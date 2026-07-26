"use client";

import { useMemo, useState } from "react";

import { Field } from "@/components/ui/Field";
import { Figure } from "@/components/ui/Figure";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Rule } from "@/components/ui/Rule";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  divideCents,
  estimatePaycheck,
  formatUSD,
  parseNonNegativeMoney,
  type Cents,
  type PaycheckResult,
} from "@/lib/finance";

const DEFAULT_SALARY = "45,000";

const FREQUENCIES = [
  { value: 52, label: "Weekly" },
  { value: 26, label: "Every 2 weeks" },
  { value: 12, label: "Monthly" },
] as const;

interface LineItem {
  label: string;
  amount: Cents;
}

export function PaycheckCalculator() {
  const [salaryRaw, setSalaryRaw] = useState(DEFAULT_SALARY);
  const [periodsPerYear, setPeriodsPerYear] = useState<number>(26);

  const { salary, result } = useMemo(() => {
    const parsed = parseNonNegativeMoney(salaryRaw);
    const computed: PaycheckResult | null =
      parsed.kind === "valid" ? estimatePaycheck(parsed.value) : null;
    return { salary: parsed, result: computed };
  }, [salaryRaw]);

  const keptPercent =
    result === null ? null : Math.round((1 - result.effectiveRate) * 100);

  const lineItems: LineItem[] =
    result === null
      ? []
      : [
          { label: "Federal income tax", amount: result.federalIncomeTax },
          { label: "Social Security", amount: result.socialSecurity },
          { label: "Medicare", amount: result.medicare },
          ...(result.additionalMedicare > 0
            ? [{ label: "Additional Medicare", amount: result.additionalMedicare }]
            : []),
          { label: "Rhode Island tax", amount: result.stateIncomeTax },
        ];

  return (
    <>
      <section aria-labelledby="result-heading" className="min-h-40 flex flex-col justify-center">
        <h2 id="result-heading" className="sr-only">
          Result
        </h2>
        {result === null || keptPercent === null ? (
          <Figure label="What you actually take home" note="Enter your pay to see the number.">
            <span className="text-ink-muted">&mdash;</span>
          </Figure>
        ) : (
          <Figure
            label="What you actually take home"
            tone="gain"
            note={
              <>
                You keep {keptPercent}% of{" "}
                {formatUSD(result.annualGross, { cents: false })}. About{" "}
                {formatUSD(divideCents(result.net, periodsPerYear), { cents: false })}{" "}
                lands in each paycheck.
              </>
            }
          >
            {formatUSD(result.net, { cents: false })}
          </Figure>
        )}
      </section>

      {result === null ? null : (
        <div className="mt-8">
          <p className="label-section">Where the rest goes, each year</p>
          <dl className="mt-3">
            {lineItems.map((item) => (
              <div
                key={item.label}
                className="flex items-baseline justify-between border-t border-rule py-3"
              >
                <dt>{item.label}</dt>
                <dd className="tabular-nums">{formatUSD(item.amount)}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between border-t border-rule py-3">
              <dt className="label-section">Total withheld</dt>
              <dd className="tabular-nums text-cost">{formatUSD(result.totalTax)}</dd>
            </div>
          </dl>
        </div>
      )}

      <Rule className="my-10" />

      <form className="flex flex-col gap-8" onSubmit={(event) => event.preventDefault()}>
        <h2 className="sr-only">Your numbers</h2>

        <Field
          htmlFor="salary"
          label="What you earn in a year"
          hint="Before anything is taken out. This estimates a single filer taking the standard deduction — no other income or deductions."
          error={salary.kind === "invalid" ? salary.reason : undefined}
        >
          <MoneyInput
            id="salary"
            value={salaryRaw}
            onValueChange={setSalaryRaw}
            prefix="$"
            placeholder="45,000"
            hasHint
            hasError={salary.kind === "invalid"}
          />
        </Field>

        <div>
          <p className="label-section">How often you are paid</p>
          <div className="mt-2">
            <SegmentedControl
              label="Pay frequency"
              options={FREQUENCIES}
              value={periodsPerYear}
              onChange={setPeriodsPerYear}
            />
          </div>
        </div>
      </form>
    </>
  );
}
