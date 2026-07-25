/**
 * Local scratch pad for exercising the finance domain by hand.
 *
 *   npm run try
 *
 * Edit the calls at the bottom and re-run. This is a developer tool, not part
 * of the suite: it asserts nothing, and it is excluded from `npm test` and from
 * CI by living outside `test/`. It ships in no bundle.
 *
 * It is written as a vitest file purely because vitest is already installed and
 * resolves TypeScript and the `@/` alias for free — Node cannot import these
 * modules directly, because its ESM resolver requires explicit file extensions.
 * The `it()` wrapper is just vitest's entry point.
 */

import { it } from 'vitest';

import {
  DEFAULT_CREDIT_CARD_APR,
  formatUSD,
  payoffMonths,
  toCents,
} from '@/lib/finance';

/** Print a payoff scenario roughly the way the UI eventually will. */
function show(balanceDollars: number, annualRate: number, paymentDollars: number): void {
  const result = payoffMonths(toCents(balanceDollars), annualRate, toCents(paymentDollars));
  const heading = `$${balanceDollars} at ${(annualRate * 100).toFixed(2)}% APR, paying $${paymentDollars}/mo`;

  if (result.kind === 'never') {
    console.log(`\n${heading}`);
    console.log(`  never pays off.`);
    console.log(`  Interest alone is ${formatUSD(result.monthlyInterest)} a month.`);
    console.log(`  You need ${formatUSD(result.shortfall)} more per month.`);
    return;
  }

  const years = Math.floor(result.months / 12);
  const months = result.months % 12;

  console.log(`\n${heading}`);
  console.log(`  ${result.months} months (${years}y ${months}m)`);
  console.log(`  That costs you ${formatUSD(result.totalInterest, { cents: false })}.`);
  console.log(`  Total paid: ${formatUSD(result.totalPaid)}`);
}

/** Print a full amortisation schedule, one row per month. */
function showSchedule(
  balanceDollars: number,
  annualRate: number,
  paymentDollars: number,
): void {
  const result = payoffMonths(toCents(balanceDollars), annualRate, toCents(paymentDollars));
  if (result.kind !== 'paid') return;

  console.log(
    `\nSchedule for $${balanceDollars} at ${(annualRate * 100).toFixed(2)}%, $${paymentDollars}/mo`,
  );
  console.log('  month     starting     interest    principal       ending');
  for (const period of result.schedule) {
    console.log(
      [
        String(period.month).padStart(7),
        formatUSD(period.startingBalance).padStart(13),
        formatUSD(period.interest).padStart(13),
        formatUSD(period.principal).padStart(13),
        formatUSD(period.endingBalance).padStart(13),
      ].join(''),
    );
  }
}

it('playground', () => {
  // ---- edit below ----
  show(1200, DEFAULT_CREDIT_CARD_APR, 35);
  show(1200, DEFAULT_CREDIT_CARD_APR, 100);
  show(3000, 0.24, 50);
  showSchedule(1000, 0.12, 100);
});
