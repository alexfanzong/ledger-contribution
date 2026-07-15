import Link from "next/link";
import { signOut } from "@/lib/actions";
import { Button } from "@/components/ui";

export function ProjectNav({ projectId }: { projectId: string }) {
  const items = [
    ["Overview", `/projects/${projectId}`],
    ["Members", `/projects/${projectId}/members`],
    ["Milestones", `/projects/${projectId}/milestones`],
    ["Ledger", `/projects/${projectId}/ledger`],
    ["Import pack", `/projects/${projectId}/import`],
    ["Peer confirmation", `/projects/${projectId}/review`],
    ["Simulation", `/projects/${projectId}/simulation`]
  ];

  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {items.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          className="rounded-md border border-line bg-white px-3 py-2 font-medium text-muted transition hover:text-ink"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button variant="secondary" type="submit">
        Sign out
      </Button>
    </form>
  );
}
