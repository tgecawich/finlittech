"use client";

import { useEffect, useMemo, useState } from "react";

import { useCompletion, useUrlSync } from "@/components/analytics";
import { Callout } from "@/components/ui/Callout";
import { CopyLink } from "@/components/ui/CopyLink";
import { Field } from "@/components/ui/Field";
import { Figure } from "@/components/ui/Figure";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Rule } from "@/components/ui/Rule";
import { calcDefault } from "@/lib/calculators";
import { encodeState } from "@/lib/url-state";
import {
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

/** Delay before the result is announced to a screen reader. */
const ANNOUNCE_DELAY_MS = 700;

function errorOf(result: MoneyParseResult | RateParseResult): string | undefined {
  return result.kind === "invalid" ? result.reason : undefined;
}

/** Initial values from the URL (server-decoded), falling back to the defaults. */
export interface CreditCardCalculatorProps {
  initial?: Readonly<Record<string, string>>;
}

export function CreditCardCalculator({ initial = {} }: CreditCardCalculatorProps) {
  const [balanceRaw, setBalanceRaw] = useState(initial.balance ?? calcDefault("credit-card", "balance"));
  const [aprRaw, setAprRaw] = useState(initial.apr ?? calcDefault("credit-card", "apr"));
  const [paymentRaw, setPaymentRaw] = useState(initial.payment ?? calcDefault("credit-card", "payment"));

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

  // Reflect state into the URL so every result is a shareable link, and count
  // real use — never the values themselves.
  const queryString = encodeState({
    balance: balanceRaw,
    apr: aprRaw,
    payment: paymentRaw,
  });
  useUrlSync(queryString);
  useCompletion("credit-card", queryString, result !== null);

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

      {result !== null ? (
        <div className="mt-8">
          <CopyLink calculator="credit-card" />
        </div>
      ) : null}

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
          hint={`${calcDefault("credit-card", "apr")}% is the average for cards carrying a balance.`}
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
