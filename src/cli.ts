import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runRoutedoc } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const pkgPath = path.resolve(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

const program = new Command();

program
  .name('apiscribe')
  .description('Scan any backend project and generate API documentation with AI')
  .version(getVersion())
  .argument('<directory>', 'Path to the project directory to scan')
  .option('-o, --output <file>', 'Output file path', 'api-docs.md')
  .option('-p, --provider <name>', 'LLM provider: openai, anthropic, or gemini', 'openai')
  .option('-m, --model <name>', 'Model name override')
  .option('--frameworks <list>', 'Comma-separated framework filter (e.g., nextjs,express)')
  .option('--verbose', 'Show debug output', false)
  .option('--json', 'Output as JSON instead of markdown', false)
  .option('--openapi', 'Output as OpenAPI 3.0 JSON spec', false)
  .option('--html', 'Output OpenAPI spec + interactive HTML docs (Scalar)', false)
  .option('--serve', 'Start a local server to preview HTML docs (implies --html)', false)
  .option('--dry-run', 'Scan only — list detected routes without calling LLM', false)
  .addHelpText(
    'after',
    `
Examples:
  $ apiscribe ./my-project
  $ apiscribe ./my-project -o docs/api.md
  $ apiscribe ./my-project -p anthropic
  $ apiscribe ./my-project -p gemini
  $ apiscribe ./my-project --frameworks nextjs,supabase --verbose
  $ apiscribe ./my-project --openapi
  $ apiscribe ./my-project --html
  $ apiscribe ./my-project --serve
  $ npx apiscribe ./my-project`,
  )
  .action(async (directory: string, options) => {
    await runRoutedoc(directory, {
      output: options.output,
      provider: options.provider,
      model: options.model,
      frameworks: options.frameworks,
      verbose: options.verbose,
      json: options.json,
      openapi: options.openapi,
      html: options.html || options.serve,
      serve: options.serve,
      dryRun: options.dryRun,
    });
  });

program.parse();
