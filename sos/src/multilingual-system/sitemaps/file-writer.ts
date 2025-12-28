/**
 * File Writer Utility
 * Writes sitemap files to the local filesystem (for build-time generation)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { SitemapGenerationResult } from './types';

const gzip = promisify(zlib.gzip);

/**
 * Write sitemap file to dist/sitemaps/ directory
 */
export async function writeSitemapFile(
  relativePath: string,
  content: string,
  distDir: string = 'dist'
): Promise<SitemapGenerationResult> {
  // Create full path: dist/sitemaps/{relativePath}
  const fullPath = path.join(distDir, 'sitemaps', relativePath);
  const dir = path.dirname(fullPath);
  
  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });
  
  // Gzip the content
  const gzipped = await gzip(Buffer.from(content, 'utf-8'));
  
  // Write file
  await fs.writeFile(fullPath, gzipped);
  
  return {
    filename: path.basename(relativePath),
    content,
    size: gzipped.length,
    path: relativePath,
  };
}

/**
 * Write multiple sitemap files
 */
export async function writeSitemapFiles(
  files: Array<{ path: string; content: string }>,
  distDir: string = 'dist'
): Promise<SitemapGenerationResult[]> {
  const results: SitemapGenerationResult[] = [];
  
  for (const file of files) {
    const result = await writeSitemapFile(file.path, file.content, distDir);
    results.push(result);
  }
  
  return results;
}


