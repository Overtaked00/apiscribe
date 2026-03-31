# apiscribe

[![npm version](https://img.shields.io/npm/v/apiscribe)](https://www.npmjs.com/package/apiscribe)
[![license](https://img.shields.io/npm/l/apiscribe)](https://github.com/Overtaked00/apiscribe/blob/main/LICENSE)

Scan any backend project and generate API documentation with AI.

Point apiscribe at a project directory — or a public GitHub repo. It detects your API routes, sends them to an LLM, and outputs documentation — as markdown, OpenAPI spec, or interactive HTML docs with a built-in AI chat assistant.

## Supported Frameworks

- **Next.js App Router** — `app/api/**/route.ts`
- **Supabase Edge Functions** — `supabase/functions/*/index.ts`
- **Express** — `app.get()`, `router.post()`, etc.
- **Fastify** — `fastify.get()`, `fastify.route()`, etc.

## Quick Start

```bash
# 1. Set your API key
export OPENAI_API_KEY=your-key-here

# 2. Run it from your project directory
npx apiscribe . --serve

# Or point at a project from anywhere
npx apiscribe ./my-project --serve

# Or scan a public GitHub repo directly
npx apiscribe expressjs/express --serve
```

That's it. Your browser opens with interactive API docs on `localhost:3000`, complete with an AI chat assistant you can ask questions about your API.

Other providers work too:

```bash
export ANTHROPIC_API_KEY=your-key-here
npx apiscribe ./my-project --serve -p anthropic

export GEMINI_API_KEY=your-key-here
npx apiscribe ./my-project --serve -p gemini
```

## Usage

```
apiscribe <directory|owner/repo> [options]

Output formats:
  --serve                Preview docs on localhost:3000 (implies --html)
  --html                 Generate interactive HTML docs (Scalar)
  --openapi              Generate OpenAPI 3.0 JSON spec
  --json                 Output as JSON instead of markdown
  (default)              Generate markdown docs

LLM options:
  -p, --provider <name>  openai, anthropic, or gemini (default: "openai")
  -m, --model <name>     Model name override

Scanning:
  --dry-run              List detected routes without calling LLM
  --frameworks <list>    Filter frameworks (e.g., nextjs,express)

General:
  -o, --output <file>    Output file path (default: "api-docs.md")
  --verbose              Show debug output
  -V, --version          Show version
  -h, --help             Show help
```

## Examples

```bash
# Preview docs in your browser (the best way to use apiscribe)
apiscribe ./my-project --serve

# Generate interactive HTML docs you can host on your own domain
apiscribe ./my-project --html

# Generate OpenAPI spec
apiscribe ./my-project --openapi

# Generate markdown docs (default)
apiscribe ./my-project

# Preview what routes will be detected (free, no LLM call)
apiscribe ./my-project --dry-run

# Use a different provider
apiscribe ./my-project --serve -p anthropic
apiscribe ./my-project --serve -p gemini

# Use a specific model
apiscribe ./my-project --serve -p anthropic -m claude-sonnet-4-20250514

# Only scan Next.js routes
apiscribe ./my-project --serve --frameworks nextjs

# Scan a public GitHub repo
apiscribe expressjs/express --serve
apiscribe expressjs/express#5.x --dry-run
apiscribe https://github.com/expressjs/express --html
```

## Ask AI

When using `--serve`, apiscribe adds an AI chat assistant to your docs. Click the **Ask AI** bubble in the bottom-right corner to open a chat panel where you can ask questions about your API — how endpoints work, what parameters are required, or how to integrate with your app.

The assistant uses the same LLM provider you configured and has full context of your generated OpenAPI spec.

## GitHub Repos

Scan any public GitHub repo without cloning it:

```bash
# owner/repo format
apiscribe expressjs/express --serve

# specific branch
apiscribe expressjs/express#5.x --dry-run

# full URL
apiscribe https://github.com/expressjs/express --html
```

apiscribe downloads a tarball of the repo, scans it, and cleans up automatically.

## API Key Configuration

apiscribe checks for API keys in this order:

1. **Environment variable** — `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`
2. **Config file** — `~/.apiscribe/config.json`

```json
{
  "OPENAI_API_KEY": "sk-...",
  "ANTHROPIC_API_KEY": "sk-ant-...",
  "GEMINI_API_KEY": "AI..."
}
```

## How It Works

1. **Scan** — Walks your project directory (or downloads a GitHub repo) and matches files against framework-specific patterns
2. **Detect** — Identifies the framework (Next.js, Supabase, Express, Fastify) and extracts HTTP methods
3. **Infer** — Converts file paths to endpoint URLs using framework conventions (e.g., `app/api/users/[id]/route.ts` → `/api/users/:id`)
4. **Generate** — Sends the route code to an LLM with framework-aware context and path hints
5. **Output** — Writes structured markdown, OpenAPI JSON, or interactive HTML documentation
6. **Serve** — With `--serve`, starts a local server with interactive docs and an AI chat assistant

## Hosting Your Docs

With `--html`, apiscribe generates a self-contained `index.html` and `openapi.json` in your output directory. The HTML file has the full API spec embedded — no backend or database required.

Host it anywhere:

- Drop it into your existing website
- Deploy to Vercel, Netlify, or GitHub Pages
- Serve from S3, CloudFront, or any static file host
- Add it to your project repo and serve it from your own domain

```bash
apiscribe ./my-project --html -o docs/api-docs.md
# outputs docs/openapi.json and docs/index.html — ready to deploy
```

## Adding Framework Support

Each framework detector implements a simple interface:

```typescript
interface FrameworkDetector {
  name: string;
  filePatterns: string[];           // Glob patterns to find candidate files
  contentPatterns: RegExp[];        // Regex to confirm a file is a route handler
  inferEndpointPath(filePath, projectRoot): string;  // File path → API URL
  extractHttpMethods(content): string[];             // Extract HTTP methods from code
  promptHint: string;               // LLM context about the framework's conventions
}
```

See `src/frameworks/` for examples.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](LICENSE)
