const fs = require('fs');
const path = require('path');

const WIKI_DIR = path.resolve(__dirname, '..', 'wiki', 'loogikavead');
const COPY_DIR = path.resolve(__dirname, '..', 'copy', 'json');

const wikiFiles = fs.readdirSync(WIKI_DIR).filter(f => f.endsWith('.md') && f !== 'sisukord.md');
const copyFiles = fs.readdirSync(COPY_DIR).filter(f => f.endsWith('.json'));

const wikiSources = new Set();
for (const wf of wikiFiles) {
  const content = fs.readFileSync(path.join(WIKI_DIR, wf), 'utf-8');
  const m = content.match(/allika[sd]:\s*[\r\n\s\-]*['"]?(https?:\/\/[^\r\n'"]+)/i);
  if (m) {
    const slug = m[1].split('/').pop().replace(/\.html$/, '').toLowerCase();
    wikiSources.add(slug);
  }
}

const missing = [];
for (const cf of copyFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(COPY_DIR, cf), 'utf-8'));
  const slug = data.slug.toLowerCase().replace(/\.html$/, '');
  if (!wikiSources.has(slug)) {
    missing.push(data);
  }
}

console.log('Total copy items:', copyFiles.length);
console.log('Translated in wiki:', wikiSources.size);
console.log('Missing to translate:', missing.length);

fs.writeFileSync(path.resolve(__dirname, '..', 'copy', 'missing_fallacies.json'), JSON.stringify(missing, null, 2));
