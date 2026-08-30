#!/usr/bin/env node

/**
 * Model Context Protocol (MCP) Server for Logical Fallacies
 * Grounded data retrieval server for logical fallacies: index, logical forms, summaries, full info & backlinks.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { FallacyDatabase } from './db.js';
import { extractArticle } from './extractor.js';

const db = new FallacyDatabase();

const server = new McpServer({
  name: 'logical-fallacies-server',
  version: '1.0.0'
});

// ==========================================
// 1. MCP TOOLS (DATA RETRIEVAL & ARTICLE EXTRACTION)
// ==========================================

// Tool: extract_article
server.tool(
  'extract_article',
  'Scrape and extract clean text, lead paragraph, metadata, and body paragraphs from any online news article, speech, or debate transcript URL.',
  {
    url: z.string().url().describe('The web URL of the article, op-ed, or debate transcript to extract')
  },
  async ({ url }) => {
    const result = await extractArticle(url);
    if (!result.success) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to extract article from "${url}": ${result.error}`
          }
        ]
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);


// Tool: get_fallacy_index
server.tool(
  'get_fallacy_index',
  'Get the complete index of all 238 logical fallacies with short summaries, Latin names, and local wiki / online backlinks.',
  {
    lang: z.enum(['both', 'et', 'en']).default('both').describe('Language preference for summaries: "both", "et", or "en"')
  },
  async ({ lang }) => {
    const index = db.getIndex(lang);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            total_fallacies: index.length,
            index
          }, null, 2)
        }
      ]
    };
  }
);

// Tool: list_logical_forms
server.tool(
  'list_logical_forms',
  'List all canonical Logical Forms across the database with titles, formal structures, and backlinks to wiki and source material.',
  {
    lang: z.enum(['both', 'et', 'en']).default('both').describe('Language preference: "both", "et", or "en"')
  },
  async ({ lang }) => {
    const forms = db.getLogicalForms(lang);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            total_logical_forms: forms.length,
            logical_forms: forms
          }, null, 2)
        }
      ]
    };
  }
);

// Tool: search_fallacies
server.tool(
  'search_fallacies',
  'Search logical fallacies by keyword, Estonian/English/Latin names, or description. Returns concise summaries and backlinks.',
  {
    query: z.string().describe('Search term (e.g. "ad hominem", "rõhuasetus", "circular reasoning", "authority")'),
    lang: z.enum(['auto', 'et', 'en']).default('auto').describe('Language preference: "et", "en", or "auto"'),
    limit: z.number().min(1).max(50).default(10).describe('Maximum number of search results to return')
  },
  async ({ query, lang, limit }) => {
    const results = db.search(query, lang, limit);
    const formatted = results.map(f => {
      const summaryEn = f.description_en ? f.description_en.split(/\n\n|\.\s+/)[0].trim() + '.' : '';
      const summaryEt = f.description_et ? f.description_et.split(/\n\n|\.\s+/)[0].trim() + '.' : '';

      return {
        slug: f.slug,
        title_et: f.title_et,
        title_en: f.title_en,
        latin_name: f.latin_name || null,
        aliases: lang === 'en' ? f.also_known_as_en : f.also_known_as_et,
        summary: lang === 'en' ? summaryEn : (lang === 'et' ? summaryEt : { en: summaryEn, et: summaryEt }),
        logical_form: lang === 'en' ? f.logical_form_en : (f.logical_form_et || f.logical_form_en),
        backlinks: {
          wiki_file: f.wiki_file ? `wiki/loogikavead/${f.wiki_file}` : null,
          source_url: f.source_url
        }
      };
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query,
            total_matches: formatted.length,
            results: formatted
          }, null, 2)
        }
      ]
    };
  }
);

// Tool: get_fallacy
server.tool(
  'get_fallacy',
  'Get full structured information for a specific fallacy (complete description, logical form, numbered examples with explanations, exceptions, tips, academic citations, and backlinks).',
  {
    identifier: z.string().describe('Slug or title of the fallacy (e.g. "Strawman-Fallacy", "Ad-Hominem-Abusive", "olgitulba-eksitus")'),
    lang: z.enum(['both', 'et', 'en']).default('both').describe('Language preference: "both", "et", or "en"')
  },
  async ({ identifier, lang }) => {
    const item = db.getBySlugOrName(identifier);
    if (!item) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Fallacy "${identifier}" not found in database.`
          }
        ]
      };
    }

    let payload;
    if (lang === 'et') {
      payload = {
        title: item.title_et,
        title_original: item.title_en,
        latin_name: item.latin_name || null,
        aliases: item.also_known_as_et,
        description: item.description_et || item.description_en,
        logical_form: item.logical_form_et || item.logical_form_en,
        examples: item.examples_et.length > 0 ? item.examples_et : item.examples_en,
        exceptions: item.exceptions_et || item.exceptions_en,
        tips: item.tips_et || item.tips_en,
        references: item.references,
        backlinks: {
          wiki_file: item.wiki_file ? `wiki/loogikavead/${item.wiki_file}` : null,
          source_url: item.source_url
        }
      };
    } else if (lang === 'en') {
      payload = {
        title: item.title_en,
        latin_name: item.latin_name || null,
        aliases: item.also_known_as_en,
        description: item.description_en,
        logical_form: item.logical_form_en,
        examples: item.examples_en,
        exceptions: item.exceptions_en,
        tips: item.tips_en,
        references: item.references,
        backlinks: {
          wiki_file: item.wiki_file ? `wiki/loogikavead/${item.wiki_file}` : null,
          source_url: item.source_url
        }
      };
    } else {
      payload = {
        slug: item.slug,
        title_en: item.title_en,
        title_et: item.title_et,
        latin_name: item.latin_name || null,
        aliases_en: item.also_known_as_en,
        aliases_et: item.also_known_as_et,
        description_en: item.description_en,
        description_et: item.description_et,
        logical_form_en: item.logical_form_en,
        logical_form_et: item.logical_form_et,
        examples_en: item.examples_en,
        examples_et: item.examples_et,
        exceptions_en: item.exceptions_en,
        exceptions_et: item.exceptions_et,
        tips_en: item.tips_en,
        tips_et: item.tips_et,
        references: item.references,
        image_url: item.image_url || null,
        backlinks: {
          wiki_file: item.wiki_file ? `wiki/loogikavead/${item.wiki_file}` : null,
          source_url: item.source_url
        }
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(payload, null, 2)
        }
      ]
    };
  }
);

// ==========================================
// 2. MCP RESOURCES
// ==========================================

// Resource: fallacy://index
server.resource(
  'index',
  'fallacy://index',
  async (uri) => {
    const index = db.getIndex('both');
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(index, null, 2)
        }
      ]
    };
  }
);

// Resource: fallacy://logical-forms
server.resource(
  'logical-forms',
  'fallacy://logical-forms',
  async (uri) => {
    const forms = db.getLogicalForms('both');
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(forms, null, 2)
        }
      ]
    };
  }
);

// Resource: fallacy://item/{slug}
server.resource(
  'item',
  'fallacy://item/{slug}',
  async (uri, { slug }) => {
    const item = db.getBySlugOrName(slug);
    if (!item) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: `Fallacy not found: ${slug}` })
          }
        ]
      };
    }

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(item, null, 2)
        }
      ]
    };
  }
);

// ==========================================
// START SERVER
// ==========================================

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Logical Fallacies MCP Server running on stdio (Data Search & Retrieval API)');
}

run().catch((err) => {
  console.error('Fatal error running MCP server:', err);
  process.exit(1);
});
