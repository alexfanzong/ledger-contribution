import Link from "next/link";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  const styles = {
    primary: "bg-ink text-white hover:bg-black",
    secondary: "border border-line bg-white text-ink hover:bg-panel",
    danger: "bg-red-700 text-white hover:bg-red-800"
  };

  return (
    <button
      className={`focus-ring inline-flex min-h-9 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition ${styles[variant]} ${className}`}
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
    primary: "bg-ink text-white hover:bg-black",
    secondary: "border border-line bg-white text-ink hover:bg-panel"
  };

  return (
    <Link
      className={`focus-ring inline-flex min-h-9 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition ${styles[variant]} ${className}`}
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
    <label className="grid gap-1 text-sm font-medium text-ink">
      <span>{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "focus-ring min-h-10 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink shadow-sm";

export function StatusBadge({ status, sample }: { status: string; sample?: boolean }) {
  const colors: Record<string, string> = {
    pending_review: "border-amber-200 bg-amber-50 text-amber-800",
    confirmed: "border-green-200 bg-green-50 text-green-800",
    partial: "border-blue-200 bg-blue-50 text-blue-800",
    rejected: "border-gray-200 bg-gray-100 text-gray-700",
    superseded: "border-gray-200 bg-gray-100 text-gray-700"
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${colors[status] ?? colors.pending_review}`}
    >
      {status.replace("_", " ")}
      {sample ? <span className="text-[10px] uppercase tracking-wide">Sample data</span> : null}
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
    <main className="min-h-screen px-4 py-6">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="flex flex-col gap-3 border-b border-line pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            {eyebrow ? <p className="text-sm font-medium text-muted">{eyebrow}</p> : null}
            <h1 className="text-2xl font-semibold tracking-normal text-ink">{title}</h1>
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
  actions
}: {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
      {title || actions ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="text-base font-semibold text-ink">{title}</h2> : <span />}
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
      <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
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
