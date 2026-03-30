import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt, buildPromptChunks } from '../src/prompt.js';
import type { DetectedRoute } from '../src/frameworks/index.js';

function makeRoute(overrides: Partial<DetectedRoute> = {}): DetectedRoute {
  return {
    filePath: '/project/app/api/test/route.ts',
    relativePath: 'app/api/test/route.ts',
    framework: 'nextjs',
    inferredPath: '/api/test',
    content: 'export async function GET() { return Response.json({}); }',
    httpMethods: ['GET'],
    ...overrides,
  };
}

describe('buildSystemPrompt', () => {
  it('includes documentation rules', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('Document EVERY endpoint');
    expect(prompt).toContain('Do NOT fabricate');
  });
});

describe('buildUserPrompt', () => {
  it('includes framework context hints', () => {
    const routes = [makeRoute()];
    const prompt = buildUserPrompt(routes, ['nextjs']);
    expect(prompt).toContain('Next.js App Router');
    expect(prompt).toContain('promptHint' in {} ? '' : 'filesystem');
  });

  it('includes route file content', () => {
    const routes = [makeRoute({ content: 'export async function POST() {}' })];
    const prompt = buildUserPrompt(routes, ['nextjs']);
    expect(prompt).toContain('export async function POST');
  });

  it('includes inferred endpoint path', () => {
    const routes = [makeRoute({ inferredPath: '/api/users/:id' })];
    const prompt = buildUserPrompt(routes, ['nextjs']);
    expect(prompt).toContain('/api/users/:id');
  });

  it('includes output format specification', () => {
    const routes = [makeRoute()];
    const prompt = buildUserPrompt(routes, ['nextjs']);
    expect(prompt).toContain('## Output Format');
    expect(prompt).toContain('Inferred endpoint path');
  });
});

describe('buildPromptChunks', () => {
  it('returns single chunk for small input', () => {
    const routes = [makeRoute()];
    const chunks = buildPromptChunks(routes, ['nextjs']);
    expect(chunks.length).toBe(1);
  });

  it('splits into multiple chunks when token limit exceeded', () => {
    const largeContent = 'x'.repeat(200000); // ~50k tokens
    const routes = [
      makeRoute({ content: largeContent, inferredPath: '/api/a' }),
      makeRoute({ content: largeContent, inferredPath: '/api/b' }),
      makeRoute({ content: largeContent, inferredPath: '/api/c' }),
    ];
    const chunks = buildPromptChunks(routes, ['nextjs'], 60000);
    expect(chunks.length).toBeGreaterThan(1);
  });
});
