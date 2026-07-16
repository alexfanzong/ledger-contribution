import Link from "next/link";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";

import { AuthWorkflowPreview } from "@/components/auth-workflow-preview";
import { BrandMark } from "@/components/brand-mark";
import { Field, inputClass } from "@/components/ui";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/lib/actions";
import { getAuthMode, getFirstQueryValue } from "@/lib/auth-page";

type AuthSearchParams = {
  error?: string | string[];
  message?: string | string[];
  mode?: string | string[];
};

export default async function AuthPage({
  searchParams
}: {
  searchParams: Promise<AuthSearchParams>;
}) {
  const params = await searchParams;
  const mode = getAuthMode(params.mode);
  const signingUp = mode === "signup";
  const requestingReset = mode === "forgot";
  const updatingPassword = mode === "reset";
  const recovering = requestingReset || updatingPassword;

  const heading = signingUp
    ? "Create your team ledger."
    : requestingReset
      ? "Reset your password."
      : updatingPassword
        ? "Choose a new password."
        : "Return to your team ledger.";
  const description = signingUp
    ? "Start recording human and agent contributions with a clear human confirmation boundary."
    : requestingReset
      ? "Enter your account email and Ledger will send a secure recovery link."
      : updatingPassword
        ? "Set a replacement password, then sign in again to continue."
        : "Sign in to record work, review evidence, and confirm contributions with your team.";

  return (
    <main className="min-h-[calc(100vh-65px)] bg-ledger-canvas px-5 py-6 text-ledger-ink md:px-8 lg:py-9">
      <div className="mx-auto max-w-[1240px]">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="focus-ring flex items-center gap-3" aria-label="Ledger home">
            <BrandMark size={40} />
            <span className="text-xl font-semibold tracking-tight">Ledger</span>
          </Link>
          <Link
            href="/"
            className="focus-ring inline-flex min-h-10 items-center gap-2 text-sm font-medium text-ledger-muted hover:text-plum-800"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to overview
          </Link>
        </header>

        <section className="grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-2xl border border-ledger-line bg-white shadow-evidence lg:grid-cols-[0.82fr_1.18fr]">
          <div className="min-w-0 px-6 py-8 sm:px-9 sm:py-10 lg:px-11 lg:py-12">
            <div className="mx-auto max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-plum-700">
                Evidence infrastructure for AI-native teams
              </p>
              <h1 className="font-display mt-4 text-[2.55rem] leading-[1.05] tracking-[-0.02em] text-ledger-ink sm:text-5xl">
                {heading}
              </h1>
              <p className="mt-4 text-sm leading-6 text-ledger-muted">{description}</p>

              {recovering ? (
                <Link
                  href="/auth"
                  className="focus-ring mt-7 inline-flex min-h-10 items-center text-sm font-semibold text-plum-800 hover:text-plum-950"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                  Back to sign in
                </Link>
              ) : (
                <nav
                  aria-label="Authentication mode"
                  className="mt-7 grid grid-cols-2 rounded-lg bg-ledger-panel p-1"
                >
                  <Link
                    href="/auth"
                    aria-current={!signingUp ? "page" : undefined}
                    className={`focus-ring grid min-h-10 place-items-center rounded-md text-sm font-semibold transition ${
                      !signingUp
                        ? "bg-white text-plum-800 shadow-sm"
                        : "text-ledger-muted hover:text-ledger-ink"
                    }`}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth?mode=signup"
                    aria-current={signingUp ? "page" : undefined}
                    className={`focus-ring grid min-h-10 place-items-center rounded-md text-sm font-semibold transition ${
                      signingUp
                        ? "bg-white text-plum-800 shadow-sm"
                        : "text-ledger-muted hover:text-ledger-ink"
                    }`}
                  >
                    Create account
                  </Link>
                </nav>
              )}

              <div className="mt-6">
                <AuthNotice
                  error={getFirstQueryValue(params.error)}
                  message={getFirstQueryValue(params.message)}
                />

                {requestingReset ? (
                  <form action={requestPasswordReset} className="mt-5 grid gap-4">
                    <Field label="Account email">
                      <input
                        className={inputClass}
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        required
                      />
                    </Field>
                    <button className="focus-ring mt-1 min-h-12 rounded-md bg-plum-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-plum-900">
                      Send reset link
                    </button>
                    <p className="text-xs leading-5 text-ledger-muted">
                      For privacy, Ledger shows the same confirmation whether or not the email is
                      registered.
                    </p>
                  </form>
                ) : updatingPassword ? (
                  <form action={updatePassword} className="mt-5 grid gap-4">
                    <Field label="New password">
                      <input
                        className={inputClass}
                        name="password"
                        type="password"
                        minLength={6}
                        autoComplete="new-password"
                        placeholder="At least 6 characters"
                        required
                      />
                    </Field>
                    <Field label="Confirm new password">
                      <input
                        className={inputClass}
                        name="password_confirmation"
                        type="password"
                        minLength={6}
                        autoComplete="new-password"
                        placeholder="Repeat your new password"
                        required
                      />
                    </Field>
                    <button className="focus-ring mt-1 min-h-12 rounded-md bg-plum-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-plum-900">
                      Update password
                    </button>
                    <Link
                      href="/auth?mode=forgot"
                      className="focus-ring min-h-8 text-center text-xs font-semibold text-plum-800 hover:text-plum-950"
                    >
                      Request another reset link
                    </Link>
                  </form>
                ) : signingUp ? (
                  <form action={signUp} className="mt-5 grid gap-4">
                    <Field label="Display name">
                      <input
                        className={inputClass}
                        name="display_name"
                        autoComplete="name"
                        placeholder="Alex Rivera"
                      />
                    </Field>
                    <Field label="Email">
                      <input
                        className={inputClass}
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        required
                      />
                    </Field>
                    <Field label="Password">
                      <input
                        className={inputClass}
                        name="password"
                        type="password"
                        minLength={6}
                        autoComplete="new-password"
                        placeholder="At least 6 characters"
                        required
                      />
                    </Field>
                    <button className="focus-ring mt-1 min-h-12 rounded-md bg-plum-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-plum-900">
                      Create account
                    </button>
                  </form>
                ) : (
                  <form action={signIn} className="mt-5 grid gap-4">
                    <Field label="Email">
                      <input
                        className={inputClass}
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        required
                      />
                    </Field>
                    <Field label="Password">
                      <input
                        className={inputClass}
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Your password"
                        required
                      />
                    </Field>
                    <div className="-mt-1 text-right">
                      <Link
                        href="/auth?mode=forgot"
                        className="focus-ring inline-flex min-h-8 items-center text-xs font-semibold text-plum-800 hover:text-plum-950"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <button className="focus-ring mt-1 min-h-12 rounded-md bg-plum-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-plum-900">
                      Sign in
                    </button>
                  </form>
                )}
              </div>

              <div className="mt-7 grid gap-3 border-t border-ledger-line pt-5 text-xs leading-5 text-ledger-muted">
                <p className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-plum-700" aria-hidden="true" />
                  No wallet or token flow. Confirmed records support internal coordination only.
                </p>
                <p className="flex items-start gap-2">
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-plum-700" aria-hidden="true" />
                  Your identity keeps peer confirmation attributable to a real team account.
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0 border-t border-ledger-line bg-ledger-panel/65 p-5 sm:p-7 lg:border-l lg:border-t-0 lg:p-9">
            <AuthWorkflowPreview />
          </div>
        </section>
      </div>
    </main>
  );
}

function AuthNotice({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;

  if (message) {
    return (
      <p className="break-words rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
        {message}
      </p>
    );
  }

  return (
    <p className="break-words rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {error}
    </p>
  );
}
