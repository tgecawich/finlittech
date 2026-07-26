/**
 * Builds the shareable metadata for a calculator page: the description a link
 * unfurls with, and the dynamic OG image URL that renders the headline number.
 *
 * Returns a plain object rather than importing Next's `Metadata` type, so this
 * stays framework-free; the page spreads it into its own `Metadata`.
 */

import { CALCULATORS, type CalculatorId } from './calculators';
import { headlineFor } from './headlines';
import { encodeState } from './url-state';

export interface ShareMetadata {
  description: string;
  openGraph: {
    title: string;
    description: string;
    images: { url: string; width: number; height: number }[];
  };
  twitter: {
    card: 'summary_large_image';
    title: string;
    description: string;
    images: string[];
  };
}

export function shareMetadata(
  id: CalculatorId,
  params: Readonly<Record<string, string>>,
): ShareMetadata {
  const headline = headlineFor(id, params);

  // Only this calculator's own keys go into the OG URL, so a stray param on the
  // page URL cannot bloat or poison the image request.
  const own: Record<string, string> = {};
  for (const key of CALCULATORS[id].keys) {
    const value = params[key];
    if (value !== undefined) own[key] = value;
  }
  const query = encodeState(own);
  const ogUrl = `/api/og?calc=${id}${query ? `&${query}` : ''}`;

  const title = `${headline.calculator}: ${headline.value}`;

  return {
    description: headline.sentence,
    openGraph: {
      title,
      description: headline.sentence,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: headline.sentence,
      images: [ogUrl],
    },
  };
}
