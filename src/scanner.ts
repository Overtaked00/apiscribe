import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import type { DetectedRoute } from './frameworks/index.js';
import { getDetectors, getDetectorsByNames } from './frameworks/index.js';

const DEFAULT_IGNORES = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/vendor/**',
  '**/__pycache__/**',
  '**/.DS_Store',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
];

export interface ScanResult {
  routes: DetectedRoute[];
  detectedFrameworks: string[];
  skippedFiles: number;
  scanDurationMs: number;
}

export interface ScanOptions {
  frameworks?: string[];
  verbose?: boolean;
}

export async function scanDirectory(
  directory: string,
  options: ScanOptions = {},
): Promise<ScanResult> {
  const startTime = Date.now();
  const detectors = options.frameworks ? getDetectorsByNames(options.frameworks) : getDetectors();

  const allRoutes: DetectedRoute[] = [];
  const detectedFrameworks = new Set<string>();
  const seenFiles = new Set<string>();
  let skippedFiles = 0;

  for (const detector of detectors) {
    const candidates = await fg(detector.filePatterns, {
      cwd: directory,
      ignore: DEFAULT_IGNORES,
      absolute: true,
    });

    for (const filePath of candidates) {
      if (seenFiles.has(filePath)) {
        skippedFiles++;
        continue;
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const matchesContent = detector.contentPatterns.some((pattern) => pattern.test(content));

      if (!matchesContent) continue;

      seenFiles.add(filePath);

      const inferredPath = detector.inferEndpointPath(filePath, directory);
      const httpMethods = detector.extractHttpMethods(content);
      const relativePath = path.relative(directory, filePath).replace(/\\/g, '/');

      allRoutes.push({
        filePath,
        relativePath,
        framework: detector.name,
        inferredPath,
        content,
        httpMethods,
      });

      detectedFrameworks.add(detector.name);

      if (options.verbose) {
        console.log(
          `  [${detector.name}] ${relativePath} → ${inferredPath} (${httpMethods.join(', ')})`,
        );
      }
    }
  }

  return {
    routes: allRoutes,
    detectedFrameworks: Array.from(detectedFrameworks),
    skippedFiles,
    scanDurationMs: Date.now() - startTime,
  };
}
