import type { Metadata } from "next";
import Link from "next/link";

import { CreditCardCalculator } from "@/components/calculators/CreditCardCalculator";
import { SiteFooter } from "@/components/ui/SiteFooter";

export const metadata: Metadata = {
  title: "Credit card",
  description:
    "See how long a credit card balance takes to pay off and what the interest costs, including when the payment never clears it.",
};

export default function CreditCardPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
      <Link
        href="/"
        className="label-section inline-block hover:text-ink transition-opacity duration-150"
      >
        &larr; FinLitTech
      </Link>

      <h1 className="figure-secondary mt-8">Credit card</h1>
      <p className="measure mt-3">
        How long a balance takes to clear, and what the interest costs you.
      </p>

      <div className="mt-12">
        <CreditCardCalculator />
      </div>

      <SiteFooter />
    </main>
  );
}
