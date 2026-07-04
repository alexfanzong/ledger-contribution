"use client";

import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="focus-ring min-h-8 rounded-md border border-line bg-white px-2 py-1 text-xs font-medium text-ink transition hover:bg-panel"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
