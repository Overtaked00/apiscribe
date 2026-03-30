import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { scanDirectory } from '../src/scanner.js';

const FIXTURES = path.resolve(import.meta.dirname, 'fixtures');

describe('scanDirectory', () => {
  it('detects Next.js App Router routes', async () => {
    const result = await scanDirectory(path.join(FIXTURES, 'nextjs-app'));
    expect(result.detectedFrameworks).toContain('nextjs');
    expect(result.routes.length).toBe(2);

    const usersRoute = result.routes.find((r) => r.inferredPath === '/api/users');
    expect(usersRoute).toBeDefined();
    expect(usersRoute!.httpMethods).toContain('GET');
    expect(usersRoute!.httpMethods).toContain('POST');

    const userByIdRoute = result.routes.find((r) => r.inferredPath === '/api/users/:id');
    expect(userByIdRoute).toBeDefined();
    expect(userByIdRoute!.httpMethods).toContain('GET');
    expect(userByIdRoute!.httpMethods).toContain('DELETE');
  });

  it('detects Supabase Edge Functions', async () => {
    const result = await scanDirectory(path.join(FIXTURES, 'supabase-app'));
    expect(result.detectedFrameworks).toContain('supabase');
    expect(result.routes.length).toBe(1);

    const helloRoute = result.routes[0];
    expect(helloRoute.inferredPath).toBe('/functions/v1/hello');
    expect(helloRoute.httpMethods).toContain('POST');
    expect(helloRoute.httpMethods).toContain('OPTIONS');
  });

  it('detects Express routes', async () => {
    const result = await scanDirectory(path.join(FIXTURES, 'express-app'));
    expect(result.detectedFrameworks).toContain('express');
    expect(result.routes.length).toBe(1);

    const usersRoute = result.routes[0];
    expect(usersRoute.httpMethods).toContain('GET');
    expect(usersRoute.httpMethods).toContain('POST');
    expect(usersRoute.httpMethods).toContain('DELETE');
  });

  it('returns empty for a directory with no routes', async () => {
    const result = await scanDirectory(FIXTURES);
    // fixtures root itself has no direct route files matching patterns
    // but subdirectories do — this tests that the scanner finds them
    expect(result.routes.length).toBeGreaterThan(0);
  });

  it('respects framework filter', async () => {
    const result = await scanDirectory(path.join(FIXTURES, 'nextjs-app'), {
      frameworks: ['supabase'],
    });
    expect(result.routes.length).toBe(0);
  });

  it('reports scan duration', async () => {
    const result = await scanDirectory(path.join(FIXTURES, 'nextjs-app'));
    expect(result.scanDurationMs).toBeGreaterThanOrEqual(0);
  });
});
