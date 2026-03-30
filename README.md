# apiscribe

[![npm version](https://img.shields.io/npm/v/apiscribe)](https://www.npmjs.com/package/apiscribe)
[![license](https://img.shields.io/npm/l/apiscribe)](https://github.com/Overtaked00/apiscribe/blob/main/LICENSE)

Scan any backend project and generate API documentation with AI.

Point apiscribe at a project directory. It detects your API routes, sends them to an LLM, and outputs documentation — as markdown, OpenAPI spec, or a Stripe-style interactive HTML page.

## Supported Frameworks

- **Next.js App Router** — `app/api/**/route.ts`
- **Supabase Edge Functions** — `supabase/functions/*/index.ts`
- **Express** — `app.get()`, `router.post()`, etc.
- **Fastify** — `fastify.get()`, `fastify.route()`, etc.

## Installation

```bash
npm install -g apiscribe
```

Or run without installing:

```bash
npx apiscribe ./my-project
```

## Quick Start

```bash
# Set your API key (OpenAI is the default provider, using gpt-4o-mini)
export OPENAI_API_KEY=your-key-here

# Generate markdown docs
apiscribe ./my-project

# Generate an interactive HTML docs page (powered by Scalar)
apiscribe ./my-project --html

# Generate an OpenAPI 3.0 spec
apiscribe ./my-project --openapi

# Use Anthropic instead
export ANTHROPIC_API_KEY=your-key-here
apiscribe ./my-project -p anthropic

# Use Gemini instead
export GEMINI_API_KEY=your-key-here
apiscribe ./my-project -p gemini
```

By default this creates an `api-docs.md` file. Use `--html` for an interactive API reference page, or `--openapi` for a raw OpenAPI 3.0.3 JSON spec.

## Usage

```
apiscribe <directory> [options]

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

# Generate interactive HTML docs (Stripe-style API reference)
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
```

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

1. **Scan** — Walks your project directory and matches files against framework-specific patterns
2. **Detect** — Identifies the framework (Next.js, Supabase, Express, Fastify) and extracts HTTP methods
3. **Infer** — Converts file paths to endpoint URLs using framework conventions (e.g., `app/api/users/[id]/route.ts` → `/api/users/:id`)
4. **Generate** — Sends the route code to an LLM with framework-aware context and path hints
5. **Output** — Writes structured markdown, OpenAPI JSON, or interactive HTML documentation

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
