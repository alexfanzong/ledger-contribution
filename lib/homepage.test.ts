import { describe, expect, it } from "vitest";

import {
  HOME_RECORD,
  HOME_WORKFLOW_STAGES,
  getHomePrimaryAction
} from "@/lib/homepage";

describe("homepage product story", () => {
  it("keeps the selected four-step evidence workflow in order", () => {
    expect(HOME_WORKFLOW_STAGES.map((stage) => stage.label)).toEqual([
      "Selected evidence",
      "Contribution draft",
      "PM Agent check",
      "Peer confirmation"
    ]);
  });

  it("uses the selected mock contribution as the homepage example", () => {
    expect(HOME_RECORD).toMatchObject({
      title: "Launch narrative and demo flow",
      contributor: "Alex Rivera",
      reviewer: "Taylor Chen",
      status: "Ready for peer review"
    });
    expect(HOME_RECORD.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("routes signed-in visitors to the product and everyone else to auth", () => {
    expect(getHomePrimaryAction(false)).toEqual({
      href: "/auth",
      label: "Start a ledger"
    });
    expect(getHomePrimaryAction(true)).toEqual({
      href: "/dashboard",
      label: "Open dashboard"
    });
  });
});
