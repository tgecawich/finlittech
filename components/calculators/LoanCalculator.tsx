"use client";

import { useMemo, useState } from "react";

import { useCompletion, useUrlSync } from "@/components/analytics";
import { CopyLink } from "@/components/ui/CopyLink";
import { Field } from "@/components/ui/Field";
import { Figure } from "@/components/ui/Figure";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Rule } from "@/components/ui/Rule";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { calcDefault } from "@/lib/calculators";
import { encodeState } from "@/lib/url-state";
import {
  amortize,
  formatDuration,
  formatUSD,
  parseNonNegativeMoney,
  parsePercent,
  type LoanResult,
  type MoneyParseResult,
  type RateParseResult,
} from "@/lib/finance";

const TERM_OPTIONS = [
  { value: 48, label: "4y" },
  { value: 60, label: "5y" },
  { value: 72, label: "6y" },
] as const;

function errorOf(result: MoneyParseResult | RateParseResult): string | undefined {
  return result.kind === "invalid" ? result.reason : undefined;
}

export interface LoanCalculatorProps {
  initial?: Readonly<Record<string, string>>;
}

export function LoanCalculator({ initial = {} }: LoanCalculatorProps) {
  const [amountRaw, setAmountRaw] = useState(initial.amount ?? calcDefault("loan", "amount"));
  const [rateRaw, setRateRaw] = useState(initial.rate ?? calcDefault("loan", "rate"));
  const [termMonths, setTermMonths] = useState<number>(
    Math.round(Number(initial.term ?? calcDefault("loan", "term"))),
  );

  const { amount, rate, result } = useMemo(() => {
    const parsedAmount = parseNonNegativeMoney(amountRaw);
    const parsedRate = parsePercent(rateRaw);

    const computed: LoanResult | null =
      parsedAmount.kind === "valid" && parsedRate.kind === "valid"
        ? amortize(parsedAmount.value, parsedRate.value, termMonths)
        : null;

    return { amount: parsedAmount, rate: parsedRate, result: computed };
  }, [amountRaw, rateRaw, termMonths]);

  const queryString = encodeState({
    amount: amountRaw,
    rate: rateRaw,
    term: String(termMonths),
  });
  useUrlSync(queryString);
  useCompletion("loan", queryString, result !== null);

  const firstPeriod = result?.schedule[0] ?? null;

  return (
    <>
      <section aria-labelledby="result-heading" className="min-h-56 flex flex-col justify-center">
        <h2 id="result-heading" className="sr-only">
          Result
        </h2>
        {result === null ? (
          <Figure label="Your monthly payment" note="Fill in all three to see the number.">
            <span className="text-ink-muted">&mdash;</span>
          </Figure>
        ) : (
          <div className="flex flex-col gap-6">
            <Figure
              label="Your monthly payment"
              note={
                <>
                  Over {formatDuration(termMonths)} that is{" "}
                  {formatUSD(result.totalPaid, { cents: false })} in all &mdash;{" "}
                  <span className="text-cost">
                    {formatUSD(result.totalInterest, { cents: false })} of it interest.
                  </span>
                </>
              }
            >
              {formatUSD(result.monthlyPayment)}
            </Figure>

            {firstPeriod && firstPeriod.interest > 0 ? (
              <p className="caption measure">
                In the first month, {formatUSD(firstPeriod.interest)} of that
                payment is interest and only {formatUSD(firstPeriod.principal)}{" "}
                goes to the balance. That flips as the loan is paid down.
              </p>
            ) : null}
            <CopyLink calculator="loan" />
          </div>
        )}
      </section>

      <Rule className="my-10" />

      <form className="flex flex-col gap-8" onSubmit={(event) => event.preventDefault()}>
        <h2 className="sr-only">Your numbers</h2>

        <Field htmlFor="amount" label="How much you borrow" error={errorOf(amount)}>
          <MoneyInput
            id="amount"
            value={amountRaw}
            onValueChange={setAmountRaw}
            prefix="$"
            placeholder="18,000"
            hasError={amount.kind === "invalid"}
          />
        </Field>

        <Field
          htmlFor="rate"
          label="Interest rate"
          hint="A used-car loan for someone with a short credit history often runs 7–12%."
          error={errorOf(rate)}
        >
          <MoneyInput
            id="rate"
            value={rateRaw}
            onValueChange={setRateRaw}
            suffix="%"
            placeholder="7.5"
            hasHint
            hasError={rate.kind === "invalid"}
          />
        </Field>

        <div>
          <p className="label-section">How long you take to pay it back</p>
          <div className="mt-2">
            <SegmentedControl
              label="Loan term in years"
              options={TERM_OPTIONS}
              value={termMonths}
              onChange={setTermMonths}
            />
          </div>
        </div>
      </form>
    </>
  );
}
