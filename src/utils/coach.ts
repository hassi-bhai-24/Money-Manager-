// On-device coach: pure rules over the user's real SQLite data.
// No network calls, no API key, no external model. Every insight cites the
// numbers it used. This is guidance, not financial advice.

import {
  avalancheOrder,
  budgetStatuses,
  expenseByCategory,
  goalPace,
  snowballOrder,
  summarizeMonth,
  totalDebt,
  totalMinPayments,
  type BudgetLike,
  type DebtLike,
  type GoalLike,
  type TransactionLike,
} from './calculations';
import { formatRs } from './money';

export interface CoachInsight {
  title: string;
  body: string;
  kind: 'good' | 'warning' | 'info';
}

export interface CoachInput {
  transactions: TransactionLike[];
  budgets: BudgetLike[];
  goals: Array<GoalLike & { name: string }>;
  debts: Array<DebtLike & { name: string }>;
  categoryNames: Map<number, string>;
  monthKey: string;
}

export function buildCoachInsights(input: CoachInput): CoachInsight[] {
  const insights: CoachInsight[] = [];
  const summary = summarizeMonth(input.transactions, input.monthKey);
  const categoryTotals = expenseByCategory(input.transactions, input.monthKey);
  const statuses = budgetStatuses(input.budgets, input.transactions, input.monthKey);

  if (input.transactions.length === 0) {
    insights.push({
      title: 'Start with your first transaction',
      body: 'Add an income or expense and the coach will have real numbers to work with. Your records stay on this device only.',
      kind: 'info',
    });
    return insights;
  }

  // Largest expense driver.
  const top = categoryTotals[0];
  if (top && top.totalCents > 0) {
    const name = input.categoryNames.get(top.categoryId) ?? 'Uncategorised';
    insights.push({
      title: `Largest expense: ${name}`,
      body: `${formatRs(top.totalCents)} this month — ${Math.round(top.share * 100)}% of all spending (${formatRs(summary.expenseCents)}). Cutting this one category moves your balance the most.`,
      kind: 'info',
    });
  }

  // Savings rate.
  if (summary.incomeCents > 0) {
    const rate = Math.round(summary.savingsRate * 100);
    insights.push({
      title:
        summary.surplusCents >= 0
          ? `You kept ${rate}% of this month's income`
          : 'Spending is above income this month',
      body:
        summary.surplusCents >= 0
          ? `Income ${formatRs(summary.incomeCents)}, spending ${formatRs(summary.expenseCents)}, surplus ${formatRs(summary.surplusCents)}.`
          : `Income ${formatRs(summary.incomeCents)}, spending ${formatRs(summary.expenseCents)} — overspend ${formatRs(-summary.surplusCents)}. Check the largest category above first.`,
      kind: summary.surplusCents >= 0 ? 'good' : 'warning',
    });
  } else if (summary.expenseCents > 0) {
    insights.push({
      title: 'No income recorded this month',
      body: `Spending so far is ${formatRs(summary.expenseCents)}. Add your income and the coach can show your real savings rate.`,
      kind: 'info',
    });
  }

  // Budget overruns and near-limits.
  for (const status of statuses) {
    const name =
      input.categoryNames.get(status.categoryId) ?? 'Uncategorised';
    if (status.overBudget) {
      insights.push({
        title: `Over budget: ${name}`,
        body: `Spent ${formatRs(status.spentCents)} of a ${formatRs(status.limitCents)} limit — over by ${formatRs(status.spentCents - status.limitCents)}.`,
        kind: 'warning',
      });
    } else if (status.nearLimit) {
      insights.push({
        title: `Near the limit: ${name}`,
        body: `Spent ${formatRs(status.spentCents)} of ${formatRs(status.limitCents)} (${Math.round(status.usedRatio * 100)}% used). ${formatRs(status.remainingCents)} left for the rest of the month.`,
        kind: 'warning',
      });
    }
  }

  // Goal pace.
  for (const goal of input.goals) {
    const pace = goalPace(goal);
    if (pace.reached) {
      insights.push({
        title: `Goal reached: ${goal.name}`,
        body: `Saved ${formatRs(goal.saved_cents)} of ${formatRs(goal.target_cents)}. Well done — set a new target when you are ready.`,
        kind: 'good',
      });
    } else if (pace.overdue) {
      insights.push({
        title: `Goal date passed: ${goal.name}`,
        body: `${formatRs(pace.remainingCents)} still needed. The target date has passed — set a new date or adjust the target so the plan stays realistic.`,
        kind: 'warning',
      });
    } else if (pace.requiredMonthlyCents !== null) {
      insights.push({
        title: `Goal pace: ${goal.name}`,
        body: `${formatRs(pace.remainingCents)} to go. Saving ${formatRs(pace.requiredMonthlyCents)} per month reaches the target on time.`,
        kind: 'info',
      });
    }
  }

  // Debt guidance from the user's actual debts.
  const activeDebts = input.debts.filter((d) => d.balance_cents > 0);
  if (activeDebts.length > 0) {
    const avalanche = avalancheOrder(activeDebts);
    const snowball = snowballOrder(activeDebts);
    const firstAvalanche = avalanche[0];
    const firstSnowball = snowball[0];
    insights.push({
      title: `Total debt: ${formatRs(totalDebt(activeDebts))}`,
      body: `Minimum payments total ${formatRs(totalMinPayments(activeDebts))} per month. Avalanche order (cheapest overall): pay "${firstAvalanche.name}" first (${firstAvalanche.apr}% APR). Snowball order (quickest win): pay "${firstSnowball.name}" first (${formatRs(firstSnowball.balance_cents)} left). Pay minimums on all debts, then put every extra rupee on the first debt in your chosen order.`,
      kind: 'warning',
    });
  }

  return insights;
}

/** Short concrete next actions, derived from the same numbers. */
export function buildNextActions(input: CoachInput): string[] {
  const actions: string[] = [];
  const summary = summarizeMonth(input.transactions, input.monthKey);
  const statuses = budgetStatuses(input.budgets, input.transactions, input.monthKey);
  const over = statuses.filter((s) => s.overBudget);
  if (over.length > 0) {
    const name = input.categoryNames.get(over[0].categoryId) ?? 'a category';
    actions.push(`Review ${name} spending — it is over budget this month.`);
  }
  const top = expenseByCategory(input.transactions, input.monthKey)[0];
  if (top && top.totalCents > 0) {
    const name = input.categoryNames.get(top.categoryId) ?? 'your top category';
    actions.push(`Set a budget for ${name} so next month has a limit to watch.`);
  }
  if (summary.incomeCents > 0 && summary.surplusCents > 0) {
    actions.push(
      `Move ${formatRs(summary.surplusCents)} of this month's surplus into a savings goal.`,
    );
  }
  const behindGoals = input.goals.filter((g) => {
    const pace = goalPace(g);
    return !pace.reached && pace.requiredMonthlyCents !== null && pace.requiredMonthlyCents > 0;
  });
  if (behindGoals.length > 0) {
    actions.push(`Add this month's saving to "${behindGoals[0].name}" before spending it.`);
  }
  const activeDebts = input.debts.filter((d) => d.balance_cents > 0);
  if (activeDebts.length > 0) {
    actions.push(
      `Log one extra payment on "${avalancheOrder(activeDebts)[0].name}" — the highest-APR debt.`,
    );
  }
  if (actions.length === 0 && input.transactions.length > 0) {
    actions.push('Keep recording every transaction — the coach gets sharper with more history.');
  }
  return actions.slice(0, 5);
}
