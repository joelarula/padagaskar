#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const WIKI_DIR = path.resolve(__dirname, '..', 'wiki', 'loogikavead');
const COPY_JSON_DIR = path.resolve(__dirname, '..', 'copy', 'json');

function extractFrontmatter(content) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (!match) return { frontmatter: {}, body: content };
  const rawFm = match[1];
  const body = content.slice(match[0].length);

  const fm = {};
  const lines = rawFm.split('\n');
  let currentKey = null;
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    if (line.startsWith('- ') && currentKey) {
      if (!Array.isArray(fm[currentKey])) fm[currentKey] = [];
      fm[currentKey].push(line.replace(/^-\s*["']?|["']?$/g, '').trim());
    } else {
      const kvMatch = /^([a-zA-Z0-9_\-]+):\s*(.*)$/.exec(line);
      if (kvMatch) {
        currentKey = kvMatch[1];
        let val = kvMatch[2].trim().replace(/^["']|["']$/g, '');
        fm[currentKey] = val;
      }
    }
  }
  return { frontmatter: fm, body };
}

function countExamplesInWiki(body) {
  const matches = body.match(/(?:###\s*Näide(?:\s*#?\s*\d*)?|\*\*(?:Näide|Näide\s*#?\d*|Näide\s*\d+):?\*\*)/gi);
  return matches ? matches.length : 0;
}

function hasSection(body, nameRegex) {
  return nameRegex.test(body);
}

function runAudit() {
  const wikiFiles = fs.readdirSync(WIKI_DIR).filter(f => f.endsWith('.md') && f !== 'sisukord.md');
  const copyFiles = fs.readdirSync(COPY_JSON_DIR).filter(f => f.endsWith('.json'));

  // Build lookup of copy files by slug, url, and title
  const copyData = [];
  const copyBySlug = new Map();
  const copyByUrl = new Map();
  const copyByName = new Map();

  for (const cf of copyFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(COPY_JSON_DIR, cf), 'utf-8'));
    copyData.push(data);
    copyBySlug.set(data.slug.toLowerCase(), data);
    copyByUrl.set(data.source_url.toLowerCase(), data);
    copyByName.set(data.title.toLowerCase(), data);
  }

  const reports = [];
  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const wf of wikiFiles) {
    const fullPath = path.join(WIKI_DIR, wf);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const { frontmatter, body } = extractFrontmatter(content);

    // Try finding matching original
    let match = null;
    const sourceLinks = frontmatter.allikad || frontmatter.allikas;
    if (sourceLinks) {
      const urls = Array.isArray(sourceLinks) ? sourceLinks : [sourceLinks];
      for (const u of urls) {
        const cleaned = u.trim().toLowerCase();
        if (copyByUrl.has(cleaned)) {
          match = copyByUrl.get(cleaned);
          break;
        }
        const slug = cleaned.split('/').pop().replace(/\.html$/, '');
        if (copyBySlug.has(slug)) {
          match = copyBySlug.get(slug);
          break;
        }
      }
    }

    if (!match && frontmatter.ingliskeelne_nimi) {
      const eng = frontmatter.ingliskeelne_nimi.toLowerCase();
      if (copyByName.has(eng)) {
        match = copyByName.get(eng);
      } else if (copyBySlug.has(eng.replace(/\s+/g, '-'))) {
        match = copyBySlug.get(eng.replace(/\s+/g, '-'));
      }
    }

    // Try finding by Estonian filename or fallback
    if (!match) {
      for (const cf of copyData) {
        if (content.toLowerCase().includes(cf.title.toLowerCase()) || content.toLowerCase().includes(cf.slug.toLowerCase())) {
          match = cf;
          break;
        }
      }
    }

    if (!match) {
      unmatchedCount++;
      reports.push({
        file: wf,
        status: 'UNMATCHED_SOURCE',
        details: `Source not found for allikad: ${JSON.stringify(frontmatter.allikad || frontmatter.allikas)} or name: ${frontmatter.ingliskeelne_nimi}`
      });
      continue;
    }

    matchedCount++;
    const wikiExamplesCount = countExamplesInWiki(body);
    const originalExamplesCount = match.examples ? match.examples.length : 0;

    const hasLogicalFormWiki = hasSection(body, /(?:###\s*Loogiline\s*vorm|\*\*Loogiline\s*vorm:?\*\*)/i);
    const hasLogicalFormOrig = !!match.logical_form;

    const hasExceptionWiki = hasSection(body, /(?:###\s*Erand|\*\*Erand:?\*\*)/i);
    const hasExceptionOrig = !!match.exceptions;

    const hasTipWiki = hasSection(body, /(?:###\s*(?:Nipp|Nõuanne|Soovitus)|\*\*(?:Nipp|Nõuanne|Soovitus):?\*\*)/i);
    const hasTipOrig = !!match.tips;

    const hasReferencesWiki = hasSection(body, /(?:###\s*Viited|\*\*Viited:?\*\*)/i);
    const hasReferencesOrig = match.references && match.references.length > 0;

    const issues = [];
    if (wikiExamplesCount < originalExamplesCount) {
      issues.push(`MISSING_EXAMPLES (Wiki has ${wikiExamplesCount}, Original has ${originalExamplesCount})`);
    } else if (wikiExamplesCount > originalExamplesCount) {
      issues.push(`EXTRA_EXAMPLES (Wiki has ${wikiExamplesCount}, Original has ${originalExamplesCount})`);
    }

    if (!hasLogicalFormWiki && hasLogicalFormOrig) {
      issues.push(`MISSING_LOGICAL_FORM`);
    }
    if (!hasExceptionWiki && hasExceptionOrig) {
      issues.push(`MISSING_EXCEPTION`);
    }
    if (!hasTipWiki && hasTipOrig) {
      issues.push(`MISSING_TIP`);
    }
    if (!hasReferencesWiki && hasReferencesOrig) {
      issues.push(`MISSING_REFERENCES`);
    }

    reports.push({
      file: wf,
      title_ee: frontmatter.loogikavea_nimi || wf,
      title_en: match.title,
      slug: match.slug,
      status: issues.length === 0 ? 'FAITHFUL' : 'DIFFERENCES_FOUND',
      wikiExamplesCount,
      originalExamplesCount,
      issues
    });
  }

  console.log(`\n=== AUDIT SUMMARY ===`);
  console.log(`Total Wiki files audited: ${wikiFiles.length}`);
  console.log(`Matched to original: ${matchedCount}`);
  console.log(`Unmatched: ${unmatchedCount}`);

  const faithful = reports.filter(r => r.status === 'FAITHFUL');
  const withIssues = reports.filter(r => r.status === 'DIFFERENCES_FOUND');
  const unmatched = reports.filter(r => r.status === 'UNMATCHED_SOURCE');

  console.log(`Faithful (exact example & section parity): ${faithful.length}`);
  console.log(`Files with differences/omissions: ${withIssues.length}`);
  console.log(`Files with unmatched source link: ${unmatched.length}`);

  if (withIssues.length > 0) {
    console.log(`\n--- FILES WITH DIFFERENCES / OMISSIONS ---`);
    for (const item of withIssues) {
      console.log(`\n📄 [${item.file}] (${item.title_en}):`);
      for (const iss of item.issues) {
        console.log(`   ⚠️  ${iss}`);
      }
    }
  }

  if (unmatched.length > 0) {
    console.log(`\n--- UNMATCHED FILES ---`);
    for (const item of unmatched) {
      console.log(`   ❓ ${item.file}: ${item.details}`);
    }
  }

  // Save audit report to JSON
  fs.writeFileSync(path.resolve(__dirname, '..', 'copy', 'audit_report.json'), JSON.stringify(reports, null, 2), 'utf-8');
}

runAudit();
