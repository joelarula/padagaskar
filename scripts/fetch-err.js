import fs from 'fs';

async function main() {
  const res = await fetch('https://www.err.ee/1610123587/laanemets-reinsalu-puuab-teha-ekreike-valitsust-olles-ise-koige-ummargusem-poliitik', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const html = await res.text();
  
  // Extract body paragraphs
  const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs = [];
  let m;
  while ((m = pRegex.exec(html)) !== null) {
    const clean = m[1].replace(/<[^>]+>/g, '').trim();
    if (clean.length > 20) {
      paragraphs.push(clean);
    }
  }

  console.log('=== ARTICLE EXTRACT ===');
  console.log(paragraphs.join('\n\n'));
}

main();
