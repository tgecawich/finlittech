/**
 * Every rate, threshold, and default the domain depends on, each carrying its
 * source and its vintage.
 *
 * Nothing here may be inlined at a call site (CLAUDE.md → Anti-patterns). The
 * footer cites this file, so a number without a URL beside it is a defect.
 */

import { toCents, type Cents, type Rate } from './types';
import type { Bracket } from './paycheck';

/**
 * Average APR on credit card accounts *assessed interest* — that is, accounts
 * carrying a balance. This is the right default for this app: the rate across
 * all accounts is materially lower because it includes people who pay in full
 * and are never charged anything, and those people are not the audience for a
 * payoff calculator.
 *
 * Source: Federal Reserve G.19 Consumer Credit release, "Terms of credit at
 * commercial banks and finance companies", series TERMCBCCINTNS (accounts
 * assessed interest). https://www.federalreserve.gov/releases/g19/current/
 *
 * Verified 2026-07-25 against the G.19 released 2026-07-08: the May 2026
 * observation — the Q2 2026 data point in this quarterly series — is 22.15%.
 *
 * The G.19 series is quarterly and published with a lag, so
 * {@link DEFAULT_CREDIT_CARD_APR_AS_OF} records which release this figure came
 * from. Re-check it against the current release before each deploy; see the
 * staleness test in test/finance/constants.test.ts.
 */
export const DEFAULT_CREDIT_CARD_APR: Rate = 0.2215;

/**
 * The G.19 release {@link DEFAULT_CREDIT_CARD_APR} was taken from, as
 * `[year, quarter]`. Displayed in the footer so the citation is honest about
 * its age rather than implying the number is live.
 */
export const DEFAULT_CREDIT_CARD_APR_AS_OF: readonly [year: number, quarter: number] = [
  2026, 2,
];

/**
 * The payment a card issuer would typically require: the larger of 1% of the
 * balance plus that period's interest, or a floor of $25.
 *
 * Not used by {@link import('./credit-card').payoffMonths}, which takes the
 * payment the user actually intends to make. Kept here for the UI's "what the
 * minimum would be" comparison in a later step.
 *
 * Source: CFPB, "What is a minimum payment?"
 * https://www.consumerfinance.gov/ask-cfpb/what-is-a-minimum-credit-card-payment-en-45/
 */
export const MINIMUM_PAYMENT_BALANCE_FRACTION: Rate = 0.01;

/**
 * Floor on a typical issuer minimum payment.
 *
 * Held as `Cents` rather than as a dollar number so that money is integer cents
 * everywhere in the domain without exception — a constant is exactly the kind
 * of place a stray float would otherwise get in.
 *
 * See {@link MINIMUM_PAYMENT_BALANCE_FRACTION} for the source.
 */
export const MINIMUM_PAYMENT_FLOOR: Cents = toCents(25);

// ---------------------------------------------------------------------------
// Payroll tax constants
//
// The tax year every figure below belongs to. The staleness test in
// test/finance/constants.test.ts fails once the calendar year passes this, so
// the numbers cannot silently rot after this ships.
// ---------------------------------------------------------------------------

/** The tax year all payroll constants below are for. */
export const TAX_YEAR = 2026;

/**
 * Federal standard deduction, single filer, tax year 2026.
 *
 * Source: IRS, "IRS releases tax inflation adjustments for tax year 2026"
 * (Rev. Proc. 2025-32, as amended by P.L. 119-21).
 * https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill
 */
export const FEDERAL_STANDARD_DEDUCTION_SINGLE: Cents = toCents(16_100);

/**
 * Federal marginal income tax brackets, single filer, tax year 2026. `upTo` is
 * the top of taxable income taxed at `rate`; the final bracket is open-ended.
 *
 * Source: IRS tax year 2026 inflation adjustments (see above).
 */
export const FEDERAL_BRACKETS_SINGLE: readonly Bracket[] = [
  { upTo: toCents(12_400), rate: 0.1 },
  { upTo: toCents(50_400), rate: 0.12 },
  { upTo: toCents(105_700), rate: 0.22 },
  { upTo: toCents(201_775), rate: 0.24 },
  { upTo: toCents(256_225), rate: 0.32 },
  { upTo: toCents(640_600), rate: 0.35 },
  { upTo: null, rate: 0.37 },
];

/**
 * Social Security (OASDI) employee rate and the 2026 wage base above which no
 * further Social Security tax is withheld.
 *
 * Source: IRS Topic No. 751 and SSA 2026 Contribution and Benefit Base.
 * https://www.irs.gov/taxtopics/tc751 · https://www.ssa.gov/oact/cola/cbb.html
 */
export const SOCIAL_SECURITY_RATE: Rate = 0.062;
export const SOCIAL_SECURITY_WAGE_BASE: Cents = toCents(184_500);

/**
 * Medicare employee rate (all wages) and the Additional Medicare surtax with
 * its withholding threshold, 2026. The employer withholds the surtax on wages
 * over $200,000 regardless of filing status.
 *
 * Source: IRS Topic No. 751 and Topic No. 560.
 * https://www.irs.gov/taxtopics/tc751 · https://www.irs.gov/taxtopics/tc560
 */
export const MEDICARE_RATE: Rate = 0.0145;
export const ADDITIONAL_MEDICARE_RATE: Rate = 0.009;
export const ADDITIONAL_MEDICARE_THRESHOLD: Cents = toCents(200_000);

/**
 * Rhode Island standard deduction and personal exemption, single filer, tax
 * year 2026. (The standard deduction phases out above ~$261,000 of income; that
 * is far outside this app's audience and is not modelled — see paycheck.ts.)
 *
 * Source: RI Division of Taxation Advisory ADV 2025-22, "Inflation Adjustments
 * for Tax Year 2026".
 * https://tax.ri.gov/sites/g/files/xkgbur541/files/2025-11/ADV_2025_22_Inflation_Adjustments.pdf
 */
export const RI_STANDARD_DEDUCTION_SINGLE: Cents = toCents(11_200);
export const RI_PERSONAL_EXEMPTION: Cents = toCents(5_250);

/**
 * Rhode Island marginal income tax brackets, tax year 2026.
 *
 * Source: RI Division of Taxation Advisory ADV 2025-22 (see above).
 */
export const RI_BRACKETS: readonly Bracket[] = [
  { upTo: toCents(82_050), rate: 0.0375 },
  { upTo: toCents(186_450), rate: 0.0475 },
  { upTo: null, rate: 0.0599 },
];
