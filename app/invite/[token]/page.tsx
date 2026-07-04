import { acceptInvitation } from "@/lib/actions";
import { LinkButton, PageShell, Panel } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: invites } = await supabase.rpc("invitation_by_token", { p_token: token });
  const invite = invites?.[0];

  return (
    <PageShell title="Accept invitation">
      <Panel title={invite ? `Join ${invite.project_name}` : "Invitation"}>
        {invite ? (
          <form action={acceptInvitation} className="grid max-w-xl gap-3">
            <input type="hidden" name="token" value={token} />
            <p className="text-sm text-muted">
              This invitation is for <strong>{invite.email}</strong> as <strong>{invite.role}</strong>.
            </p>
            {userData.user ? (
              <button className="focus-ring min-h-10 w-fit rounded-md bg-ink px-4 text-sm font-medium text-white">
                Accept invitation
              </button>
            ) : (
              <>
                <p className="text-sm text-muted">Sign in first, then return to this link.</p>
                <LinkButton href="/auth">Sign in</LinkButton>
              </>
            )}
          </form>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm text-muted">This invitation was not found or is no longer readable.</p>
            <LinkButton href="/dashboard" variant="secondary">Dashboard</LinkButton>
          </div>
        )}
      </Panel>
    </PageShell>
  );
}
