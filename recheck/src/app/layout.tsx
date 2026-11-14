import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recheck | Make sense of your medical bills",
  description:
    "Bring medical bills and insurance statements together, spot possible billing mistakes, and prepare questions for your provider with Recheck.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
