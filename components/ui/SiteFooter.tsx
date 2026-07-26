import {
  DEFAULT_CREDIT_CARD_APR,
  DEFAULT_CREDIT_CARD_APR_AS_OF,
  TAX_YEAR,
} from "@/lib/finance";
import type { CalculatorId } from "@/lib/calculators";

const [APR_YEAR, APR_QUARTER] = DEFAULT_CREDIT_CARD_APR_AS_OF;
const APR_PERCENT = (DEFAULT_CREDIT_CARD_APR * 100).toFixed(2);

interface Citation {
  /** The default being cited, with its value. */
  label: string;
  /** What the value is. */
  detail: string;
  /** Where it comes from — omitted when the default is an illustrative assumption. */
  source?: { name: string; href: string };
}

/**
 * The defaults each calculator ships with, and where they come from. Values are
 * read from the constants, so a citation can never drift from the number it
 * cites. An assumption (an illustrative rate) is labelled as one rather than
 * dressed up with a false authority.
 */
function citationsFor(calculator: CalculatorId): Citation[] {
  switch (calculator) {
    case "credit-card":
      return [
        {
          label: `Default APR, ${APR_PERCENT}%`,
          detail: `average APR on accounts assessed interest, Q${APR_QUARTER} ${APR_YEAR}`,
          source: {
            name: "Federal Reserve G.19",
            href: "https://www.federalreserve.gov/releases/g19/current/",
          },
        },
      ];
    case "compound":
      return [
        {
          label: "Default return, 7%",
          detail:
            "a common long-run stock-market estimate, not a guarantee — real returns vary and can be negative",
        },
      ];
    case "loan":
      return [
        {
          label: "Default rate, 7.5%",
          detail: "an illustrative figure for a used-car loan, not a quoted rate",
        },
      ];
    case "paycheck":
      return [
        {
          label: `Federal tax, ${TAX_YEAR}`,
          detail: "marginal brackets and the standard deduction",
          source: {
            name: "IRS",
            href: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill",
          },
        },
        {
          label: "FICA",
          detail: "Social Security wage base, Medicare, and the Additional Medicare surtax",
          source: { name: "IRS & SSA", href: "https://www.irs.gov/taxtopics/tc751" },
        },
        {
          label: `Rhode Island tax, ${TAX_YEAR}`,
          detail: "brackets, standard deduction, and personal exemption",
          source: {
            name: "RI Division of Taxation",
            href: "https://tax.ri.gov/guidance/advisories",
          },
        },
      ];
    default:
      return [];
  }
}

export function SiteFooter({ calculator }: { calculator?: CalculatorId }) {
  const citations = calculator ? citationsFor(calculator) : [];

  return (
    <footer className="mt-20">
      <hr className="border-0 border-t border-rule" />
      <div className="caption measure mt-6 flex flex-col gap-4">
        <p>
          Nothing you type leaves your device. There are no accounts, and no
          value you enter is stored or sent anywhere.
        </p>

        {citations.length > 0 ? (
          <div>
            <p className="label-section">Where the numbers come from</p>
            <ul className="mt-2 flex flex-col gap-2">
              {citations.map((citation) => (
                <li key={citation.label}>
                  <span className="text-ink">{citation.label}</span> —{" "}
                  {citation.detail}
                  {citation.source ? (
                    <>
                      {" ("}
                      <a
                        href={citation.source.href}
                        className="underline underline-offset-2 hover:text-ink"
                      >
                        {citation.source.name}
                      </a>
                      {")"}
                    </>
                  ) : null}
                  .
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </footer>
  );
}
