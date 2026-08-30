import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');

// Test unicode61 with remove_diacritics
db.exec(`
  CREATE VIRTUAL TABLE test_fts USING fts5(
    title,
    tokenize="unicode61 remove_diacritics 2"
  );
`);

db.prepare('INSERT INTO test_fts (title) VALUES (?)').run('Õlgtulba eksitus ja rõhuasetus');
db.prepare('INSERT INTO test_fts (title) VALUES (?)').run('Öökulli argument ja süü läbi seotuse');

const r1 = db.prepare('SELECT * FROM test_fts WHERE test_fts MATCH ?').all('õlgtulba');
const r2 = db.prepare('SELECT * FROM test_fts WHERE test_fts MATCH ?').all('olgtulba');
const r3 = db.prepare('SELECT * FROM test_fts WHERE test_fts MATCH ?').all('ÕLGTULBA');
const r4 = db.prepare('SELECT * FROM test_fts WHERE test_fts MATCH ?').all('ookulli');
const r5 = db.prepare('SELECT * FROM test_fts WHERE test_fts MATCH ?').all('öökulli');

console.log('r1 (lowercase õ):', r1.length);
console.log('r2 (diacritic-tolerant o):', r2.length);
console.log('r3 (uppercase Õ):', r3.length);
console.log('r4 (diacritic-tolerant ookulli):', r4.length);
console.log('r5 (exact öökulli):', r5.length);
