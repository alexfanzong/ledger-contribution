import { createProject } from "@/lib/actions";
import { SubmitButton } from "@/components/submit-button";
import { ActionNotice, Field, inputClass, LinkButton, PageShell, Panel } from "@/components/ui";

export default async function NewProjectPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return (
    <PageShell title="New project" actions={<LinkButton href="/dashboard" variant="secondary">Back</LinkButton>}>
      <ActionNotice error={query.error} />
      <Panel title="Project basics">
        <form action={createProject} className="grid max-w-2xl gap-3">
          <Field label="Name">
            <input className={inputClass} name="name" required />
          </Field>
          <Field label="Description">
            <textarea className={inputClass} name="description" rows={4} />
          </Field>
          <SubmitButton
            className="focus-ring min-h-10 w-fit rounded-md bg-ink px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            pendingLabel="Creating..."
          >
            Create project
          </SubmitButton>
        </form>
      </Panel>
    </PageShell>
  );
}
