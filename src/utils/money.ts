// Money helpers. Amounts are integer cents everywhere in storage and
// calculations; these helpers only convert at the UI boundary.

export const CURRENCY_SYMBOL = 'Rs';

/** Format integer cents as "Rs 1,234.56". Negative values show a minus sign. */
export function formatRs(amountCents: number): string {
  const sign = amountCents < 0 ? '-' : '';
  const abs = Math.abs(amountCents);
  const whole = Math.floor(abs / 100);
  const cents = abs % 100;
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${CURRENCY_SYMBOL} ${grouped}.${cents.toString().padStart(2, '0')}`;
}

/**
 * Parse a user-typed amount into integer cents.
 * Accepts "250", "250.5", "Rs 1,250.00". Returns null for anything invalid
 * (empty, zero, negative, non-numeric, more than 2 decimal places).
 */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[Rs₨,\s]/gi, '').trim();
  if (cleaned === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  const cents = Math.round(value * 100);
  if (cents <= 0 || cents > 999_999_999_99) return null;
  return cents;
}

/** Local 'YYYY-MM-DD' for a Date (no UTC shift). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** 'YYYY-MM' for a 'YYYY-MM-DD' date key. */
export function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function currentMonthKey(): string {
  return monthKeyOf(todayKey());
}

/** 'June 2026' style label for a 'YYYY-MM' key. */
export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Whole months from `fromKey` (inclusive) to `toKey` (inclusive). Minimum 1. */
export function monthsBetweenInclusive(fromKey: string, toKey: string): number {
  const [fy, fm] = fromKey.split('-').map(Number);
  const [ty, tm] = toKey.split('-').map(Number);
  return Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
}
