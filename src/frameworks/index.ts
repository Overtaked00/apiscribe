export interface FrameworkDetector {
  name: string;
  filePatterns: string[];
  contentPatterns: RegExp[];
  inferEndpointPath(filePath: string, projectRoot: string): string;
  extractHttpMethods(content: string): string[];
  promptHint: string;
}

export interface DetectedRoute {
  filePath: string;
  relativePath: string;
  framework: string;
  inferredPath: string;
  content: string;
  httpMethods: string[];
}

import { nextjsDetector } from './nextjs.js';
import { supabaseDetector } from './supabase.js';
import { expressDetector } from './express.js';
import { fastifyDetector } from './fastify.js';

const ALL_DETECTORS: FrameworkDetector[] = [
  nextjsDetector,
  supabaseDetector,
  expressDetector,
  fastifyDetector,
];

export function getDetectors(): FrameworkDetector[] {
  return ALL_DETECTORS;
}

export function getDetectorsByNames(names: string[]): FrameworkDetector[] {
  const lower = names.map((n) => n.toLowerCase());
  return ALL_DETECTORS.filter((d) => lower.includes(d.name.toLowerCase()));
}
