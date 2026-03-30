import path from 'node:path';
import type { FrameworkDetector } from './index.js';

export const fastifyDetector: FrameworkDetector = {
  name: 'fastify',

  filePatterns: [
    '**/routes/**/*.ts',
    '**/routes/**/*.js',
    '**/plugins/**/*.ts',
    '**/plugins/**/*.js',
  ],

  contentPatterns: [
    /\b(fastify|server|app)\.(get|post|put|delete|patch|head|options|route)\s*\(/,
    /import\s+.*fastify/i,
    /require\s*\(\s*['"]fastify['"]\s*\)/,
  ],

  inferEndpointPath(filePath: string, projectRoot: string): string {
    const relative = path.relative(projectRoot, filePath).replace(/\\/g, '/');
    const routeMatch = relative.match(/routes\/(.+)\.[tj]s$/);
    if (routeMatch) {
      return `/(see code — mounted from routes/${routeMatch[1]})`;
    }
    return '/(routes defined in code — see file content)';
  },

  extractHttpMethods(content: string): string[] {
    const pattern = /\b(?:fastify|server|app)\.(get|post|put|delete|patch|head|options)\s*\(/gi;
    const methods = new Set<string>();
    let match;
    while ((match = pattern.exec(content)) !== null) {
      methods.add(match[1].toUpperCase());
    }

    const routePattern = /method:\s*['"](\w+)['"]/gi;
    while ((match = routePattern.exec(content)) !== null) {
      methods.add(match[1].toUpperCase());
    }

    return methods.size > 0 ? Array.from(methods) : ['UNKNOWN'];
  },

  promptHint: `Fastify: Routes are defined using fastify.get('/path', handler) or the route shorthand.
Fastify also supports a declarative route style: fastify.route({ method: 'GET', url: '/path', handler }).
Fastify uses a plugin system for route organization. Routes may be registered in plugins with prefixes.
Schema validation is often inline: { schema: { body: {...}, querystring: {...}, params: {...} } }.`,
};
