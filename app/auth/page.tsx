import { signIn, signUp } from "@/lib/actions";
import { Field, inputClass, Panel } from "@/components/ui";

export default function AuthPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
        <div className="grid content-center gap-4">
          <h1 className="text-3xl font-semibold">Sign in with email</h1>
          <p className="text-muted">
            The MVP uses Supabase Auth identities so peer confirmation can be tested with real team
            accounts from day one.
          </p>
          <AuthNotice searchParams={searchParams} />
        </div>

        <Panel title="Existing account">
          <form action={signIn} className="grid gap-3">
            <Field label="Email">
              <input className={inputClass} name="email" type="email" required />
            </Field>
            <Field label="Password">
              <input className={inputClass} name="password" type="password" required />
            </Field>
            <button className="focus-ring min-h-10 rounded-md bg-ink px-3 text-sm font-medium text-white">
              Sign in
            </button>
          </form>
        </Panel>

        <div />
        <Panel title="New account">
          <form action={signUp} className="grid gap-3">
            <Field label="Display name">
              <input className={inputClass} name="display_name" />
            </Field>
            <Field label="Email">
              <input className={inputClass} name="email" type="email" required />
            </Field>
            <Field label="Password">
              <input className={inputClass} name="password" type="password" minLength={6} required />
            </Field>
            <button className="focus-ring min-h-10 rounded-md bg-ink px-3 text-sm font-medium text-white">
              Create account
            </button>
          </form>
        </Panel>
      </div>
    </main>
  );
}

async function AuthNotice({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  if (!params.error && !params.message) return null;
  if (params.message) {
    return (
      <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
        {params.message}
      </p>
    );
  }
  return (
    <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {params.error}
    </p>
  );
}
