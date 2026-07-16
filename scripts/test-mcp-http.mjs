import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const serverPath = resolve(
  root,
  "plugins/ledger-contribution/mcp/server.mjs"
);
const port = 8791;
const endpoint = new URL(`http://127.0.0.1:${port}/mcp`);
const child = spawn(process.execPath, [serverPath, "--http"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"]
});

let stderr = "";
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch {
      // The process may still be binding the port.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Ledger MCP HTTP server did not become ready. ${stderr}`);
}

const client = new Client({ name: "ledger-mcp-http-test", version: "0.1.0" });

try {
  await waitForHealth();
  const oversized = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: "x".repeat(512 * 1024) })
  });
  if (oversized.status !== 413) {
    throw new Error(`Expected oversized MCP request to return 413, received ${oversized.status}`);
  }

  const transport = new StreamableHTTPClientTransport(endpoint);
  await client.connect(transport);
  const tools = await client.listTools();
  if (tools.tools.length !== 3) {
    throw new Error(`Expected 3 HTTP MCP tools, received ${tools.tools.length}`);
  }
  console.log("Ledger MCP HTTP test passed (/mcp, stateless transport).")
} finally {
  await client.close().catch(() => undefined);
  child.kill("SIGTERM");
}
