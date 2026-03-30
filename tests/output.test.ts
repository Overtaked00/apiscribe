import { describe, it, expect } from 'vitest';
import { mergeDocumentationChunks } from '../src/output.js';

describe('mergeDocumentationChunks', () => {
  it('returns single chunk as-is', () => {
    const result = mergeDocumentationChunks(['# API Docs\n\n## Users\n\n### GET /users']);
    expect(result).toBe('# API Docs\n\n## Users\n\n### GET /users');
  });

  it('merges multiple chunks', () => {
    const chunks = [
      '# API Docs\n\n## Table of Contents\n\n## Users\n\n### GET /users\nList users',
      '# API Docs\n\n## Table of Contents\n\n## Products\n\n### GET /products\nList products',
    ];
    const result = mergeDocumentationChunks(chunks);
    expect(result).toContain('## Users');
    expect(result).toContain('## Products');
    expect(result).not.toContain('## Table of Contents');
  });
});
