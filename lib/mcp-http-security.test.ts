import { describe, expect, it } from "vitest";

import {
  MCP_MAX_REQUEST_BYTES,
  contentLengthWithinLimit,
  createFixedWindowRateLimiter,
} from "@/lib/mcp-http-security";

describe("MCP HTTP boundary controls", () => {
  it("rejects malformed and oversized content-length values", () => {
    expect(contentLengthWithinLimit(undefined)).toBe(true);
    expect(contentLengthWithinLimit(String(MCP_MAX_REQUEST_BYTES))).toBe(true);
    expect(contentLengthWithinLimit(String(MCP_MAX_REQUEST_BYTES + 1))).toBe(false);
    expect(contentLengthWithinLimit("not-a-number")).toBe(false);
    expect(contentLengthWithinLimit("-1")).toBe(false);
  });

  it("rate limits an address inside a fixed window and resets later", () => {
    const limiter = createFixedWindowRateLimiter({ limit: 2, windowMs: 1_000 });

    expect(limiter.allow("127.0.0.1", 0)).toBe(true);
    expect(limiter.allow("127.0.0.1", 100)).toBe(true);
    expect(limiter.allow("127.0.0.1", 200)).toBe(false);
    expect(limiter.allow("127.0.0.1", 1_001)).toBe(true);
  });

  it("prunes expired address windows so public HTTP traffic cannot grow memory forever", () => {
    const limiter = createFixedWindowRateLimiter({ limit: 2, windowMs: 1_000 });

    for (let index = 0; index < 255; index += 1) {
      expect(limiter.allow(`198.51.100.${index}`, 0)).toBe(true);
    }

    expect(limiter.entryCount()).toBe(255);
    expect(limiter.allow("203.0.113.1", 1_001)).toBe(true);
    expect(limiter.entryCount()).toBe(1);
  });
});
