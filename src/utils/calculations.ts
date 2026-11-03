// Pure calculation helpers. No imports from React Native, Expo, or the
// database, so these can be unit-tested under plain Node.

import { currentMonthKey, monthKeyOf, monthsBetweenInclusive, todayKey } from './money';

export interface TransactionLike {
  amount_cents: number;
  type: 'income' | 'expense';
  category_id: number;
  date: string;
}

export interface MonthSummary {
  monthKey: string;
  incomeCents: number;
  expenseCents: number;
  surplusCents: number;
  savingsRate: number; // 0..1, 0 when there is no income
  transactionCount: number;
}

export function summarizeMonth(
  transactions: TransactionLike[],
  monthKey: string = currentMonthKey(),
): MonthSummary {
  let incomeCents = 0;
  let expenseCents = 0;
  let count = 0;
  for (const tx of transactions) {
    if (monthKeyOf(tx.date) !== monthKey) continue;
    count += 1;
    if (tx.type === 'income') incomeCents += tx.amount_cents;
    else expenseCents += tx.amount_cents;
  }
  const surplusCents = incomeCents - expenseCents;
  return {
    monthKey,
    incomeCents,
    expenseCents,
    surplusCents,
    savingsRate: incomeCents > 0 ? Math.max(0, surplusCents) / incomeCents : 0,
    transactionCount: count,
  };
}

export interface CategoryTotal {
  categoryId: number;
  totalCents: number;
  share: number; // 0..1 of total expense
}

export function expenseByCategory(
  transactions: TransactionLike[],
  monthKey: string = currentMonthKey(),
): CategoryTotal[] {
  const totals = new Map<number, number>();
  let grand = 0;
  for (const tx of transactions) {
    if (tx.type !== 'expense' || monthKeyOf(tx.date) !== monthKey) continue;
    totals.set(tx.category_id, (totals.get(tx.category_id) ?? 0) + tx.amount_cents);
    grand += tx.amount_cents;
  }
  return [...totals.entries()]
    .map(([categoryId, totalCents]) => ({
      categoryId,
      totalCents,
      share: grand > 0 ? totalCents / grand : 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

export function totalBalance(transactions: TransactionLike[]): number {
  let balance = 0;
  for (const tx of transactions) {
    balance += tx.type === 'income' ? tx.amount_cents : -tx.amount_cents;
  }
  return balance;
}

export interface BudgetLike {
  category_id: number;
  monthly_limit_cents: number;
}

export interface BudgetStatus {
  categoryId: number;
  limitCents: number;
  spentCents: number;
  remainingCents: number;
  usedRatio: number; // spent / limit
  overBudget: boolean;
  nearLimit: boolean; // >= 80% but not over
}

export function budgetStatuses(
  budgets: BudgetLike[],
  transactions: TransactionLike[],
  monthKey: string = currentMonthKey(),
): BudgetStatus[] {
  const spent = new Map<number, number>();
  for (const tx of transactions) {
    if (tx.type !== 'expense' || monthKeyOf(tx.date) !== monthKey) continue;
    spent.set(tx.category_id, (spent.get(tx.category_id) ?? 0) + tx.amount_cents);
  }
  return budgets.map((budget) => {
    const spentCents = spent.get(budget.category_id) ?? 0;
    const usedRatio =
      budget.monthly_limit_cents > 0 ? spentCents / budget.monthly_limit_cents : 0;
    return {
      categoryId: budget.category_id,
      limitCents: budget.monthly_limit_cents,
      spentCents,
      remainingCents: budget.monthly_limit_cents - spentCents,
      usedRatio,
      overBudget: spentCents > budget.monthly_limit_cents,
      nearLimit: usedRatio >= 0.8 && spentCents <= budget.monthly_limit_cents,
    };
  });
}

export interface GoalLike {
  target_cents: number;
  saved_cents: number;
  target_date: string | null;
}

export interface GoalPace {
  remainingCents: number;
  progressRatio: number; // 0..1
  reached: boolean;
  /** Required saving per month from now until the target date, or null when no date is set. */
  requiredMonthlyCents: number | null;
  monthsLeft: number | null;
  overdue: boolean;
}

export function goalPace(goal: GoalLike, nowKey: string = todayKey()): GoalPace {
  const remainingCents = Math.max(0, goal.target_cents - goal.saved_cents);
  const progressRatio =
    goal.target_cents > 0 ? Math.min(1, goal.saved_cents / goal.target_cents) : 0;
  const reached = remainingCents === 0;
  if (!goal.target_date) {
    return { remainingCents, progressRatio, reached, requiredMonthlyCents: null, monthsLeft: null, overdue: false };
  }
  const overdue = goal.target_date < nowKey && !reached;
  const monthsLeft = overdue
    ? 0
    : monthsBetweenInclusive(monthKeyOf(nowKey), monthKeyOf(goal.target_date));
  const requiredMonthlyCents = reached
    ? 0
    : Math.ceil(remainingCents / Math.max(1, monthsLeft));
  return { remainingCents, progressRatio, reached, requiredMonthlyCents, monthsLeft, overdue };
}

export interface DebtLike {
  id: number;
  balance_cents: number;
  apr: number;
  min_payment_cents: number;
}

/** Highest APR first (ties: larger balance first). Usually the cheapest overall. */
export function avalancheOrder<T extends DebtLike>(debts: T[]): T[] {
  return [...debts].sort(
    (a, b) => b.apr - a.apr || b.balance_cents - a.balance_cents,
  );
}

/** Smallest balance first. Quick wins that keep motivation up. */
export function snowballOrder<T extends DebtLike>(debts: T[]): T[] {
  return [...debts].sort((a, b) => a.balance_cents - b.balance_cents);
}

export function totalDebt(debts: DebtLike[]): number {
  return debts.reduce((sum, debt) => sum + Math.max(0, debt.balance_cents), 0);
}

export function totalMinPayments(debts: DebtLike[]): number {
  return debts.reduce((sum, debt) => sum + Math.max(0, debt.min_payment_cents), 0);
}
