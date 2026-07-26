import { describe, expect, it } from 'vitest';

import {
  ADDITIONAL_MEDICARE_THRESHOLD,
  DEFAULT_CREDIT_CARD_APR,
  DEFAULT_CREDIT_CARD_APR_AS_OF,
  FEDERAL_BRACKETS_SINGLE,
  MEDICARE_RATE,
  MINIMUM_PAYMENT_BALANCE_FRACTION,
  MINIMUM_PAYMENT_FLOOR,
  RI_BRACKETS,
  SOCIAL_SECURITY_RATE,
  SOCIAL_SECURITY_WAGE_BASE,
  TAX_YEAR,
} from '@/lib/finance/constants';
import { assertAnnualRate, toCents } from '@/lib/finance/types';

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

describe('TAX_YEAR staleness tripwire', () => {
  it('is not older than the current year', () => {
    // Once the calendar passes TAX_YEAR this fails, forcing a review of every
    // bracket, rate, threshold, and wage base against the new year's figures.
    expect(TAX_YEAR).toBeGreaterThanOrEqual(new Date().getUTCFullYear());
  });
});

describe('payroll constants — sanity, not self-agreement', () => {
  it('holds the statutory FICA rates and 2026 wage base', () => {
    // These are fixed in law, not inflation-adjusted, so exact values are the
    // right assertion. Wage base is the one that moves yearly.
    expect(SOCIAL_SECURITY_RATE).toBe(0.062);
    expect(MEDICARE_RATE).toBe(0.0145);
    expect(SOCIAL_SECURITY_WAGE_BASE).toBe(toCents(184_500));
    expect(ADDITIONAL_MEDICARE_THRESHOLD).toBe(toCents(200_000));
  });

  it('has federal brackets that ascend in rate and threshold and end open', () => {
    for (let i = 1; i < FEDERAL_BRACKETS_SINGLE.length; i += 1) {
      const prev = FEDERAL_BRACKETS_SINGLE[i - 1];
      const curr = FEDERAL_BRACKETS_SINGLE[i];
      if (prev === undefined || curr === undefined) throw new Error('bracket gap');
      expect(curr.rate).toBeGreaterThan(prev.rate);
      if (prev.upTo !== null && curr.upTo !== null) {
        expect(curr.upTo).toBeGreaterThan(prev.upTo);
      }
    }
    expect(FEDERAL_BRACKETS_SINGLE.at(-1)?.upTo).toBeNull();
    expect(RI_BRACKETS.at(-1)?.upTo).toBeNull();
  });
});

describe('minimum payment constants', () => {
  it('describes a 1% minimum with a $25 floor, held in cents', () => {
    expect(MINIMUM_PAYMENT_BALANCE_FRACTION).toBe(0.01);
    expect(MINIMUM_PAYMENT_FLOOR).toBe(2500);
  });
});
