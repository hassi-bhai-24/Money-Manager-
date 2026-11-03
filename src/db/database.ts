import * as SQLite from 'expo-sqlite';

import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';

export interface Category {
  id: number;
  name: string;
  kind: 'income' | 'expense' | 'both';
  icon: string;
  is_default: number;
  created_at: string;
}

export interface Transaction {
  id: number;
  amount_cents: number;
  type: 'income' | 'expense';
  category_id: number;
  date: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: number;
  category_id: number;
  monthly_limit_cents: number;
  created_at: string;
}

export interface Goal {
  id: number;
  name: string;
  target_cents: number;
  saved_cents: number;
  target_date: string | null;
  note: string;
  created_at: string;
}

export interface Debt {
  id: number;
  name: string;
  balance_cents: number;
  apr: number;
  min_payment_cents: number;
  created_at: string;
}

export interface DebtPayment {
  id: number;
  debt_id: number;
  amount_cents: number;
  date: string;
  note: string;
  created_at: string;
}

export interface NewTransaction {
  amount_cents: number;
  type: 'income' | 'expense';
  category_id: number;
  date: string;
  note: string;
}

export const DEFAULT_CATEGORIES: Array<{
  name: string;
  kind: 'income' | 'expense' | 'both';
  icon: string;
}> = [
  { name: 'Salary', kind: 'income', icon: '💼' },
  { name: 'Business', kind: 'income', icon: '🏪' },
  { name: 'Other Income', kind: 'income', icon: '💵' },
  { name: 'Food & Groceries', kind: 'expense', icon: '🛒' },
  { name: 'Dining Out', kind: 'expense', icon: '🍽️' },
  { name: 'Rent & Housing', kind: 'expense', icon: '🏠' },
  { name: 'Transport', kind: 'expense', icon: '🚌' },
  { name: 'Utilities', kind: 'expense', icon: '💡' },
  { name: 'Shopping', kind: 'expense', icon: '🛍️' },
  { name: 'Health', kind: 'expense', icon: '💊' },
  { name: 'Education', kind: 'expense', icon: '📚' },
  { name: 'Entertainment', kind: 'expense', icon: '🎬' },
  { name: 'Other', kind: 'both', icon: '•' },
];

let db: SQLite.SQLiteDatabase | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

/** Open (or reuse) the database and run migrations. Call once at startup. */
export function initDatabase(): SQLite.SQLiteDatabase {
  if (db) return db;
  const opened = SQLite.openDatabaseSync('moneymanager.db');
  opened.execSync('PRAGMA journal_mode = WAL;');
  opened.execSync('PRAGMA foreign_keys = ON;');
  const versionRow = opened.getFirstSync<{ user_version: number }>(
    'PRAGMA user_version;',
  );
  const currentVersion = versionRow?.user_version ?? 0;
  if (currentVersion < SCHEMA_VERSION) {
    opened.withTransactionSync(() => {
      for (const statement of SCHEMA_SQL) {
        opened.execSync(statement);
      }
      opened.execSync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
    });
  }
  seedDefaultCategories(opened);
  db = opened;
  return opened;
}

function seedDefaultCategories(database: SQLite.SQLiteDatabase): void {
  const count = database.getFirstSync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM categories;',
  )?.n ?? 0;
  if (count > 0) return;
  const createdAt = nowIso();
  database.withTransactionSync(() => {
    for (const category of DEFAULT_CATEGORIES) {
      database.runSync(
        'INSERT INTO categories (name, kind, icon, is_default, created_at) VALUES (?, ?, ?, 1, ?);',
        [category.name, category.kind, category.icon, createdAt],
      );
    }
  });
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) return initDatabase();
  return db;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export function listCategories(): Category[] {
  return getDb().getAllSync<Category>(
    'SELECT * FROM categories ORDER BY is_default DESC, name ASC;',
  );
}

export function addCategory(
  name: string,
  kind: 'income' | 'expense' | 'both',
  icon = '•',
): number {
  const result = getDb().runSync(
    'INSERT INTO categories (name, kind, icon, is_default, created_at) VALUES (?, ?, ?, 0, ?);',
    [name.trim(), kind, icon, nowIso()],
  );
  return result.lastInsertRowId;
}

/** Returns false when the category is still referenced by transactions. */
export function deleteCategory(id: number): boolean {
  const database = getDb();
  const used = database.getFirstSync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM transactions WHERE category_id = ?;',
    [id],
  )?.n ?? 0;
  if (used > 0) return false;
  database.runSync('DELETE FROM budgets WHERE category_id = ?;', [id]);
  database.runSync('DELETE FROM categories WHERE id = ?;', [id]);
  return true;
}

// ---------------------------------------------------------------------------
// Transactions — every write goes straight to SQLite and is re-read from it.
// React state is only a cache; the database is the source of truth.
// ---------------------------------------------------------------------------

export function listTransactions(): Transaction[] {
  return getDb().getAllSync<Transaction>(
    'SELECT * FROM transactions ORDER BY date DESC, id DESC;',
  );
}

export function addTransaction(input: NewTransaction): number {
  const stamp = nowIso();
  const result = getDb().runSync(
    'INSERT INTO transactions (amount_cents, type, category_id, date, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
    [input.amount_cents, input.type, input.category_id, input.date, input.note, stamp, stamp],
  );
  return result.lastInsertRowId;
}

export function updateTransaction(id: number, input: NewTransaction): void {
  getDb().runSync(
    'UPDATE transactions SET amount_cents = ?, type = ?, category_id = ?, date = ?, note = ?, updated_at = ? WHERE id = ?;',
    [input.amount_cents, input.type, input.category_id, input.date, input.note, nowIso(), id],
  );
}

export function deleteTransaction(id: number): void {
  getDb().runSync('DELETE FROM transactions WHERE id = ?;', [id]);
}

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

export function listBudgets(): Budget[] {
  return getDb().getAllSync<Budget>('SELECT * FROM budgets ORDER BY id ASC;');
}

export function upsertBudget(categoryId: number, monthlyLimitCents: number): void {
  getDb().runSync(
    `INSERT INTO budgets (category_id, monthly_limit_cents, created_at)
     VALUES (?, ?, ?)
     ON CONFLICT(category_id) DO UPDATE SET monthly_limit_cents = excluded.monthly_limit_cents;`,
    [categoryId, monthlyLimitCents, nowIso()],
  );
}

export function deleteBudget(id: number): void {
  getDb().runSync('DELETE FROM budgets WHERE id = ?;', [id]);
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export function listGoals(): Goal[] {
  return getDb().getAllSync<Goal>('SELECT * FROM goals ORDER BY created_at ASC;');
}

export function addGoal(input: {
  name: string;
  target_cents: number;
  target_date: string | null;
  note: string;
}): number {
  const result = getDb().runSync(
    'INSERT INTO goals (name, target_cents, saved_cents, target_date, note, created_at) VALUES (?, ?, 0, ?, ?, ?);',
    [input.name.trim(), input.target_cents, input.target_date, input.note, nowIso()],
  );
  return result.lastInsertRowId;
}

export function updateGoal(
  id: number,
  input: { name: string; target_cents: number; target_date: string | null; note: string },
): void {
  getDb().runSync(
    'UPDATE goals SET name = ?, target_cents = ?, target_date = ?, note = ? WHERE id = ?;',
    [input.name.trim(), input.target_cents, input.target_date, input.note, id],
  );
}

export function addToGoal(id: number, amountCents: number): void {
  getDb().runSync('UPDATE goals SET saved_cents = saved_cents + ? WHERE id = ?;', [
    amountCents,
    id,
  ]);
}

export function deleteGoal(id: number): void {
  getDb().runSync('DELETE FROM goals WHERE id = ?;', [id]);
}

// ---------------------------------------------------------------------------
// Debts
// ---------------------------------------------------------------------------

export function listDebts(): Debt[] {
  return getDb().getAllSync<Debt>('SELECT * FROM debts ORDER BY created_at ASC;');
}

export function addDebt(input: {
  name: string;
  balance_cents: number;
  apr: number;
  min_payment_cents: number;
}): number {
  const result = getDb().runSync(
    'INSERT INTO debts (name, balance_cents, apr, min_payment_cents, created_at) VALUES (?, ?, ?, ?, ?);',
    [input.name.trim(), input.balance_cents, input.apr, input.min_payment_cents, nowIso()],
  );
  return result.lastInsertRowId;
}

export function updateDebt(
  id: number,
  input: { name: string; balance_cents: number; apr: number; min_payment_cents: number },
): void {
  getDb().runSync(
    'UPDATE debts SET name = ?, balance_cents = ?, apr = ?, min_payment_cents = ? WHERE id = ?;',
    [input.name.trim(), input.balance_cents, input.apr, input.min_payment_cents, id],
  );
}

/** Log a payment and reduce the balance, atomically. Balance never goes below zero. */
export function logDebtPayment(
  debtId: number,
  amountCents: number,
  date: string,
  note: string,
): void {
  const database = getDb();
  database.withTransactionSync(() => {
    database.runSync(
      'INSERT INTO debt_payments (debt_id, amount_cents, date, note, created_at) VALUES (?, ?, ?, ?, ?);',
      [debtId, amountCents, date, note, nowIso()],
    );
    database.runSync(
      'UPDATE debts SET balance_cents = MAX(0, balance_cents - ?) WHERE id = ?;',
      [amountCents, debtId],
    );
  });
}

export function listDebtPayments(debtId: number): DebtPayment[] {
  return getDb().getAllSync<DebtPayment>(
    'SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY date DESC, id DESC;',
    [debtId],
  );
}

export function deleteDebt(id: number): void {
  const database = getDb();
  database.withTransactionSync(() => {
    database.runSync('DELETE FROM debt_payments WHERE debt_id = ?;', [id]);
    database.runSync('DELETE FROM debts WHERE id = ?;', [id]);
  });
}

// ---------------------------------------------------------------------------
// Export / import / reset
// ---------------------------------------------------------------------------

export interface BackupData {
  version: 1;
  exportedAt: string;
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  debts: Debt[];
  debtPayments: DebtPayment[];
}

export function exportAllData(): BackupData {
  const database = getDb();
  return {
    version: 1,
    exportedAt: nowIso(),
    categories: database.getAllSync<Category>('SELECT * FROM categories ORDER BY id ASC;'),
    transactions: database.getAllSync<Transaction>('SELECT * FROM transactions ORDER BY id ASC;'),
    budgets: database.getAllSync<Budget>('SELECT * FROM budgets ORDER BY id ASC;'),
    goals: database.getAllSync<Goal>('SELECT * FROM goals ORDER BY id ASC;'),
    debts: database.getAllSync<Debt>('SELECT * FROM debts ORDER BY id ASC;'),
    debtPayments: database.getAllSync<DebtPayment>(
      'SELECT * FROM debt_payments ORDER BY id ASC;',
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Validate a parsed backup completely BEFORE writing anything.
 * Returns an error message, or null when the backup is safe to import.
 */
export function validateBackup(value: unknown): string | null {
  if (!isRecord(value)) return 'Backup file is not a JSON object.';
  if (value.version !== 1) return 'Unsupported backup version.';
  const arrays: Array<[string, (row: unknown) => boolean]> = [
    [
      'categories',
      (r) =>
        isRecord(r) &&
        typeof r.name === 'string' &&
        r.name.trim().length > 0 &&
        (r.kind === 'income' || r.kind === 'expense' || r.kind === 'both'),
    ],
    [
      'transactions',
      (r) =>
        isRecord(r) &&
        isPositiveInteger(r.amount_cents) &&
        (r.type === 'income' || r.type === 'expense') &&
        isNonNegativeInteger(r.category_id) &&
        typeof r.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(r.date),
    ],
    [
      'budgets',
      (r) =>
        isRecord(r) &&
        isNonNegativeInteger(r.category_id) &&
        isPositiveInteger(r.monthly_limit_cents),
    ],
    [
      'goals',
      (r) =>
        isRecord(r) &&
        typeof r.name === 'string' &&
        r.name.trim().length > 0 &&
        isPositiveInteger(r.target_cents) &&
        isNonNegativeInteger(r.saved_cents),
    ],
    [
      'debts',
      (r) =>
        isRecord(r) &&
        typeof r.name === 'string' &&
        r.name.trim().length > 0 &&
        isNonNegativeInteger(r.balance_cents) &&
        typeof r.apr === 'number' &&
        r.apr >= 0,
    ],
    [
      'debtPayments',
      (r) =>
        isRecord(r) &&
        isNonNegativeInteger(r.debt_id) &&
        isPositiveInteger(r.amount_cents) &&
        typeof r.date === 'string',
    ],
  ];
  for (const [key, checkRow] of arrays) {
    const list = value[key];
    if (!Array.isArray(list)) return `Backup is missing the "${key}" list.`;
    if (!list.every(checkRow)) return `Backup has an invalid row in "${key}".`;
  }
  return null;
}

/**
 * Replace all data with a validated backup, in one transaction.
 * Callers must run validateBackup() first; this re-checks and throws on
 * invalid input so a bad file can never wipe good data.
 * Returns the number of rows imported per table.
 */
export function importBackup(value: unknown): Record<string, number> {
  const error = validateBackup(value);
  if (error) throw new Error(error);
  const data = value as unknown as BackupData;
  const database = getDb();
  const counts: Record<string, number> = {};
  database.withTransactionSync(() => {
    database.execSync(
      'DELETE FROM debt_payments; DELETE FROM debts; DELETE FROM goals; DELETE FROM budgets; DELETE FROM transactions; DELETE FROM categories;',
    );
    const stamp = nowIso();
    for (const category of data.categories) {
      database.runSync(
        'INSERT INTO categories (id, name, kind, icon, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?);',
        [
          category.id,
          category.name,
          category.kind,
          category.icon || '•',
          category.is_default ?? 0,
          category.created_at || stamp,
        ],
      );
    }
    for (const tx of data.transactions) {
      database.runSync(
        'INSERT INTO transactions (id, amount_cents, type, category_id, date, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
        [
          tx.id,
          tx.amount_cents,
          tx.type,
          tx.category_id,
          tx.date,
          tx.note || '',
          tx.created_at || stamp,
          tx.updated_at || stamp,
        ],
      );
    }
    for (const budget of data.budgets) {
      database.runSync(
        'INSERT INTO budgets (id, category_id, monthly_limit_cents, created_at) VALUES (?, ?, ?, ?);',
        [budget.id, budget.category_id, budget.monthly_limit_cents, budget.created_at || stamp],
      );
    }
    for (const goal of data.goals) {
      database.runSync(
        'INSERT INTO goals (id, name, target_cents, saved_cents, target_date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [
          goal.id,
          goal.name,
          goal.target_cents,
          goal.saved_cents,
          goal.target_date,
          goal.note || '',
          goal.created_at || stamp,
        ],
      );
    }
    for (const debt of data.debts) {
      database.runSync(
        'INSERT INTO debts (id, name, balance_cents, apr, min_payment_cents, created_at) VALUES (?, ?, ?, ?, ?, ?);',
        [
          debt.id,
          debt.name,
          debt.balance_cents,
          debt.apr,
          debt.min_payment_cents,
          debt.created_at || stamp,
        ],
      );
    }
    for (const payment of data.debtPayments) {
      database.runSync(
        'INSERT INTO debt_payments (id, debt_id, amount_cents, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?);',
        [
          payment.id,
          payment.debt_id,
          payment.amount_cents,
          payment.date,
          payment.note || '',
          payment.created_at || stamp,
        ],
      );
    }
    counts.categories = data.categories.length;
    counts.transactions = data.transactions.length;
    counts.budgets = data.budgets.length;
    counts.goals = data.goals.length;
    counts.debts = data.debts.length;
    counts.debtPayments = data.debtPayments.length;
  });
  return counts;
}

/** Delete every user row and re-seed the default categories. */
export function clearAllData(): void {
  const database = getDb();
  database.withTransactionSync(() => {
    database.execSync(
      'DELETE FROM debt_payments; DELETE FROM debts; DELETE FROM goals; DELETE FROM budgets; DELETE FROM transactions; DELETE FROM categories;',
    );
  });
  seedDefaultCategories(database);
}
