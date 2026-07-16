import Link from "next/link";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  const styles = {
    primary: "bg-plum-700 text-white shadow-sm hover:bg-plum-800",
    secondary: "border border-ledger-line bg-white text-ledger-ink shadow-sm hover:border-plum-400 hover:bg-ledger-panel",
    danger: "bg-red-700 text-white shadow-sm hover:bg-red-800"
  };

  return (
    <button
      className={`focus-ring inline-flex min-h-9 items-center justify-center rounded-md px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  className = "",
  variant = "primary",
  ...props
}: ComponentProps<typeof Link> & { variant?: "primary" | "secondary" }) {
  const styles = {
    primary: "bg-plum-700 text-white shadow-sm hover:bg-plum-800",
    secondary: "border border-ledger-line bg-white text-ledger-ink shadow-sm hover:border-plum-400 hover:bg-ledger-panel"
  };

  return (
    <Link
      className={`focus-ring inline-flex min-h-9 items-center justify-center rounded-md px-3 py-2 text-sm font-semibold transition ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ledger-ink">
      <span className="text-[13px]">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "focus-ring min-h-10 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm text-ledger-ink shadow-sm transition placeholder:text-ledger-muted/70 focus:border-plum-400";

export function StatusBadge({ status, sample }: { status: string; sample?: boolean }) {
  const colors: Record<string, string> = {
    pending_review: "border-amber-200 bg-amber-50 text-amber-800",
    confirmed: "border-emerald-200 bg-emerald-50 text-emerald-800",
    partial: "border-blue-200 bg-blue-50 text-blue-800",
    rejected: "border-ledger-line bg-ledger-panel text-ledger-muted",
    superseded: "border-ledger-line bg-ledger-panel text-ledger-muted"
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize tracking-wide ${colors[status] ?? colors.pending_review}`}
    >
      {status.replace("_", " ")}
      {sample ? <span className="text-[10px] font-medium normal-case tracking-normal">· Sample data</span> : null}
    </span>
  );
}

export function PageShell({
  title,
  eyebrow,
  actions,
  children
}: {
  title: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-ledger-canvas px-4 py-5 text-ledger-ink sm:px-6 sm:py-7">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="flex flex-col gap-4 border-b border-ledger-line pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-plum-700">Contribution Evidence</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="truncate text-2xl font-semibold tracking-[-0.02em] text-ledger-ink sm:text-[28px]">{title}</h1>
              {eyebrow ? <span className="text-sm text-ledger-muted">{eyebrow}</span> : null}
            </div>
            <p className="mt-2 text-xs font-medium text-ledger-muted">Evidence workspace · peer-confirmed records</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </header>
        {children}
      </div>
    </main>
  );
}

export function Panel({
  title,
  children,
  actions,
  className = ""
}: {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-ledger-line bg-white p-4 shadow-soft sm:p-5 ${className}`}>
      {title || actions ? (
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-ledger-line pb-3">
          {title ? <h2 className="text-sm font-bold tracking-[-0.01em] text-ledger-ink">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function ActionNotice({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;

  if (message) {
    return (
      <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        {message}
      </p>
    );
  }

  return (
    <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      {error}
    </p>
  );
}
