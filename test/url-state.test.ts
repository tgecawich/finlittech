import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { cleanNumeric, decodeState, encodeState, withDefaults } from '@/lib/url-state';

describe('cleanNumeric', () => {
  it('keeps only digits, a dot, and a minus', () => {
    expect(cleanNumeric('$1,200.00')).toBe('1200.00');
    expect(cleanNumeric('22.15%')).toBe('22.15');
    expect(cleanNumeric(' 45,000 ')).toBe('45000');
    expect(cleanNumeric('-50')).toBe('-50');
  });

  it('strips anything that could be an injection attempt', () => {
    expect(cleanNumeric('<script>1</script>')).toBe('1');
    expect(cleanNumeric('abc')).toBe('');
  });
});

describe('encodeState', () => {
  it('drops empty values and normalises the rest', () => {
    expect(encodeState({ balance: '$1,200', apr: '22.15%', payment: '' })).toBe(
      'apr=22.15&balance=1200',
    );
  });

  it('is stable in key order, so the same state always makes the same URL', () => {
    // A stable URL is what lets a shared link and its cached OG image match.
    const a = encodeState({ b: '1', a: '2', c: '3' });
    const b = encodeState({ c: '3', b: '1', a: '2' });
    expect(a).toBe(b);
    expect(a).toBe('a=2&b=1&c=3');
  });
});

describe('decodeState', () => {
  it('reads only the requested keys that are present and non-empty', () => {
    const decoded = decodeState('balance=1200&apr=22.15&junk=9', ['balance', 'apr', 'payment']);
    expect(decoded).toEqual({ balance: '1200', apr: '22.15' });
  });

  it('accepts a URLSearchParams as well as a string', () => {
    const decoded = decodeState(new URLSearchParams('salary=45000'), ['salary', 'freq']);
    expect(decoded).toEqual({ salary: '45000' });
  });

  it('cleans values on the way out, so a crafted param cannot smuggle characters', () => {
    expect(decodeState('balance=1200e9', ['balance'])).toEqual({ balance: '12009' });
    expect(decodeState('balance=abc', ['balance'])).toEqual({});
  });
});

describe('withDefaults', () => {
  it('overlays decoded values on the defaults', () => {
    expect(
      withDefaults({ balance: '1200', apr: '22.15', payment: '35' }, { payment: '80' }),
    ).toEqual({ balance: '1200', apr: '22.15', payment: '80' });
  });

  it('returns the defaults unchanged when nothing is decoded', () => {
    const defaults = { salary: '45000', freq: '26' };
    expect(withDefaults(defaults, {})).toEqual(defaults);
  });
});

describe('encode / decode round trip', () => {
  it('round-trips any clean numeric state', () => {
    const keys = ['a', 'b', 'c'] as const;
    fc.assert(
      fc.property(
        fc.record({
          a: fc.integer({ min: 0, max: 1_000_000 }).map(String),
          b: fc.float({ min: 0, max: 100, noNaN: true }).map((n) => n.toFixed(2)),
          c: fc.integer({ min: 1, max: 480 }).map(String),
        }),
        (state) => {
          const decoded = decodeState(encodeState(state), keys);
          // Values survive as their cleaned numeric selves.
          expect(decoded.a).toBe(cleanNumeric(state.a));
          expect(decoded.c).toBe(cleanNumeric(state.c));
        },
      ),
    );
  });
});
