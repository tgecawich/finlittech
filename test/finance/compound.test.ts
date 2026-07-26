import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  costOfWaiting,
  projectSavings,
  type CompoundPoint,
} from '@/lib/finance/compound';
import { centsFromInteger, toCents, toMonthlyRate } from '@/lib/finance/types';

function finalOf(series: readonly CompoundPoint[]): CompoundPoint {
  const last = series[series.length - 1];
  if (last === undefined) throw new Error('empty series');
  return last;
}

/**
 * Independent oracle: the closed-form future value of an ordinary annuity,
 *
 *     FV = PMT × (((1 + r)^n − 1) / r),   and PMT × n when r = 0.
 *
 * Computed in floating point with no per-month rounding, so it is a genuinely
 * different algorithm from the integer simulation under test. Reference: future
 * value of an annuity, https://en.wikipedia.org/wiki/Future_value#Annuity.
 */
function closedFormFV(pmtCents: number, annualRate: number, n: number): number {
  const r = toMonthlyRate(annualRate);
  if (r === 0) return pmtCents * n;
  return (pmtCents * (Math.pow(1 + r, n) - 1)) / r;
}

/**
 * The most a per-month half-cent rounding step can drift by the end, once each
 * step is compounded for the months that follow it:
 *
 *     0.5 × Σ_{k=0}^{n} (1 + r)^k  =  0.5 × ((1 + r)^(n+1) − 1) / r.
 *
 * Comparing against this — rather than a flat cent tolerance — is what makes the
 * oracle test honest for long horizons, where a naive "within n cents" would be
 * far too tight.
 */
function driftBound(annualRate: number, n: number): number {
  const r = toMonthlyRate(annualRate);
  if (r === 0) return 0;
  return 0.5 * ((Math.pow(1 + r, n + 1) - 1) / r) + 1;
}

describe('projectSavings — hand-checked schedule', () => {
  /**
   * $100 a month at 12.00% APR, so the monthly rate is exactly 1% and every
   * figure stays a whole number of cents, checkable by hand:
   *
   *   month  interest   deposit    value
   *       1      0.00    100.00   100.00
   *       2      1.00    100.00   201.00
   *       3      2.01    100.00   303.01
   *
   * Interest posts on the prior balance, then the deposit — an ordinary annuity,
   * so the last deposit earns nothing. FV = 100 × ((1.01^3 − 1) / 0.01) =
   * $303.01, which the closed form and this table agree on exactly.
   */
  const series = projectSavings(toCents(100), 0.12, 3);

  it('starts on a zero line at month 0', () => {
    expect(series[0]).toEqual({
      month: 0,
      contributed: 0,
      value: 0,
      growth: 0,
    });
  });

  it('matches the hand-derived table', () => {
    expect(series).toHaveLength(4); // month 0 through 3
    expect(series[1]).toEqual({ month: 1, contributed: 10_000, value: 10_000, growth: 0 });
    expect(series[2]).toEqual({ month: 2, contributed: 20_000, value: 20_100, growth: 100 });
    expect(series[3]).toEqual({ month: 3, contributed: 30_000, value: 30_301, growth: 301 });
  });

  it('agrees with the closed form once its float noise is rounded away', () => {
    // The integer simulation lands on exactly 30301 cents. The closed form,
    // computed with Math.pow, is 30301.000000000135 — so the sim is the more
    // exact of the two, and the comparison is against the rounded oracle.
    expect(finalOf(series).value).toBe(Math.round(closedFormFV(toCents(100), 0.12, 3)));
  });
});

describe('projectSavings — required explicit cases', () => {
  it('zero rate: value is just the sum of contributions', () => {
    const series = projectSavings(toCents(50), 0, 24);
    const final = finalOf(series);
    expect(final.value).toBe(toCents(1200));
    expect(final.contributed).toBe(toCents(1200));
    expect(final.growth).toBe(0);
  });

  it('zero contribution: nothing ever accrues, because there is nothing to grow', () => {
    const series = projectSavings(toCents(0), 0.2215, 120);
    expect(series).toHaveLength(121);
    expect(finalOf(series).value).toBe(0);
    expect(finalOf(series).growth).toBe(0);
  });

  it('a single month contributes once and earns no interest that month', () => {
    // Ordinary annuity: the deposit lands at period close, so month 1 is just
    // the deposit.
    const series = projectSavings(toCents(100), 0.12, 1);
    expect(finalOf(series)).toEqual({
      month: 1,
      contributed: 10_000,
      value: 10_000,
      growth: 0,
    });
  });

  it('zero months returns only the starting line', () => {
    const series = projectSavings(toCents(100), 0.07, 0);
    expect(series).toEqual([{ month: 0, contributed: 0, value: 0, growth: 0 }]);
  });
});

describe('projectSavings — programmer error', () => {
  it('throws on a negative contribution', () => {
    expect(() => projectSavings(toCents(-1), 0.07, 12)).toThrow(/monthlyContribution/);
  });

  it('throws on negative or fractional months', () => {
    expect(() => projectSavings(toCents(100), 0.07, -1)).toThrow(/totalMonths/);
    expect(() => projectSavings(toCents(100), 0.07, 12.5)).toThrow(/totalMonths/);
  });

  it('throws on a negative or fractional start month', () => {
    expect(() => projectSavings(toCents(100), 0.07, 12, -1)).toThrow(/startMonth/);
    expect(() => projectSavings(toCents(100), 0.07, 12, 1.5)).toThrow(/startMonth/);
  });

  it('throws when an APR is passed as a percentage', () => {
    expect(() => projectSavings(toCents(100), 7, 12)).toThrow(/decimal fraction/);
  });
});

describe('costOfWaiting — hand-checked', () => {
  /**
   * $100 a month at 12% APR over three months. The immediate saver contributes
   * every month (final value $303.01, from the table above). The delayed saver
   * waits one month, contributing only in months 2 and 3:
   *
   *   month  interest   deposit    value
   *       1      0.00      0.00     0.00
   *       2      0.00    100.00   100.00
   *       3      1.00    100.00   201.00
   *
   * so the gap is $303.01 − $201.00 = $102.01, on just $100 less paid in.
   */
  const result = costOfWaiting(toCents(100), 0.12, 3, 1);

  it('reports both final values and the gap between them', () => {
    expect(finalOf(result.immediate).value).toBe(toCents(303.01));
    expect(finalOf(result.delayed).value).toBe(toCents(201));
    expect(result.costOfWaiting).toBe(toCents(102.01));
  });

  it('reports what each saver paid in', () => {
    expect(result.immediateContributed).toBe(toCents(300));
    expect(result.delayedContributed).toBe(toCents(200));
  });

  it('keeps both series on the same timeline', () => {
    expect(result.immediate).toHaveLength(4);
    expect(result.delayed).toHaveLength(4);
    expect(result.delayMonths).toBe(1);
  });

  it('costs nothing when the delay is zero', () => {
    const noWait = costOfWaiting(toCents(100), 0.12, 3, 0);
    expect(noWait.costOfWaiting).toBe(0);
    expect(noWait.immediateContributed).toBe(noWait.delayedContributed);
  });

  it('the delay may exceed the horizon, leaving the delayed saver with nothing', () => {
    const result = costOfWaiting(toCents(100), 0.07, 12, 24);
    expect(finalOf(result.delayed).value).toBe(0);
    expect(result.delayedContributed).toBe(0);
    expect(result.costOfWaiting).toBe(finalOf(result.immediate).value);
  });
});

/** Contribution up to $2,000/mo, rate up to 12%, up to 30 years. */
const scenario = fc.record({
  contributionCents: fc.integer({ min: 0, max: 200_000 }),
  annualRateBasisPoints: fc.integer({ min: 0, max: 1_200 }),
  months: fc.integer({ min: 1, max: 360 }),
});

describe('projectSavings — invariants', () => {
  it('value always equals contributions plus growth, at every point', () => {
    fc.assert(
      fc.property(scenario, ({ contributionCents, annualRateBasisPoints, months }) => {
        const series = projectSavings(
          centsFromInteger(contributionCents),
          annualRateBasisPoints / 10_000,
          months,
        );
        for (const point of series) {
          expect(point.value).toBe(point.contributed + point.growth);
        }
      }),
    );
  });

  it('value and contributions never decrease over time', () => {
    fc.assert(
      fc.property(scenario, ({ contributionCents, annualRateBasisPoints, months }) => {
        const series = projectSavings(
          centsFromInteger(contributionCents),
          annualRateBasisPoints / 10_000,
          months,
        );
        for (let i = 1; i < series.length; i += 1) {
          const prev = series[i - 1] as CompoundPoint;
          const curr = series[i] as CompoundPoint;
          expect(curr.value).toBeGreaterThanOrEqual(prev.value);
          expect(curr.contributed).toBeGreaterThanOrEqual(prev.contributed);
          expect(curr.month).toBe(i);
        }
      }),
    );
  });

  it('growth is never negative when the rate is not', () => {
    fc.assert(
      fc.property(scenario, ({ contributionCents, annualRateBasisPoints, months }) => {
        const final = finalOf(
          projectSavings(
            centsFromInteger(contributionCents),
            annualRateBasisPoints / 10_000,
            months,
          ),
        );
        expect(final.growth).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it('a bigger contribution never ends lower', () => {
    fc.assert(
      fc.property(
        scenario,
        fc.integer({ min: 1, max: 50_000 }),
        ({ contributionCents, annualRateBasisPoints, months }, extra) => {
          const rate = annualRateBasisPoints / 10_000;
          const base = finalOf(projectSavings(centsFromInteger(contributionCents), rate, months));
          const more = finalOf(
            projectSavings(centsFromInteger(contributionCents + extra), rate, months),
          );
          expect(more.value).toBeGreaterThanOrEqual(base.value);
        },
      ),
    );
  });

  it('a higher rate never ends lower', () => {
    fc.assert(
      fc.property(
        scenario,
        fc.integer({ min: 1, max: 800 }),
        ({ contributionCents, annualRateBasisPoints, months }, extraBps) => {
          const contribution = centsFromInteger(contributionCents);
          const base = finalOf(projectSavings(contribution, annualRateBasisPoints / 10_000, months));
          const higher = finalOf(
            projectSavings(contribution, (annualRateBasisPoints + extraBps) / 10_000, months),
          );
          expect(higher.value).toBeGreaterThanOrEqual(base.value);
        },
      ),
    );
  });

  it('stays within the compounded rounding-drift bound of the closed form', () => {
    fc.assert(
      fc.property(scenario, ({ contributionCents, annualRateBasisPoints, months }) => {
        const rate = annualRateBasisPoints / 10_000;
        const sim = finalOf(projectSavings(centsFromInteger(contributionCents), rate, months)).value;
        const oracle = closedFormFV(contributionCents, rate, months);
        expect(Math.abs(sim - oracle)).toBeLessThanOrEqual(driftBound(rate, months));
      }),
    );
  });
});

describe('costOfWaiting — invariants', () => {
  const delayed = fc.record({
    contributionCents: fc.integer({ min: 1, max: 200_000 }),
    annualRateBasisPoints: fc.integer({ min: 0, max: 1_200 }),
    months: fc.integer({ min: 1, max: 360 }),
    delayMonths: fc.integer({ min: 0, max: 360 }),
  });

  it('never reports a negative cost, and the delayed saver never pays in more', () => {
    fc.assert(
      fc.property(delayed, ({ contributionCents, annualRateBasisPoints, months, delayMonths }) => {
        const result = costOfWaiting(
          centsFromInteger(contributionCents),
          annualRateBasisPoints / 10_000,
          months,
          delayMonths,
        );
        expect(result.costOfWaiting).toBeGreaterThanOrEqual(0);
        expect(result.delayedContributed).toBeLessThanOrEqual(result.immediateContributed);
      }),
    );
  });

  it('waiting longer never costs less', () => {
    fc.assert(
      fc.property(
        fc.record({
          contributionCents: fc.integer({ min: 1, max: 200_000 }),
          annualRateBasisPoints: fc.integer({ min: 0, max: 1_200 }),
          months: fc.integer({ min: 2, max: 360 }),
        }),
        fc.integer({ min: 0, max: 179 }),
        fc.integer({ min: 1, max: 180 }),
        ({ contributionCents, annualRateBasisPoints, months }, shortWait, extraWait) => {
          const contribution = centsFromInteger(contributionCents);
          const rate = annualRateBasisPoints / 10_000;
          const shorter = costOfWaiting(contribution, rate, months, shortWait).costOfWaiting;
          const longer = costOfWaiting(contribution, rate, months, shortWait + extraWait)
            .costOfWaiting;
          expect(longer).toBeGreaterThanOrEqual(shorter);
        },
      ),
    );
  });
});
