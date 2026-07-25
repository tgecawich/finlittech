import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  MAX_CENTS,
  ONE_CENT,
  ZERO_CENTS,
  assertAnnualRate,
  centsFromInteger,
  roundHalfAwayFromZero,
  toCents,
  toMonthlyRate,
} from '@/lib/finance/types';
import { toDollars } from '@/lib/finance/money';

describe('roundHalfAwayFromZero', () => {
  it('rounds ties away from zero in both directions', () => {
    expect(roundHalfAwayFromZero(0.5)).toBe(1);
    expect(roundHalfAwayFromZero(1.5)).toBe(2);
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(-0.5)).toBe(-1);
    expect(roundHalfAwayFromZero(-1.5)).toBe(-2);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
  });

  it('differs from Math.round on negative ties, which is the whole point', () => {
    // Math.round rounds ties toward +Infinity, so it is not symmetric.
    // Documenting the divergence here means a future "simplification" to
    // Math.round fails loudly instead of quietly changing every refund.
    expect(Math.round(-0.5)).toBe(-0);
    expect(roundHalfAwayFromZero(-0.5)).toBe(-1);
  });

  it('rounds non-ties to the nearest integer', () => {
    expect(roundHalfAwayFromZero(0.49)).toBe(0);
    expect(roundHalfAwayFromZero(0.51)).toBe(1);
    expect(roundHalfAwayFromZero(-0.49)).toBe(0);
    expect(roundHalfAwayFromZero(-0.51)).toBe(-1);
  });

  it('never returns negative zero', () => {
    // -0 would render as "-$0.00", which reads as a bug to a user.
    expect(Object.is(roundHalfAwayFromZero(-0.1), 0)).toBe(true);
    expect(Object.is(roundHalfAwayFromZero(-0), 0)).toBe(true);
  });

  it('is symmetric under negation for every value', () => {
    fc.assert(
      fc.property(fc.double({ min: -1e12, max: 1e12, noNaN: true }), (value) => {
        const forward = roundHalfAwayFromZero(value);
        const reversed = roundHalfAwayFromZero(-value);
        // Compared this way rather than with toBe so that the 0 / -0 case is
        // an equality, not an Object.is failure.
        expect(reversed === -forward || (reversed === 0 && forward === 0)).toBe(true);
      }),
    );
  });
});

describe('toCents', () => {
  it('converts whole and fractional dollars', () => {
    expect(toCents(0)).toBe(0);
    expect(toCents(1)).toBe(100);
    expect(toCents(1200)).toBe(120_000);
    expect(toCents(0.42)).toBe(42);
    expect(toCents(-19.99)).toBe(-1999);
  });

  it('rounds sub-cent input half away from zero', () => {
    expect(toCents(0.005)).toBe(1);
    expect(toCents(-0.005)).toBe(-1);
    expect(toCents(0.004)).toBe(0);
    expect(toCents(0.006)).toBe(1);
  });

  it('survives the binary representation of 1.005', () => {
    // The double nearest 1.005 is 1.00499999999999989..., so `1.005 * 100` is
    // 100.49999999999999 and a naive Math.round yields 100. This is the single
    // most common money-rounding bug in JavaScript.
    expect(1.005 * 100).not.toBe(100.5);
    expect(toCents(1.005)).toBe(101);
    expect(toCents(2.675)).toBe(268);
    expect(toCents(8.165)).toBe(817);
  });

  it('normalises negative zero', () => {
    expect(Object.is(toCents(-0), 0)).toBe(true);
    expect(Object.is(toCents(-0.001), 0)).toBe(true);
  });

  it('throws on non-finite input, because the caller is broken', () => {
    expect(() => toCents(Number.NaN)).toThrow(RangeError);
    expect(() => toCents(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => toCents(Number.NEGATIVE_INFINITY)).toThrow(RangeError);
  });

  it('throws on a non-number, which TypeScript alone cannot prevent at a boundary', () => {
    // Values arriving from a query string or JSON are `unknown` at runtime no
    // matter what the signature claims.
    expect(() => toCents('1200' as unknown as number)).toThrow(RangeError);
    expect(() => toCents(null as unknown as number)).toThrow(RangeError);
  });

  it('throws when the result would exceed integer precision', () => {
    expect(() => toCents(Number.MAX_SAFE_INTEGER)).toThrow(/representable range/);
  });

  it('is exact to fifteen significant digits, far past any realistic amount', () => {
    // The noise-shedding step that makes toCents(1.005) correct costs the 16th
    // digit, so toCents tops out around $10 trillion rather than at MAX_CENTS.
    // Documented rather than hidden: centsFromInteger covers the full range,
    // and nothing in this app goes near either bound.
    expect(toCents(1_000_000_000)).toBe(100_000_000_000);
    expect(toCents(99_999_999_999.99)).toBe(9_999_999_999_999);
    expect(MAX_CENTS).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('toCents / toDollars round trip', () => {
  it('round-trips every amount that is already whole cents', () => {
    // Stated carefully: the round trip holds for cent-representable dollar
    // values. It cannot hold for sub-cent input such as 1.005, because toCents
    // is lossy by design — that loss is the point of the type.
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000_00, max: 1_000_000_00 }), (cents) => {
        const dollars = cents / 100;
        expect(toCents(dollars)).toBe(cents);
      }),
    );
  });

  it('round-trips in the other direction for every representable amount', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000_00, max: 1_000_000_00 }), (value) => {
        const amount = centsFromInteger(value);
        expect(toCents(toDollars(amount))).toBe(amount);
      }),
    );
  });
});

describe('centsFromInteger', () => {
  it('accepts safe integers', () => {
    expect(centsFromInteger(0)).toBe(0);
    expect(centsFromInteger(-1)).toBe(-1);
    expect(centsFromInteger(MAX_CENTS)).toBe(MAX_CENTS);
  });

  it('normalises negative zero', () => {
    expect(Object.is(centsFromInteger(-0), 0)).toBe(true);
  });

  it('throws on a fractional value, which means a rounding step was skipped', () => {
    expect(() => centsFromInteger(1.5)).toThrow(RangeError);
    expect(() => centsFromInteger(Number.NaN)).toThrow(RangeError);
    expect(() => centsFromInteger(Number.MAX_SAFE_INTEGER + 2)).toThrow(RangeError);
  });
});

describe('constants', () => {
  it('exposes zero and one cent', () => {
    expect(ZERO_CENTS).toBe(0);
    expect(ONE_CENT).toBe(1);
  });
});

describe('assertAnnualRate', () => {
  it('accepts decimal fractions from 0 to 1 inclusive', () => {
    expect(() => assertAnnualRate(0)).not.toThrow();
    expect(() => assertAnnualRate(0.2215)).not.toThrow();
    expect(() => assertAnnualRate(1)).not.toThrow();
  });

  it('rejects a percentage passed where a fraction was expected', () => {
    // By far the most common caller error: 22.15 instead of 0.2215.
    expect(() => assertAnnualRate(22.15)).toThrow(/decimal fraction/);
    expect(() => assertAnnualRate(22.15)).toThrow(/0.2215/);
  });

  it('rejects negative and non-finite rates', () => {
    expect(() => assertAnnualRate(-0.01)).toThrow(RangeError);
    expect(() => assertAnnualRate(Number.NaN)).toThrow(RangeError);
    expect(() => assertAnnualRate(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => assertAnnualRate('0.22' as unknown as number)).toThrow(RangeError);
  });
});

describe('toMonthlyRate', () => {
  it('divides the nominal annual rate by twelve', () => {
    // US card issuers compute a monthly periodic rate as APR / 12, not as the
    // effective conversion (1 + apr)^(1/12) - 1. Matching the statement matters
    // more than matching the textbook.
    expect(toMonthlyRate(0.12)).toBeCloseTo(0.01, 12);
    expect(toMonthlyRate(0.2215)).toBeCloseTo(0.01845833333, 10);
    expect(toMonthlyRate(0)).toBe(0);
  });

  it('validates its input', () => {
    expect(() => toMonthlyRate(22.15)).toThrow(RangeError);
  });
});
