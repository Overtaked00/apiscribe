import path from 'node:path';
import type { FrameworkDetector } from './index.js';

export const expressDetector: FrameworkDetector = {
  name: 'express',

  filePatterns: [
    '**/routes/**/*.ts',
    '**/routes/**/*.js',
    '**/router/**/*.ts',
    '**/router/**/*.js',
    '**/*.router.ts',
    '**/*.router.js',
    '**/*.routes.ts',
    '**/*.routes.js',
    '**/app.ts',
    '**/app.js',
    '**/server.ts',
    '**/server.js',
  ],

  contentPatterns: [/\b(app|router)\.(get|post|put|delete|patch|all|use)\s*\(\s*['"\/]/],

  inferEndpointPath(filePath: string, projectRoot: string): string {
    const relative = path.relative(projectRoot, filePath).replace(/\\/g, '/');
    const routeMatch = relative.match(/routes\/(.+)\.[tj]s$/);
    if (routeMatch) {
      return `/(see code — mounted from routes/${routeMatch[1]})`;
    }
    return '/(routes defined in code — see file content)';
  },

  extractHttpMethods(content: string): string[] {
    const pattern = /\b(?:app|router)\.(get|post|put|delete|patch|all)\s*\(/gi;
    const methods = new Set<string>();
    let match;
    while ((match = pattern.exec(content)) !== null) {
      methods.add(match[1].toUpperCase());
    }
    return methods.size > 0 ? Array.from(methods) : ['UNKNOWN'];
  },

  promptHint: `Express.js: Routes are defined programmatically using app.get('/path', handler) or router.get('/path', handler).
Route paths are in the code, not the filesystem. Look for app.get(), app.post(), router.get(), router.post(), etc.
Routes may be mounted with a prefix: app.use('/api/v1', userRouter) means all routes in userRouter are prefixed with /api/v1.
Middleware chains are common: app.get('/path', authMiddleware, handler).
Look for route parameters like /users/:id and query parameters accessed via req.query.`,
};
