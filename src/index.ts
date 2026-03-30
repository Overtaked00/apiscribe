import fs from 'node:fs/promises';
import http from 'node:http';
import { exec } from 'node:child_process';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { scanDirectory } from './scanner.js';
import { buildSystemPrompt, buildPromptChunks } from './prompt.js';
import { callLlm, resolveApiKey, type LlmProvider } from './llm.js';
import { writeOutput, writeOpenApiOutput, mergeDocumentationChunks } from './output.js';
import {
  buildOpenApiSystemPrompt,
  buildOpenApiPromptChunks,
  extractAndValidateOpenApiJson,
  mergeOpenApiSpecs,
} from './openapi.js';

export interface RoutedocOptions {
  output: string;
  provider: LlmProvider;
  model?: string;
  frameworks?: string;
  verbose: boolean;
  json: boolean;
  openapi: boolean;
  html: boolean;
  serve: boolean;
  dryRun: boolean;
}

export async function runRoutedoc(directory: string, options: RoutedocOptions): Promise<void> {
  const resolvedDir = path.resolve(directory);

  try {
    await fs.access(resolvedDir);
  } catch {
    console.error(chalk.red(`Directory not found: ${resolvedDir}`));
    process.exit(1);
  }

  const isOpenApiMode = options.openapi || options.html;

  // Scan
  const spinner = ora();
  spinner.start('Scanning for route files...');

  const frameworkFilter = options.frameworks
    ? options.frameworks.split(',').map((f) => f.trim())
    : undefined;

  const scanResult = await scanDirectory(resolvedDir, {
    frameworks: frameworkFilter,
    verbose: options.verbose,
  });

  if (scanResult.routes.length === 0) {
    spinner.fail('No API routes found.');
    console.error(
      chalk.yellow(
        '\nSupported frameworks: Next.js App Router, Supabase Edge Functions, Express, Fastify',
      ),
    );
    console.error(chalk.dim('Try running with --verbose to see what was scanned.'));
    process.exit(1);
  }

  spinner.succeed(
    `Found ${scanResult.routes.length} route file${scanResult.routes.length === 1 ? '' : 's'} (${scanResult.detectedFrameworks.join(', ')}) in ${scanResult.scanDurationMs}ms`,
  );

  if (options.dryRun) {
    console.log(chalk.bold('\nDetected routes:\n'));
    for (const route of scanResult.routes) {
      const methods = chalk.cyan(route.httpMethods.join(', '));
      const endpoint = chalk.green(route.inferredPath);
      const file = chalk.dim(route.relativePath);
      console.log(`  ${methods} ${endpoint}  ${file}`);
    }
    console.log(
      chalk.dim(
        `\n  ${scanResult.routes.length} routes across ${scanResult.detectedFrameworks.length} framework(s)`,
      ),
    );
    return;
  }

  // API key check (only needed when not dry-run)
  const apiKey = resolveApiKey(options.provider);
  if (!apiKey) {
    const envVarMap: Record<LlmProvider, string> = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      gemini: 'GEMINI_API_KEY',
    };
    const envVar = envVarMap[options.provider];
    console.error(chalk.red(`No API key found for ${options.provider}.`));
    console.error(chalk.yellow(`\nSet the environment variable:`));
    console.error(chalk.dim(`  export ${envVar}=your-key-here`));
    console.error(chalk.yellow(`\nOr create ~/.apiscribe/config.json:`));
    console.error(chalk.dim(`  { "${envVar}": "your-key-here" }`));
    process.exit(1);
  }

  // Build prompt
  const systemPrompt = isOpenApiMode ? buildOpenApiSystemPrompt() : buildSystemPrompt();
  const chunks = isOpenApiMode
    ? buildOpenApiPromptChunks(scanResult.routes, scanResult.detectedFrameworks)
    : buildPromptChunks(scanResult.routes, scanResult.detectedFrameworks);

  if (options.verbose) {
    console.log(chalk.dim(`\n  Mode: ${isOpenApiMode ? 'OpenAPI' : 'Markdown'}`));
    console.log(chalk.dim(`  Prompt chunks: ${chunks.length}`));
    for (let i = 0; i < chunks.length; i++) {
      console.log(chalk.dim(`  Chunk ${i + 1}: ~${Math.ceil(chunks[i].length / 4)} tokens`));
    }
  }

  // Call LLM
  const llmOptions = {
    provider: options.provider,
    model: options.model,
    apiKey,
    maxTokens: isOpenApiMode ? 16384 : 16384,
    jsonMode: isOpenApiMode,
  };

  const results: string[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let model = '';
  const docType = isOpenApiMode ? 'OpenAPI spec' : 'documentation';

  for (let i = 0; i < chunks.length; i++) {
    const label = chunks.length > 1 ? ` (chunk ${i + 1}/${chunks.length})` : '';
    spinner.start(`Generating ${docType} with ${options.provider}${label}...`);

    try {
      const response = await callLlm(systemPrompt, chunks[i], llmOptions);
      results.push(response.content);
      totalInputTokens += response.inputTokens;
      totalOutputTokens += response.outputTokens;
      model = response.model;
    } catch (error: any) {
      spinner.fail('LLM call failed.');

      if (error.status === 429) {
        console.error(chalk.red('Rate limit exceeded. Please wait and try again.'));
        console.error(chalk.yellow(`Detail: ${error.message}`));
      } else if (error.message?.includes('context_length_exceeded')) {
        console.error(chalk.red('Too much code for a single LLM call.'));
        console.error(chalk.yellow('Try scanning a subdirectory: apiscribe ./my-project/app/api'));
        console.error(chalk.yellow(`Detail: ${error.message}`));
      } else {
        console.error(chalk.red(`Error: ${error.message}`));
        if (options.verbose && error.stack) {
          console.error(chalk.dim(error.stack));
        }
      }
      process.exit(1);
    }
  }

  spinner.succeed(
    `${isOpenApiMode ? 'OpenAPI spec' : 'Documentation'} generated (${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out tokens)`,
  );

  // Write output
  const outputPath = path.resolve(options.output);

  if (isOpenApiMode) {
    spinner.start('Writing OpenAPI output...');

    const specs = results.map((raw) => {
      try {
        return extractAndValidateOpenApiJson(raw);
      } catch (err: any) {
        spinner.fail('Failed to parse OpenAPI spec from LLM response.');
        console.error(chalk.red(err.message));
        if (options.verbose) {
          console.error(chalk.dim('\nRaw LLM output (first 500 chars):'));
          console.error(chalk.dim(raw.slice(0, 500)));
        }
        process.exit(1);
      }
    });

    const mergedSpec = mergeOpenApiSpecs(specs);
    const result = await writeOpenApiOutput(mergedSpec, {
      outputPath,
      writeHtml: options.html,
    });

    spinner.succeed(`OpenAPI spec written to ${chalk.green(result.specPath)}`);
    if (result.htmlPath) {
      console.log(chalk.green(`  HTML docs written to ${result.htmlPath}`));
    }

    if (options.serve && result.specPath) {
      await startDocServer(result.specPath, mergedSpec);
    } else if (result.htmlPath) {
      console.log(chalk.dim(`  Open in your browser to view the API reference`));
    }
  } else {
    const content = mergeDocumentationChunks(results);

    spinner.start(`Writing to ${options.output}...`);
    await writeOutput(
      content,
      scanResult,
      { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, model },
      {
        outputPath,
        json: options.json,
      },
    );
    spinner.succeed(`Documentation written to ${chalk.green(options.output)}`);
  }
}

async function startDocServer(specPath: string, spec: Record<string, any>): Promise<void> {
  const port = 3000;
  const { generateScalarHtml } = await import('./openapi.js');

  const specJson = JSON.stringify(spec);
  const html = generateScalarHtml(spec);

  const server = http.createServer((req, res) => {
    if (req.url === '/openapi.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(specJson);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    }
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(chalk.green(`\n  API docs server running at ${chalk.bold(url)}`));
    console.log(chalk.dim('  Press Ctrl+C to stop\n'));

    // Auto-open browser
    const openCmd =
      process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${openCmd} ${url}`);
  });

  // Keep process alive until Ctrl+C
  await new Promise(() => {});
}
