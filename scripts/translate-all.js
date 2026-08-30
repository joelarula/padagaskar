#!/usr/bin/env node

/**
 * Batch translation script for Logical Fallacies into Estonian wiki
 */

const fs = require('fs');
const path = require('path');

const WIKI_DIR = path.resolve(__dirname, '..', 'wiki', 'loogikavead');
const COPY_JSON_DIR = path.resolve(__dirname, '..', 'copy', 'json');
const CACHE_DIR = path.resolve(__dirname, '..', 'copy', 'translated_json');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Slugify function for Estonian filenames
function slugifyEstonian(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/õ/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function translateText(text) {
  if (!text || typeof text !== 'string' || text.trim() === '') return '';
  
  // Split long texts by double line breaks to keep paragraph structures intact
  const paragraphs = text.split(/\n\n+/);
  const translatedParas = [];

  for (const para of paragraphs) {
    if (!para.trim()) continue;
    try {
      const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=et&dt=t&q=' + encodeURIComponent(para);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const resText = json[0].map(item => item[0]).join('');
      translatedParas.push(resText);
    } catch (err) {
      console.warn(`Translation error for snippet: ${err.message}. Keeping original.`);
      translatedParas.push(para);
    }
    await sleep(80);
  }

  return translatedParas.join('\n\n');
}

async function translateFallacy(data) {
  const cacheFile = path.join(CACHE_DIR, `${data.slug}.json`);
  if (fs.existsSync(cacheFile)) {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
  }

  console.log(`Translating: ${data.title} (${data.slug})...`);

  const titleEE = await translateText(data.title);
  const descEE = await translateText(data.description);
  const logicalFormEE = await translateText(data.logical_form);
  const exceptionsEE = await translateText(data.exceptions);
  const tipsEE = await translateText(data.tips);

  const akaEE = [];
  if (data.also_known_as && data.also_known_as.length > 0) {
    for (const aka of data.also_known_as) {
      const transAka = await translateText(aka);
      akaEE.push(transAka);
    }
  }

  const examplesEE = [];
  if (data.examples && data.examples.length > 0) {
    for (const ex of data.examples) {
      const exTrans = await translateText(ex.example);
      const expTrans = await translateText(ex.explanation);
      examplesEE.push({
        number: ex.number,
        example: exTrans,
        explanation: expTrans,
        original_example: ex.example,
        original_explanation: ex.explanation
      });
    }
  }

  const result = {
    ...data,
    title_et: titleEE,
    description_et: descEE,
    logical_form_et: logicalFormEE,
    exceptions_et: exceptionsEE,
    tips_et: tipsEE,
    also_known_as_et: akaEE,
    examples_et: examplesEE,
    translated_at: new Date().toISOString()
  };

  fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2), 'utf-8');
  return result;
}

function buildWikiMarkdown(data) {
  let md = `---\n`;
  md += `allikad:\n`;
  md += `  - "${data.source_url}"\n`;
  md += `loogikavea_nimi: "${data.title_et.replace(/"/g, '\\"')}"\n`;
  md += `ingliskeelne_nimi: "${data.title.replace(/"/g, '\\"')}"\n`;
  if (data.latin_name) {
    md += `ladinakeelne_nimi: "${data.latin_name.replace(/"/g, '\\"')}"\n`;
  }
  md += `keel: "eesti"\n`;
  md += `---\n\n`;

  md += `# ${data.title_et}\n\n`;

  if (data.latin_name) {
    md += `*${data.latin_name}*\n\n`;
  }

  if (data.also_known_as_et && data.also_known_as_et.length > 0) {
    md += `(tuntud ka kui: ${data.also_known_as_et.join(', ')})\n\n`;
  }

  if (data.also_known_as && data.also_known_as.length > 0) {
    md += `inglise (also known as: ${data.also_known_as.join(', ')})\n\n`;
  }

  if (data.description_et) {
    md += `**Kirjeldus:**\n${data.description_et}\n\n`;
  }

  if (data.logical_form_et) {
    md += `**Loogiline vorm:**\n\n`;
    const lines = data.logical_form_et.split('\n').filter(Boolean);
    for (const line of lines) {
      md += `* ${line.replace(/^[\*\-•]\s*/, '')}\n`;
    }
    md += `\n`;
  }

  if (data.examples_et && data.examples_et.length > 0) {
    data.examples_et.forEach((ex, idx) => {
      md += `**Näide ${ex.number || idx + 1}:**\n\n`;
      md += `> ${ex.example.replace(/\n/g, '\n> ')}\n\n`;
      if (ex.explanation) {
        md += `**Selgitus:** ${ex.explanation}\n\n`;
      }
    });
  }

  if (data.exceptions_et) {
    md += `**Erand:** ${data.exceptions_et}\n\n`;
  }

  if (data.tips_et) {
    md += `**Nipp:** ${data.tips_et}\n\n`;
  }

  if (data.references && data.references.length > 0) {
    md += `**Viited:**\n`;
    for (const ref of data.references) {
      md += `- ${ref.replace(/^[\*\-•]\s*/, '')}\n`;
    }
    md += `\n`;
  }

  return md;
}

async function updateSisukord() {
  const wikiFiles = fs.readdirSync(WIKI_DIR).filter(f => f.endsWith('.md') && f !== 'sisukord.md');
  const items = [];

  for (const f of wikiFiles) {
    const fullPath = path.join(WIKI_DIR, f);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const nameMatch = content.match(/loogikavea_nimi:\s*["']?(.*?)["']?$/m);
    const engMatch = content.match(/ingliskeelne_nimi:\s*["']?(.*?)["']?$/m);
    const title = nameMatch ? nameMatch[1].trim() : f.replace(/\.md$/, '');
    const eng = engMatch ? engMatch[1].trim() : '';
    items.push({ filename: f, title, eng });
  }

  // Sort alphabetically by Estonian title
  items.sort((a, b) => a.title.localeCompare(b.title, 'et'));

  let sisukord = `# Loogikavigade Sisukord\n\nKokku: **${items.length}** loogikaviga\n\n`;
  let currentLetter = '';

  for (const item of items) {
    const letter = item.title[0].toUpperCase();
    if (letter !== currentLetter) {
      currentLetter = letter;
      sisukord += `\n## ${currentLetter}\n\n`;
    }
    sisukord += `- [${item.title}](${item.filename})${item.eng ? ` *(${item.eng})*` : ''}\n`;
  }

  fs.writeFileSync(path.join(WIKI_DIR, 'sisukord.md'), sisukord, 'utf-8');
  console.log(`Updated sisukord.md with ${items.length} fallacies.`);
}

async function main() {
  const copyFiles = fs.readdirSync(COPY_JSON_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${copyFiles.length} fallacies in copy/json/`);

  // Check existing wiki files to avoid overwriting existing translations unless forced
  const existingSources = new Set();
  const wikiFiles = fs.readdirSync(WIKI_DIR).filter(f => f.endsWith('.md') && f !== 'sisukord.md');
  for (const wf of wikiFiles) {
    const content = fs.readFileSync(path.join(WIKI_DIR, wf), 'utf-8');
    const m = content.match(/allika[sd]:\s*[\r\n\s\-]*['"]?(https?:\/\/[^\r\n'"]+)/i);
    if (m) {
      const slug = m[1].split('/').pop().replace(/\.html$/, '').toLowerCase();
      existingSources.add(slug);
    }
  }

  let count = 0;
  for (let i = 0; i < copyFiles.length; i++) {
    const cf = copyFiles[i];
    const data = JSON.parse(fs.readFileSync(path.join(COPY_JSON_DIR, cf), 'utf-8'));
    const slug = data.slug.toLowerCase().replace(/\.html$/, '');

    if (existingSources.has(slug)) {
      continue; // Skip already translated files
    }

    count++;
    console.log(`[${count}] Translating ${data.title} (${data.slug})...`);
    const translated = await translateFallacy(data);

    const filename = `${slugifyEstonian(translated.title_et || data.slug)}.md`;
    let targetPath = path.join(WIKI_DIR, filename);

    // If filename collides, append slug
    if (fs.existsSync(targetPath)) {
      targetPath = path.join(WIKI_DIR, `${slugifyEstonian(translated.title_et)}-${slugifyEstonian(data.slug)}.md`);
    }

    const md = buildWikiMarkdown(translated);
    fs.writeFileSync(targetPath, md, 'utf-8');
    existingSources.add(slug);
  }

  console.log(`\nAll translations complete! Newly created: ${count}`);
  await updateSisukord();
}

main().catch(err => {
  console.error('Fatal error during translation:', err);
  process.exit(1);
});
