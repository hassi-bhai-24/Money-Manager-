// Single source of truth for the SQLite schema.
//
// The persistence test (scripts/persistence-test.mjs) reads the SQL strings
// out of this file and executes the exact same statements against a fresh
// SQLite file with a different driver (node:sqlite), so the schema tested
// is byte-for-byte the schema the app runs. Keep every CREATE TABLE
// statement inside SCHEMA_SQL as a template literal.
//
// Design notes:
// - Money is stored as integer cents (amount_cents) so 0.1 + 0.2 style
//   floating-point errors can never corrupt a balance.
// - Dates are stored as 'YYYY-MM-DD' strings (local calendar date).
// - SCHEMA_VERSION is stored in the meta table via PRAGMA user_version
//   so future migrations can run conditionally.

export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'both')),
    icon TEXT NOT NULL DEFAULT '•',
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category_id INTEGER NOT NULL REFERENCES categories(id),
    date TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL UNIQUE REFERENCES categories(id),
    monthly_limit_cents INTEGER NOT NULL CHECK (monthly_limit_cents > 0),
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target_cents INTEGER NOT NULL CHECK (target_cents > 0),
    saved_cents INTEGER NOT NULL DEFAULT 0 CHECK (saved_cents >= 0),
    target_date TEXT,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    balance_cents INTEGER NOT NULL CHECK (balance_cents >= 0),
    apr REAL NOT NULL DEFAULT 0 CHECK (apr >= 0),
    min_payment_cents INTEGER NOT NULL DEFAULT 0 CHECK (min_payment_cents >= 0),
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS debt_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    debt_id INTEGER NOT NULL REFERENCES debts(id),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    date TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);`,
];
