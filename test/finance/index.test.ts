import { describe, expect, it } from 'vitest';

import * as finance from '@/lib/finance';

/**
 * The public surface is a contract with the components that will consume it.
 * Adding to it is free; removing or renaming breaks a caller, so the shape is
 * pinned here deliberately rather than left to drift.
 */
describe('lib/finance public API', () => {
  it('exports the domain entry points components are allowed to use', () => {
    expect(Object.keys(finance).sort()).toEqual(
      [
        'DEFAULT_CREDIT_CARD_APR',
        'DEFAULT_CREDIT_CARD_APR_AS_OF',
        'MAX_CENTS',
        'MINIMUM_PAYMENT_BALANCE_FRACTION',
        'MINIMUM_PAYMENT_FLOOR',
        'ONE_CENT',
        'ZERO_CENTS',
        'addCents',
        'assertAnnualRate',
        'centsFromInteger',
        'compareCents',
        'formatUSD',
        'maxCents',
        'minCents',
        'multiplyCentsByRate',
        'negateCents',
        'payoffMonths',
        'roundHalfAwayFromZero',
        'subtractCents',
        'sumCents',
        'toCents',
        'toDollars',
        'toMonthlyRate',
      ].sort(),
    );
  });

  it('is usable end to end through the entry point alone', () => {
    const result = finance.payoffMonths(
      finance.toCents(1200),
      finance.DEFAULT_CREDIT_CARD_APR,
      finance.toCents(35),
    );
    expect(result.kind).toBe('paid');
    if (result.kind !== 'paid') return;
    expect(finance.formatUSD(result.totalInterest, { cents: false })).toMatch(/^\$\d/);
  });
});
