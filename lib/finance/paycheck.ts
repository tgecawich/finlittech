/**
 * Gross-to-net pay for a single filer taking the standard deduction.
 *
 * Four withholdings come out of a US paycheck, and this estimates all four:
 * federal income tax (marginal brackets on income after the standard
 * deduction), Social Security (a flat rate up to a yearly wage base), Medicare
 * (a flat rate on everything, plus a surtax over a threshold), and — because
 * this app is for Rhode Island students — Rhode Island income tax.
 *
 * ## What this models, and what it does not
 *
 * This is an annual estimate for the common case, not a tax return. It assumes:
 * a single filer, the standard deduction (no itemizing), no pre-tax deductions
 * (401(k), health), no credits, and no income other than these wages. It does
 * not model the Rhode Island standard-deduction phase-out, which only touches
 * incomes above ~$261,000 — far outside this app's audience. Every rate and
 * threshold lives in constants.ts with a citation and a tax year.
 *
 * Real paycheck *withholding* (IRS Publication 15-T) uses per-payperiod tables
 * that annualize pay and can differ from the year-end liability computed here;
 * this estimates the liability, which is the number that actually answers "how
 * much of my pay do I keep."
 */

import {
  ADDITIONAL_MEDICARE_RATE,
  ADDITIONAL_MEDICARE_THRESHOLD,
  FEDERAL_BRACKETS_SINGLE,
  FEDERAL_STANDARD_DEDUCTION_SINGLE,
  MEDICARE_RATE,
  RI_BRACKETS,
  RI_PERSONAL_EXEMPTION,
  RI_STANDARD_DEDUCTION_SINGLE,
  SOCIAL_SECURITY_RATE,
  SOCIAL_SECURITY_WAGE_BASE,
} from './constants';
import { roundHalfAwayFromZero } from './money';
import { centsFromInteger, type Cents, type Rate } from './types';

/**
 * A marginal tax bracket: income up to `upTo` (or all remaining income, when
 * `upTo` is null) is taxed at `rate`. Thresholds are amounts of *taxable*
 * income in cents.
 */
export interface Bracket {
  readonly upTo: Cents | null;
  readonly rate: Rate;
}

/** The withholdings taken from a year of wages, and what is left. */
export interface PaycheckResult {
  readonly annualGross: Cents;
  readonly federalIncomeTax: Cents;
  readonly socialSecurity: Cents;
  readonly medicare: Cents;
  /** The 0.9% Additional Medicare surtax on wages over the threshold; usually zero. */
  readonly additionalMedicare: Cents;
  readonly stateIncomeTax: Cents;
  /** Everything withheld, added up. */
  readonly totalTax: Cents;
  /** Take-home pay: gross minus every withholding. */
  readonly net: Cents;
  /** Total tax as a fraction of gross, for "you keep 84%" style copy. 0 when gross is 0. */
  readonly effectiveRate: Rate;
}

/**
 * Apply a marginal bracket schedule to an amount of taxable income.
 *
 * Each bracket taxes only the slice of income that falls inside it. Products are
 * summed exactly and rounded to a whole cent once, at the end, so the result
 * does not depend on how many brackets the income happens to span.
 */
function taxFromBrackets(taxable: Cents, brackets: readonly Bracket[]): Cents {
  let tax = 0;
  let lowerEdge = 0;

  for (const bracket of brackets) {
    if (taxable <= lowerEdge) break;
    const upperEdge = bracket.upTo ?? taxable;
    const slice = Math.min(taxable, upperEdge) - lowerEdge;
    tax += slice * bracket.rate;
    lowerEdge = upperEdge;
  }

  return centsFromInteger(roundHalfAwayFromZero(tax));
}

/** Taxable income after a set of deductions, floored at zero. */
function taxableAfter(gross: Cents, ...deductions: Cents[]): Cents {
  const remaining = deductions.reduce<number>((acc, deduction) => acc - deduction, gross);
  return centsFromInteger(Math.max(0, remaining));
}

function scale(amount: Cents, rate: Rate): Cents {
  return centsFromInteger(roundHalfAwayFromZero(amount * rate));
}

/**
 * Estimate a year of take-home pay from annual gross wages.
 *
 * Throws on negative gross, which is a caller bug.
 */
export function estimatePaycheck(annualGross: Cents): PaycheckResult {
  if (annualGross < 0) {
    throw new RangeError(`estimatePaycheck: annualGross must not be negative, received ${annualGross}`);
  }

  const federalIncomeTax = taxFromBrackets(
    taxableAfter(annualGross, FEDERAL_STANDARD_DEDUCTION_SINGLE),
    FEDERAL_BRACKETS_SINGLE,
  );

  // Social Security stops at the wage base; Medicare never stops, and adds a
  // surtax on wages over the threshold.
  const socialSecurityWages = centsFromInteger(Math.min(annualGross, SOCIAL_SECURITY_WAGE_BASE));
  const socialSecurity = scale(socialSecurityWages, SOCIAL_SECURITY_RATE);

  const medicare = scale(annualGross, MEDICARE_RATE);
  const surtaxWages = centsFromInteger(Math.max(0, annualGross - ADDITIONAL_MEDICARE_THRESHOLD));
  const additionalMedicare = scale(surtaxWages, ADDITIONAL_MEDICARE_RATE);

  const stateIncomeTax = taxFromBrackets(
    taxableAfter(annualGross, RI_STANDARD_DEDUCTION_SINGLE, RI_PERSONAL_EXEMPTION),
    RI_BRACKETS,
  );

  const totalTax = centsFromInteger(
    federalIncomeTax + socialSecurity + medicare + additionalMedicare + stateIncomeTax,
  );
  const net = centsFromInteger(annualGross - totalTax);
  const effectiveRate = annualGross === 0 ? 0 : totalTax / annualGross;

  return {
    annualGross,
    federalIncomeTax,
    socialSecurity,
    medicare,
    additionalMedicare,
    stateIncomeTax,
    totalTax,
    net,
    effectiveRate,
  };
}
