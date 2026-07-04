import { LinkButton } from "@/components/ui";
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

  return (
    <main className="min-h-screen px-4 py-10">
      <section className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="grid gap-6">
          <div className="grid gap-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-ink md:text-6xl">
              Contribution evidence for AI teams.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted">
              Record human and AI-assisted work, require peer confirmation, and create a
              non-binding discussion weight that teams can use as a starting point for allocation
              conversations.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton href={signedIn ? "/dashboard" : "/auth"}>
              {signedIn ? "Open dashboard" : "Sign in"}
            </LinkButton>
            <LinkButton href="/auth" variant="secondary">
              Start with email
            </LinkButton>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            No wallet, no token flow, no chain transaction. The server stores a future verification
            fingerprint for confirmed contribution records.
          </p>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
            <div>
              <p className="text-sm font-medium text-muted">Contribution Evidence</p>
              <h2 className="text-xl font-semibold">Peer confirmation queue</h2>
            </div>
            <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
              Pending Review
            </span>
          </div>
          <div className="grid gap-3 text-sm">
            {[
              ["AI research synthesis", "Research", "Medium suggested"],
              ["Architecture review", "Architecture", "High suggested"],
              ["Launch checklist", "Operations", "Low suggested"]
            ].map(([title, category, impact]) => (
              <div key={title} className="grid gap-1 rounded-md border border-line p-3">
                <div className="flex items-center justify-between gap-3">
                  <strong>{title}</strong>
                  <span className="text-muted">{category}</span>
                </div>
                <p className="text-muted">{impact} · needs another member to confirm.</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
