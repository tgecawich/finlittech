import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { estimatePaycheck } from '@/lib/finance/paycheck';
import { centsFromInteger, toCents } from '@/lib/finance/types';

describe('estimatePaycheck — $60,000, hand-derived from the published schedules', () => {
  /**
   * Single filer, $60,000 gross, tax year 2026. Every figure below is computed
   * by hand from the official schedules cited in constants.ts, not from this
   * implementation:
   *
   *   Federal: taxable = 60,000 − 16,100 (std ded) = 43,900.
   *            10% × 12,400            =   1,240.00
   *            12% × (43,900 − 12,400) =   3,780.00   → $5,020.00
   *   Social Security: 6.2% × 60,000 (under the $184,500 base) = $3,720.00
   *   Medicare:        1.45% × 60,000 = $870.00; no surtax (< $200,000)
   *   Rhode Island: taxable = 60,000 − 11,200 − 5,250 = 43,550.
   *                 3.75% × 43,550 = $1,633.13   (43,550 < 82,050)
   */
  const result = estimatePaycheck(toCents(60_000));

  it('federal income tax is $5,020.00', () => {
    expect(result.federalIncomeTax).toBe(toCents(5_020));
  });

  it('Social Security is $3,720.00 and Medicare is $870.00 with no surtax', () => {
    expect(result.socialSecurity).toBe(toCents(3_720));
    expect(result.medicare).toBe(toCents(870));
    expect(result.additionalMedicare).toBe(0);
  });

  it('Rhode Island income tax is $1,633.13', () => {
    expect(result.stateIncomeTax).toBe(toCents(1_633.13));
  });

  it('total tax and net reconcile to the gross', () => {
    expect(result.totalTax).toBe(toCents(11_243.13));
    expect(result.net).toBe(toCents(48_756.87));
    expect(centsFromInteger(result.net + result.totalTax)).toBe(result.annualGross);
  });
});

describe('estimatePaycheck — $250,000, exercising the caps and top brackets', () => {
  /**
   * Single filer, $250,000 gross, 2026, hand-derived:
   *
   *   Federal: taxable = 250,000 − 16,100 = 233,900.
   *     10%×12,400 + 12%×38,000 + 22%×55,300 + 24%×96,075 + 32%×32,125
   *     = 1,240 + 4,560 + 12,166 + 23,058 + 10,280 = $51,304.00
   *   Social Security: capped at 6.2% × 184,500 = $11,439.00
   *   Medicare: 1.45% × 250,000 = $3,625.00
   *   Additional Medicare: 0.9% × (250,000 − 200,000) = $450.00
   */
  const result = estimatePaycheck(toCents(250_000));

  it('federal income tax spans five brackets to $51,304.00', () => {
    expect(result.federalIncomeTax).toBe(toCents(51_304));
  });

  it('Social Security is capped at the wage base', () => {
    expect(result.socialSecurity).toBe(toCents(11_439));
  });

  it('Medicare adds the 0.9% surtax over $200,000', () => {
    expect(result.medicare).toBe(toCents(3_625));
    expect(result.additionalMedicare).toBe(toCents(450));
  });
});

describe('estimatePaycheck — required edge cases', () => {
  it('a low earner pays FICA even with no income tax due', () => {
    // $5,000 is below every deduction, so no income tax — but Social Security
    // and Medicare come out from the first dollar. This is the point students
    // are usually surprised by.
    const result = estimatePaycheck(toCents(5_000));
    expect(result.federalIncomeTax).toBe(0);
    expect(result.stateIncomeTax).toBe(0);
    expect(result.socialSecurity).toBe(toCents(310)); // 6.2% × 5,000
    expect(result.medicare).toBe(toCents(72.5)); // 1.45% × 5,000
    expect(result.net).toBe(toCents(4_617.5));
  });

  it('zero gross yields zero everything and a zero effective rate', () => {
    const result = estimatePaycheck(toCents(0));
    expect(result.totalTax).toBe(0);
    expect(result.net).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });

  it('income exactly at a bracket edge is taxed only up to that edge', () => {
    // Federal taxable exactly $12,400 (gross 28,500 − 16,100) → all at 10%.
    const result = estimatePaycheck(toCents(28_500));
    expect(result.federalIncomeTax).toBe(toCents(1_240));
  });

  it('throws on negative gross', () => {
    expect(() => estimatePaycheck(toCents(-1))).toThrow(/annualGross/);
  });
});

const grossGen = fc.integer({ min: 0, max: 2_000_000 }).map(centsFromInteger);

describe('estimatePaycheck — invariants', () => {
  it('net plus every withholding always equals gross', () => {
    fc.assert(
      fc.property(grossGen, (gross) => {
        const r = estimatePaycheck(gross);
        const parts = centsFromInteger(
          r.federalIncomeTax +
            r.socialSecurity +
            r.medicare +
            r.additionalMedicare +
            r.stateIncomeTax,
        );
        expect(r.totalTax).toBe(parts);
        expect(centsFromInteger(r.net + r.totalTax)).toBe(gross);
      }),
    );
  });

  it('no single withholding ever exceeds gross, and net never does', () => {
    fc.assert(
      fc.property(grossGen, (gross) => {
        const r = estimatePaycheck(gross);
        for (const part of [
          r.federalIncomeTax,
          r.socialSecurity,
          r.medicare,
          r.additionalMedicare,
          r.stateIncomeTax,
        ]) {
          expect(part).toBeGreaterThanOrEqual(0);
          expect(part).toBeLessThanOrEqual(gross);
        }
        expect(r.net).toBeLessThanOrEqual(gross);
      }),
    );
  });

  it('earning more never lowers take-home pay (marginal rates stay under 100%)', () => {
    fc.assert(
      fc.property(grossGen, fc.integer({ min: 1, max: 100_000 }), (gross, raiseCents) => {
        const before = estimatePaycheck(gross);
        const after = estimatePaycheck(centsFromInteger(gross + raiseCents));
        expect(after.net).toBeGreaterThanOrEqual(before.net);
      }),
    );
  });

  it('Social Security withholding never exceeds the wage-base cap', () => {
    // 6.2% × $184,500 = $11,439.00.
    fc.assert(
      fc.property(grossGen, (gross) => {
        expect(estimatePaycheck(gross).socialSecurity).toBeLessThanOrEqual(toCents(11_439));
      }),
    );
  });
});
