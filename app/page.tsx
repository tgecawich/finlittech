import Link from "next/link";

import { SiteFooter } from "@/components/ui/SiteFooter";

/**
 * The landing page: the four tools, nothing else.
 *
 * Three of them are not built yet and say so plainly rather than linking to a
 * dead route or hiding until they exist. A tool that is coming is information;
 * a 404 is not.
 */
const TOOLS = [
  {
    name: "Credit card",
    description:
      "How long a balance takes to pay off, and what the interest costs. Including when the payment never clears it at all.",
    href: "/credit-card",
  },
  {
    name: "Compound interest",
    description:
      "What starting now is worth against starting ten years from now.",
    href: "/compound",
  },
  {
    name: "Loan",
    description: "A full payment schedule for a car or student loan.",
    href: null,
  },
  {
    name: "Paycheck",
    description:
      "Gross to net, with federal, FICA, and Rhode Island withholding.",
    href: null,
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
      <h1 className="figure-primary">FinLitTech</h1>
      <p className="measure mt-6 text-lg">
        Four calculators for the money questions nobody shows you the arithmetic
        for. Enter your numbers, see what they actually cost.
      </p>
      <p className="caption measure mt-4">
        No accounts. Nothing saved. Nothing you type leaves your device.
      </p>

      <ul className="mt-14">
        {TOOLS.map((tool) => (
          <li key={tool.name}>
            <hr className="border-0 border-t border-rule" />
            {tool.href ? (
              <Link
                href={tool.href}
                className="group block py-6 transition-opacity duration-150 hover:opacity-70"
              >
                <span className="figure-secondary block">
                  {tool.name}{" "}
                  <span aria-hidden="true" className="text-ink-muted">
                    &rarr;
                  </span>
                </span>
                <span className="measure mt-2 block">{tool.description}</span>
              </Link>
            ) : (
              <div className="py-6">
                <span className="figure-secondary block text-ink-muted">
                  {tool.name}
                </span>
                <span className="measure mt-2 block text-ink-muted">
                  {tool.description}
                </span>
                <span className="label-section mt-2 block">Not built yet</span>
              </div>
            )}
          </li>
        ))}
        <li>
          <hr className="border-0 border-t border-rule" />
        </li>
      </ul>

      <SiteFooter />
    </main>
  );
}
