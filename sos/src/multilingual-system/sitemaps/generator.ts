/**
 * Main Sitemap Generator
 * Orchestrates the generation of all 3 levels of sitemaps
 */

import { LANGUAGES, LANGUAGE_COUNTRY_COMBINATIONS, COUNTRIES, SITE_URL } from './constants';
import { countryToSlug } from './utils';
import { GenerationSummary, SitemapGenerationResult, ProviderData } from './types';
import { generateLevel1Sitemap, getLevel1Filename, getLevel1Path } from './language-country';
import { generateLevel2Sitemap, getLevel2Filename, getLevel2Path } from './country';
import { generateLevel3SitemapIndex, getLevel3Path, getSitemapUrl } from './global';
import { submitSitemapToSearchEngines } from './auto-submit';
import { writeSitemapFile } from './file-writer';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

export interface GenerateSitemapsOptions {
  providers: ProviderData[];
  writeToDisk?: boolean;
  distDir?: string;
  submitToSearchEngines?: boolean;
}

export interface GenerateSitemapsResult {
  level1: SitemapGenerationResult[];
  level2: SitemapGenerationResult[];
  level3: SitemapGenerationResult | null;
  summary: GenerationSummary;
  submissionResults?: Array<{ engine: string; success: boolean; error?: string }>;
}

/**
 * Main function to generate all sitemaps
 */
export async function generateAllSitemaps(
  options: GenerateSitemapsOptions
): Promise<GenerateSitemapsResult> {
  const startTime = Date.now();
  const {
    providers,
    writeToDisk = false,
    distDir = 'dist',
    submitToSearchEngines = false,
  } = options;
  
  console.log('🚀 Starting sitemap generation...');
  console.log(`📊 Found ${providers.length} public providers`);
  
  // Get unique countries from providers
  const countries = new Set<string>();
  providers.forEach(p => {
    const country = p.country;
    if (country) countries.add(country);
  });
  
  console.log(`🌍 Found ${countries.size} unique countries`);
  
  const errors: string[] = [];
  let totalSize = 0;
  const level1Results: SitemapGenerationResult[] = [];
  const level2Results: SitemapGenerationResult[] = [];
  const level1IndexEntries: Array<{ loc: string; lastmod: string }> = [];
  const level2IndexEntries: Array<{ loc: string; lastmod: string }> = [];
  const now = new Date().toISOString().split('T')[0];
  
  // Generate Level 1 sitemaps (by language-country) - ALL combinations
  console.log('📝 Generating Level 1 sitemaps (by language-country)...');
  console.log(`   Creating ${LANGUAGE_COUNTRY_COMBINATIONS.length} sitemaps (${LANGUAGES.length} languages × ${COUNTRIES.length} countries)`);
  for (const langCountry of LANGUAGE_COUNTRY_COMBINATIONS) {
    try {
      const sitemapContent = generateLevel1Sitemap(langCountry.code, langCountry.country, providers);
      const filename = getLevel1Filename(langCountry.code, langCountry.country);
      const relativePath = getLevel1Path(langCountry.code, langCountry.country);
      const gzipped = await gzip(Buffer.from(sitemapContent, 'utf-8'));
      totalSize += gzipped.length;
      
      let result: SitemapGenerationResult;
      if (writeToDisk) {
        result = await writeSitemapFile(relativePath, sitemapContent, distDir);
      } else {
        result = {
          filename,
          content: sitemapContent,
          size: gzipped.length,
          path: relativePath,
        };
      }
      
      level1Results.push(result);
      level1IndexEntries.push({
        loc: getSitemapUrl(relativePath),
        lastmod: now,
      });
      
      // Log progress every 100 sitemaps
      if (level1Results.length % 100 === 0) {
        console.log(`  ✓ Progress: ${level1Results.length}/${LANGUAGE_COUNTRY_COMBINATIONS.length} sitemaps`);
      }
    } catch (error) {
      const errorMsg = `Failed to generate Level 1 sitemap for ${langCountry.code}-${langCountry.country}: ${error}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }
  console.log(`✅ Level 1 complete: ${level1Results.length}/${LANGUAGE_COUNTRY_COMBINATIONS.length} sitemaps generated`);
  
  // Generate Level 2 sitemaps (by country)
  console.log('📝 Generating Level 2 sitemaps (by country)...');
  // Use countries from config, but filter to only those that have providers
  const countriesArray = COUNTRIES.filter(country => countries.has(country.toUpperCase()));
  for (let i = 0; i < countriesArray.length; i++) {
    const country = countriesArray[i];
    try {
      const sitemapContent = generateLevel2Sitemap(country, providers);
      const filename = getLevel2Filename(country);
      const relativePath = getLevel2Path(country);
      const gzipped = await gzip(Buffer.from(sitemapContent, 'utf-8'));
      totalSize += gzipped.length;
      
      let result: SitemapGenerationResult;
      if (writeToDisk) {
        result = await writeSitemapFile(relativePath, sitemapContent, distDir);
      } else {
        result = {
          filename,
          content: sitemapContent,
          size: gzipped.length,
          path: relativePath,
        };
      }
      
      level2Results.push(result);
      level2IndexEntries.push({
        loc: getSitemapUrl(relativePath),
        lastmod: now,
      });
      
      // Log progress every 10 countries
      if ((i + 1) % 10 === 0 || i === countriesArray.length - 1) {
        console.log(`  ✓ Progress: ${i + 1}/${countriesArray.length} countries (${(gzipped.length / 1024).toFixed(2)} KB each)`);
      }
    } catch (error) {
      const errorMsg = `Failed to generate Level 2 sitemap for ${country}: ${error}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }
  console.log(`✅ Level 2 complete: ${level2Results.length}/${countriesArray.length} sitemaps generated`);
  
  // Generate Level 3 sitemap index
  console.log('📝 Generating Level 3 sitemap index...');
  let level3Result: SitemapGenerationResult | null = null;
  try {
    const indexContent = generateLevel3SitemapIndex(level1IndexEntries, level2IndexEntries);
    const relativePath = getLevel3Path();
    const gzipped = await gzip(Buffer.from(indexContent, 'utf-8'));
    totalSize += gzipped.length;
    
    if (writeToDisk) {
      level3Result = await writeSitemapFile(relativePath, indexContent, distDir);
    } else {
      level3Result = {
        filename: 'sitemap-index.xml.gz',
        content: indexContent,
        size: gzipped.length,
        path: relativePath,
      };
    }
    
    console.log(`✅ Level 3 complete: ${level3Result.filename} (${(gzipped.length / 1024).toFixed(2)} KB)`);
  } catch (error) {
    const errorMsg = `Failed to generate sitemap index: ${error}`;
    console.error(`❌ ${errorMsg}`);
    errors.push(errorMsg);
  }
  
  // Submit to search engines
  let submissionResults: Array<{ engine: string; success: boolean; error?: string }> | undefined;
  if (submitToSearchEngines && level3Result) {
    console.log('📤 Submitting to search engines...');
    try {
      const results = await submitSitemapToSearchEngines(level3Result.path);
      submissionResults = results.map(r => ({
        engine: r.engine,
        success: r.success,
        error: r.error,
      }));
      
      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Submitted to ${successCount}/${results.length} search engines`);
    } catch (error) {
      const errorMsg = `Failed to submit to search engines: ${error}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }
  
  const duration = Date.now() - startTime;
  const summary: GenerationSummary = {
    level1Count: level1Results.length,
    level2Count: level2Results.length,
    totalFiles: level1Results.length + level2Results.length + (level3Result ? 1 : 0),
    totalSize,
    duration,
    errors: errors.length > 0 ? errors : undefined,
  };
  
  console.log('✅ Sitemap generation complete!');
  console.log(`📊 Summary: ${summary.totalFiles} files, ${(totalSize / 1024 / 1024).toFixed(2)} MB, ${(duration / 1000).toFixed(2)}s`);
  
  if (errors.length > 0) {
    console.warn(`⚠️ Completed with ${errors.length} errors`);
  }
  
  return {
    level1: level1Results,
    level2: level2Results,
    level3: level3Result,
    summary,
    submissionResults,
  };
}

