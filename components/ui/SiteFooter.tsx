import { DEFAULT_CREDIT_CARD_APR_AS_OF } from "@/lib/finance";

const [SOURCE_YEAR, SOURCE_QUARTER] = DEFAULT_CREDIT_CARD_APR_AS_OF;

/**
 * Every default the app shows, with its source.
 *
 * The vintage is read from the constant rather than written here, so a citation
 * cannot drift away from the number it is citing.
 */
export function SiteFooter() {
  return (
    <footer className="mt-20">
      <hr className="border-0 border-t border-rule" />
      <div className="caption measure mt-6 flex flex-col gap-3">
        <p>
          Nothing you type leaves your device. There are no accounts, and no
          value you enter is stored or sent anywhere.
        </p>
        <p>
          Default interest rate: average APR on accounts assessed interest,{" "}
          Q{SOURCE_QUARTER} {SOURCE_YEAR}, from the{" "}
          <a
            href="https://www.federalreserve.gov/releases/g19/current/"
            className="underline underline-offset-2 hover:text-ink"
          >
            Federal Reserve G.19 release
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
