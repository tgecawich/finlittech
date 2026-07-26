import type { Metadata } from "next";
import Link from "next/link";

import { PaycheckCalculator } from "@/components/calculators/PaycheckCalculator";
import { SiteFooter } from "@/components/ui/SiteFooter";

export const metadata: Metadata = {
  title: "Paycheck",
  description:
    "See what you actually keep from a salary after federal tax, Social Security, Medicare, and Rhode Island tax.",
};

export default function PaycheckPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
      <Link
        href="/"
        className="label-section inline-block hover:text-ink transition-opacity duration-150"
      >
        &larr; FinLitTech
      </Link>

      <h1 className="figure-secondary mt-8">Paycheck</h1>
      <p className="measure mt-3">
        What lands in your account after everything is taken out.
      </p>

      <div className="mt-12">
        <PaycheckCalculator />
      </div>

      <SiteFooter />
    </main>
  );
}
