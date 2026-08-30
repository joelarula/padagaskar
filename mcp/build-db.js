#!/usr/bin/env node

/**
 * Builds a high-performance SQLite database (mcp/fallacies.db)
 * from copy/json/*.json, copy/translated_json/*.json, and wiki/loogikavead/*.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const COPY_JSON_DIR = path.join(ROOT_DIR, 'copy', 'json');
const WIKI_DIR = path.join(ROOT_DIR, 'wiki', 'loogikavead');
const CACHE_DIR = path.join(ROOT_DIR, 'copy', 'translated_json');
const DB_PATH = path.join(__dirname, 'fallacies.db');

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

export function buildDatabase() {
  console.log(`Building SQLite database at ${DB_PATH}...`);
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }

  const db = new DatabaseSync(DB_PATH);

  // Enable WAL mode for concurrency and performance
  db.exec('PRAGMA journal_mode = WAL;');

  // Schema creation
  db.exec(`
    CREATE TABLE fallacies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title_en TEXT NOT NULL,
      title_et TEXT NOT NULL,
      latin_name TEXT,
      description_en TEXT,
      description_et TEXT,
      logical_form_en TEXT,
      logical_form_et TEXT,
      exceptions_en TEXT,
      exceptions_et TEXT,
      tips_en TEXT,
      tips_et TEXT,
      source_url TEXT,
      image_url TEXT,
      wiki_file TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fallacy_id INTEGER NOT NULL,
      alias TEXT NOT NULL,
      lang TEXT NOT NULL,
      FOREIGN KEY(fallacy_id) REFERENCES fallacies(id) ON DELETE CASCADE
    );

    CREATE TABLE examples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fallacy_id INTEGER NOT NULL,
      example_number INTEGER,
      example_en TEXT,
      explanation_en TEXT,
      example_et TEXT,
      explanation_et TEXT,
      is_addition INTEGER DEFAULT 0,
      FOREIGN KEY(fallacy_id) REFERENCES fallacies(id) ON DELETE CASCADE
    );

    CREATE TABLE citations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fallacy_id INTEGER NOT NULL,
      citation TEXT NOT NULL,
      FOREIGN KEY(fallacy_id) REFERENCES fallacies(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_fallacies_slug ON fallacies(slug);
    CREATE INDEX idx_fallacies_title_en ON fallacies(title_en);
    CREATE INDEX idx_fallacies_title_et ON fallacies(title_et);
    CREATE INDEX idx_aliases_alias ON aliases(alias);
  `);

  // Create FTS5 virtual table with full UTF-8 and Estonian diacritic support
  let hasFts = false;
  try {
    db.exec(`
      CREATE VIRTUAL TABLE fallacies_fts USING fts5(
        title_en,
        title_et,
        latin_name,
        aliases,
        description_en,
        description_et,
        logical_form_en,
        logical_form_et,
        tokenize="unicode61 remove_diacritics 2"
      );
    `);
    hasFts = true;
    console.log('FTS5 UTF-8 full-text search table created successfully.');
  } catch (err) {
    console.warn(`FTS5 error (${err.message}). Using standard SQL indexing.`);
  }

  // Load wiki data
  const wikiBySlug = new Map();
  if (fs.existsSync(WIKI_DIR)) {
    const wikiFiles = fs.readdirSync(WIKI_DIR).filter(f => f.endsWith('.md') && f !== 'sisukord.md');
    for (const wf of wikiFiles) {
      const content = fs.readFileSync(path.join(WIKI_DIR, wf), 'utf-8');
      const { frontmatter, body } = extractFrontmatter(content);
      const sourceLinks = frontmatter.allikad || frontmatter.allikas;
      if (sourceLinks) {
        const urls = Array.isArray(sourceLinks) ? sourceLinks : [sourceLinks];
        for (const u of urls) {
          const slug = u.split('/').pop().replace(/\.html$/, '').toLowerCase();
          wikiBySlug.set(slug, { filename: wf, frontmatter, body });
        }
      }
    }
  }

  const jsonFiles = fs.readdirSync(COPY_JSON_DIR).filter(f => f.endsWith('.json'));

  const insertFallacyStmt = db.prepare(`
    INSERT INTO fallacies (
      slug, title_en, title_et, latin_name,
      description_en, description_et,
      logical_form_en, logical_form_et,
      exceptions_en, exceptions_et,
      tips_en, tips_et,
      source_url, image_url, wiki_file
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?, ?
    )
  `);

  const insertAliasStmt = db.prepare(`
    INSERT INTO aliases (fallacy_id, alias, lang) VALUES (?, ?, ?)
  `);

  const insertExampleStmt = db.prepare(`
    INSERT INTO examples (
      fallacy_id, example_number, example_en, explanation_en, example_et, explanation_et, is_addition
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCitationStmt = db.prepare(`
    INSERT INTO citations (fallacy_id, citation) VALUES (?, ?)
  `);

  let count = 0;

  for (const jf of jsonFiles) {
    const enData = JSON.parse(fs.readFileSync(path.join(COPY_JSON_DIR, jf), 'utf-8'));
    const slugKey = enData.slug.toLowerCase().replace(/\.html$/, '');

    let etData = null;
    const cachePath = path.join(CACHE_DIR, `${enData.slug}.json`);
    if (fs.existsSync(cachePath)) {
      etData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    }

    const wikiEntry = wikiBySlug.get(slugKey);

    let descWiki = '';
    let formWiki = '';
    if (wikiEntry && wikiEntry.body) {
      const descM = /(?:\*\*Kirjeldus:?\*\*|##\s*Kirjeldus)\s*([\s\S]*?)(?=(?:\*\*Loogiline|\*\*Näide|###|##|$))/i.exec(wikiEntry.body);
      if (descM) descWiki = descM[1].replace(/<[^>]+>/g, '').trim();
      const formM = /(?:\*\*Loogiline\s*vorm:?\*\*|###\s*Loogiline\s*vorm|##\s*Loogiline\s*vorm)\s*([\s\S]*?)(?=(?:\*\*Näide|###\s*Näide|##\s*Näide|\*\*Erand|###\s*Erand|$))/i.exec(wikiEntry.body);
      if (formM) formWiki = formM[1].replace(/<[^>]+>/g, '').trim();
    }

    const title_en = enData.title || '';
    const title_et = (etData && etData.title_et) || (wikiEntry && wikiEntry.frontmatter.loogikavea_nimi) || title_en;
    const latin_name = enData.latin_name || (wikiEntry && wikiEntry.frontmatter.ladinakeelne_nimi) || '';
    const description_en = enData.description || '';
    const description_et = (etData && etData.description_et) || descWiki || '';
    const logical_form_en = enData.logical_form || '';
    const logical_form_et = (etData && etData.logical_form_et) || formWiki || '';
    const exceptions_en = enData.exceptions || '';
    const exceptions_et = (etData && etData.exceptions_et) || '';
    const tips_en = enData.tips || '';
    const tips_et = (etData && etData.tips_et) || '';
    const source_url = enData.source_url || '';
    const image_url = enData.image_url || '';
    const wiki_file = wikiEntry ? wikiEntry.filename : null;

    const result = insertFallacyStmt.run(
      enData.slug,
      title_en,
      title_et,
      latin_name,
      description_en,
      description_et,
      logical_form_en,
      logical_form_et,
      exceptions_en,
      exceptions_et,
      tips_en,
      tips_et,
      source_url,
      image_url,
      wiki_file
    );

    const fallacyId = Number(result.lastInsertRowid);
    count++;

    // Insert Aliases
    const aliasesList = [];
    if (enData.also_known_as) {
      for (const a of enData.also_known_as) {
        insertAliasStmt.run(fallacyId, a, 'en');
        aliasesList.push(a);
      }
    }
    if (etData && etData.also_known_as_et) {
      for (const a of etData.also_known_as_et) {
        insertAliasStmt.run(fallacyId, a, 'et');
        aliasesList.push(a);
      }
    }

    // Insert Examples
    if (enData.examples) {
      for (let i = 0; i < enData.examples.length; i++) {
        const exEn = enData.examples[i];
        const exEt = (etData && etData.examples_et && etData.examples_et[i]) || null;
        insertExampleStmt.run(
          fallacyId,
          exEn.number || i + 1,
          exEn.example || '',
          exEn.explanation || '',
          exEt ? exEt.example : '',
          exEt ? exEt.explanation : '',
          0
        );
      }
    }

    // Insert Citations
    if (enData.references) {
      for (const ref of enData.references) {
        insertCitationStmt.run(fallacyId, ref);
      }
    }

    // Insert into FTS if available
    if (hasFts) {
      db.prepare(`
        INSERT INTO fallacies_fts (
          rowid, title_en, title_et, latin_name, aliases,
          description_en, description_et, logical_form_en, logical_form_et
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        fallacyId,
        title_en,
        title_et,
        latin_name,
        aliasesList.join(', '),
        description_en,
        description_et,
        logical_form_en,
        logical_form_et
      );
    }
  }

  db.close();
  console.log(`Successfully compiled ${count} fallacies into SQLite database: ${DB_PATH}`);
}

buildDatabase();
