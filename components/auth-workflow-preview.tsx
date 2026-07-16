import {
  Bot,
  CheckCircle2,
  FileCheck2,
  FileText,
  Hash,
  PenLine
} from "lucide-react";

import { AUTH_WORKFLOW_STAGES } from "@/lib/auth-page";
import { HOME_RECORD } from "@/lib/homepage";

const STAGE_ICONS = [FileText, PenLine, Bot, FileCheck2] as const;

export function AuthWorkflowPreview() {
  return (
    <aside aria-labelledby="auth-workflow-title" className="h-full min-w-0">
      <div className="flex h-full min-w-0 flex-col rounded-xl border border-ledger-line bg-white shadow-soft">
        <div className="border-b border-ledger-line px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-plum-700">
            One contribution, fully traceable
          </p>
          <h2 id="auth-workflow-title" className="font-display mt-2 text-3xl leading-tight text-ledger-ink">
            From work to confirmed evidence.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ledger-muted">
            Ledger keeps AI assistance visible, but another human still makes the final call.
          </p>
        </div>

        <div className="border-b border-ledger-line bg-ledger-panel/70 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-ledger-ink shadow-sm">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-ledger-muted">Example contribution</p>
              <p className="truncate text-sm font-semibold text-ledger-ink">{HOME_RECORD.title}</p>
              <p className="mt-0.5 text-xs text-ledger-muted">Recorded by {HOME_RECORD.contributor}</p>
            </div>
          </div>
        </div>

        <div className="relative flex-1">
          <span
            aria-hidden="true"
            className="absolute bottom-9 left-[36px] top-9 w-px bg-ledger-line sm:left-[40px]"
          />
          <ol className="px-5 py-2 sm:px-6">
            {AUTH_WORKFLOW_STAGES.map((stage, index) => {
              const Icon = STAGE_ICONS[index];
              const isAgent = index === 2;
              const isConfirmed = index === 3;

              return (
                <li key={stage.label} className="relative grid grid-cols-[34px_minmax(0,1fr)] gap-3 py-3">
                  <span
                    className={`relative z-10 grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold ${
                      isConfirmed
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : isAgent
                          ? "border-plum-100 bg-plum-100 text-plum-800"
                          : "border-ledger-line bg-white text-ledger-ink"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div
                    className={
                      isAgent
                        ? "rounded-lg border border-plum-100 bg-plum-100/55 px-3 py-2.5"
                        : "px-1 py-1"
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-ledger-ink">{stage.label}</h3>
                      {isAgent ? (
                        <span className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-plum-800">
                          Advisory only
                        </span>
                      ) : null}
                      {isConfirmed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Confirmed
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-ledger-muted">{stage.description}</p>
                    {isAgent ? (
                      <p className="mt-1 text-[10px] font-medium text-plum-950">
                        Advisory only. Human confirmation is still required.
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="border-t border-ledger-line px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-ledger-ink">
            <Hash className="h-4 w-4 text-plum-700" aria-hidden="true" />
            Evidence hash (receipt)
          </div>
          <p className="mt-2 truncate rounded-md border border-ledger-line bg-ledger-panel px-3 py-2 font-mono text-[10px] text-ledger-muted">
            {HOME_RECORD.evidenceHash}
          </p>
        </div>
      </div>
    </aside>
  );
}
