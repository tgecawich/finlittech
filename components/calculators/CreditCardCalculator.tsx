"use client";

import { useEffect, useMemo, useState } from "react";

import { Callout } from "@/components/ui/Callout";
import { Field } from "@/components/ui/Field";
import { Figure } from "@/components/ui/Figure";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Rule } from "@/components/ui/Rule";
import {
  DEFAULT_CREDIT_CARD_APR,
  addCents,
  formatDuration,
  formatUSD,
  parseNonNegativeMoney,
  parsePercent,
  payoffMonths,
  type MoneyParseResult,
  type PayoffResult,
  type RateParseResult,
} from "@/lib/finance";

/**
 * Prefilled with a realistic scenario so the page answers its question before
 * anyone types. The audience has about forty-five seconds of patience, and an
 * empty form asks them to spend it on data entry.
 *
 * The APR default is derived from the cited constant rather than written out
 * again, so the two can never disagree.
 */
const DEFAULT_BALANCE = "1,200";
const DEFAULT_PAYMENT = "35";
const DEFAULT_APR = (DEFAULT_CREDIT_CARD_APR * 100).toFixed(2);

/** Delay before the result is announced to a screen reader. */
const ANNOUNCE_DELAY_MS = 700;

function errorOf(result: MoneyParseResult | RateParseResult): string | undefined {
  return result.kind === "invalid" ? result.reason : undefined;
}

export function CreditCardCalculator() {
  const [balanceRaw, setBalanceRaw] = useState(DEFAULT_BALANCE);
  const [aprRaw, setAprRaw] = useState(DEFAULT_APR);
  const [paymentRaw, setPaymentRaw] = useState(DEFAULT_PAYMENT);

  const { balance, apr, payment, result } = useMemo(() => {
    const parsedBalance = parseNonNegativeMoney(balanceRaw);
    const parsedApr = parsePercent(aprRaw);
    const parsedPayment = parseNonNegativeMoney(paymentRaw);

    // Narrowed explicitly rather than with a boolean flag, so the compiler is
    // the thing guaranteeing no unvalidated value reaches the domain.
    let computed: PayoffResult | null = null;
    if (
      parsedBalance.kind === "valid" &&
      parsedApr.kind === "valid" &&
      parsedPayment.kind === "valid"
    ) {
      computed = payoffMonths(
        parsedBalance.value,
        parsedApr.value,
        parsedPayment.value,
      );
    }

    return {
      balance: parsedBalance,
      apr: parsedApr,
      payment: parsedPayment,
      result: computed,
    };
  }, [balanceRaw, aprRaw, paymentRaw]);

  const summary = useSummary(result, balance, payment);

  /**
   * The figure updates instantly; only the screen-reader announcement is
   * delayed. Debouncing the visible number would add lag to a calculation that
   * takes microseconds, and a live region that fires on every keystroke is
   * unusable — so the delay goes where the problem actually is.
   */
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setAnnounced(summary), ANNOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [summary]);

  return (
    <>
      {/*
        Height is reserved so the page does not shift when the result changes
        between its shortest and tallest states.
      */}
      <section
        aria-labelledby="result-heading"
        className="min-h-64 flex flex-col justify-center"
      >
        <h2 id="result-heading" className="sr-only">
          Result
        </h2>
        <ResultDisplay result={result} balance={balance} payment={payment} />
      </section>

      <p aria-live="polite" className="sr-only">
        {announced}
      </p>

      <Rule className="my-10" />

      <form
        className="flex flex-col gap-8"
        onSubmit={(event) => event.preventDefault()}
      >
        <h2 className="sr-only">Your numbers</h2>

        <Field
          htmlFor="balance"
          label="What you owe"
          error={errorOf(balance)}
        >
          <MoneyInput
            id="balance"
            value={balanceRaw}
            onValueChange={setBalanceRaw}
            prefix="$"
            placeholder="1,200"
            hasError={balance.kind === "invalid"}
          />
        </Field>

        <Field
          htmlFor="apr"
          label="Interest rate"
          hint={`${DEFAULT_APR}% is the average for cards carrying a balance.`}
          error={errorOf(apr)}
        >
          <MoneyInput
            id="apr"
            value={aprRaw}
            onValueChange={setAprRaw}
            suffix="%"
            placeholder="22.15"
            hasHint
            hasError={apr.kind === "invalid"}
          />
        </Field>

        <Field
          htmlFor="payment"
          label="What you pay each month"
          error={errorOf(payment)}
        >
          <MoneyInput
            id="payment"
            value={paymentRaw}
            onValueChange={setPaymentRaw}
            prefix="$"
            placeholder="35"
            hasError={payment.kind === "invalid"}
          />
        </Field>
      </form>
    </>
  );
}

/** The sentence announced to screen readers, and the basis of every result state. */
function useSummary(
  result: PayoffResult | null,
  balance: MoneyParseResult,
  payment: MoneyParseResult,
): string {
  return useMemo(() => {
    if (result === null) return "";

    if (result.kind === "never") {
      const required =
        payment.kind === "valid"
          ? addCents(payment.value, result.shortfall)
          : result.shortfall;
      return `This balance never gets paid off. Interest alone is ${formatUSD(
        result.monthlyInterest,
      )} a month. You need at least ${formatUSD(required)} a month.`;
    }

    if (result.months === 0) {
      return "You owe nothing.";
    }

    const owed = balance.kind === "valid" ? formatUSD(balance.value, { cents: "auto" }) : "";
    return `Paying this off takes ${formatDuration(
      result.months,
    )} and costs ${formatUSD(result.totalInterest)} in interest, on top of ${owed}.`;
  }, [result, balance, payment]);
}

function ResultDisplay({
  result,
  balance,
  payment,
}: {
  result: PayoffResult | null;
  balance: MoneyParseResult;
  payment: MoneyParseResult;
}) {
  if (result === null) {
    return (
      <Figure label="What it costs you" note="Fill in all three to see the number.">
        <span className="text-ink-muted">&mdash;</span>
      </Figure>
    );
  }

  if (result.kind === "never") {
    const required =
      payment.kind === "valid"
        ? addCents(payment.value, result.shortfall)
        : result.shortfall;

    return (
      <div className="flex flex-col gap-6">
        <Figure label="This never gets paid off" tone="cost">
          {formatUSD(required)}
        </Figure>

        <Callout tone="cost">
          <p className="measure">
            At{" "}
            {payment.kind === "valid"
              ? formatUSD(payment.value, { cents: "auto" })
              : "this"}{" "}
            a month, interest alone is {formatUSD(result.monthlyInterest)}{" "}
            &mdash; the balance grows instead of shrinking. You need{" "}
            {formatUSD(required)} a month for it to move at all,{" "}
            {formatUSD(result.shortfall)} more than now.
          </p>
        </Callout>
      </div>
    );
  }

  if (result.months === 0) {
    return (
      <Figure label="What it costs you" note="You owe nothing.">
        {formatUSD(result.totalInterest, { cents: false })}
      </Figure>
    );
  }

  return (
    <Figure
      label="What it costs you"
      tone="cost"
      note={
        <>
          Paying{" "}
          {payment.kind === "valid" ? formatUSD(payment.value, { cents: "auto" }) : "this"} a month
          clears{" "}
          {balance.kind === "valid" ? formatUSD(balance.value, { cents: "auto" }) : "the balance"}{" "}
          in {formatDuration(result.months)} &mdash;{" "}
          {formatUSD(result.totalPaid, { cents: "auto" })} in total.
        </>
      }
    >
      {formatUSD(result.totalInterest, { cents: false })}
    </Figure>
  );
}
