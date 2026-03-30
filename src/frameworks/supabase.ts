import path from 'node:path';
import type { FrameworkDetector } from './index.js';

export const supabaseDetector: FrameworkDetector = {
  name: 'supabase',

  filePatterns: ['**/supabase/functions/*/index.ts', '**/supabase/functions/*/index.js'],

  contentPatterns: [
    /Deno\.serve|serve\s*\(\s*async/,
    /Deno\.env\.get/,
    /from\s+['"]https:\/\/deno\.land/,
  ],

  inferEndpointPath(filePath: string, projectRoot: string): string {
    const relative = path.relative(projectRoot, filePath).replace(/\\/g, '/');
    const match = relative.match(/supabase\/functions\/([^/]+)\/index\.[tj]s$/);
    if (!match) return '/unknown';
    return `/functions/v1/${match[1]}`;
  },

  extractHttpMethods(content: string): string[] {
    const methods = new Set<string>();
    methods.add('POST');

    const methodChecks = content.matchAll(/req\.method\s*===?\s*['"](\w+)['"]/g);
    for (const m of methodChecks) {
      methods.add(m[1]);
    }

    if (/['"]OPTIONS['"]/.test(content)) {
      methods.add('OPTIONS');
    }

    return Array.from(methods);
  },

  promptHint: `Supabase Edge Functions: Each function lives in supabase/functions/{name}/index.ts and runs on Deno.
The endpoint URL is: /functions/v1/{name} (e.g., supabase/functions/verify-phone/index.ts → /functions/v1/verify-phone).
Functions typically accept POST requests. Some dispatch internally based on request body fields (e.g., { action: "send" } vs { action: "verify" }).
Some functions are triggered by database webhooks (INSERT/UPDATE events) rather than direct HTTP calls.
All functions handle CORS preflight (OPTIONS). Environment variables use Deno.env.get().`,
};
