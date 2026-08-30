/**
 * Article Extractor Module for MCP Server
 * Fetches and extracts clean article text, metadata, paragraphs, and speakers from web URLs.
 */

export async function extractArticle(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'et,en-US;q=0.9,en;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // 1. Extract Title
    let title = '';
    const ogTitle = /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i.exec(html)
      || /<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i.exec(html);
    if (ogTitle) {
      title = decodeHtmlEntities(ogTitle[1]);
    } else {
      const titleTag = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
      title = titleTag ? decodeHtmlEntities(titleTag[1].split('|')[0].trim()) : '';
    }

    // 2. Extract Lead / Description
    let lead = '';
    const ogDesc = /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i.exec(html)
      || /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i.exec(html);
    if (ogDesc) {
      lead = decodeHtmlEntities(ogDesc[1]);
    }

    // 3. Extract Author / Publisher / Date
    let author = '';
    const authorMeta = /<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i.exec(html);
    if (authorMeta) author = decodeHtmlEntities(authorMeta[1]);

    let publishedTime = '';
    const dateMeta = /<meta\s+property=["']article:published_time["']\s+content=["']([^"']+)["']/i.exec(html);
    if (dateMeta) publishedTime = dateMeta[1];

    // 4. Extract Main Article Body
    // Remove scripts, styles, navs, headers, footers, and cookie banners
    const cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '');

    const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    const paragraphs = [];
    let match;

    while ((match = pRegex.exec(cleanHtml)) !== null) {
      const rawText = match[1]
        .replace(/<[^>]+>/g, '')
        .trim();
      
      const clean = decodeHtmlEntities(rawText);

      // Filter out cookie warnings, navigation links, and short snippets
      if (
        clean.length > 25 &&
        !clean.includes('{{') &&
        !clean.includes('küpsiste') &&
        !clean.includes('Laadi alla uus') &&
        !clean.includes('vaata otse')
      ) {
        paragraphs.push(clean);
      }
    }

    const fullText = paragraphs.join('\n\n');
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    return {
      success: true,
      url,
      title,
      lead,
      author: author || null,
      published_time: publishedTime || null,
      paragraphs,
      text: fullText,
      word_count: wordCount
    };
  } catch (error) {
    return {
      success: false,
      url,
      error: error.message
    };
  }
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&auml;/gi, 'ä')
    .replace(/&ouml;/gi, 'ö')
    .replace(/&uuml;/gi, 'ü')
    .replace(/&otilde;/gi, 'õ')
    .replace(/&Auml;/gi, 'Ä')
    .replace(/&Ouml;/gi, 'Ö')
    .replace(/&Uuml;/gi, 'Ü')
    .replace(/&Otilde;/gi, 'Õ')
    .replace(/&scaron;/gi, 'š')
    .replace(/&Scaron;/gi, 'Š')
    .replace(/&zcaron;/gi, 'ž')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .trim();
}
