/**
 * Arithmetic on `Cents`, plus formatting at the render boundary.
 *
 * ## Rounding convention
 *
 * **Interest accrues on integer cents and rounds half away from zero at period
 * close.** One convention, applied everywhere. Inconsistent rounding is how
 * schedules stop summing.
 *
 * Two consequences worth understanding before changing anything here:
 *
 * 1. *Rounding happens once per period, not once at the end.* A period's
 *    interest is rounded to a whole cent before it is added to the balance, so
 *    the next period accrues on a whole number of cents. This is what a card
 *    issuer does, and it is why simulating month by month gives a different —
 *    and more truthful — answer than the closed form.
 *
 * 2. *Ties round away from zero, not toward positive infinity.* `-0.5` becomes
 *    `-1`, not `0`. This keeps `round(-x) === -round(x)`, so a refund and a
 *    charge of equal size round to equal magnitudes. `Math.round` on its own
 *    does not have this property.
 *
 * The residual that per-period rounding accumulates is absorbed by the final
 * payment in each schedule, so a closing balance lands on exactly zero rather
 * than a stray cent or three. See docs/decisions/0001-rounding-convention.md.
 */

import {
  centsFromInteger,
  roundHalfAwayFromZero,
  type Cents,
  type Months,
  type Rate,
} from './types';

// Re-exported so callers reaching for the rounding primitive find it beside the
// convention it implements. The implementation lives in types.ts because
// `toCents` needs it and money.ts depends on types.ts, not the reverse.
export { roundHalfAwayFromZero };

/** Sum of two amounts. */
export function addCents(a: Cents, b: Cents): Cents {
  return centsFromInteger(a + b);
}

/** Difference of two amounts. May be negative. */
export function subtractCents(a: Cents, b: Cents): Cents {
  return centsFromInteger(a - b);
}

/** Negation. `negateCents(ZERO_CENTS)` is `0`, never `-0`. */
export function negateCents(amount: Cents): Cents {
  return centsFromInteger(-amount);
}

/**
 * Scale an amount by a rate, rounding to a whole cent.
 *
 * This is the only multiplication in the domain, which is deliberate: it means
 * there is exactly one place where a fractional cent can appear, and exactly
 * one rounding decision to audit.
 */
export function multiplyCentsByRate(amount: Cents, rate: Rate): Cents {
  if (!Number.isFinite(rate)) {
    throw new RangeError(
      `multiplyCentsByRate: expected a finite rate, received ${String(rate)}`,
    );
  }
  return centsFromInteger(roundHalfAwayFromZero(amount * rate));
}

/** Total of a list of amounts. An empty list sums to zero. */
export function sumCents(amounts: readonly Cents[]): Cents {
  let total = 0;
  for (const amount of amounts) {
    total += amount;
  }
  return centsFromInteger(total);
}

/** Negative when `a` is smaller, positive when larger, zero when equal. */
export function compareCents(a: Cents, b: Cents): number {
  return a - b;
}

/** The larger of two amounts. */
export function maxCents(a: Cents, b: Cents): Cents {
  return a >= b ? a : b;
}

/** The smaller of two amounts. */
export function minCents(a: Cents, b: Cents): Cents {
  return a <= b ? a : b;
}

/**
 * Convert to dollars as a plain number.
 *
 * Only for formatting and charting, where a fractional value is what the
 * consumer needs. Never feed the result back into domain arithmetic — that is
 * precisely the floating-point path the `Cents` type exists to prevent.
 */
export function toDollars(amount: Cents): number {
  return amount / 100;
}

/** Options for {@link formatUSD}. */
export interface FormatUSDOptions {
  /**
   * Include cents. Defaults to `true`.
   *
   * The Voice section calls for "That costs you $912", not "$912.44" — headline
   * figures pass `cents: false`, schedules and line items keep the precision.
   *
   * `"auto"` shows cents only when there are any, so a sentence reads "paying
   * $35 a month" rather than "paying $35.00 a month", without ever rounding
   * $35.50 down to $36 and stating something untrue.
   */
  readonly cents?: boolean | 'auto';
}

// Constructing an Intl.NumberFormat is expensive relative to formatting with
// one, and results re-render on every keystroke. Build each variant once.
const WITH_CENTS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const WITHOUT_CENTS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Render an amount as a US dollar string. The one place in the app where money
 * becomes text.
 *
 * Whole-dollar output rounds half away from zero, matching the domain
 * convention: `$0.50` renders as `$1` and `-$0.50` as `-$1`.
 */
export function formatUSD(amount: Cents, options: FormatUSDOptions = {}): string {
  const { cents = true } = options;
  const showCents = cents === 'auto' ? amount % 100 !== 0 : cents;
  return (showCents ? WITH_CENTS : WITHOUT_CENTS).format(toDollars(amount));
}

const COMPACT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/**
 * Render an amount abbreviated: `$262K`, `$1.2M`, `$950`.
 *
 * For chart axes and inline plot labels, where the full figure is too long and
 * the precise cents are noise. The headline still uses {@link formatUSD}; this
 * is only ever a label on a picture.
 */
export function formatCompactUSD(amount: Cents): string {
  return COMPACT.format(toDollars(amount));
}

/**
 * Render a count of months the way a person would say it.
 *
 * "55 months" is technically the answer and tells a sixteen-year-old nothing.
 * "4 years 7 months" is the same fact in a unit they feel. Formatting at the
 * boundary, like {@link formatUSD}, and tested for the same reason.
 */
export function formatDuration(months: Months): string {
  if (months < 12) {
    return months === 1 ? '1 month' : `${months} months`;
  }

  const years = Math.floor(months / 12);
  const remainder = months % 12;
  const yearPart = years === 1 ? '1 year' : `${years} years`;

  if (remainder === 0) {
    return yearPart;
  }

  return `${yearPart} ${remainder === 1 ? '1 month' : `${remainder} months`}`;
}
