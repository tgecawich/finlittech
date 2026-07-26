import type { Metadata } from "next";
import Link from "next/link";

import { CompoundCalculator } from "@/components/calculators/CompoundCalculator";
import { SiteFooter } from "@/components/ui/SiteFooter";

export const metadata: Metadata = {
  title: "Compound interest",
  description:
    "See what starting to invest now is worth against starting ten years later — the same monthly amount, a very different ending.",
};

export default function CompoundPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
      <Link
        href="/"
        className="label-section inline-block hover:text-ink transition-opacity duration-150"
      >
        &larr; FinLitTech
      </Link>

      <h1 className="figure-secondary mt-8">Compound interest</h1>
      <p className="measure mt-3">
        The same amount each month. The only difference is when you start.
      </p>

      <div className="mt-12">
        <CompoundCalculator />
      </div>

      <SiteFooter />
    </main>
  );
}
