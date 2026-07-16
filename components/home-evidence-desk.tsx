"use client";

import Image from "next/image";
import {
  Bot,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Sparkles
} from "lucide-react";
import { useState } from "react";

import { HOME_RECORD } from "@/lib/homepage";

function Person({
  image,
  name,
  role,
  timestamp
}: {
  image: string;
  name: string;
  role: string;
  timestamp?: string;
}) {
  return (
    <div className="flex min-w-40 items-center gap-3">
      <Image
        src={image}
        alt=""
        width={44}
        height={44}
        className="h-11 w-11 rounded-full border-2 border-white object-cover shadow-sm"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ledger-ink">{name}</p>
        <p className="text-xs text-ledger-muted">{role}</p>
        {timestamp ? <p className="mt-0.5 text-xs text-ledger-muted">{timestamp}</p> : null}
      </div>
    </div>
  );
}

function StageNumber({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
        active ? "bg-plum-700 text-white" : "bg-periwinkle-100 text-indigo-700"
      }`}
    >
      {children}
    </span>
  );
}

export function HomeEvidenceDesk() {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyHash() {
    await navigator.clipboard.writeText(HOME_RECORD.evidenceHash);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section
      aria-label="Team evidence desk example"
      className="overflow-hidden rounded-xl border border-ledger-line bg-white shadow-evidence"
    >
      <div className="flex flex-col gap-3 border-b border-ledger-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <h2 className="font-display text-2xl leading-none text-ledger-ink">Team evidence desk</h2>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-periwinkle-100 px-3 py-1.5 text-xs font-medium text-indigo-700">
          <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
          {HOME_RECORD.status}
        </span>
      </div>

      <div className="relative">
        <div
          className="absolute bottom-24 left-[35px] top-10 hidden w-px bg-indigo-100 sm:block md:left-[39px]"
          aria-hidden="true"
        />

        <article className="grid gap-4 border-b border-ledger-line px-5 py-3 sm:grid-cols-[42px_minmax(0,1fr)_auto] md:px-6">
          <StageNumber>1</StageNumber>
          <div className="min-w-0">
            <p className="mb-2 text-sm font-semibold text-ledger-ink">Selected evidence</p>
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-ledger-panel p-2 text-ledger-ink">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ledger-ink">{HOME_RECORD.title}</p>
                <p className="mt-1 text-xs text-ledger-muted">Document · Updated 2h ago</p>
              </div>
            </div>
          </div>
          <Person
            image="/avatars/alex-rivera.png"
            name={HOME_RECORD.contributor}
            role="Contributor"
          />
        </article>

        <article className="grid gap-4 border-b border-ledger-line px-5 py-3 sm:grid-cols-[42px_minmax(0,1fr)_auto] md:px-6">
          <StageNumber>2</StageNumber>
          <div className="min-w-0">
            <p className="mb-2 text-sm font-semibold text-ledger-ink">Contribution draft</p>
            <div className="rounded-lg bg-ledger-panel px-4 py-2.5 text-xs text-ledger-muted">
              Alex recorded the contribution and described the impact.
            </div>
            {detailsOpen ? (
              <p className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs leading-5 text-ledger-muted">
                Consolidated the product narrative, judge flow, and demo checkpoints into one
                evidence-backed launch package.
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setDetailsOpen((open) => !open)}
              className="focus-ring mt-2 text-xs font-semibold text-indigo-700 hover:text-plum-700"
              aria-expanded={detailsOpen}
            >
              {detailsOpen ? "Hide draft details" : "View draft details"}
            </button>
          </div>
          <Person
            image="/avatars/alex-rivera.png"
            name={HOME_RECORD.contributor}
            role="Contributor"
            timestamp="Today, 9:41 AM"
          />
        </article>

        <article className="grid gap-4 border-b border-ledger-line px-5 py-3 sm:grid-cols-[42px_minmax(0,1fr)_auto] md:px-6">
          <StageNumber>3</StageNumber>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ledger-ink">PM Agent check</p>
              <span className="rounded bg-periwinkle-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                PM Agent
              </span>
            </div>
            <div className="rounded-lg bg-indigo-50/70 p-3">
              <div className="flex gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
                <div className="text-[11px] leading-4 text-ledger-muted">
                  <p className="font-semibold text-ledger-ink">Advisory assessment</p>
                  <p>Medium confidence this contribution is a meaningful driver.</p>
                  <p>Why: Clear scope and outcome. Impact depends on adoption.</p>
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-3 text-[10px] text-ledger-muted">
              <span>Lower confidence</span>
              <span className="flex flex-1 items-center justify-between" aria-label="Medium confidence">
                {[0, 1, 2, 3, 4].map((dot) => (
                  <span
                    key={dot}
                    className={`h-2.5 w-2.5 rounded-full border ${
                      dot === 2
                        ? "border-plum-800 bg-plum-600 ring-2 ring-plum-100"
                        : "border-indigo-200 bg-indigo-200"
                    }`}
                  />
                ))}
              </span>
              <span>Higher confidence</span>
            </div>
            <p className="mt-2 text-[10px] text-ledger-muted">Advisory only. Not a decision.</p>
          </div>
          <div className="flex min-w-40 items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-periwinkle-100 text-indigo-700">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ledger-ink">PM Agent</p>
              <p className="text-xs text-ledger-muted">AI Agent</p>
              <p className="mt-0.5 text-xs text-ledger-muted">Today, 9:43 AM</p>
            </div>
          </div>
        </article>

        <article className="grid gap-4 px-5 py-3 sm:grid-cols-[42px_minmax(0,1fr)_auto] md:px-6">
          <StageNumber active>4</StageNumber>
          <div className="min-w-0">
            <p className="mb-2 text-sm font-semibold text-ledger-ink">Peer confirmation</p>
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Confirmed by {HOME_RECORD.reviewer}.
            </div>
            <p className="mb-1.5 mt-3 text-[10px] font-semibold text-ledger-ink">
              Evidence hash (receipt)
            </p>
            <div className="flex items-center gap-2 rounded-md border border-ledger-line bg-white px-3 py-2 font-mono text-[10px] text-ledger-muted">
              <span className="min-w-0 flex-1 truncate">{HOME_RECORD.evidenceHash}</span>
              <button
                type="button"
                onClick={copyHash}
                className="focus-ring rounded p-1 text-ledger-muted hover:bg-ledger-panel hover:text-ledger-ink"
                aria-label={copied ? "Evidence hash copied" : "Copy evidence hash"}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Person
            image="/avatars/taylor-chen.png"
            name={HOME_RECORD.reviewer}
            role="Peer reviewer"
            timestamp="Today, 9:52 AM"
          />
        </article>
      </div>
    </section>
  );
}
