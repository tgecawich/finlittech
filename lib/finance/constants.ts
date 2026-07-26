/**
 * Every rate, threshold, and default the domain depends on, each carrying its
 * source and its vintage.
 *
 * Nothing here may be inlined at a call site (CLAUDE.md → Anti-patterns). The
 * footer cites this file, so a number without a URL beside it is a defect.
 */

import { toCents, type Cents, type Rate } from './types';

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
