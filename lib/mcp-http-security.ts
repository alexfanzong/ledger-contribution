export const MCP_MAX_REQUEST_BYTES = 512 * 1024;

export function contentLengthWithinLimit(value: string | undefined): boolean {
  if (value === undefined) return true;
  if (!/^\d+$/.test(value)) return false;

  const length = Number(value);
  return Number.isSafeInteger(length) && length >= 0 && length <= MCP_MAX_REQUEST_BYTES;
}

export function createFixedWindowRateLimiter({
  limit,
  windowMs,
}: {
  limit: number;
  windowMs: number;
}) {
  const windows = new Map<string, { startedAt: number; count: number }>();
  let checks = 0;

  return {
    allow(key: string, now = Date.now()): boolean {
      checks += 1;
      if (checks % 256 === 0) {
        for (const [candidate, state] of windows) {
          if (now - state.startedAt >= windowMs) windows.delete(candidate);
        }
      }

      const current = windows.get(key);
      if (!current || now - current.startedAt >= windowMs) {
        windows.set(key, { startedAt: now, count: 1 });
        return true;
      }

      if (current.count >= limit) return false;
      current.count += 1;
      return true;
    },
    entryCount(): number {
      return windows.size;
    },
  };
}
