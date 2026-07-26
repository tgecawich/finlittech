/**
 * Compound growth of regular savings — the future value of an ordinary annuity.
 *
 * The closed form is
 *
 *     FV = PMT × (((1 + r)^n − 1) / r)
 *
 * (reference: future value of an ordinary annuity, e.g.
 * https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator).
 * But as with the credit card, this simulates period by period instead, for
 * three reasons: it applies the domain's rounding convention (interest rounds
 * to a whole cent each month, matching a real account), it returns the whole
 * trajectory rather than only the endpoint — the chart *is* the product here —
 * and it makes the "started ten years later" comparison a change of one
 * argument rather than a second formula.
 *
 * Contributions are treated as an *ordinary* annuity: each month, interest
 * posts on the running balance and then the contribution is added, so the final
 * contribution earns no interest. This is the same timing the closed form
 * above assumes, which is what lets the tests use it as an independent oracle.
 */

import { addCents, multiplyCentsByRate, subtractCents } from './money';
import {
  ZERO_CENTS,
  toMonthlyRate,
  type Cents,
  type Months,
  type Rate,
} from './types';

/** One month of a savings trajectory. */
export interface CompoundPoint {
  /** 0-based month. Month 0 is the starting line: nothing contributed, nothing grown. */
  readonly month: Months;
  /** Everything paid in up to and including this month. */
  readonly contributed: Cents;
  /** Account value at the end of this month. */
  readonly value: Cents;
  /**
   * Value minus contributions — the part that is growth rather than your own
   * money. Equal to the sum of every interest posting so far, by construction.
   */
  readonly growth: Cents;
}

function assertWholeMonths(name: string, months: Months): void {
  if (!Number.isInteger(months) || months < 0) {
    throw new RangeError(`${name} must be a whole number of months >= 0, received ${months}`);
  }
}

/**
 * Project a monthly contribution forward, returning a value for every month
 * from 0 to `totalMonths` inclusive.
 *
 * `startMonth` delays the first contribution: with `startMonth = 0` money goes
 * in from month 1, and with `startMonth = 120` the first ten years contribute
 * nothing and deposits begin in month 121. A `startMonth` at or beyond
 * `totalMonths` simply never contributes, which is a valid — if bleak — answer,
 * not an error.
 *
 * Throws on negative money or a percentage passed where a fraction was meant,
 * because those are caller bugs.
 */
export function projectSavings(
  monthlyContribution: Cents,
  annualRate: Rate,
  totalMonths: Months,
  startMonth: Months = 0,
): CompoundPoint[] {
  if (monthlyContribution < 0) {
    throw new RangeError(
      `projectSavings: monthlyContribution must not be negative, received ${monthlyContribution}`,
    );
  }
  assertWholeMonths('projectSavings: totalMonths', totalMonths);
  assertWholeMonths('projectSavings: startMonth', startMonth);

  // Validates the rate, so an APR passed as 7 instead of 0.07 throws here.
  const monthlyRate = toMonthlyRate(annualRate);

  const series: CompoundPoint[] = [
    { month: 0, contributed: ZERO_CENTS, value: ZERO_CENTS, growth: ZERO_CENTS },
  ];

  let value: Cents = ZERO_CENTS;
  let contributed: Cents = ZERO_CENTS;

  for (let month = 1; month <= totalMonths; month += 1) {
    // Ordinary annuity: interest on the prior balance posts first, then the
    // deposit — so this month's contribution earns nothing this month.
    const interest = multiplyCentsByRate(value, monthlyRate);
    value = addCents(value, interest);

    if (month > startMonth) {
      value = addCents(value, monthlyContribution);
      contributed = addCents(contributed, monthlyContribution);
    }

    series.push({
      month,
      contributed,
      value,
      growth: subtractCents(value, contributed),
    });
  }

  return series;
}

/** The two trajectories a "cost of waiting" chart compares, and the gap between them. */
export interface WaitingCostResult {
  /** Contributing from the start. */
  readonly immediate: readonly CompoundPoint[];
  /** Contributing only after `delayMonths` have passed, on the same timeline. */
  readonly delayed: readonly CompoundPoint[];
  /** How long the delayed saver waits. */
  readonly delayMonths: Months;
  /**
   * What the delay costs: the immediate saver's final value minus the delayed
   * saver's. This is the emotional core number — the headline the page leads
   * with.
   */
  readonly costOfWaiting: Cents;
  /** Total the immediate saver pays in. */
  readonly immediateContributed: Cents;
  /** Total the delayed saver pays in — always less, since they contribute for fewer months. */
  readonly delayedContributed: Cents;
}

/**
 * Compare contributing now against contributing after a delay, on one shared
 * timeline, and report the gap at the end.
 *
 * Both savers put in the same amount each month at the same rate; the only
 * difference is when they start. The whole point of the chart is that the gap
 * is far larger than the difference in what they paid in.
 */
export function costOfWaiting(
  monthlyContribution: Cents,
  annualRate: Rate,
  totalMonths: Months,
  delayMonths: Months,
): WaitingCostResult {
  const immediate = projectSavings(monthlyContribution, annualRate, totalMonths, 0);
  const delayed = projectSavings(monthlyContribution, annualRate, totalMonths, delayMonths);

  // Both series have totalMonths + 1 points and are never empty (month 0 is
  // always present), so the final point is defined without an index guard.
  const immediateFinal = immediate[immediate.length - 1] as CompoundPoint;
  const delayedFinal = delayed[delayed.length - 1] as CompoundPoint;

  return {
    immediate,
    delayed,
    delayMonths,
    costOfWaiting: subtractCents(immediateFinal.value, delayedFinal.value),
    immediateContributed: immediateFinal.contributed,
    delayedContributed: delayedFinal.contributed,
  };
}
