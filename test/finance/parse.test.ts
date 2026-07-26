import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  MAX_INPUT_APR_PERCENT,
  MAX_INPUT_DOLLARS,
  parseMoney,
  parseNonNegativeMoney,
  parsePercent,
} from '@/lib/finance/parse';
import { toCents } from '@/lib/finance/types';

function valueOf(result: ReturnType<typeof parseMoney>): number {
  if (result.kind !== 'valid') {
    throw new Error(`expected a valid parse, received "${result.kind}"`);
  }
  return result.value;
}

describe('parseMoney', () => {
  it('parses the formats a person actually types', () => {
    expect(valueOf(parseMoney('1200'))).toBe(120_000);
    expect(valueOf(parseMoney('1,200'))).toBe(120_000);
    expect(valueOf(parseMoney('$1200'))).toBe(120_000);
    expect(valueOf(parseMoney('$1,200.00'))).toBe(120_000);
    expect(valueOf(parseMoney('1200.00'))).toBe(120_000);
    expect(valueOf(parseMoney(' $ 1,200.00 '))).toBe(120_000);
  });

  it('parses sub-dollar and partial-decimal input', () => {
    expect(valueOf(parseMoney('.5'))).toBe(50);
    expect(valueOf(parseMoney('0.42'))).toBe(42);
    expect(valueOf(parseMoney('12.'))).toBe(1200);
  });

  it('rounds sub-cent input by the domain convention', () => {
    expect(valueOf(parseMoney('1.005'))).toBe(101);
    expect(valueOf(parseMoney('1.004'))).toBe(100);
  });

  it('parses negatives, leaving the meaning to the caller', () => {
    expect(valueOf(parseMoney('-50'))).toBe(-5000);
    expect(valueOf(parseMoney('-$1,200.00'))).toBe(-120_000);
  });

  it('treats blank and partial input as empty, not as an error', () => {
    // The field must stay quiet while someone is still typing.
    expect(parseMoney('').kind).toBe('empty');
    expect(parseMoney('   ').kind).toBe('empty');
    expect(parseMoney('$').kind).toBe('empty');
    expect(parseMoney(',').kind).toBe('empty');
    expect(parseMoney('.').kind).toBe('empty');
    expect(parseMoney('-').kind).toBe('empty');
    expect(parseMoney('-.').kind).toBe('empty');
  });

  it('rejects text and malformed numbers', () => {
    expect(parseMoney('abc')).toEqual({ kind: 'invalid', reason: 'Use numbers only.' });
    expect(parseMoney('1.2.3').kind).toBe('invalid');
    expect(parseMoney('12a').kind).toBe('invalid');
    expect(parseMoney('1e5').kind).toBe('invalid');
    expect(parseMoney('--5').kind).toBe('invalid');
    expect(parseMoney('5-').kind).toBe('invalid');
  });

  it('rejects amounts beyond the input ceiling with a readable reason', () => {
    const result = parseMoney(String(MAX_INPUT_DOLLARS + 1));
    expect(result).toEqual({ kind: 'invalid', reason: 'That number is too large.' });
    expect(parseMoney(String(MAX_INPUT_DOLLARS)).kind).toBe('valid');
  });

  it('rejects a number so long it overflows to Infinity', () => {
    // 400 digits exceeds the range of a double. It is caught by the ceiling
    // rather than by a separate finite check, which also gives a truer message.
    const absurd = '9'.repeat(400);
    expect(parseMoney(absurd)).toEqual({ kind: 'invalid', reason: 'That number is too large.' });
    expect(parsePercent(absurd).kind).toBe('invalid');
  });

  it('never throws, whatever it is handed', () => {
    // The whole point of returning a union: a person mashing a keyboard is an
    // expected state, and an exception here would take the page down.
    fc.assert(
      fc.property(fc.string(), (input) => {
        expect(() => parseMoney(input)).not.toThrow();
      }),
    );
  });

  it('round-trips any amount that was formatted from cents', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100_000_000, max: 100_000_000 }), (cents) => {
        const formatted = (cents / 100).toFixed(2);
        expect(valueOf(parseMoney(formatted))).toBe(cents);
      }),
    );
  });

  it('agrees with toCents for plain numeric input', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (dollars) => {
        expect(valueOf(parseMoney(String(dollars)))).toBe(toCents(dollars));
      }),
    );
  });
});

describe('parseNonNegativeMoney', () => {
  it('accepts zero and positive amounts', () => {
    expect(valueOf(parseNonNegativeMoney('0'))).toBe(0);
    expect(valueOf(parseNonNegativeMoney('$1,200'))).toBe(120_000);
  });

  it('rejects negatives with a message a sixteen-year-old can act on', () => {
    expect(parseNonNegativeMoney('-50')).toEqual({
      kind: 'invalid',
      reason: 'Enter an amount of zero or more.',
    });
  });

  it('passes empty and invalid states straight through', () => {
    expect(parseNonNegativeMoney('').kind).toBe('empty');
    expect(parseNonNegativeMoney('abc').kind).toBe('invalid');
  });

  it('never returns a value payoffMonths would throw on', () => {
    // The guarantee the calculator depends on: anything this returns as valid
    // is safe to hand straight to the domain.
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = parseNonNegativeMoney(input);
        if (result.kind === 'valid') {
          expect(result.value).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });
});

describe('parsePercent', () => {
  it('converts a typed percentage to a decimal fraction', () => {
    expect(parsePercent('22.15')).toEqual({ kind: 'valid', value: 0.2215 });
    expect(parsePercent('22.15%')).toEqual({ kind: 'valid', value: 0.2215 });
    expect(parsePercent('0')).toEqual({ kind: 'valid', value: 0 });
    expect(parsePercent('100')).toEqual({ kind: 'valid', value: 1 });
  });

  it('avoids showing floating point noise back to the user', () => {
    // 22.15 / 100 is 0.22149999999999997 in binary floating point.
    expect(22.15 / 100).not.toBe(0.2215);
    expect(parsePercent('22.15')).toEqual({ kind: 'valid', value: 0.2215 });
  });

  it('treats blank and partial input as empty', () => {
    expect(parsePercent('').kind).toBe('empty');
    expect(parsePercent('%').kind).toBe('empty');
    expect(parsePercent('.').kind).toBe('empty');
  });

  it('rejects text, negatives, and rates above the ceiling', () => {
    expect(parsePercent('abc').kind).toBe('invalid');
    expect(parsePercent('1.2.3').kind).toBe('invalid');
    expect(parsePercent('-5')).toEqual({
      kind: 'invalid',
      reason: 'An APR cannot be negative.',
    });
    expect(parsePercent(String(MAX_INPUT_APR_PERCENT + 1)).kind).toBe('invalid');
  });

  it('never throws, and never produces a rate the domain would reject', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = parsePercent(input);
        expect(['empty', 'valid', 'invalid']).toContain(result.kind);
        if (result.kind === 'valid') {
          // assertAnnualRate accepts 0..1 inclusive; anything else would throw
          // downstream, which is precisely what this boundary exists to prevent.
          expect(result.value).toBeGreaterThanOrEqual(0);
          expect(result.value).toBeLessThanOrEqual(1);
        }
      }),
    );
  });
});
