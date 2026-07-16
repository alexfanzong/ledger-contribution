import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const serverPath = resolve(
  root,
  "plugins/ledger-contribution/mcp/server.mjs"
);

const pack = {
  schema_version: "1.0",
  pack_id: "pack-mcp-smoke-test",
  project_name: "Ledger",
  period: { start: "2026-07-14", end: "2026-07-16" },
  contributor_hint: { type: "human", display_name: "Alex Rivera" },
  evidence: [
    {
      ref: "commit:abc1234",
      kind: "commit",
      title: "Build MCP server",
      summary: "Implements the bounded Ledger tool surface."
    },
    {
      ref: "test:mcp",
      kind: "test",
      title: "MCP smoke test",
      summary: "Calls the bundled server through the stdio transport."
    }
  ],
  claims: [
    {
      claim_id: "claim:mcp-server",
      category: "code",
      description: "Implemented and verified the Ledger MCP server.",
      proposed_impact: "medium",
      evidence_refs: ["commit:abc1234", "test:mcp"]
    }
  ],
  generated_by: {
    tool: "codex",
    generated_at: "2026-07-16T09:00:00.000Z"
  }
};

const transport = new StdioClientTransport({
  command: "node",
  args: [serverPath]
});
const client = new Client({ name: "ledger-mcp-smoke-test", version: "0.1.0" });

try {
  await client.connect(transport);
  const tools = await client.listTools();
  const names = tools.tools.map((tool) => tool.name).sort();
  const expected = [
    "get_contribution_pack_template",
    "preverify_contribution_pack",
    "validate_contribution_pack"
  ];

  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected MCP tools: ${names.join(", ")}`);
  }

  const validation = await client.callTool({
    name: "validate_contribution_pack",
    arguments: { pack }
  });
  if (validation.structuredContent?.valid !== true) {
    throw new Error("Valid pack did not pass MCP validation");
  }

  const preverification = await client.callTool({
    name: "preverify_contribution_pack",
    arguments: { pack }
  });
  if (preverification.structuredContent?.human_confirmation_required !== true) {
    throw new Error("MCP pre-verification lost the human confirmation boundary");
  }

  console.log("Ledger MCP smoke test passed (3 tools, stdio transport).")
} finally {
  await client.close();
}
