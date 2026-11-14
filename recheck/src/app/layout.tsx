import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recheck | Stop overpaying for healthcare",
  description:
    "Find where to go for care, what you are likely to pay with your own insurance, and whether your medical bill is right.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
