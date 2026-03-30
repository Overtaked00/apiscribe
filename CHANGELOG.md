# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-03-30

### Added

- OpenAPI 3.0.3 output format (`--openapi` flag)
- Interactive HTML documentation page powered by Scalar (`--html` flag)
- Gemini LLM provider support (`-p gemini`)
- JSON mode for OpenAI to ensure valid OpenAPI JSON output
- Smart chunking for accounts with low TPM limits (e.g., OpenAI Tier 1)
- Local dev server with `--serve` flag (auto-opens `localhost:3000` with Scalar docs)

### Changed

- Default OpenAI model changed from `gpt-4o` to `gpt-4o-mini`

## [0.1.0] - 2026-03-30

### Added

- Initial release
- CLI tool with `npx apiscribe` support
- Framework detection for Next.js App Router, Supabase Edge Functions, Express, and Fastify
- Filesystem-based endpoint path inference for Next.js and Supabase
- OpenAI and Anthropic LLM provider support
- Markdown and JSON output formats
- `--dry-run` mode to preview detected routes
- `--verbose` mode for debugging
- Automatic chunking for large codebases
