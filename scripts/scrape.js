#!/usr/bin/env node

/**
 * Scraper for logicallyfallacious.com
 * Extracts full fallacy catalog into local copy/ folder for translation.
 */

const fs = require('fs');
const path = require('path');
const { parseIndexPage, parseFallacyPage, fallacyToMarkdown } = require('./parser');

const BASE_URL = 'https://www.logicallyfallacious.com';
const INDEX_URL = `${BASE_URL}/logicalfallacies/search`;

const COPY_DIR = path.resolve(__dirname, '..', 'copy');
const JSON_DIR = path.join(COPY_DIR, 'json');
const MD_DIR = path.join(COPY_DIR, 'md');
const HTML_DIR = path.join(COPY_DIR, 'raw_html');

function ensureDirs() {
  [COPY_DIR, JSON_DIR, MD_DIR, HTML_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 3, backoff = 1000) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
      }
      return await response.text();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`[Retry ${i + 1}/${retries}] Failed to fetch ${url}: ${err.message}. Retrying in ${backoff}ms...`);
      await sleep(backoff);
      backoff *= 2;
    }
  }
}

async function scrapeIndex(force = false) {
  ensureDirs();
  const indexPath = path.join(COPY_DIR, 'index.json');
  const indexMdPath = path.join(COPY_DIR, 'index.md');

  if (!force && fs.existsSync(indexPath)) {
    console.log(`Using cached index from ${indexPath}`);
    return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  }

  console.log(`Fetching fallacies index from ${INDEX_URL}...`);
  const html = await fetchWithRetry(INDEX_URL);
  fs.writeFileSync(path.join(HTML_DIR, '_index.html'), html, 'utf-8');

  const items = parseIndexPage(html);
  console.log(`Parsed ${items.length} fallacies from index page.`);

  fs.writeFileSync(indexPath, JSON.stringify(items, null, 2), 'utf-8');

  // Also write a friendly Markdown index
  let mdContent = `# Logical Fallacies Catalog (logicallyfallacious.com)\n\nTotal: **${items.length}** fallacies\n\n`;
  
  let currentLetter = '';
  for (const item of items) {
    if (item.letter !== currentLetter) {
      currentLetter = item.letter;
      mdContent += `\n## ${currentLetter}\n\n`;
    }
    mdContent += `- [${item.name}](md/${item.slug}.md) — *${item.description || item.slug}*\n`;
  }

  fs.writeFileSync(indexMdPath, mdContent, 'utf-8');
  console.log(`Saved index to:\n  - ${indexPath}\n  - ${indexMdPath}`);

  return items;
}

async function scrapeFallacy(item, options = {}) {
  ensureDirs();
  const { force = false, delay = 350 } = options;
  const jsonPath = path.join(JSON_DIR, `${item.slug}.json`);
  const mdPath = path.join(MD_DIR, `${item.slug}.md`);
  const rawHtmlPath = path.join(HTML_DIR, `${item.slug}.html`);

  if (!force && fs.existsSync(jsonPath) && fs.existsSync(mdPath)) {
    return { skipped: true, slug: item.slug, name: item.name };
  }

  const url = item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`;
  const html = await fetchWithRetry(url);
  fs.writeFileSync(rawHtmlPath, html, 'utf-8');

  const parsed = parseFallacyPage(html, url);
  if (!parsed.title) {
    parsed.title = item.name;
  }
  parsed.slug = item.slug;
  parsed.letter = item.letter;

  fs.writeFileSync(jsonPath, JSON.stringify(parsed, null, 2), 'utf-8');

  const md = fallacyToMarkdown(parsed);
  fs.writeFileSync(mdPath, md, 'utf-8');

  if (delay > 0) {
    await sleep(delay);
  }

  return { skipped: false, slug: item.slug, name: parsed.title };
}

async function scrapeAll(options = {}) {
  const { force = false, delay = 350 } = options;
  const index = await scrapeIndex(force);
  console.log(`Starting scrape of ${index.length} fallacies (delay: ${delay}ms)...`);

  let completed = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < index.length; i++) {
    const item = index[i];
    const progress = `[${i + 1}/${index.length}]`;
    try {
      const result = await scrapeFallacy(item, { force, delay });
      if (result.skipped) {
        skipped++;
        // Print progress periodically for skipped items
        if ((i + 1) % 25 === 0 || i === index.length - 1) {
          console.log(`${progress} Checked ${i + 1}/${index.length} (${skipped} cached, ${completed} new)`);
        }
      } else {
        completed++;
        console.log(`${progress} Scraped: ${result.name} (${result.slug})`);
      }
    } catch (err) {
      failed++;
      console.error(`${progress} ERROR scraping ${item.name} (${item.slug}): ${err.message}`);
      errors.push({ slug: item.slug, name: item.name, error: err.message });
    }
  }

  // Generate manifest
  const manifest = {
    scraped_at: new Date().toISOString(),
    total_index: index.length,
    scraped_new: completed,
    cached: skipped,
    failed: failed,
    errors
  };
  fs.writeFileSync(path.join(COPY_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  console.log('\n========================================');
  console.log(`Scraping Summary:`);
  console.log(`Total: ${index.length}`);
  console.log(`New Scraped: ${completed}`);
  console.log(`Cached/Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Manifest saved to ${path.join(COPY_DIR, 'manifest.json')}`);
  console.log('========================================\n');
}

async function main() {
  const args = process.argv.slice(2);
  const isIndexOnly = args.includes('--index-only');
  const isAll = args.includes('--all');
  const force = args.includes('--force');
  const slugIdx = args.indexOf('--slug');
  const delayIdx = args.indexOf('--delay');
  const delay = delayIdx !== -1 && args[delayIdx + 1] ? parseInt(args[delayIdx + 1], 10) : 350;

  if (isIndexOnly) {
    await scrapeIndex(force);
  } else if (slugIdx !== -1 && args[slugIdx + 1]) {
    const slug = args[slugIdx + 1];
    const item = {
      slug,
      name: slug,
      url: `${BASE_URL}/logicalfallacies/${slug}`,
      letter: slug[0].toUpperCase()
    };
    console.log(`Scraping single fallacy: ${slug}...`);
    const res = await scrapeFallacy(item, { force, delay: 0 });
    console.log(`Done: ${JSON.stringify(res, null, 2)}`);
  } else if (isAll || args.length === 0) {
    await scrapeAll({ force, delay });
  } else {
    console.log(`Usage:
  node scripts/scrape.js --index-only        # Scrape fallacy list index
  node scripts/scrape.js --all               # Scrape all fallacies (resumable)
  node scripts/scrape.js --slug <slug>       # Scrape a specific fallacy
  node scripts/scrape.js --all --force       # Force re-download all
  node scripts/scrape.js --all --delay 500   # Custom delay in ms (default: 350)
`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
