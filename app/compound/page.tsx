import type { Metadata } from "next";
import Link from "next/link";

import { CompoundCalculator } from "@/components/calculators/CompoundCalculator";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { CALCULATORS } from "@/lib/calculators";
import { shareMetadata } from "@/lib/share";
import { decodeState, firstValues, withDefaults } from "@/lib/url-state";

const CFG = CALCULATORS.compound;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = firstValues(await searchParams);
  return { title: "Compound interest", ...shareMetadata("compound", params) };
}

export default async function CompoundPage({ searchParams }: { searchParams: SearchParams }) {
  const params = firstValues(await searchParams);
  const initial = withDefaults(CFG.defaults, decodeState(new URLSearchParams(params), CFG.keys));

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
        <CompoundCalculator initial={initial} />
      </div>

      <SiteFooter />
    </main>
  );
}
