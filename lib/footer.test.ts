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

    expect(links.length).toBeGreaterThanOrEqual(8);
    expect(links.every((link) => link.href !== "#")).toBe(true);
    expect(
      links.every(
        (link) =>
          link.href.startsWith("/") || link.href.startsWith("https://")
      )
    ).toBe(true);
  });

  it("keeps the primary product and review paths discoverable", () => {
    const hrefs = FOOTER_LINK_GROUPS.flatMap((group) =>
      group.links.map((link) => link.href)
    );

    expect(hrefs).toContain("/#workflow");
    expect(hrefs).toContain("/auth?mode=signup");
    expect(hrefs).toContain(
      `${LEDGER_REPOSITORY_URL}/blob/main/plugins/ledger-contribution/JUDGE_TESTING.md`
    );
  });
});
