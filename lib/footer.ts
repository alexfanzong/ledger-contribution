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
      { label: "Sign in", href: "/auth" },
      { label: "Create account", href: "/auth?mode=signup" }
    ]
  },
  {
    label: "Workspace",
    links: [{ label: "Dashboard", href: "/dashboard" }]
  }
];
