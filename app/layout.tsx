import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

/**
 * Source Serif 4, variable, for result numerals only.
 *
 * next/font self-hosts the file at build time, so there is no request to Google
 * at runtime — one fewer third-party dependency, and nothing about a student's
 * visit leaves the origin. It also generates a fallback with adjusted metrics,
 * which is what keeps the swap from shifting layout.
 *
 * No weight is specified, so the variable font is used. The design has two
 * weights in total and creates emphasis with scale, not weight.
 */
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://finlittech.vercel.app"),
  title: {
    default: "FinLitTech — see the number",
    template: "%s · FinLitTech",
  },
  description:
    "Free calculators that show what a credit card balance, a loan, or a paycheck actually costs. No accounts, nothing saved, nothing tracked.",
  openGraph: {
    type: "website",
    siteName: "FinLitTech",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sourceSerif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        {/* Privacy-respecting: page views only, no cookies, no PII. */}
        <Analytics />
      </body>
    </html>
  );
}
