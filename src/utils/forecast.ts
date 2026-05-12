import { ForecastInput, MonthlySummary } from '../types';

/**
 * Calculate month forecast (client-side mirror of DB trigger logic).
 *
 * When a budget exists for the month:
 *   forecast = balance + (plannedIncome - actualIncomeToDate)
 *                      - (plannedExpenses - actualExpensesToDate)
 *              + pendingTransactionsTotal
 *
 * pending transactions count only when date <= today (handled by caller).
 */
export function calculateForecast(input: ForecastInput): number {
  const {
    currentBalance,
    plannedIncome,
    plannedExpenses,
    actualIncomeToDate,
    actualExpensesToDate,
    pendingTransactionsTotal,
  } = input;

  return (
    currentBalance +
    (plannedIncome - actualIncomeToDate) -
    (plannedExpenses - actualExpensesToDate) +
    pendingTransactionsTotal
  );
}

/**
 * Calculate annual forecast across months.
 * - Months with a budget → use budget-based formula
 * - Months without a budget → use average of last 3 months
 */
export function calculateAnnualForecast(
  summaries: MonthlySummary[],
  currentMonth: number,
  currentYear: number
): number {
  const sorted = [...summaries].sort(
    (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)
  );

  const recent = sorted
    .filter((s) => s.year * 12 + s.month < currentYear * 12 + currentMonth)
    .slice(-3);

  const avgIncome =
    recent.length > 0
      ? recent.reduce((sum, s) => sum + (s.total_income ?? 0), 0) / recent.length
      : 0;

  const avgExpenses =
    recent.length > 0
      ? recent.reduce((sum, s) => sum + (s.total_expenses ?? 0), 0) / recent.length
      : 0;

  return avgIncome - avgExpenses;
}

/** Round to 2 decimal places (avoids floating point drift) */
export function roundAmount(value: number): number {
  return Math.round(value * 100) / 100;
}
