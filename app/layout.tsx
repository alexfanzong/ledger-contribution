import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import "./globals.css";
import { LegalFooter } from "@/components/legal-footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "Contribution Ledger",
  description: "Contribution evidence and peer confirmation for AI teams."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${dmSerifDisplay.variable}`}>
        {children}
        <LegalFooter />
      </body>
    </html>
  );
}
