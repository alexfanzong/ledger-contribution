import { describe, expect, it } from "vitest";

import { FOOTER_LINK_GROUPS, LEDGER_REPOSITORY_URL } from "@/lib/footer";

describe("public footer links", () => {
  it("uses the canonical public repository", () => {
    expect(LEDGER_REPOSITORY_URL).toBe(
      "https://github.com/alexfanzong/ledger-contribution"
    );
  });

  it("contains only real routes, anchors, or https URLs", () => {
    const links = FOOTER_LINK_GROUPS.flatMap((group) => group.links);

    expect(links.length).toBeGreaterThanOrEqual(4);
    expect(links.every((link) => link.href !== "#")).toBe(true);
    expect(
      links.every(
        (link) =>
          link.href.startsWith("/") || link.href.startsWith("https://")
      )
    ).toBe(true);
  });

  it("keeps the primary product paths discoverable", () => {
    const hrefs = FOOTER_LINK_GROUPS.flatMap((group) =>
      group.links.map((link) => link.href)
    );

    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/auth?mode=signup");
  });
});
