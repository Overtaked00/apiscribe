# Contributing to apiscribe

## Development Setup

```bash
git clone https://github.com/YOUR_USERNAME/apiscribe.git
cd apiscribe
npm install
```

## Development

Run the CLI in development mode (no build step needed):

```bash
npx tsx src/cli.ts ./path/to/project --dry-run
```

## Building

```bash
npm run build
```

## Testing

```bash
npm test              # Run tests once
npm run test:watch    # Watch mode
```

## Linting & Formatting

```bash
npm run lint          # Run ESLint
npm run format        # Run Prettier
npm run format:check  # Check formatting
```

## Key Source Files

- `src/cli.ts` — CLI argument parsing (Commander)
- `src/index.ts` — Main orchestration: scan → prompt → LLM → output
- `src/scanner.ts` — Directory scanning and route detection
- `src/prompt.ts` — Markdown prompt construction and chunking
- `src/openapi.ts` — OpenAPI prompt, JSON validation, spec merging, Scalar HTML generation
- `src/llm.ts` — LLM provider abstraction (OpenAI, Anthropic, Gemini)
- `src/output.ts` — File output (markdown, JSON, OpenAPI, HTML)
- `src/frameworks/` — Framework-specific route detectors

## Adding a New Framework Detector

1. Create `src/frameworks/yourframework.ts`
2. Implement the `FrameworkDetector` interface:
   - `filePatterns` — Glob patterns to find candidate route files
   - `contentPatterns` — Regex to confirm the file contains route definitions
   - `inferEndpointPath()` — Convert file path to the API endpoint URL
   - `extractHttpMethods()` — Parse HTTP methods from the code
   - `promptHint` — Context string explaining the framework's routing conventions to the LLM
3. Register it in `src/frameworks/index.ts`
4. Add tests in `tests/frameworks/yourframework.test.ts`

## Pull Request Guidelines

- Keep PRs focused on a single change
- Add tests for new functionality
- Run `npm test` and `npm run lint` before submitting
- Describe what changed and why in the PR description
