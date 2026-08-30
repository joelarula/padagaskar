/**
 * Parser for logicallyfallacious.com fallacy pages
 */

function decodeHtmlEntities(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8212;/g, "—")
    .replace(/&#8211;/g, "–")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function cleanText(html) {
  if (!html) return '';
  let str = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '* ')
    .replace(/<i[^>]*>(.*?)<\/i>/gis, '*$1*')
    .replace(/<em[^>]*>(.*?)<\/em>/gis, '*$1*')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gis, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gis, '**$1**')
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gis, '[$2]($1)')
    .replace(/<[^>]+>/g, '');

  str = decodeHtmlEntities(str);
  // Normalize whitespace while preserving linebreaks
  str = str.split('\n').map(line => line.trim()).join('\n');
  str = str.replace(/\n{3,}/g, '\n\n');
  return str.trim();
}

/**
 * Extracts list of fallacies from the search/index page HTML
 */
function parseIndexPage(html) {
  const fallacies = [];
  const itemRegex = /<div class="[^"]*fallacy-item[^"]*"[^>]*data-letter="([^"]*)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
  
  let match;
  while ((match = itemRegex.exec(html)) !== null) {
    const letter = match[1];
    const block = match[2];

    const titleMatch = /<h3[^>]*class="[^"]*fallacy-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/i.exec(block);
    const descMatch = /<p[^>]*class="[^"]*fallacy-description[^"]*"[^>]*>([\s\S]*?)<\/p>/i.exec(block);

    if (titleMatch) {
      const urlPath = titleMatch[1].trim();
      const name = decodeHtmlEntities(titleMatch[2].replace(/<[^>]+>/g, '').trim());
      const description = descMatch ? decodeHtmlEntities(descMatch[1].replace(/<[^>]+>/g, '').trim()) : '';
      const slug = urlPath.replace(/^\/logicalfallacies\//, '').replace(/^\/fallacies\//, '').replace(/^\//, '');

      fallacies.push({
        letter,
        name,
        slug,
        url: urlPath.startsWith('http') ? urlPath : `https://www.logicallyfallacious.com${urlPath}`,
        description
      });
    }
  }

  // Fallback pattern if cards format differs slightly
  if (fallacies.length === 0) {
    const fallbackRegex = /<a[^>]*href="(\/logicalfallacies\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let fbMatch;
    const seen = new Set();
    while ((fbMatch = fallbackRegex.exec(html)) !== null) {
      const urlPath = fbMatch[1];
      const name = decodeHtmlEntities(fbMatch[2].trim());
      const slug = urlPath.replace(/^\/logicalfallacies\//, '');
      if (!seen.has(slug) && slug && name) {
        seen.add(slug);
        fallacies.push({
          letter: name[0].toUpperCase(),
          name,
          slug,
          url: `https://www.logicallyfallacious.com${urlPath}`,
          description: ''
        });
      }
    }
  }

  return fallacies;
}

/**
 * Extracts structured data from a single fallacy page
 */
function parseFallacyPage(html, url) {
  const data = {
    source_url: url,
    title: '',
    latin_name: '',
    also_known_as: [],
    description: '',
    logical_form: '',
    examples: [],
    exceptions: '',
    tips: '',
    references: [],
    image_url: ''
  };

  // Extract title
  const titleMatch = /<h1[^>]*class="[^"]*text-danger[^"]*"[^>]*>([\s\S]*?)<\/h1>/i.exec(html) ||
                     /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (titleMatch) {
    data.title = decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '').trim());
  }

  // Extract main article container (under the h1 in card-body)
  const cardBodyMatch = /<div class="card-body">\s*<h1[^>]*>[\s\S]*?<\/h1>\s*<div>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div class="col-lg-4">/i.exec(html) ||
                        /<div class="card-body">\s*<h1[^>]*>[\s\S]*?<\/h1>\s*<div>([\s\S]*?)<\/div>\s*<\/div>/i.exec(html);

  const contentHtml = cardBodyMatch ? cardBodyMatch[1] : html;

  // Extract Latin name
  const latinMatch = /<p[^>]*class="uk-text-large"[^>]*>([\s\S]*?)<\/p>/i.exec(contentHtml);
  if (latinMatch) {
    data.latin_name = decodeHtmlEntities(latinMatch[1].replace(/<[^>]+>/g, '').trim());
  }

  // Extract Also Known As
  const akaMatch = /<p[^>]*>\s*\(also known as:\s*([\s\S]*?)\)\s*<\/p>/i.exec(contentHtml);
  if (akaMatch) {
    const rawAka = akaMatch[1].replace(/<[^>]+>/g, '');
    data.also_known_as = decodeHtmlEntities(rawAka)
      .split(/,\s*|\n/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  // Extract Image URL
  const imgMatch = /<img[^>]*src="([^"]*fallacy-images\/[^"]+)"/i.exec(contentHtml);
  if (imgMatch) {
    const src = imgMatch[1];
    data.image_url = src.startsWith('http') ? src : `https://www.logicallyfallacious.com${src}`;
  }

  // Helper to extract text between a header and the next header/marker
  function extractBetween(startRegex, endRegex) {
    const startMatch = startRegex.exec(contentHtml);
    if (!startMatch) return '';
    const startIndex = startMatch.index + startMatch[0].length;
    const rest = contentHtml.slice(startIndex);
    const endMatch = endRegex.exec(rest);
    const raw = endMatch ? rest.slice(0, endMatch.index) : rest;
    return cleanText(raw);
  }

  // Extract Description
  data.description = extractBetween(
    /<strong>Description:<\/strong>/i,
    /(?:<p[^>]*>)?<strong>(?:Logical Form|Example|Exception|Tip|Reference)/i
  );

  // Extract Logical Form
  data.logical_form = extractBetween(
    /<strong>Logical Form:<\/strong>/i,
    /(?:<p[^>]*>)?<strong>(?:Example|Exception|Tip|Reference)/i
  );

  // Extract Examples and Explanations
  const exampleRegex = /<strong>Example\s*(?:#\s*(\d+))?:?\s*<\/strong>([\s\S]*?)<strong>Explanation:?\s*<\/strong>\s*([\s\S]*?)(?=(?:(?:<p[^>]*>)?<strong>(?:Example|Exception|Tip|Reference)|<img|<i>Questions about|$))/gi;
  
  let exMatch;
  while ((exMatch = exampleRegex.exec(contentHtml)) !== null) {
    const num = exMatch[1] ? parseInt(exMatch[1], 10) : data.examples.length + 1;
    const exampleRaw = exMatch[2];
    const explanationRaw = exMatch[3];

    data.examples.push({
      number: num,
      example: cleanText(exampleRaw),
      explanation: cleanText(explanationRaw)
    });
  }

  // Extract Exceptions
  data.exceptions = extractBetween(
    /<strong>Exception(?:s)?:?\s*<\/strong>/i,
    /(?:<p[^>]*>)?<strong>(?:Tip|Reference)|<img|<i>Questions/i
  );

  // Extract Tip
  data.tips = extractBetween(
    /<strong>Tip:?\s*<\/strong>/i,
    /(?:<p[^>]*>)?<strong>(?:Reference)|<img|<i>Questions/i
  );

  // Extract References
  const refText = extractBetween(
    /<strong>References?:?\s*<\/strong>/i,
    /<img|<i>Questions|$|class="site-footer"/i
  );
  if (refText) {
    data.references = refText
      .split('\n')
      .map(r => r.replace(/^[\*\-•\s]+|[\*\-•\s]+$/g, '').trim())
      .filter(r => r.length > 2);
  }

  return data;
}

/**
 * Converts structured fallacy object to standardized Markdown format
 */
function fallacyToMarkdown(data) {
  let md = `---\nsource: "${data.source_url}"\nenglish_name: "${data.title.replace(/"/g, '\\"')}"\n`;
  if (data.latin_name) {
    md += `latin_name: "${data.latin_name.replace(/"/g, '\\"')}"\n`;
  }
  if (data.also_known_as && data.also_known_as.length > 0) {
    md += `also_known_as:\n`;
    for (const aka of data.also_known_as) {
      md += `  - "${aka.replace(/"/g, '\\"')}"\n`;
    }
  }
  md += `status: "pending_translation"\n---\n\n`;

  md += `# ${data.title}\n\n`;

  if (data.latin_name) {
    md += `*${data.latin_name}*\n\n`;
  }

  if (data.also_known_as && data.also_known_as.length > 0) {
    md += `(also known as: ${data.also_known_as.join(', ')})\n\n`;
  }

  if (data.description) {
    md += `**Description:**\n\n${data.description}\n\n`;
  }

  if (data.logical_form) {
    md += `**Logical Form:**\n\n`;
    const formLines = data.logical_form.split('\n').filter(Boolean);
    for (const line of formLines) {
      md += `* ${line.replace(/^[\*\-•]\s*/, '')}\n`;
    }
    md += `\n`;
  }

  if (data.examples && data.examples.length > 0) {
    data.examples.forEach((ex, idx) => {
      md += `**Example #${ex.number || idx + 1}:**\n\n`;
      md += `> ${ex.example.replace(/\n/g, '\n> ')}\n\n`;
      if (ex.explanation) {
        md += `**Explanation:** ${ex.explanation}\n\n`;
      }
    });
  }

  if (data.exceptions) {
    md += `**Exception:** ${data.exceptions}\n\n`;
  }

  if (data.tips) {
    md += `**Tip:** ${data.tips}\n\n`;
  }

  if (data.image_url) {
    md += `![${data.title} illustration](${data.image_url})\n\n`;
  }

  if (data.references && data.references.length > 0) {
    md += `**References:**\n\n`;
    for (const ref of data.references) {
      md += `- ${ref.replace(/^\-\s*/, '')}\n`;
    }
    md += `\n`;
  }

  return md;
}

module.exports = {
  parseIndexPage,
  parseFallacyPage,
  fallacyToMarkdown,
  cleanText
};
