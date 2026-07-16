import Link from "next/link";
import { ArrowRight, Bot, FileText, ShieldCheck, Users } from "lucide-react";

import { HomeEvidenceDesk } from "@/components/home-evidence-desk";
import { BrandMark } from "@/components/brand-mark";
import { HOME_WORKFLOW_STAGES, getHomePrimaryAction } from "@/lib/homepage";
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
  const workflowIcons = [FileText, FileText, Bot, Users] as const;

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
            <a className="focus-ring hover:text-plum-700" href="#workflow">
              How it works
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
            <a
              className="focus-ring inline-flex min-h-12 items-center gap-3 px-2 text-sm font-semibold text-plum-800 hover:text-plum-950"
              href="#workflow"
            >
              See the workflow
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>

        <HomeEvidenceDesk />
      </section>

      <section id="workflow" className="mx-auto max-w-[1440px] px-5 pt-2.5 md:px-8 xl:px-9">
        <div className="grid overflow-hidden rounded-xl border border-ledger-line bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-4">
          {HOME_WORKFLOW_STAGES.map((stage, index) => {
            const Icon = workflowIcons[index];
            return (
              <div
                key={stage.label}
                className="relative flex gap-4 border-b border-ledger-line p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-periwinkle-100 text-xs font-semibold text-indigo-700">
                  {index + 1}
                </span>
                <Icon className="mt-1 h-5 w-5 shrink-0 text-ledger-ink" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-ledger-ink">{stage.label}</h2>
                  <p className="mt-1 text-xs leading-5 text-ledger-muted">{stage.description}</p>
                </div>
                {index < HOME_WORKFLOW_STAGES.length - 1 ? (
                  <ArrowRight
                    className="absolute -right-2 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-plum-400 xl:block"
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-5 py-2 md:px-8" aria-label="Trust statement">
        <p className="mx-auto flex max-w-[1440px] items-center justify-center gap-3 text-sm font-medium text-ledger-ink">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          No wallet. No token flow. No automated equity decisions.
        </p>
      </section>
    </main>
  );
}
