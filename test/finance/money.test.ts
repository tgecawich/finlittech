import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  addCents,
  compareCents,
  formatDuration,
  formatUSD,
  maxCents,
  minCents,
  multiplyCentsByRate,
  negateCents,
  subtractCents,
  sumCents,
  toDollars,
} from '@/lib/finance/money';
import { centsFromInteger, toCents, ZERO_CENTS } from '@/lib/finance/types';

const centsGen = fc.integer({ min: -10_000_000, max: 10_000_000 }).map(centsFromInteger);

describe('addCents / subtractCents', () => {
  it('adds and subtracts exactly, including across zero', () => {
    expect(addCents(toCents(0.1), toCents(0.2))).toBe(30);
    expect(subtractCents(toCents(10), toCents(19.99))).toBe(-999);
  });

  it('does not accumulate floating point error', () => {
    // The reason the domain is integer cents at all: adding 0.1 and 0.2 as
    // dollars gives 0.30000000000000004.
    expect(0.1 + 0.2).not.toBe(0.3);
    const tenCents = toCents(0.1);
    let total = ZERO_CENTS;
    for (let i = 0; i < 10; i += 1) {
      total = addCents(total, tenCents);
    }
    expect(total).toBe(100);
    expect(toDollars(total)).toBe(1);
  });

  it('is commutative and associative', () => {
    fc.assert(
      fc.property(centsGen, centsGen, centsGen, (a, b, c) => {
        expect(addCents(a, b)).toBe(addCents(b, a));
        expect(addCents(addCents(a, b), c)).toBe(addCents(a, addCents(b, c)));
      }),
    );
  });

  it('subtraction inverts addition', () => {
    fc.assert(
      fc.property(centsGen, centsGen, (a, b) => {
        expect(subtractCents(addCents(a, b), b)).toBe(a);
      }),
    );
  });

  it('throws rather than silently losing precision beyond the safe range', () => {
    const huge = centsFromInteger(Number.MAX_SAFE_INTEGER);
    expect(() => addCents(huge, centsFromInteger(10))).toThrow(RangeError);
  });
});

describe('negateCents', () => {
  it('negates without producing negative zero', () => {
    expect(negateCents(centsFromInteger(500))).toBe(-500);
    expect(negateCents(centsFromInteger(-500))).toBe(500);
    expect(Object.is(negateCents(ZERO_CENTS), 0)).toBe(true);
  });
});

describe('multiplyCentsByRate', () => {
  it('rounds the product to a whole cent', () => {
    // $1,200.00 at a monthly periodic rate of 22.15% / 12 = 0.01845833...
    // 120000 x 0.0184583333 = 2215.0 cents exactly.
    expect(multiplyCentsByRate(toCents(1200), 0.2215 / 12)).toBe(2215);
    // 100 cents x 0.005 = 0.5 cents, a tie, which rounds away from zero.
    expect(multiplyCentsByRate(toCents(1), 0.005)).toBe(1);
    expect(multiplyCentsByRate(toCents(-1), 0.005)).toBe(-1);
  });

  it('returns zero for a zero rate or a zero amount', () => {
    expect(multiplyCentsByRate(toCents(1200), 0)).toBe(0);
    expect(multiplyCentsByRate(ZERO_CENTS, 0.2215)).toBe(0);
  });

  it('throws on a non-finite rate', () => {
    expect(() => multiplyCentsByRate(toCents(1), Number.NaN)).toThrow(RangeError);
    expect(() => multiplyCentsByRate(toCents(1), Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it('always returns a whole number of cents', () => {
    fc.assert(
      fc.property(centsGen, fc.double({ min: 0, max: 1, noNaN: true }), (amount, rate) => {
        expect(Number.isInteger(multiplyCentsByRate(amount, rate))).toBe(true);
      }),
    );
  });
});

describe('sumCents', () => {
  it('sums a list, with an empty list summing to zero', () => {
    expect(sumCents([])).toBe(0);
    expect(sumCents([toCents(1), toCents(2.5), toCents(-0.5)])).toBe(300);
  });

  it('agrees with repeated addition', () => {
    fc.assert(
      fc.property(fc.array(centsGen, { maxLength: 50 }), (amounts) => {
        const folded = amounts.reduce<number>((acc, amount) => acc + amount, 0);
        expect(sumCents(amounts)).toBe(folded);
      }),
    );
  });
});

describe('compareCents / maxCents / minCents', () => {
  it('orders amounts', () => {
    const small = toCents(1);
    const large = toCents(2);
    expect(compareCents(small, large)).toBeLessThan(0);
    expect(compareCents(large, small)).toBeGreaterThan(0);
    expect(compareCents(small, small)).toBe(0);
  });

  it('selects the larger and smaller, and is stable on equality', () => {
    const small = toCents(1);
    const large = toCents(2);
    expect(maxCents(small, large)).toBe(large);
    expect(maxCents(large, small)).toBe(large);
    expect(maxCents(small, small)).toBe(small);
    expect(minCents(small, large)).toBe(small);
    expect(minCents(large, small)).toBe(small);
    expect(minCents(small, small)).toBe(small);
  });
});

describe('toDollars', () => {
  it('divides by one hundred', () => {
    expect(toDollars(toCents(1200))).toBe(1200);
    expect(toDollars(toCents(0.42))).toBe(0.42);
    expect(toDollars(toCents(-19.99))).toBe(-19.99);
  });
});

describe('formatDuration', () => {
  it('says months below a year', () => {
    expect(formatDuration(0)).toBe('0 months');
    expect(formatDuration(1)).toBe('1 month');
    expect(formatDuration(11)).toBe('11 months');
  });

  it('says whole years without a stray zero', () => {
    expect(formatDuration(12)).toBe('1 year');
    expect(formatDuration(24)).toBe('2 years');
  });

  it('says years and months together', () => {
    expect(formatDuration(13)).toBe('1 year 1 month');
    expect(formatDuration(25)).toBe('2 years 1 month');
    expect(formatDuration(55)).toBe('4 years 7 months');
  });

  it('never says "1 years", "1 months", or a zero month remainder', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1200 }), (months) => {
        const text = formatDuration(months);
        // Plurals must agree.
        expect(text).not.toMatch(/\b1 (?:years|months)\b/);
        // "1 year 0 months" is wrong; a bare "0 months" is correct and allowed.
        expect(text).not.toMatch(/\byears? 0 months?\b/);
      }),
    );
  });
});

describe('formatUSD', () => {
  it('formats whole dollars, sub-dollar amounts, and negatives', () => {
    expect(formatUSD(toCents(1200))).toBe('$1,200.00');
    expect(formatUSD(toCents(0.42))).toBe('$0.42');
    expect(formatUSD(toCents(0))).toBe('$0.00');
    expect(formatUSD(toCents(-912.44))).toBe('-$912.44');
    expect(formatUSD(toCents(1234567.89))).toBe('$1,234,567.89');
  });

  it('drops cents on request, for headline figures', () => {
    // The Voice section calls for "That costs you $912", not "$912.44".
    expect(formatUSD(toCents(912.44), { cents: false })).toBe('$912');
    expect(formatUSD(toCents(1200), { cents: false })).toBe('$1,200');
  });

  it('shows cents only when there are any, on auto', () => {
    // For prose: "paying $35 a month", never "$35.00 a month".
    expect(formatUSD(toCents(35), { cents: 'auto' })).toBe('$35');
    expect(formatUSD(toCents(1200), { cents: 'auto' })).toBe('$1,200');
    expect(formatUSD(toCents(0), { cents: 'auto' })).toBe('$0');
    // But never rounds a real fraction away, which would state something false.
    expect(formatUSD(toCents(35.5), { cents: 'auto' })).toBe('$35.50');
    expect(formatUSD(toCents(912.44), { cents: 'auto' })).toBe('$912.44');
    expect(formatUSD(toCents(-19.99), { cents: 'auto' })).toBe('-$19.99');
  });

  it('never loses value on auto, unlike cents: false', () => {
    fc.assert(
      fc.property(centsGen, (amount) => {
        const auto = Number(formatUSD(amount, { cents: 'auto' }).replace(/[$,]/g, ''));
        expect(toCents(auto)).toBe(amount);
      }),
    );
  });

  it('rounds whole-dollar output half away from zero, matching the domain', () => {
    // Intl defaults to halfExpand. Asserted rather than assumed, because a
    // change to half-even here would silently disagree with every schedule.
    expect(formatUSD(toCents(0.5), { cents: false })).toBe('$1');
    expect(formatUSD(toCents(-0.5), { cents: false })).toBe('-$1');
    expect(formatUSD(toCents(1.5), { cents: false })).toBe('$2');
    expect(formatUSD(toCents(2.5), { cents: false })).toBe('$3');
  });

  it('never renders negative zero', () => {
    expect(formatUSD(toCents(-0))).toBe('$0.00');
    expect(formatUSD(negateCents(ZERO_CENTS))).toBe('$0.00');
  });

  it('is parseable back to the original amount', () => {
    fc.assert(
      fc.property(centsGen, (amount) => {
        const parsed = Number(formatUSD(amount).replace(/[$,]/g, ''));
        expect(toCents(parsed)).toBe(amount);
      }),
    );
  });
});
