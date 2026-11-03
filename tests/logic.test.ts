import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  avalancheOrder,
  budgetStatuses,
  expenseByCategory,
  goalPace,
  snowballOrder,
  summarizeMonth,
  totalBalance,
  totalDebt,
} from '../src/utils/calculations';
import { buildCoachInsights } from '../src/utils/coach';
import { formatRs, parseAmountToCents } from '../src/utils/money';

const tx = (
  amount_cents: number,
  type: 'income' | 'expense',
  category_id: number,
  date: string,
) => ({ amount_cents, type, category_id, date });

describe('money formatting and parsing', () => {
  it('formats cents with grouping and decimals', () => {
    assert.equal(formatRs(123456), 'Rs 1,234.56');
    assert.equal(formatRs(0), 'Rs 0.00');
    assert.equal(formatRs(-5000), '-Rs 50.00');
  });

  it('parses user input strictly', () => {
    assert.equal(parseAmountToCents('250'), 25000);
    assert.equal(parseAmountToCents('250.5'), 25050);
    assert.equal(parseAmountToCents('Rs 1,250.00'), 125000);
    assert.equal(parseAmountToCents('0'), null);
    assert.equal(parseAmountToCents('-5'), null);
    assert.equal(parseAmountToCents('12.345'), null);
    assert.equal(parseAmountToCents('abc'), null);
    assert.equal(parseAmountToCents(''), null);
  });
});

describe('month summary and balance', () => {
  it('empty data gives zeros', () => {
    const summary = summarizeMonth([], '2026-11');
    assert.equal(summary.incomeCents, 0);
    assert.equal(summary.expenseCents, 0);
    assert.equal(summary.surplusCents, 0);
    assert.equal(totalBalance([]), 0);
  });

  it('sums only the requested month, mixed income and expense', () => {
    const rows = [
      tx(1000000, 'income', 1, '2026-11-02'),
      tx(25000, 'expense', 2, '2026-11-03'),
      tx(999999, 'expense', 2, '2026-10-31'),
    ];
    const summary = summarizeMonth(rows, '2026-11');
    assert.equal(summary.incomeCents, 1000000);
    assert.equal(summary.expenseCents, 25000);
    assert.equal(summary.surplusCents, 975000);
    assert.equal(summary.savingsRate, 0.975);
    assert.equal(totalBalance(rows), 1000000 - 25000 - 999999);
  });

  it('largest expense category is ranked first with shares', () => {
    const rows = [
      tx(80000, 'expense', 2, '2026-11-01'),
      tx(20000, 'expense', 3, '2026-11-01'),
    ];
    const totals = expenseByCategory(rows, '2026-11');
    assert.equal(totals[0].categoryId, 2);
    assert.equal(totals[0].share, 0.8);
  });
});

describe('budgets', () => {
  it('detects over-budget and near-limit', () => {
    const rows = [
      tx(110000, 'expense', 2, '2026-11-01'),
      tx(85000, 'expense', 3, '2026-11-01'),
    ];
    const statuses = budgetStatuses(
      [
        { category_id: 2, monthly_limit_cents: 100000 },
        { category_id: 3, monthly_limit_cents: 100000 },
        { category_id: 4, monthly_limit_cents: 100000 },
      ],
      rows,
      '2026-11',
    );
    assert.equal(statuses[0].overBudget, true);
    assert.equal(statuses[1].nearLimit, true);
    assert.equal(statuses[1].usedRatio, 0.85);
    assert.equal(statuses[2].spentCents, 0);
    assert.equal(statuses[2].overBudget, false);
  });
});

describe('goals', () => {
  it('goal already reached reports zero remaining', () => {
    const pace = goalPace({ target_cents: 100000, saved_cents: 100000, target_date: '2026-12-31' }, '2026-11-03');
    assert.equal(pace.reached, true);
    assert.equal(pace.remainingCents, 0);
    assert.equal(pace.requiredMonthlyCents, 0);
  });

  it('required monthly saving divides the remainder over months left', () => {
    const pace = goalPace({ target_cents: 100000, saved_cents: 40000, target_date: '2027-01-31' }, '2026-11-03');
    // Nov, Dec, Jan = 3 months; 60000 / 3 = 20000.
    assert.equal(pace.monthsLeft, 3);
    assert.equal(pace.requiredMonthlyCents, 20000);
    assert.equal(pace.overdue, false);
  });

  it('no target date means no monthly requirement', () => {
    const pace = goalPace({ target_cents: 100000, saved_cents: 10000, target_date: null }, '2026-11-03');
    assert.equal(pace.requiredMonthlyCents, null);
    assert.equal(pace.monthsLeft, null);
  });
});

describe('debt payoff ordering', () => {
  const debts = [
    { id: 1, balance_cents: 500000, apr: 0, min_payment_cents: 0 },
    { id: 2, balance_cents: 2000000, apr: 24, min_payment_cents: 0 },
    { id: 3, balance_cents: 1000000, apr: 12, min_payment_cents: 0 },
  ];

  it('avalanche orders by APR first, zero-APR debt is skipped for interest', () => {
    assert.deepEqual(avalancheOrder(debts).map((d) => d.id), [2, 3, 1]);
  });

  it('snowball orders by smallest balance first', () => {
    assert.deepEqual(snowballOrder(debts).map((d) => d.id), [1, 3, 2]);
  });

  it('total debt ignores negative balances', () => {
    assert.equal(totalDebt([...debts, { id: 4, balance_cents: -5, apr: 0, min_payment_cents: 0 }]), 3500000);
  });
});

describe('coach', () => {
  it('empty data gives a single getting-started insight', () => {
    const insights = buildCoachInsights({
      transactions: [],
      budgets: [],
      goals: [],
      debts: [],
      categoryNames: new Map(),
      monthKey: '2026-11',
    });
    assert.equal(insights.length, 1);
    assert.match(insights[0].title, /first transaction/);
  });

  it('flags the largest expense driver with real numbers', () => {
    const insights = buildCoachInsights({
      transactions: [
        tx(900000, 'income', 1, '2026-11-01'),
        tx(300000, 'expense', 2, '2026-11-02'),
        tx(100000, 'expense', 3, '2026-11-02'),
      ],
      budgets: [{ category_id: 2, monthly_limit_cents: 200000 }],
      goals: [],
      debts: [],
      categoryNames: new Map([
        [2, 'Food'],
        [3, 'Transport'],
      ]),
      monthKey: '2026-11',
    });
    const titles = insights.map((i) => i.title).join(' | ');
    assert.match(titles, /Largest expense: Food/);
    assert.match(titles, /Over budget: Food/);
    assert.ok(insights.some((i) => i.body.includes('Rs 3,000.00')));
  });
});
