import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { amortize, type LoanPeriod } from '@/lib/finance/loan';
import { sumCents } from '@/lib/finance/money';
import { centsFromInteger, toCents } from '@/lib/finance/types';

function lastOf(schedule: readonly LoanPeriod[]): LoanPeriod {
  const period = schedule[schedule.length - 1];
  if (period === undefined) throw new Error('empty schedule');
  return period;
}

describe('amortize — verified against a published payment', () => {
  /**
   * $200,000 at 6.00% APR over 360 months. The level payment is the textbook
   * $1,199.10 — one of the most widely published amortization figures there is
   * (any mortgage calculator; the formula M = P·i / (1 − (1+i)^−n)).
   */
  const result = amortize(toCents(200_000), 0.06, 360);

  it('computes the canonical $1,199.10 monthly payment', () => {
    expect(result.monthlyPayment).toBe(toCents(1199.1));
  });

  it('runs for exactly the term and closes on zero', () => {
    expect(result.schedule).toHaveLength(360);
    expect(lastOf(result.schedule).endingBalance).toBe(0);
  });

  it('total paid is principal plus interest, and interest is about $231,676', () => {
    // 360 × $1,199.10 ≈ $431,676, of which $231,676 is interest. Checked against
    // the same published schedule, not against this implementation.
    expect(result.totalPaid).toBe(centsFromInteger(result.totalInterest + toCents(200_000)));
    expect(result.totalInterest).toBeGreaterThan(toCents(231_000));
    expect(result.totalInterest).toBeLessThan(toCents(232_000));
  });

  it('first month is almost all interest, as amortization goes', () => {
    // $200,000 × 0.5% = $1,000.00 of the first $1,199.10 is interest.
    const first = result.schedule[0];
    expect(first?.interest).toBe(toCents(1000));
    expect(first?.principal).toBe(toCents(199.1));
  });
});

describe('amortize — a second published check', () => {
  it('gives $860.66 on $10,000 at 6% over 12 months', () => {
    // Widely published short-term amortization figure.
    const result = amortize(toCents(10_000), 0.06, 12);
    expect(result.monthlyPayment).toBe(toCents(860.66));
    expect(lastOf(result.schedule).endingBalance).toBe(0);
  });
});

describe('amortize — required explicit cases', () => {
  it('zero rate splits the principal evenly with no interest', () => {
    const result = amortize(toCents(1200), 0, 12);
    expect(result.monthlyPayment).toBe(toCents(100));
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBe(toCents(1200));
    expect(lastOf(result.schedule).endingBalance).toBe(0);
  });

  it('zero rate with a remainder lands the residual in the final payment', () => {
    const result = amortize(toCents(1000), 0, 3);
    // round(1000/3) = $333.33 billed twice, then the remainder.
    expect(result.monthlyPayment).toBe(toCents(333.33));
    expect(result.totalPaid).toBe(toCents(1000));
    expect(lastOf(result.schedule).endingBalance).toBe(0);
  });

  it('zero principal is a schedule of nothing owed', () => {
    const result = amortize(toCents(0), 0.06, 12);
    expect(result.monthlyPayment).toBe(0);
    expect(result.totalPaid).toBe(0);
    expect(result.totalInterest).toBe(0);
    expect(lastOf(result.schedule).endingBalance).toBe(0);
  });

  it('a single-period loan pays principal plus one month of interest', () => {
    const result = amortize(toCents(1000), 0.12, 1);
    expect(result.schedule).toHaveLength(1);
    expect(result.totalInterest).toBe(toCents(10)); // 1000 × 1%
    expect(result.totalPaid).toBe(toCents(1010));
    expect(lastOf(result.schedule).endingBalance).toBe(0);
  });
});

describe('amortize — programmer error', () => {
  it('throws on a negative principal', () => {
    expect(() => amortize(toCents(-1), 0.06, 12)).toThrow(/principal/);
  });

  it('throws on a term under one month or a fractional term', () => {
    expect(() => amortize(toCents(1000), 0.06, 0)).toThrow(/termMonths/);
    expect(() => amortize(toCents(1000), 0.06, 12.5)).toThrow(/termMonths/);
  });

  it('throws when an APR is passed as a percentage', () => {
    expect(() => amortize(toCents(1000), 6, 12)).toThrow(/decimal fraction/);
  });
});

/** Principal $100–$1,000,000, rate 0–15%, term 1–480 months. */
const scenario = fc.record({
  principalCents: fc.integer({ min: 10_000, max: 100_000_000 }),
  annualRateBasisPoints: fc.integer({ min: 0, max: 1_500 }),
  termMonths: fc.integer({ min: 1, max: 480 }),
});

describe('amortize — invariants', () => {
  it('runs for exactly the term and closes on exactly zero', () => {
    fc.assert(
      fc.property(scenario, ({ principalCents, annualRateBasisPoints, termMonths }) => {
        const result = amortize(
          centsFromInteger(principalCents),
          annualRateBasisPoints / 10_000,
          termMonths,
        );
        expect(result.schedule).toHaveLength(termMonths);
        expect(lastOf(result.schedule).endingBalance).toBe(0);
      }),
    );
  });

  it('the schedule sums to the principal and to the totals it reports', () => {
    fc.assert(
      fc.property(scenario, ({ principalCents, annualRateBasisPoints, termMonths }) => {
        const principal = centsFromInteger(principalCents);
        const result = amortize(principal, annualRateBasisPoints / 10_000, termMonths);
        expect(sumCents(result.schedule.map((p) => p.principal))).toBe(principal);
        expect(sumCents(result.schedule.map((p) => p.interest))).toBe(result.totalInterest);
        expect(sumCents(result.schedule.map((p) => p.payment))).toBe(result.totalPaid);
        expect(result.totalPaid).toBe(principal + result.totalInterest);
      }),
    );
  });

  it('every period is internally consistent and the balance only falls', () => {
    fc.assert(
      fc.property(scenario, ({ principalCents, annualRateBasisPoints, termMonths }) => {
        const principal = centsFromInteger(principalCents);
        const result = amortize(principal, annualRateBasisPoints / 10_000, termMonths);
        let expectedStart: number = principal;
        result.schedule.forEach((period, index) => {
          expect(period.month).toBe(index + 1);
          expect(period.startingBalance).toBe(expectedStart);
          expect(period.principal).toBe(period.payment - period.interest);
          expect(period.endingBalance).toBe(period.startingBalance - period.principal);
          expect(period.endingBalance).toBeGreaterThanOrEqual(0);
          expect(period.endingBalance).toBeLessThanOrEqual(period.startingBalance);
          expectedStart = period.endingBalance;
        });
      }),
    );
  });

  it('a materially higher rate never costs less interest', () => {
    // Monotonicity is a continuous fact; per-cent rounding can flip it by a cent
    // on a trivially small loan where a whole month's interest rounds to change.
    // Tested where it is meaningful: a real-sized loan and a rate jump whose
    // effect is dollars, far above the rounding floor.
    fc.assert(
      fc.property(
        fc.record({
          principalCents: fc.integer({ min: 1_000_000, max: 100_000_000 }),
          baseBps: fc.integer({ min: 0, max: 800 }),
          extraBps: fc.integer({ min: 50, max: 600 }),
          termMonths: fc.integer({ min: 12, max: 480 }),
        }),
        ({ principalCents, baseBps, extraBps, termMonths }) => {
          const principal = centsFromInteger(principalCents);
          const lower = amortize(principal, baseBps / 10_000, termMonths);
          const higher = amortize(principal, (baseBps + extraBps) / 10_000, termMonths);
          expect(higher.totalInterest).toBeGreaterThanOrEqual(lower.totalInterest);
        },
      ),
    );
  });

  it('a longer term lowers the monthly payment but raises total interest', () => {
    fc.assert(
      fc.property(
        fc.record({
          principalCents: fc.integer({ min: 1_000_000, max: 100_000_000 }),
          annualRateBasisPoints: fc.integer({ min: 100, max: 1_500 }),
          termMonths: fc.integer({ min: 12, max: 240 }),
        }),
        fc.integer({ min: 12, max: 240 }),
        ({ principalCents, annualRateBasisPoints, termMonths }, extraMonths) => {
          const principal = centsFromInteger(principalCents);
          const rate = annualRateBasisPoints / 10_000;
          const shorter = amortize(principal, rate, termMonths);
          const longer = amortize(principal, rate, termMonths + extraMonths);
          expect(longer.monthlyPayment).toBeLessThanOrEqual(shorter.monthlyPayment);
          expect(longer.totalInterest).toBeGreaterThanOrEqual(shorter.totalInterest);
        },
      ),
    );
  });
});
