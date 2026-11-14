import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recheck",
  description: "Don't pay it. Recheck it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
