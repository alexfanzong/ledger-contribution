export const LEDGER_REPOSITORY_URL =
  "https://github.com/alexfanzong/ledger-contribution";

export type FooterLink = {
  label: string;
  href: string;
};

export type FooterLinkGroup = {
  label: string;
  links: FooterLink[];
};

export const FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  {
    label: "Product",
    links: [
      { label: "Overview", href: "/" },
      { label: "How it works", href: "/#workflow" },
      { label: "Sign in", href: "/auth" },
      { label: "Create account", href: "/auth?mode=signup" }
    ]
  },
  {
    label: "Plugin",
    links: [
      { label: "GitHub repository", href: LEDGER_REPOSITORY_URL },
      {
        label: "Plugin guide",
        href: `${LEDGER_REPOSITORY_URL}/blob/main/plugins/ledger-contribution/README.md`
      },
      {
        label: "Contribution Pack",
        href: `${LEDGER_REPOSITORY_URL}/blob/main/plugins/ledger-contribution/skills/ledger-contribution-pack/references/contract.md`
      },
      {
        label: "Judge testing",
        href: `${LEDGER_REPOSITORY_URL}/blob/main/plugins/ledger-contribution/JUDGE_TESTING.md`
      }
    ]
  },
  {
    label: "Trust",
    links: [
      { label: "Trust model", href: `${LEDGER_REPOSITORY_URL}#trust-model` },
      {
        label: "Build Week scope",
        href: `${LEDGER_REPOSITORY_URL}#openai-build-week`
      },
      { label: "Legal scope", href: `${LEDGER_REPOSITORY_URL}#legal-scope` },
      { label: "Source code", href: LEDGER_REPOSITORY_URL }
    ]
  }
];
