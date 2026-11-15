import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { LOCALE_TAGS } from "@/lib/i18n/locales";
import { Instrument_Sans, Literata, Newsreader, Onest } from "next/font/google";
import "./globals.css";

// Instrument Sans and Newsreader have no Cyrillic, so Russian and Kazakh text
// falls through to Onest and Literata. The stacks name only the Latin font
// itself, not its Arial-based fallback, which would catch Cyrillic first.
const sans = Instrument_Sans({ subsets: ["latin"] });
const serif = Newsreader({ subsets: ["latin"] });
const sansCyrillic = Onest({ subsets: ["cyrillic", "cyrillic-ext"] });
const serifCyrillic = Literata({ subsets: ["cyrillic", "cyrillic-ext"] });
const firstFamily = (font: { style: { fontFamily: string } }) => font.style.fontFamily.split(",")[0].trim();
const fontStacks = {
  "--font-sans-stack": `${firstFamily(sans)}, ${sansCyrillic.style.fontFamily}, Arial, Helvetica, sans-serif`,
  "--font-serif-stack": `${firstFamily(serif)}, ${serifCyrillic.style.fontFamily}, Georgia, "Times New Roman", serif`,
} as React.CSSProperties;

export const metadata: Metadata = {
  title: "Recheck | Stop overpaying for healthcare",
  description:
    "Find where to go for care, what you are likely to pay with your own insurance, and whether your medical bill is right.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={LOCALE_TAGS[locale]} style={fontStacks}>
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
