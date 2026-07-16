"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/actions";
import { Button } from "@/components/ui";

export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
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
    <nav aria-label="Project workspace" className="max-w-full overflow-x-auto rounded-lg border border-ledger-line bg-ledger-panel p-1">
      <div className="flex min-w-max gap-1 text-[13px]">
        {items.map(([label, href]) => {
          const isActive = pathname === href || (href !== `/projects/${projectId}` && pathname.startsWith(`${href}/`));

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`focus-ring whitespace-nowrap rounded-md px-3 py-2 font-semibold transition ${
                isActive
                  ? "bg-white text-plum-800 shadow-sm"
                  : "text-ledger-muted hover:bg-white/70 hover:text-ledger-ink"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
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
