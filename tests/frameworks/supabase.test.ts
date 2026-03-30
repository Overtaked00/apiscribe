import { describe, it, expect } from 'vitest';
import { supabaseDetector } from '../../src/frameworks/supabase.js';

describe('supabaseDetector', () => {
  describe('inferEndpointPath', () => {
    it('converts function name to endpoint path', () => {
      const result = supabaseDetector.inferEndpointPath(
        '/project/supabase/functions/verify-phone/index.ts',
        '/project',
      );
      expect(result).toBe('/functions/v1/verify-phone');
    });

    it('handles function names with hyphens', () => {
      const result = supabaseDetector.inferEndpointPath(
        '/project/supabase/functions/city-price-lookup/index.ts',
        '/project',
      );
      expect(result).toBe('/functions/v1/city-price-lookup');
    });

    it('returns /unknown for non-matching path', () => {
      const result = supabaseDetector.inferEndpointPath(
        '/project/src/utils/helper.ts',
        '/project',
      );
      expect(result).toBe('/unknown');
    });
  });

  describe('extractHttpMethods', () => {
    it('always includes POST', () => {
      const content = 'serve(async (req) => { return new Response("ok"); });';
      expect(supabaseDetector.extractHttpMethods(content)).toContain('POST');
    });

    it('detects OPTIONS from CORS handling', () => {
      const content = `
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok');
  }
});
`;
      const methods = supabaseDetector.extractHttpMethods(content);
      expect(methods).toContain('POST');
      expect(methods).toContain('OPTIONS');
    });
  });

  describe('contentPatterns', () => {
    it('matches Deno.serve', () => {
      const content = 'Deno.serve(async (req) => {});';
      expect(supabaseDetector.contentPatterns.some((p) => p.test(content))).toBe(true);
    });

    it('matches serve import from deno.land', () => {
      const content = "import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';";
      expect(supabaseDetector.contentPatterns.some((p) => p.test(content))).toBe(true);
    });

    it('matches Deno.env.get', () => {
      const content = "const key = Deno.env.get('API_KEY');";
      expect(supabaseDetector.contentPatterns.some((p) => p.test(content))).toBe(true);
    });
  });
});
