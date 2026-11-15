import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { LOCALE_TAGS } from "@/lib/i18n/locales";
import { Instrument_Sans, Newsreader } from "next/font/google";
import "./globals.css";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-newsreader" });

export const metadata: Metadata = {
  title: "Recheck | Stop overpaying for healthcare",
  description:
    "Find where to go for care, what you are likely to pay with your own insurance, and whether your medical bill is right.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={LOCALE_TAGS[locale]} className={`${sans.variable} ${serif.variable}`}>
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
