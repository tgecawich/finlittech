import type { Metadata } from "next";
import Link from "next/link";

import { LoanCalculator } from "@/components/calculators/LoanCalculator";
import { SiteFooter } from "@/components/ui/SiteFooter";

export const metadata: Metadata = {
  title: "Loan",
  description:
    "See the monthly payment on a car or personal loan, and how much of it is interest over the life of the loan.",
};

export default function LoanPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
      <Link
        href="/"
        className="label-section inline-block hover:text-ink transition-opacity duration-150"
      >
        &larr; FinLitTech
      </Link>

      <h1 className="figure-secondary mt-8">Loan</h1>
      <p className="measure mt-3">
        What a car or personal loan costs each month, and in the end.
      </p>

      <div className="mt-12">
        <LoanCalculator />
      </div>

      <SiteFooter />
    </main>
  );
}
