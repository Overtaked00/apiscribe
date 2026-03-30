import path from 'node:path';
import type { FrameworkDetector } from './index.js';

export const nextjsDetector: FrameworkDetector = {
  name: 'nextjs',

  filePatterns: ['**/app/api/**/route.ts', '**/app/api/**/route.js'],

  contentPatterns: [
    /export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/,
    /NextRequest|NextResponse/,
  ],

  inferEndpointPath(filePath: string, projectRoot: string): string {
    const relative = path.relative(projectRoot, filePath).replace(/\\/g, '/');
    const match = relative.match(/app\/api\/(.+)\/route\.[tj]sx?$/);
    if (!match) return '/unknown';
    let routePath = match[1];
    routePath = routePath.replace(/\[\.\.\.(\w+)\]/g, ':$1*');
    routePath = routePath.replace(/\[(\w+)\]/g, ':$1');
    return `/api/${routePath}`;
  },

  extractHttpMethods(content: string): string[] {
    const pattern = /export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/g;
    const methods: string[] = [];
    let match;
    while ((match = pattern.exec(content)) !== null) {
      methods.push(match[2]);
    }
    return methods.length > 0 ? methods : ['UNKNOWN'];
  },

  promptHint: `Next.js App Router: Each file at app/api/[path]/route.ts defines API endpoints.
The URL path maps directly from the filesystem: app/api/user/profile/route.ts → /api/user/profile.
Dynamic segments use brackets: app/api/marketplace/[billId]/route.ts → /api/marketplace/:billId.
Each exported function name IS the HTTP method: export function GET handles GET requests, export function POST handles POST, etc.
A single route.ts file can export multiple HTTP method handlers.`,
};
