"use client";

import { useMemo, useState } from "react";

import { Field } from "@/components/ui/Field";
import { Figure } from "@/components/ui/Figure";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Rule } from "@/components/ui/Rule";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  costOfWaiting,
  formatUSD,
  parseNonNegativeMoney,
  parsePercent,
  type MoneyParseResult,
  type RateParseResult,
} from "@/lib/finance";
import { GrowthChart } from "./GrowthChart";

/** The premise of the comparison: starting now versus starting a decade late. */
const DELAY_YEARS = 10;
const DELAY_MONTHS = DELAY_YEARS * 12;

const DEFAULT_MONTHLY = "100";
const DEFAULT_RETURN = "7";
const DEFAULT_YEARS = 40;

const HORIZON_OPTIONS = [
  { value: 20, label: "20y" },
  { value: 30, label: "30y" },
  { value: 40, label: "40y" },
] as const;

function errorOf(result: MoneyParseResult | RateParseResult): string | undefined {
  return result.kind === "invalid" ? result.reason : undefined;
}

export function CompoundCalculator() {
  const [monthlyRaw, setMonthlyRaw] = useState(DEFAULT_MONTHLY);
  const [returnRaw, setReturnRaw] = useState(DEFAULT_RETURN);
  const [years, setYears] = useState<number>(DEFAULT_YEARS);

  const { monthly, annualReturn, result } = useMemo(() => {
    const parsedMonthly = parseNonNegativeMoney(monthlyRaw);
    const parsedReturn = parsePercent(returnRaw);

    const computed =
      parsedMonthly.kind === "valid" && parsedReturn.kind === "valid"
        ? costOfWaiting(
            parsedMonthly.value,
            parsedReturn.value,
            years * 12,
            DELAY_MONTHS,
          )
        : null;

    return { monthly: parsedMonthly, annualReturn: parsedReturn, result: computed };
  }, [monthlyRaw, returnRaw, years]);

  const altText = useMemo(() => {
    if (result === null) return "Enter an amount and a return to see the projection.";
    const immediateFinal = result.immediate[result.immediate.length - 1];
    const delayedFinal = result.delayed[result.delayed.length - 1];
    if (immediateFinal === undefined || delayedFinal === undefined) return "";
    return (
      `Putting in ${formatUSD(result.immediateContributed, { cents: false })} in total, ` +
      `${formatUSD(immediateFinal.value, { cents: false })} is what you end with over ${years} years. ` +
      `Waiting ${DELAY_YEARS} years to start leaves you with ${formatUSD(delayedFinal.value, { cents: false })} instead — ` +
      `${formatUSD(result.costOfWaiting, { cents: false })} less, on only ${formatUSD(result.extraContributed, { cents: false })} less paid in.`
    );
  }, [result, years]);

  return (
    <>
      <section aria-labelledby="result-heading" className="min-h-40 flex flex-col justify-center">
        <h2 id="result-heading" className="sr-only">
          Result
        </h2>
        {result === null ? (
          <Figure label="What starting now is worth" note="Fill in both to see the number.">
            <span className="text-ink-muted">&mdash;</span>
          </Figure>
        ) : (
          <Figure
            label="What starting now is worth"
            tone="gain"
            note={
              <>
                Ten years of waiting. You pay in only{" "}
                {formatUSD(result.extraContributed, { cents: false })} more by
                starting now — and end with{" "}
                {formatUSD(result.costOfWaiting, { cents: false })} more.
              </>
            }
          >
            {formatUSD(result.costOfWaiting, { cents: false })}
          </Figure>
        )}
      </section>

      {/* Height reserved so clearing an input never collapses the chart. */}
      <div className="mt-8 min-h-[380px]">
        {result === null ? null : (
          <>
            <GrowthChart
              immediate={result.immediate}
              delayed={result.delayed}
              delayMonths={result.delayMonths}
              costOfWaiting={result.costOfWaiting}
              altText={altText}
            />
            <p className="caption measure mt-4">{altText}</p>
          </>
        )}
      </div>

      <Rule className="my-10" />

      <form className="flex flex-col gap-8" onSubmit={(event) => event.preventDefault()}>
        <h2 className="sr-only">Your numbers</h2>

        <Field htmlFor="monthly" label="What you put in each month" error={errorOf(monthly)}>
          <MoneyInput
            id="monthly"
            value={monthlyRaw}
            onValueChange={setMonthlyRaw}
            prefix="$"
            placeholder="100"
            hasError={monthly.kind === "invalid"}
          />
        </Field>

        <Field
          htmlFor="return"
          label="Yearly return"
          hint="7% is a common long-run stock-market estimate. It is not guaranteed."
          error={errorOf(annualReturn)}
        >
          <MoneyInput
            id="return"
            value={returnRaw}
            onValueChange={setReturnRaw}
            suffix="%"
            placeholder="7"
            hasHint
            hasError={annualReturn.kind === "invalid"}
          />
        </Field>

        <div>
          <p className="label-section">For how long</p>
          <div className="mt-2">
            <SegmentedControl
              label="Savings horizon in years"
              options={HORIZON_OPTIONS}
              value={years}
              onChange={setYears}
            />
          </div>
        </div>
      </form>
    </>
  );
}
