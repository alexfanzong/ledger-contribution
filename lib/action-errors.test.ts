import { describe, expect, it } from "vitest";

import { publicReviewError } from "@/lib/action-errors";

describe("review action errors", () => {
  it("maps known database boundaries to useful public messages", () => {
    expect(publicReviewError("Contributors cannot confirm their own contribution")).toBe(
      "You cannot confirm your own contribution. Ask a different project member to review it."
    );
    expect(publicReviewError("Agent owners cannot confirm their own agent contribution")).toBe(
      "You cannot confirm work attributed to an agent you own. Ask a different project member to review it."
    );
    expect(publicReviewError("Contribution has already been reviewed")).toBe(
      "This contribution is no longer awaiting confirmation. Refresh the page to see its latest status."
    );
  });

  it("does not expose unexpected database error text", () => {
    expect(publicReviewError("duplicate key value violates secret_internal_index")).toBe(
      "Review could not be submitted. Refresh the page and try again."
    );
  });
});
