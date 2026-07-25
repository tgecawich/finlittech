import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { payoffMonths, type PayoffResult } from '@/lib/finance/credit-card';
import { sumCents } from '@/lib/finance/money';
import { centsFromInteger, toCents, toMonthlyRate } from '@/lib/finance/types';
import { lastPeriod, periodAt } from './helpers';

function expectPaid(result: PayoffResult): Extract<PayoffResult, { kind: 'paid' }> {
  if (result.kind !== 'paid') {
    throw new Error(`expected a paid result, received "${result.kind}"`);
  }
  return result;
}

function expectNever(result: PayoffResult): Extract<PayoffResult, { kind: 'never' }> {
  if (result.kind !== 'never') {
    throw new Error(`expected a never result, received "${result.kind}"`);
  }
  return result;
}

/**
 * Independent oracle: the closed-form solution for the number of payments on a
 * declining balance.
 *
 *     n = -log(1 - (B x i) / P) / log(1 + i)
 *
 * This is the standard annuity payment-count formula — the same one behind
 * Excel's NPER and every published payoff calculator. It is a genuinely
 * different algorithm from the month-by-month simulation under test: it never
 * rounds to a cent, so agreement to within a single month is strong evidence
 * the simulation is right, and disagreement by more would mean it is not.
 *
 * Reference: Federal Reserve, "Credit card repayment calculator" methodology;
 * https://www.federalreserve.gov/creditcardcalculator/
 */
function closedFormMonths(balanceCents: number, annualRate: number, paymentCents: number): number {
  const monthlyRate = toMonthlyRate(annualRate);
  if (monthlyRate === 0) {
    return Math.ceil(balanceCents / paymentCents);
  }
  return Math.ceil(
    -Math.log(1 - (balanceCents * monthlyRate) / paymentCents) / Math.log(1 + monthlyRate),
  );
}

describe('payoffMonths — verified schedule', () => {
  /**
   * $1,000.00 at 12.00% APR paying $100.00 a month.
   *
   * The APR is chosen so the monthly periodic rate is exactly 1%, which makes
   * the whole table checkable by hand with no floating point in sight. Derived
   * from the method the CFPB describes — interest charged on the balance at the
   * start of each month, payment applied after — not from this implementation:
   *
   *   month  starting   interest  principal   ending
   *       1  1,000.00      10.00      90.00   910.00
   *       2    910.00       9.10      90.90   819.10
   *       3    819.10       8.19      91.81   727.29
   *       4    727.29       7.27      92.73   634.56
   *       5    634.56       6.35      93.65   540.91
   *       6    540.91       5.41      94.59   446.32
   *       7    446.32       4.46      95.54   350.78
   *       8    350.78       3.51      96.49   254.29
   *       9    254.29       2.54      97.46   156.83
   *      10    156.83       1.57      98.43    58.40
   *      11     58.40       0.58      58.40     0.00   <- final payment $58.98
   *
   * Method reference:
   * https://www.consumerfinance.gov/ask-cfpb/how-is-my-credit-card-interest-calculated-en-51/
   */
  const result = expectPaid(payoffMonths(toCents(1000), 0.12, toCents(100)));

  it('takes eleven months', () => {
    expect(result.months).toBe(11);
    expect(result.schedule).toHaveLength(11);
  });

  it('charges $58.98 of interest in total', () => {
    expect(result.totalInterest).toBe(toCents(58.98));
    expect(result.totalPaid).toBe(toCents(1058.98));
  });

  it('matches the hand-derived table month by month', () => {
    const expected = [
      { starting: 1000.0, interest: 10.0, principal: 90.0, ending: 910.0 },
      { starting: 910.0, interest: 9.1, principal: 90.9, ending: 819.1 },
      { starting: 819.1, interest: 8.19, principal: 91.81, ending: 727.29 },
      { starting: 727.29, interest: 7.27, principal: 92.73, ending: 634.56 },
      { starting: 634.56, interest: 6.35, principal: 93.65, ending: 540.91 },
      { starting: 540.91, interest: 5.41, principal: 94.59, ending: 446.32 },
      { starting: 446.32, interest: 4.46, principal: 95.54, ending: 350.78 },
      { starting: 350.78, interest: 3.51, principal: 96.49, ending: 254.29 },
      { starting: 254.29, interest: 2.54, principal: 97.46, ending: 156.83 },
      { starting: 156.83, interest: 1.57, principal: 98.43, ending: 58.4 },
      { starting: 58.4, interest: 0.58, principal: 58.4, ending: 0 },
    ];

    expected.forEach((row, index) => {
      const period = periodAt(result.schedule, index);
      expect(period.month).toBe(index + 1);
      expect(period.startingBalance).toBe(toCents(row.starting));
      expect(period.interest).toBe(toCents(row.interest));
      expect(period.principal).toBe(toCents(row.principal));
      expect(period.endingBalance).toBe(toCents(row.ending));
    });
  });

  it('reduces the final payment to exactly what is left', () => {
    const final = lastPeriod(result.schedule);
    expect(final.payment).toBe(toCents(58.98));
    expect(final.payment).toBeLessThan(toCents(100));
    expect(final.endingBalance).toBe(0);
  });

  it('agrees with the closed-form payment count', () => {
    expect(closedFormMonths(toCents(1000), 0.12, toCents(100))).toBe(11);
  });
});

describe('payoffMonths — the card that never pays off', () => {
  /**
   * $3,000.00 at 24.00% APR, so the monthly periodic rate is exactly 2% and the
   * first month's interest is exactly $60.00. Paying $50.00 a month does not
   * cover it, so the balance grows every month forever.
   */
  const result = expectNever(payoffMonths(toCents(3000), 0.24, toCents(50)));

  it('is a modelled state, not a thrown error', () => {
    expect(result.kind).toBe('never');
  });

  it('reports the monthly interest the payment fails to cover', () => {
    expect(result.monthlyInterest).toBe(toCents(60));
  });

  it('reports the exact shortfall, including the cent that makes progress', () => {
    // $60.01 is required to reduce the balance at all, so the shortfall on a
    // $50.00 payment is $10.01 — not $10.00. Paying exactly the interest leaves
    // the balance untouched forever, which is the trap the number has to name.
    expect(result.shortfall).toBe(toCents(10.01));
  });

  it('treats a payment exactly equal to the interest as never paying off', () => {
    const exact = expectNever(payoffMonths(toCents(3000), 0.24, toCents(60)));
    expect(exact.shortfall).toBe(toCents(0.01));
  });

  it('pays off once the shortfall is added, which is what makes the number true', () => {
    const paid = expectPaid(payoffMonths(toCents(3000), 0.24, toCents(60.01)));
    expect(paid.months).toBeGreaterThan(0);
    expect(lastPeriod(paid.schedule).endingBalance).toBe(0);
  });

  it('treats a zero payment on a real balance as never paying off', () => {
    const zeroPayment = expectNever(payoffMonths(toCents(500), 0.2215, toCents(0)));
    expect(zeroPayment.shortfall).toBeGreaterThan(0);
  });

  it('treats a zero payment at zero interest as never paying off', () => {
    // No interest accrues, but nothing is ever repaid either. The required
    // payment is one cent and the shortfall says so.
    const stalled = expectNever(payoffMonths(toCents(500), 0, toCents(0)));
    expect(stalled.monthlyInterest).toBe(0);
    expect(stalled.shortfall).toBe(1);
  });
});

describe('payoffMonths — required explicit cases', () => {
  it('zero rate: the balance divides evenly by the payment', () => {
    const result = expectPaid(payoffMonths(toCents(1000), 0, toCents(250)));
    expect(result.months).toBe(4);
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBe(toCents(1000));
    expect(lastPeriod(result.schedule).endingBalance).toBe(0);
  });

  it('zero rate with a remainder: the final payment is the remainder', () => {
    const result = expectPaid(payoffMonths(toCents(1000), 0, toCents(300)));
    expect(result.months).toBe(4);
    expect(lastPeriod(result.schedule).payment).toBe(toCents(100));
    expect(result.totalPaid).toBe(toCents(1000));
  });

  it('zero principal: paid off in no months at all', () => {
    const result = expectPaid(payoffMonths(toCents(0), 0.2215, toCents(50)));
    expect(result.months).toBe(0);
    expect(result.schedule).toHaveLength(0);
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBe(0);
  });

  it('payment exceeding the balance: one month, paying balance plus interest', () => {
    // $100.00 at 12% APR. One month of interest is $1.00, so the account clears
    // for $101.00 even though $500.00 was offered.
    const result = expectPaid(payoffMonths(toCents(100), 0.12, toCents(500)));
    expect(result.months).toBe(1);
    expect(result.totalInterest).toBe(toCents(1));
    expect(result.totalPaid).toBe(toCents(101));
    expect(lastPeriod(result.schedule).payment).toBe(toCents(101));
  });

  it('single period: a payment exactly equal to balance plus interest', () => {
    const result = expectPaid(payoffMonths(toCents(100), 0.12, toCents(101)));
    expect(result.months).toBe(1);
    expect(lastPeriod(result.schedule).payment).toBe(toCents(101));
    expect(lastPeriod(result.schedule).endingBalance).toBe(0);
  });

  it('charges nothing when a month of interest rounds to under a cent', () => {
    // A 14 cent balance at 33.75% APR accrues 0.39 cents a month, which rounds
    // to zero. The balance therefore behaves as interest-free and clears in 14
    // one-cent payments. An issuer's ledger does the same thing — it cannot
    // post a third of a cent — which is why simulating month by month is more
    // truthful here than the continuous formula, which insists on 19 months.
    const result = expectPaid(payoffMonths(centsFromInteger(14), 0.3375, centsFromInteger(1)));
    expect(result.months).toBe(14);
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBe(14);
    expect(closedFormMonths(14, 0.3375, 1)).toBe(19);
  });

  it('a payment one cent short of clearing the account takes two months', () => {
    const result = expectPaid(payoffMonths(toCents(100), 0.12, toCents(100.99)));
    expect(result.months).toBe(2);
    expect(lastPeriod(result.schedule).endingBalance).toBe(0);
  });
});

describe('payoffMonths — programmer error', () => {
  it('throws on a negative balance', () => {
    expect(() => payoffMonths(toCents(-1), 0.2215, toCents(50))).toThrow(/balance/);
  });

  it('throws on a negative payment', () => {
    expect(() => payoffMonths(toCents(1000), 0.2215, toCents(-50))).toThrow(/payment/);
  });

  it('throws when an APR is passed as a percentage', () => {
    expect(() => payoffMonths(toCents(1000), 22.15, toCents(50))).toThrow(/decimal fraction/);
  });
});

/**
 * Scenarios are bounded so the simulation stays fast: the payment is at least
 * 1/240th of the balance, which caps a zero-interest payoff at twenty years.
 * Payments below the monthly interest still occur and produce 'never', which is
 * exactly what several of these properties are about.
 */
const scenario = fc
  .record({
    balanceCents: fc.integer({ min: 1, max: 200_000 }),
    annualRateBasisPoints: fc.integer({ min: 0, max: 4_000 }),
  })
  .chain(({ balanceCents, annualRateBasisPoints }) =>
    fc.record({
      balanceCents: fc.constant(balanceCents),
      annualRateBasisPoints: fc.constant(annualRateBasisPoints),
      paymentCents: fc.integer({
        min: Math.max(1, Math.ceil(balanceCents / 240)),
        max: balanceCents + 10_000,
      }),
    }),
  );

describe('payoffMonths — invariants', () => {
  it('total paid always equals principal plus total interest', () => {
    fc.assert(
      fc.property(scenario, ({ balanceCents, annualRateBasisPoints, paymentCents }) => {
        const balance = centsFromInteger(balanceCents);
        const result = payoffMonths(
          balance,
          annualRateBasisPoints / 10_000,
          centsFromInteger(paymentCents),
        );
        if (result.kind !== 'paid') return;
        expect(result.totalPaid).toBe(balance + result.totalInterest);
      }),
    );
  });

  it('the schedule sums exactly to the totals it reports', () => {
    fc.assert(
      fc.property(scenario, ({ balanceCents, annualRateBasisPoints, paymentCents }) => {
        const balance = centsFromInteger(balanceCents);
        const result = payoffMonths(
          balance,
          annualRateBasisPoints / 10_000,
          centsFromInteger(paymentCents),
        );
        if (result.kind !== 'paid') return;
        expect(sumCents(result.schedule.map((period) => period.payment))).toBe(result.totalPaid);
        expect(sumCents(result.schedule.map((period) => period.interest))).toBe(
          result.totalInterest,
        );
        expect(sumCents(result.schedule.map((period) => period.principal))).toBe(balance);
      }),
    );
  });

  it('the final balance is exactly zero cents, never off by one', () => {
    fc.assert(
      fc.property(scenario, ({ balanceCents, annualRateBasisPoints, paymentCents }) => {
        const result = payoffMonths(
          centsFromInteger(balanceCents),
          annualRateBasisPoints / 10_000,
          centsFromInteger(paymentCents),
        );
        if (result.kind !== 'paid') return;
        expect(lastPeriod(result.schedule).endingBalance).toBe(0);
      }),
    );
  });

  it('every period is internally consistent and chains to the next', () => {
    fc.assert(
      fc.property(scenario, ({ balanceCents, annualRateBasisPoints, paymentCents }) => {
        const balance = centsFromInteger(balanceCents);
        const result = payoffMonths(
          balance,
          annualRateBasisPoints / 10_000,
          centsFromInteger(paymentCents),
        );
        if (result.kind !== 'paid') return;

        let expectedStart: number = balance;
        result.schedule.forEach((period, index) => {
          expect(period.month).toBe(index + 1);
          expect(period.startingBalance).toBe(expectedStart);
          expect(period.principal).toBe(period.payment - period.interest);
          expect(period.endingBalance).toBe(period.startingBalance - period.principal);
          expect(period.endingBalance).toBeLessThan(period.startingBalance);
          expect(period.endingBalance).toBeGreaterThanOrEqual(0);
          expectedStart = period.endingBalance;
        });
      }),
    );
  });

  it('paying more never takes longer', () => {
    fc.assert(
      fc.property(
        scenario,
        fc.integer({ min: 1, max: 50_000 }),
        ({ balanceCents, annualRateBasisPoints, paymentCents }, extra) => {
          const balance = centsFromInteger(balanceCents);
          const annualRate = annualRateBasisPoints / 10_000;
          const lower = payoffMonths(balance, annualRate, centsFromInteger(paymentCents));
          const higher = payoffMonths(balance, annualRate, centsFromInteger(paymentCents + extra));
          if (lower.kind !== 'paid' || higher.kind !== 'paid') return;
          expect(higher.months).toBeLessThanOrEqual(lower.months);
          expect(higher.totalInterest).toBeLessThanOrEqual(lower.totalInterest);
        },
      ),
    );
  });

  it('a higher APR never costs less interest', () => {
    fc.assert(
      fc.property(
        scenario,
        fc.integer({ min: 1, max: 2_000 }),
        ({ balanceCents, annualRateBasisPoints, paymentCents }, extraBasisPoints) => {
          const balance = centsFromInteger(balanceCents);
          const payment = centsFromInteger(paymentCents);
          const lower = payoffMonths(balance, annualRateBasisPoints / 10_000, payment);
          const higher = payoffMonths(
            balance,
            Math.min(10_000, annualRateBasisPoints + extraBasisPoints) / 10_000,
            payment,
          );
          if (lower.kind !== 'paid' || higher.kind !== 'paid') return;
          expect(higher.totalInterest).toBeGreaterThanOrEqual(lower.totalInterest);
          expect(higher.months).toBeGreaterThanOrEqual(lower.months);
        },
      ),
    );
  });

  it('adding the reported shortfall always turns "never" into "paid"', () => {
    // The contract behind the most important sentence the app produces. If this
    // fails, the UI is telling a student a number that does not work.
    fc.assert(
      fc.property(scenario, ({ balanceCents, annualRateBasisPoints, paymentCents }) => {
        const balance = centsFromInteger(balanceCents);
        const annualRate = annualRateBasisPoints / 10_000;
        const result = payoffMonths(balance, annualRate, centsFromInteger(paymentCents));
        if (result.kind !== 'never') return;

        const topped = payoffMonths(
          balance,
          annualRate,
          centsFromInteger(paymentCents + result.shortfall),
        );
        expect(topped.kind).toBe('paid');

        // And one cent less is still not enough — the shortfall is exact, not
        // merely sufficient.
        if (result.shortfall > 1) {
          const short = payoffMonths(
            balance,
            annualRate,
            centsFromInteger(paymentCents + result.shortfall - 1),
          );
          expect(short.kind).toBe('never');
        }
      }),
    );
  });

  it('agrees with the closed-form payment count to within one month', () => {
    // The simulation rounds interest to a whole cent every month; the formula
    // does not. So they agree only in the regime where that rounding is a small
    // perturbation, and the preconditions below say exactly what that regime is:
    //
    //  - monthly interest of at least $1, so a half-cent rounding step is under
    //    0.5% of the charge. Below that the two genuinely diverge, and the
    //    simulation is the correct one. At a 14 cent balance and 33.75% APR the
    //    monthly interest rounds to zero, so the account clears in 14 months
    //    while the continuous formula insists on 19. A real issuer would also
    //    charge nothing.
    //
    //  - a payment at least half again the interest, so the balance is actually
    //    falling rather than crawling. In the crawling regime the payoff month
    //    is hypersensitive to a single cent, and no fixed tolerance is
    //    meaningful.
    //
    // The boundary cases the preconditions exclude are not untested — they are
    // covered exactly by the hand-derived table and the shortfall property.
    let compared = 0;

    fc.assert(
      fc.property(scenario, ({ balanceCents, annualRateBasisPoints, paymentCents }) => {
        const annualRate = annualRateBasisPoints / 10_000;
        const result = payoffMonths(
          centsFromInteger(balanceCents),
          annualRate,
          centsFromInteger(paymentCents),
        );
        if (result.kind !== 'paid' || result.months === 0) return;

        const firstInterest = periodAt(result.schedule, 0).interest;
        if (firstInterest < 100) return;
        if (paymentCents < firstInterest * 1.5) return;

        compared += 1;
        const oracle = closedFormMonths(balanceCents, annualRate, paymentCents);
        expect(Math.abs(result.months - oracle)).toBeLessThanOrEqual(1);
      }),
    );

    // Guard against the property passing vacuously if the generator or the
    // preconditions drift apart later.
    expect(compared).toBeGreaterThan(0);
  });
});
