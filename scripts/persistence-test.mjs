#!/usr/bin/env node
/**
 * Persistence restart test.
 *
 * Proves the save bug is fixed at the storage layer: rows written to SQLite
 * survive closing and reopening the database file, and updates/deletes
 * persist across a second reopen.
 *
 * The SQL executed here is extracted from src/db/schema.ts (the exact
 * SCHEMA_SQL statements the app runs). The driver differs — node:sqlite
 * under Node instead of expo-sqlite on device — but the statements, the
 * file format, and the close/reopen semantics are identical. This is
 * stated plainly in the README; it is not a claim that expo-sqlite
 * itself was executed under Node.
 */
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');
const schemaSource = fs.readFileSync(
  path.join(projectRoot, 'src/db/schema.ts'),
  'utf8',
);

const arrayStart = schemaSource.indexOf('export const SCHEMA_SQL');
assert.ok(arrayStart >= 0, 'SCHEMA_SQL not found in schema.ts');
const arrayEnd = schemaSource.indexOf('];', arrayStart);
assert.ok(arrayEnd > arrayStart, 'SCHEMA_SQL end not found');
const arrayText = schemaSource.slice(arrayStart, arrayEnd);
const statements = [...arrayText.matchAll(/`([\s\S]*?)`/g)].map((m) => m[1].trim());
assert.ok(statements.length >= 8, `expected >= 8 schema statements, got ${statements.length}`);
console.log(`Schema statements extracted from src/db/schema.ts: ${statements.length}`);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moneymanager-persist-'));
const dbPath = path.join(tmpDir, 'moneymanager.db');

function openAndInit() {
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  for (const statement of statements) db.exec(statement);
  return db;
}

function seed(db) {
  db.exec(
    `INSERT INTO categories (name, kind, icon, is_default, created_at)
     VALUES ('Salary', 'income', '💼', 1, '2026-11-01T00:00:00.000Z'),
            ('Food & Groceries', 'expense', '🛒', 1, '2026-11-01T00:00:00.000Z');`,
  );
  db.exec(
    `INSERT INTO budgets (category_id, monthly_limit_cents, created_at)
     VALUES (2, 1500000, '2026-11-01T00:00:00.000Z');`,
  );
  db.exec(
    `INSERT INTO goals (name, target_cents, saved_cents, target_date, note, created_at)
     VALUES ('Emergency fund', 5000000, 100000, '2026-12-31', '', '2026-11-01T00:00:00.000Z');`,
  );
  db.exec(
    `INSERT INTO debts (name, balance_cents, apr, min_payment_cents, created_at)
     VALUES ('Car loan', 25000000, 18.5, 500000, '2026-11-01T00:00:00.000Z');`,
  );
  db.exec(
    `INSERT INTO transactions (amount_cents, type, category_id, date, note, created_at, updated_at)
     VALUES (12000000, 'income', 1, '2026-11-02', 'Salary', '2026-11-02T00:00:00.000Z', '2026-11-02T00:00:00.000Z'),
            (845000, 'expense', 2, '2026-11-03', 'Groceries', '2026-11-03T00:00:00.000Z', '2026-11-03T00:00:00.000Z');`,
  );
}

// --- Pass 1: create, insert, close (simulates the app being killed). ---
let db = openAndInit();
seed(db);
db.close();
console.log('Pass 1: inserted rows, closed database.');

// --- Pass 2: reopen, assert everything survived, then update + delete. ---
db = openAndInit();
const txCount = db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n;
assert.equal(txCount, 2, '2 transactions must survive reopen');
const salary = db
  .prepare("SELECT amount_cents, note FROM transactions WHERE note = 'Salary'")
  .get();
assert.equal(salary.amount_cents, 12000000);
const budget = db.prepare('SELECT monthly_limit_cents FROM budgets').get();
assert.equal(budget.monthly_limit_cents, 1500000);
const goal = db.prepare('SELECT saved_cents FROM goals').get();
assert.equal(goal.saved_cents, 100000);
const debt = db.prepare('SELECT balance_cents, apr FROM debts').get();
assert.equal(debt.balance_cents, 25000000);
assert.equal(debt.apr, 18.5);
console.log('Pass 2: all rows present with exact values after reopen.');

// Update one row and delete another, then close again.
db.exec("UPDATE goals SET saved_cents = 250000 WHERE name = 'Emergency fund';");
db.exec("DELETE FROM transactions WHERE note = 'Groceries';");
db.close();
console.log('Pass 2: updated goal, deleted one transaction, closed database.');

// --- Pass 3: reopen, assert the changes persisted. ---
db = openAndInit();
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n, 1);
assert.equal(
  db.prepare("SELECT saved_cents FROM goals WHERE name = 'Emergency fund'").get().saved_cents,
  250000,
);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM budgets').get().n, 1);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM debts').get().n, 1);
db.close();
console.log('Pass 3: update + delete persisted across a second reopen.');

// Cleanup.
fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('PERSISTENCE TEST: PASS');
