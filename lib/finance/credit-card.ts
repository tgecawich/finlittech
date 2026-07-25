/**
 * Credit card payoff simulation.
 *
 * Simulated month by month rather than solved in closed form. It is a handful
 * of iterations, it is obviously correct on inspection, and it produces the
 * schedule the chart needs anyway. The closed form
 * `n = -log(1 - (B × i) / P) / log(1 + i)` also disagrees with a real statement
 * by a few cents, because an issuer rounds interest to a whole cent every month
 * and the formula does not.
 *
 * Reference: standard declining-balance amortisation. See
 * https://www.consumerfinance.gov/ask-cfpb/how-is-my-credit-card-interest-calculated-en-51/
 */

import {
  addCents,
  multiplyCentsByRate,
  subtractCents,
} from './money';
import {
  ONE_CENT,
  ZERO_CENTS,
  toMonthlyRate,
  type Cents,
  type Months,
  type Rate,
} from './types';

/** One month of a payoff schedule. */
export interface Period {
  /** 1-based month number. */
  readonly month: Months;
  /** Balance carried into this month. */
  readonly startingBalance: Cents;
  /** Interest charged this month, rounded to a whole cent. */
  readonly interest: Cents;
  /** Portion of the payment that reduced the balance. */
  readonly principal: Cents;
  /**
   * Amount actually paid this month. Equal to the requested payment except in
   * the final month, which pays only what is left.
   */
  readonly payment: Cents;
  /** Balance carried out of this month. Exactly zero in the final month. */
  readonly endingBalance: Cents;
}

/**
 * The outcome of a payoff simulation.
 *
 * A card that never pays off is not an exception — it is the single most
 * important number this app produces, so it is a modelled state with an exact
 * shortfall figure rather than a thrown error (CLAUDE.md → Error handling).
 */
export type PayoffResult =
  | {
      readonly kind: 'paid';
      readonly months: Months;
      readonly totalInterest: Cents;
      readonly totalPaid: Cents;
      readonly schedule: readonly Period[];
    }
  | {
      readonly kind: 'never';
      /** Interest charged in the first month, which the payment fails to cover. */
      readonly monthlyInterest: Cents;
      /**
       * How much *more* per month is required for the balance to ever reach
       * zero. The UI states it plainly: "At $35/month this never gets paid off.
       * You need at least $58."
       */
      readonly shortfall: Cents;
    };

/**
 * Simulate paying off `balance` at `annualRate` with a fixed monthly `payment`.
 *
 * Interest is charged on the balance at the start of each month, then the
 * payment is applied. The final payment is reduced to exactly what remains, so
 * the closing balance is exactly zero rather than a stray cent.
 *
 * Throws on negative input, which means a caller is broken.
 */
export function payoffMonths(
  balance: Cents,
  annualRate: Rate,
  payment: Cents,
): PayoffResult {
  if (balance < 0) {
    throw new RangeError(`payoffMonths: balance must not be negative, received ${balance}`);
  }
  if (payment < 0) {
    throw new RangeError(`payoffMonths: payment must not be negative, received ${payment}`);
  }

  // Validates the rate, so an APR passed as 22.15 instead of 0.2215 throws here.
  const monthlyRate = toMonthlyRate(annualRate);

  // Nothing owed, nothing to simulate. An empty schedule is the honest answer:
  // there are no periods.
  if (balance === 0) {
    return {
      kind: 'paid',
      months: 0,
      totalInterest: ZERO_CENTS,
      totalPaid: ZERO_CENTS,
      schedule: [],
    };
  }

  // Guard the non-terminating case BEFORE the loop, never with an iteration cap.
  //
  // The first month's interest is the largest interest charge that can ever
  // occur, because the balance is at its highest. So if the payment covers the
  // first month's interest with at least one cent to spare, the balance falls
  // every month, interest falls with it, and the loop is guaranteed to finish.
  // If it does not, the balance is flat or growing and no iteration count would
  // ever reveal that — the loop would simply run until the cap and lie.
  const monthlyInterest = multiplyCentsByRate(balance, monthlyRate);
  const requiredPayment = addCents(monthlyInterest, ONE_CENT);

  if (payment < requiredPayment) {
    return {
      kind: 'never',
      monthlyInterest,
      shortfall: subtractCents(requiredPayment, payment),
    };
  }

  const schedule: Period[] = [];
  let remaining: Cents = balance;
  let totalInterest = ZERO_CENTS;
  let totalPaid = ZERO_CENTS;

  while (remaining > 0) {
    const startingBalance = remaining;
    const interest = multiplyCentsByRate(startingBalance, monthlyRate);

    // What it would take to clear the account this month. The final payment
    // absorbs the residual left by per-period rounding, which is what makes the
    // closing balance land on exactly zero.
    const payoffAmount = addCents(startingBalance, interest);
    const appliedPayment = payment < payoffAmount ? payment : payoffAmount;

    const principal = subtractCents(appliedPayment, interest);
    const endingBalance = subtractCents(startingBalance, principal);

    schedule.push({
      month: schedule.length + 1,
      startingBalance,
      interest,
      principal,
      payment: appliedPayment,
      endingBalance,
    });

    totalInterest = addCents(totalInterest, interest);
    totalPaid = addCents(totalPaid, appliedPayment);
    remaining = endingBalance;
  }

  return {
    kind: 'paid',
    months: schedule.length,
    totalInterest,
    totalPaid,
    schedule,
  };
}
