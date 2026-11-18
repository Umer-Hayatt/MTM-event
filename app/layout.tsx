import type { Metadata } from "next";
import { DM_Sans, Libre_Baskerville } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
const baskerville = Libre_Baskerville({ variable: "--font-baskerville", subsets: ["latin"], weight: "700", display: "swap" });

export const metadata: Metadata = {
  title: "Convene: from scattered messages to a plan you can audit",
  description: "Convene turns event emails, WhatsApp chats and memos into a validated, budgeted plan where every number points back to a message.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${baskerville.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
