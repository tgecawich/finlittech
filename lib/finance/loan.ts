/**
 * Fixed-rate loan amortization.
 *
 * The level monthly payment on an amortizing loan is
 *
 *     M = P × i / (1 − (1 + i)^−n)
 *
 * (reference: standard amortization / present value of an annuity, e.g.
 * https://www.consumerfinance.gov/owning-a-home/loan-options/ and any bank's
 * amortization schedule). With a zero rate this is undefined, so there is an
 * explicit branch falling back to `P / n`.
 *
 * As everywhere in the domain, the schedule is simulated period by period on
 * integer cents. **The final payment absorbs the rounding residual**: per-period
 * rounding otherwise leaves the closing balance at ±1–3 cents instead of zero,
 * and adjusting the last payment is what separates a working amortization table
 * from a correct one. Unlike the credit card, a loan always pays off in exactly
 * its term — the term is given, not discovered — so there is no non-terminating
 * case to guard.
 */

import {
  addCents,
  multiplyCentsByRate,
  roundHalfAwayFromZero,
  subtractCents,
} from './money';
import {
  centsFromInteger,
  toMonthlyRate,
  ZERO_CENTS,
  type Cents,
  type Months,
  type Rate,
} from './types';

/** One month of an amortization schedule. */
export interface LoanPeriod {
  /** 1-based month number. */
  readonly month: Months;
  readonly startingBalance: Cents;
  readonly interest: Cents;
  readonly principal: Cents;
  readonly payment: Cents;
  /** Balance carried out of this month. Exactly zero in the final month. */
  readonly endingBalance: Cents;
}

/** The result of amortizing a loan. */
export interface LoanResult {
  /**
   * The level monthly payment. Every month bills this except the last, which is
   * adjusted by a cent or two to land the balance on exactly zero.
   */
  readonly monthlyPayment: Cents;
  readonly totalInterest: Cents;
  readonly totalPaid: Cents;
  readonly schedule: readonly LoanPeriod[];
}

/**
 * Amortize `principal` at `annualRate` over `termMonths` equal monthly payments.
 *
 * Throws on a negative principal, a term under one month, or a percentage passed
 * where a fraction was meant — all caller bugs.
 */
export function amortize(
  principal: Cents,
  annualRate: Rate,
  termMonths: Months,
): LoanResult {
  if (principal < 0) {
    throw new RangeError(`amortize: principal must not be negative, received ${principal}`);
  }
  if (!Number.isInteger(termMonths) || termMonths < 1) {
    throw new RangeError(`amortize: termMonths must be a whole number >= 1, received ${termMonths}`);
  }

  // Validates the rate, so an APR passed as 6 instead of 0.06 throws here.
  const monthlyRate = toMonthlyRate(annualRate);

  const monthlyPayment = levelPayment(principal, monthlyRate, termMonths);

  const schedule: LoanPeriod[] = [];
  let remaining: Cents = principal;
  let totalInterest = ZERO_CENTS;
  let totalPaid = ZERO_CENTS;

  for (let month = 1; month <= termMonths; month += 1) {
    const startingBalance = remaining;
    const interest = multiplyCentsByRate(startingBalance, monthlyRate);

    // The final month bills whatever clears the loan — starting balance plus its
    // interest — which absorbs the residual left by per-period rounding. Earlier
    // months bill the level payment, capped so a near-final overpayment can't
    // drive the balance negative.
    const isFinalMonth = month === termMonths;
    const payoffAmount = addCents(startingBalance, interest);
    const scheduledPayment =
      monthlyPayment < payoffAmount ? monthlyPayment : payoffAmount;
    const payment = isFinalMonth ? payoffAmount : scheduledPayment;

    const principalPaid = subtractCents(payment, interest);
    const endingBalance = subtractCents(startingBalance, principalPaid);

    schedule.push({
      month,
      startingBalance,
      interest,
      principal: principalPaid,
      payment,
      endingBalance,
    });

    totalInterest = addCents(totalInterest, interest);
    totalPaid = addCents(totalPaid, payment);
    remaining = endingBalance;
  }

  return { monthlyPayment, totalInterest, totalPaid, schedule };
}

/**
 * The closed-form level payment, rounded to a whole cent.
 *
 * The schedule is what's authoritative — this only sets the monthly figure the
 * borrower sees and the amount billed in every month but the last.
 */
function levelPayment(principal: Cents, monthlyRate: Rate, termMonths: Months): Cents {
  if (monthlyRate === 0) {
    return centsFromInteger(roundHalfAwayFromZero(principal / termMonths));
  }
  const factor = 1 - Math.pow(1 + monthlyRate, -termMonths);
  return centsFromInteger(roundHalfAwayFromZero((principal * monthlyRate) / factor));
}
