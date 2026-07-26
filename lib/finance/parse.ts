/**
 * Parsing raw text into `Cents` at the input boundary.
 *
 * This is the only place a user-typed string becomes money. It lives in the
 * domain rather than in the input component for the reason the boundary rule
 * gives: it rounds, it validates, and it has edge cases, so it needs tests —
 * and components are supposed to contain no logic at all.
 *
 * Everything here returns a discriminated union. A person typing "$" or "1.2.3"
 * is an expected state, not a programmer error, so nothing throws.
 */

import { toCents, type Cents } from './types';

/**
 * Largest amount an input will accept, in dollars.
 *
 * A credit card balance above a billion dollars is a typo or a stress test, and
 * saying so is friendlier than letting `toCents` raise a range error about
 * integer precision.
 */
export const MAX_INPUT_DOLLARS = 1_000_000_000;

/** The outcome of parsing a money input. */
export type MoneyParseResult =
  /** Nothing to parse yet — blank, or partial input like "$", "-" or ".". */
  | { readonly kind: 'empty' }
  | { readonly kind: 'valid'; readonly value: Cents }
  | { readonly kind: 'invalid'; readonly reason: string };

// Currency symbols, thousands separators and whitespace are noise; people type
// them and mean nothing by them.
const NOISE = /[$,\s]/g;

// A number, possibly negative, possibly with a decimal point. Deliberately
// permits partial input such as "12." so the field does not report an error
// while someone is still typing.
const NUMERIC = /^-?\d*\.?\d*$/;

const HAS_DIGIT = /\d/;

/**
 * Parse a money string such as `"1,200"`, `"$1200"` or `"1200.00"`.
 *
 * Sub-cent input rounds by the domain convention, so `"1.005"` is 101 cents.
 * Negative values parse successfully; whether a negative amount is *meaningful*
 * is the caller's question, not this function's.
 */
export function parseMoney(raw: string): MoneyParseResult {
  const stripped = raw.replace(NOISE, '');

  if (stripped === '') {
    return { kind: 'empty' };
  }

  if (!NUMERIC.test(stripped)) {
    return { kind: 'invalid', reason: 'Use numbers only.' };
  }

  // "-", "." and "-." pass the pattern but carry no value yet. Treated as empty
  // rather than invalid so the field stays quiet mid-keystroke.
  if (!HAS_DIGIT.test(stripped)) {
    return { kind: 'empty' };
  }

  // Cannot be NaN: the pattern above admits only digits, one optional point and
  // an optional sign, and the digit check rules out "-", "." and "-.". It can
  // overflow to Infinity on a few hundred digits, which the ceiling below
  // catches — and "too large" is the truer message for that anyway.
  const dollars = Number(stripped);

  if (Math.abs(dollars) > MAX_INPUT_DOLLARS) {
    return { kind: 'invalid', reason: 'That number is too large.' };
  }

  return { kind: 'valid', value: toCents(dollars) };
}

/**
 * Parse a money string that is not allowed to be negative.
 *
 * The rule lives here rather than in a form component because it is a domain
 * fact — `payoffMonths` throws on a negative balance or payment — and a
 * component restating it would be a second copy to keep in sync.
 */
export function parseNonNegativeMoney(raw: string): MoneyParseResult {
  const result = parseMoney(raw);

  if (result.kind === 'valid' && result.value < 0) {
    return { kind: 'invalid', reason: 'Enter an amount of zero or more.' };
  }

  return result;
}

/**
 * Parse an annual percentage rate typed as a percentage, such as `"22.15"`.
 *
 * Returned as a decimal fraction, because that is what the domain takes. The
 * input says 22.15 and `Rate` means 0.2215; this is the one place that
 * conversion happens.
 */
export type RateParseResult =
  | { readonly kind: 'empty' }
  | { readonly kind: 'valid'; readonly value: number }
  | { readonly kind: 'invalid'; readonly reason: string };

/** Highest APR an input will accept, as a percentage. */
export const MAX_INPUT_APR_PERCENT = 100;

export function parsePercent(raw: string): RateParseResult {
  const stripped = raw.replace(/[%\s]/g, '');

  if (stripped === '') {
    return { kind: 'empty' };
  }

  if (!NUMERIC.test(stripped)) {
    return { kind: 'invalid', reason: 'Use numbers only.' };
  }

  if (!HAS_DIGIT.test(stripped)) {
    return { kind: 'empty' };
  }

  // See parseMoney: NaN is unreachable here, and an overflow to Infinity is
  // caught by the ceiling check below.
  const percent = Number(stripped);

  if (percent < 0) {
    return { kind: 'invalid', reason: 'An APR cannot be negative.' };
  }

  if (percent > MAX_INPUT_APR_PERCENT) {
    return { kind: 'invalid', reason: `Enter an APR of ${MAX_INPUT_APR_PERCENT}% or less.` };
  }

  // Divided through a 15-significant-digit round trip so 22.15 becomes 0.2215
  // rather than 0.22149999999999997, which would then be shown back to the user
  // by any code that formats the rate.
  return { kind: 'valid', value: Number((percent / 100).toPrecision(15)) };
}
