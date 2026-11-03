import {
  addCategory,
  addDebt,
  addGoal,
  addTransaction,
  getDb,
  listCategories,
  upsertBudget,
} from '../db/database';
import { toDateKey } from '../utils/money';

const SAMPLE_PREFIX = 'Sample — ';

/**
 * Demo data, clearly labelled so it can never be confused with real
 * records. Dates are relative to today so the dashboard always shows
 * the sample month. Uses the same SQLite write path as the real UI.
 */
export function loadSampleData(): void {
  const categories = listCategories();
  const find = (name: string) => categories.find((c) => c.name === name);
  const ensure = (name: string, kind: 'income' | 'expense'): number => {
    const existing = find(name);
    if (existing) return existing.id;
    return addCategory(name, kind, '•');
  };

  const salaryId = ensure('Salary', 'income');
  const foodId = ensure('Food & Groceries', 'expense');
  const transportId = ensure('Transport', 'expense');
  const shoppingId = ensure('Shopping', 'expense');

  const now = new Date();
  const day = (offset: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    return toDateKey(d);
  };

  addTransaction({
    amount_cents: 12000000,
    type: 'income',
    category_id: salaryId,
    date: day(-9),
    note: `${SAMPLE_PREFIX}Monthly salary`,
  });
  addTransaction({
    amount_cents: 845000,
    type: 'expense',
    category_id: foodId,
    date: day(-6),
    note: `${SAMPLE_PREFIX}Weekly groceries`,
  });
  addTransaction({
    amount_cents: 320000,
    type: 'expense',
    category_id: foodId,
    date: day(-3),
    note: `${SAMPLE_PREFIX}Groceries top-up`,
  });
  addTransaction({
    amount_cents: 45000,
    type: 'expense',
    category_id: transportId,
    date: day(-2),
    note: `${SAMPLE_PREFIX}Bus fare`,
  });
  addTransaction({
    amount_cents: 600000,
    type: 'expense',
    category_id: shoppingId,
    date: day(-1),
    note: `${SAMPLE_PREFIX}Shoes on sale`,
  });

  upsertBudget(foodId, 1500000);
  addGoal({
    name: `${SAMPLE_PREFIX}Emergency fund`,
    target_cents: 5000000,
    target_date: null,
    note: 'Demo goal — delete it from the Goals tab.',
  });
  addDebt({
    name: `${SAMPLE_PREFIX}Phone instalments`,
    balance_cents: 8000000,
    apr: 0,
    min_payment_cents: 200000,
  });
}

/** Remove only rows created by loadSampleData (matched by the prefix). */
export function clearSampleData(): void {
  const database = getDb();
  database.withTransactionSync(() => {
    database.runSync('DELETE FROM transactions WHERE note LIKE ?;', [`${SAMPLE_PREFIX}%`]);
    database.runSync('DELETE FROM goals WHERE name LIKE ?;', [`${SAMPLE_PREFIX}%`]);
    database.runSync('DELETE FROM debts WHERE name LIKE ?;', [`${SAMPLE_PREFIX}%`]);
  });
}
