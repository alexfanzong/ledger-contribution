import type { Metadata } from "next";
import "./globals.css";
import { LegalFooter } from "@/components/legal-footer";

export const metadata: Metadata = {
  title: "Contribution Ledger",
  description: "Contribution evidence and peer confirmation for AI teams."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <LegalFooter />
      </body>
    </html>
  );
}
