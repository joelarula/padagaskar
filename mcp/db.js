import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'fallacies.db');

export class FallacyDatabase {
  constructor() {
    this.ensureDb();
  }

  ensureDb() {
    if (!fs.existsSync(DB_PATH)) {
      // Lazy build if not present
      const { buildDatabase } = require('./build-db.js');
      buildDatabase();
    }
    this.db = new DatabaseSync(DB_PATH);
  }

  getAll() {
    return this.db.prepare('SELECT * FROM fallacies ORDER BY title_en ASC').all();
  }

  getIndex(lang = 'both') {
    const rows = this.db.prepare(`
      SELECT f.id, f.slug, f.title_en, f.title_et, f.latin_name, 
             f.description_en, f.description_et, f.logical_form_en, f.logical_form_et,
             f.source_url, f.wiki_file,
             (SELECT COUNT(*) FROM examples WHERE fallacy_id = f.id) AS examples_count
      FROM fallacies f
      ORDER BY f.title_en ASC
    `).all();

    return rows.map(r => {
      const summaryEn = r.description_en ? r.description_en.split(/\n\n|\.\s+/)[0].trim() + '.' : '';
      const summaryEt = r.description_et ? r.description_et.split(/\n\n|\.\s+/)[0].trim() + '.' : '';

      return {
        slug: r.slug,
        title_en: r.title_en,
        title_et: r.title_et,
        latin_name: r.latin_name || null,
        summary: lang === 'en' ? summaryEn : (lang === 'et' ? summaryEt : { en: summaryEn, et: summaryEt }),
        has_logical_form: !!(r.logical_form_en || r.logical_form_et),
        examples_count: r.examples_count,
        backlinks: {
          wiki_file: r.wiki_file ? `wiki/loogikavead/${r.wiki_file}` : null,
          source_url: r.source_url
        }
      };
    });
  }

  getLogicalForms(lang = 'both') {
    const rows = this.db.prepare(`
      SELECT f.slug, f.title_en, f.title_et, f.latin_name,
             f.logical_form_en, f.logical_form_et, f.source_url, f.wiki_file
      FROM fallacies f
      WHERE (f.logical_form_en IS NOT NULL AND f.logical_form_en != '')
         OR (f.logical_form_et IS NOT NULL AND f.logical_form_et != '')
      ORDER BY f.title_en ASC
    `).all();

    return rows.map(r => ({
      slug: r.slug,
      title_en: r.title_en,
      title_et: r.title_et,
      latin_name: r.latin_name || null,
      logical_form: lang === 'en' ? r.logical_form_en : (lang === 'et' ? (r.logical_form_et || r.logical_form_en) : { en: r.logical_form_en, et: r.logical_form_et }),
      backlinks: {
        wiki_file: r.wiki_file ? `wiki/loogikavead/${r.wiki_file}` : null,
        source_url: r.source_url
      }
    }));
  }

  getBySlugOrName(identifier) {
    if (!identifier) return null;
    const clean = identifier.trim();

    // 1. Direct slug match
    let fallacy = this.db.prepare('SELECT * FROM fallacies WHERE slug = ? COLLATE NOCASE').get(clean);
    if (fallacy) return this.hydrate(fallacy);

    // 2. English or Estonian title match
    fallacy = this.db.prepare(`
      SELECT * FROM fallacies 
      WHERE title_en = ? COLLATE NOCASE 
         OR title_et = ? COLLATE NOCASE 
         OR latin_name = ? COLLATE NOCASE
    `).get(clean, clean, clean);
    if (fallacy) return this.hydrate(fallacy);

    // 3. Alias match
    const aliasRow = this.db.prepare(`
      SELECT fallacy_id FROM aliases WHERE alias = ? COLLATE NOCASE LIMIT 1
    `).get(clean);
    if (aliasRow) {
      fallacy = this.db.prepare('SELECT * FROM fallacies WHERE id = ?').get(aliasRow.fallacy_id);
      if (fallacy) return this.hydrate(fallacy);
    }

    return null;
  }

  search(query, lang = 'auto', limit = 10) {
    if (!query || query.trim() === '') {
      return this.getAll().slice(0, limit).map(f => this.hydrate(f));
    }

    const q = query.trim();

    // FTS search if table exists
    try {
      const ftsRows = this.db.prepare(`
        SELECT f.*, rank 
        FROM fallacies_fts fts
        JOIN fallacies f ON f.id = fts.rowid
        WHERE fallacies_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `).all(`${q}*`, limit);

      if (ftsRows && ftsRows.length > 0) {
        return ftsRows.map(f => this.hydrate(f));
      }
    } catch (e) {
      // Fallback to LIKE search if FTS syntax fails or table not present
    }

    const likeQuery = `%${q}%`;
    const rows = this.db.prepare(`
      SELECT DISTINCT f.*
      FROM fallacies f
      LEFT JOIN aliases a ON a.fallacy_id = f.id
      WHERE f.title_en LIKE ? 
         OR f.title_et LIKE ?
         OR f.latin_name LIKE ?
         OR a.alias LIKE ?
         OR f.description_en LIKE ?
         OR f.description_et LIKE ?
         OR f.logical_form_en LIKE ?
         OR f.logical_form_et LIKE ?
      LIMIT ?
    `).all(
      likeQuery, likeQuery, likeQuery, likeQuery,
      likeQuery, likeQuery, likeQuery, likeQuery,
      limit
    );

    return rows.map(f => this.hydrate(f));
  }

  getRandom(lang = 'et') {
    const row = this.db.prepare('SELECT * FROM fallacies ORDER BY RANDOM() LIMIT 1').get();
    return row ? this.hydrate(row) : null;
  }

  hydrate(fallacyRow) {
    if (!fallacyRow) return null;
    const fallacyId = fallacyRow.id;

    // Load aliases
    const aliases = this.db.prepare('SELECT alias, lang FROM aliases WHERE fallacy_id = ?').all(fallacyId);
    const also_known_as_en = aliases.filter(a => a.lang === 'en').map(a => a.alias);
    const also_known_as_et = aliases.filter(a => a.lang === 'et').map(a => a.alias);

    // Load examples
    const examplesRows = this.db.prepare('SELECT * FROM examples WHERE fallacy_id = ? ORDER BY example_number ASC').all(fallacyId);
    const examples_en = examplesRows.map(e => ({
      number: e.example_number,
      example: e.example_en,
      explanation: e.explanation_en
    }));
    const examples_et = examplesRows.filter(e => e.example_et).map(e => ({
      number: e.example_number,
      example: e.example_et,
      explanation: e.explanation_et
    }));

    // Load citations
    const citations = this.db.prepare('SELECT citation FROM citations WHERE fallacy_id = ?').all(fallacyId).map(c => c.citation);

    return {
      ...fallacyRow,
      also_known_as_en,
      also_known_as_et,
      examples_en,
      examples_et,
      references: citations
    };
  }

  close() {
    this.db.close();
  }
}
