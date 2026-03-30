import { describe, it, expect } from 'vitest';
import { nextjsDetector } from '../../src/frameworks/nextjs.js';

describe('nextjsDetector', () => {
  describe('inferEndpointPath', () => {
    it('converts basic route path', () => {
      const result = nextjsDetector.inferEndpointPath(
        '/project/app/api/users/route.ts',
        '/project',
      );
      expect(result).toBe('/api/users');
    });

    it('converts nested route path', () => {
      const result = nextjsDetector.inferEndpointPath(
        '/project/app/api/housing-market/listings/route.ts',
        '/project',
      );
      expect(result).toBe('/api/housing-market/listings');
    });

    it('converts dynamic segment [param] to :param', () => {
      const result = nextjsDetector.inferEndpointPath(
        '/project/app/api/marketplace/[billId]/route.ts',
        '/project',
      );
      expect(result).toBe('/api/marketplace/:billId');
    });

    it('converts catch-all [...param] to :param*', () => {
      const result = nextjsDetector.inferEndpointPath(
        '/project/app/api/docs/[...slug]/route.ts',
        '/project',
      );
      expect(result).toBe('/api/docs/:slug*');
    });

    it('handles versioned routes', () => {
      const result = nextjsDetector.inferEndpointPath(
        '/project/app/api/v1/bills/upload/route.ts',
        '/project',
      );
      expect(result).toBe('/api/v1/bills/upload');
    });
  });

  describe('extractHttpMethods', () => {
    it('extracts single method', () => {
      const content = 'export async function GET(request: NextRequest) {}';
      expect(nextjsDetector.extractHttpMethods(content)).toEqual(['GET']);
    });

    it('extracts multiple methods', () => {
      const content = `
export async function GET(request: NextRequest) {}
export async function POST(request: NextRequest) {}
export function DELETE(request: NextRequest) {}
`;
      const methods = nextjsDetector.extractHttpMethods(content);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('DELETE');
    });

    it('returns UNKNOWN for no methods', () => {
      const content = 'const x = 1;';
      expect(nextjsDetector.extractHttpMethods(content)).toEqual(['UNKNOWN']);
    });
  });

  describe('contentPatterns', () => {
    it('matches export async function GET', () => {
      const content = 'export async function GET(request: NextRequest) {}';
      expect(nextjsDetector.contentPatterns.some((p) => p.test(content))).toBe(true);
    });

    it('matches NextRequest import', () => {
      const content = "import { NextRequest } from 'next/server';";
      expect(nextjsDetector.contentPatterns.some((p) => p.test(content))).toBe(true);
    });

    it('does not match unrelated code', () => {
      const content = 'const greeting = "hello";';
      expect(nextjsDetector.contentPatterns.some((p) => p.test(content))).toBe(false);
    });
  });
});
