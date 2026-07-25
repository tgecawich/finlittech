import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CREDIT_CARD_APR,
  DEFAULT_CREDIT_CARD_APR_AS_OF,
  MINIMUM_PAYMENT_BALANCE_FRACTION,
  MINIMUM_PAYMENT_FLOOR,
} from '@/lib/finance/constants';
import { assertAnnualRate } from '@/lib/finance/types';

/** Quarters elapsed since year 0, so two vintages can be compared directly. */
function absoluteQuarter(year: number, quarter: number): number {
  return year * 4 + (quarter - 1);
}

function currentQuarter(): readonly [number, number] {
  const now = new Date();
  return [now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) + 1];
}

describe('DEFAULT_CREDIT_CARD_APR', () => {
  it('is a decimal fraction, not a percentage', () => {
    expect(() => assertAnnualRate(DEFAULT_CREDIT_CARD_APR)).not.toThrow();
  });

  it('sits in a plausible band for accounts assessed interest', () => {
    // Deliberately loose. This does not assert the exact published figure —
    // that would just restate the constant. It catches the errors that actually
    // happen: a decimal slip (0.02215 or 2.215), or a value drifting so far
    // from reality that nobody checked the source.
    expect(DEFAULT_CREDIT_CARD_APR).toBeGreaterThan(0.1);
    expect(DEFAULT_CREDIT_CARD_APR).toBeLessThan(0.35);
  });

  it('records a well-formed vintage', () => {
    const [year, quarter] = DEFAULT_CREDIT_CARD_APR_AS_OF;
    expect(Number.isInteger(year)).toBe(true);
    expect(quarter).toBeGreaterThanOrEqual(1);
    expect(quarter).toBeLessThanOrEqual(4);
  });

  it('does not cite a quarter that has not happened yet', () => {
    const [year, quarter] = DEFAULT_CREDIT_CARD_APR_AS_OF;
    const [nowYear, nowQuarter] = currentQuarter();
    expect(absoluteQuarter(year, quarter)).toBeLessThanOrEqual(
      absoluteQuarter(nowYear, nowQuarter),
    );
  });

  it('fails once the cited figure is more than two years stale', () => {
    // The point of this test is to break the build rather than let a number
    // quietly rot. When it fails, re-read the G.19 release and update both the
    // rate and its vintage — do not widen the window.
    const [year, quarter] = DEFAULT_CREDIT_CARD_APR_AS_OF;
    const [nowYear, nowQuarter] = currentQuarter();
    const quartersStale =
      absoluteQuarter(nowYear, nowQuarter) - absoluteQuarter(year, quarter);
    expect(quartersStale).toBeLessThanOrEqual(8);
  });
});

describe('minimum payment constants', () => {
  it('describes a 1% minimum with a $25 floor, held in cents', () => {
    expect(MINIMUM_PAYMENT_BALANCE_FRACTION).toBe(0.01);
    expect(MINIMUM_PAYMENT_FLOOR).toBe(2500);
  });
});
