import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import * as tar from 'tar';

interface GitHubSource {
  owner: string;
  repo: string;
  branch?: string;
}

const GITHUB_URL_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/#]+)/;
const SHORTHAND_RE = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/;
const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024; // 100MB

export function isGitHubSource(input: string): boolean {
  if (input.startsWith('.') || input.startsWith('/') || input.startsWith('~')) {
    return false;
  }

  if (GITHUB_URL_RE.test(input)) {
    return true;
  }

  const shorthand = input.split('#')[0];
  return SHORTHAND_RE.test(shorthand);
}

export function parseGitHubSource(input: string): GitHubSource {
  // Full URL: https://github.com/owner/repo or https://github.com/owner/repo/tree/branch
  const urlMatch = input.match(GITHUB_URL_RE);
  if (urlMatch) {
    const owner = urlMatch[1];
    const repo = urlMatch[2].replace(/\.git$/, '');
    const treeMatch = input.match(/\/tree\/(.+?)(?:\/|$)/);
    const branch = treeMatch ? treeMatch[1] : undefined;
    return { owner, repo, branch };
  }

  // Shorthand: owner/repo or owner/repo#branch
  const [repoPath, branch] = input.split('#');
  const shortMatch = repoPath.match(SHORTHAND_RE);
  if (!shortMatch) {
    throw new Error(`Invalid GitHub source: ${input}`);
  }

  return {
    owner: shortMatch[1],
    repo: shortMatch[2].replace(/\.git$/, ''),
    branch: branch || undefined,
  };
}

async function fetchTarball(
  source: GitHubSource,
  branch: string,
): Promise<Response> {
  const url = `https://codeload.github.com/${source.owner}/${source.repo}/tar.gz/${branch}`;
  return fetch(url, { headers: { 'User-Agent': 'apiscribe' } });
}

export async function downloadRepo(source: GitHubSource): Promise<string> {
  let response: Response;

  if (source.branch) {
    response = await fetchTarball(source, source.branch);
  } else {
    // Try main first, fall back to master
    response = await fetchTarball(source, 'main');
    if (response.status === 404) {
      response = await fetchTarball(source, 'master');
    }
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `Repository not found: ${source.owner}/${source.repo}` +
          (source.branch ? ` (branch: ${source.branch})` : '') +
          `. Make sure it exists and is public.`,
      );
    }
    throw new Error(`Failed to download repository: HTTP ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_DOWNLOAD_BYTES) {
    throw new Error(
      `Repository is too large (>${Math.round(MAX_DOWNLOAD_BYTES / 1024 / 1024)}MB). ` +
        `Clone it locally and use: apiscribe ./path-to-repo`,
    );
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'apiscribe-'));

  const body = response.body;
  if (!body) {
    throw new Error('Empty response body');
  }

  const nodeStream = Readable.fromWeb(body as any);

  await pipeline(nodeStream, createGunzip(), tar.extract({ cwd: tmpDir, strip: 1 }));

  return tmpDir;
}

export async function cleanupRepo(tmpDir: string): Promise<void> {
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup
  }
}
