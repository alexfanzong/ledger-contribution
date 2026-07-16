import Link from "next/link";
import { ArrowUpRight, Github, Info } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { FOOTER_LINK_GROUPS, LEDGER_REPOSITORY_URL } from "@/lib/footer";

export const LEGAL_DISCLAIMER =
  "This product does not create, transfer, or evidence legal equity ownership. Contribution records are for internal coordination and negotiation support only. Any actual equity, option, token, bonus, revenue-share, or founder agreement requires separate legal documentation, corporate approval, tax review, and applicable securities-law compliance.";

export function LegalFooter() {
  return (
    <footer id="security" className="border-t border-white/10 bg-ledger-ink text-white">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-14 md:px-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(520px,1fr)] lg:gap-20 lg:py-16 xl:px-9">
        <div className="max-w-xl">
          <Link
            href="/"
            className="focus-ring inline-flex items-center gap-4 rounded-sm"
            aria-label="Ledger home"
          >
            <BrandMark size={58} />
            <span className="font-display text-4xl tracking-[-0.02em]">Ledger</span>
          </Link>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/65">
            Evidence infrastructure for human-agent teams. Turn selected work into
            reviewable contribution records without automating ownership decisions.
          </p>

          <a
            href={LEDGER_REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
            className="focus-ring mt-7 inline-flex min-h-11 items-center gap-3 rounded-full border border-white/20 px-4 text-sm font-medium text-white/80 transition hover:border-white/45 hover:text-white"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            Open source on GitHub
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>

        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3"
        >
          {FOOTER_LINK_GROUPS.map((group) => (
            <div key={group.label}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                {group.label}
              </h2>
              <ul className="mt-5 grid gap-3.5 text-sm text-white/55">
                {group.links.map((link) => {
                  const external = link.href.startsWith("https://");

                  return (
                    <li key={`${group.label}-${link.label}`}>
                      {external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="focus-ring rounded-sm transition hover:text-white"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="focus-ring rounded-sm transition hover:text-white"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto grid max-w-[1440px] gap-5 px-5 py-6 text-[11px] leading-5 text-white/45 md:px-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start lg:gap-10 xl:px-9">
          <p className="whitespace-nowrap">© 2026 Ledger. MIT licensed.</p>
          <div className="flex gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-plum-400" aria-hidden="true" />
            <p>{LEGAL_DISCLAIMER}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
