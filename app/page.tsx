import Link from "next/link";

import { HomeEvidenceDesk } from "@/components/home-evidence-desk";
import { BrandMark } from "@/components/brand-mark";
import { getHomePrimaryAction } from "@/lib/homepage";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let signedIn = false;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  } catch {
    signedIn = false;
  }

  const primaryAction = getHomePrimaryAction(signedIn);

  return (
    <main className="overflow-x-clip bg-ledger-canvas text-ledger-ink">
      <header className="border-b border-ledger-line bg-ledger-canvas/95 px-5 backdrop-blur md:px-8">
        <div className="mx-auto flex min-h-20 max-w-[1440px] items-center justify-between gap-6">
          <Link href="/" className="focus-ring flex items-center gap-3" aria-label="Ledger home">
            <BrandMark size={40} />
            <span className="text-xl font-semibold tracking-tight">Ledger</span>
          </Link>

          <nav className="hidden items-center gap-12 text-sm font-medium lg:flex" aria-label="Primary">
            <a className="focus-ring hover:text-plum-700" href="#product">
              Product
            </a>
            <a className="focus-ring hover:text-plum-700" href="#security">
              Security
            </a>
          </nav>

          <div className="flex items-center gap-3 sm:gap-6">
            <Link className="focus-ring hidden text-sm font-medium hover:text-plum-700 sm:block" href={signedIn ? "/dashboard" : "/auth"}>
              {signedIn ? "Dashboard" : "Sign in"}
            </Link>
            <Link
              className="focus-ring hidden min-h-11 items-center justify-center rounded-md bg-plum-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-plum-900 min-[420px]:inline-flex sm:px-6"
              href={primaryAction.href}
            >
              {primaryAction.label}
            </Link>
          </div>
        </div>
      </header>

      <section
        id="product"
        className="mx-auto grid max-w-[1440px] gap-12 px-5 pb-8 pt-16 md:px-8 lg:items-center lg:gap-14 lg:pb-3 lg:pt-9 xl:grid-cols-[580px_minmax(0,1fr)] xl:px-9"
      >
        <div className="pb-4 lg:-translate-y-2 lg:pb-0">
          <p className="mb-6 text-[10px] font-semibold uppercase tracking-[0.12em] text-plum-700 sm:text-sm sm:tracking-[0.15em]">
            Evidence infrastructure for AI-native teams
          </p>
          <h1 className="font-display max-w-[650px] text-[2.9rem] leading-[1.01] tracking-[-0.025em] text-ledger-ink min-[420px]:text-[3.5rem] sm:text-[4.5rem] lg:text-[4.35rem] xl:text-[4.55rem]">
            Turn team contributions into durable evidence.
          </h1>
          <p className="mt-7 max-w-[610px] text-lg leading-8 text-ledger-muted lg:text-[1.18rem]">
            Humans and agents can record work, receive an advisory PM Agent check, and require
            another team member to confirm it. Create a trusted foundation for allocation
            conversations and decision-making.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md bg-plum-800 px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-plum-900"
              href={primaryAction.href}
            >
              {primaryAction.label}
            </Link>
          </div>
        </div>

        <HomeEvidenceDesk />
      </section>
    </main>
  );
}
