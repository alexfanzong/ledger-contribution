import { createServer as createHttpServer } from "node:http";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

import contributionPackTemplate from "@/plugins/ledger-contribution/skills/ledger-contribution-pack/references/contribution-pack.template.json";
import {
  preverifyContributionPack,
  validateContributionPack,
} from "@/lib/mcp-tools";
import {
  MCP_MAX_REQUEST_BYTES,
  contentLengthWithinLimit,
  createFixedWindowRateLimiter,
} from "@/lib/mcp-http-security";

const SERVER_NAME = "ledger-contribution";
const SERVER_VERSION = "0.2.1";
const SERVER_WEBSITE_URL = "https://github.com/alexfanzong/ledger-contribution";
const SERVER_ICON_URL =
  "https://raw.githubusercontent.com/alexfanzong/ledger-contribution/codex/openai-build-week-contribution-import/plugins/ledger-contribution/assets/mcp-icon.png";
const MCP_PATH = "/mcp";
const httpRateLimiter = createFixedWindowRateLimiter({
  limit: 120,
  windowMs: 60_000,
});

const packInputSchema = {
  pack: z
    .record(z.string(), z.unknown())
    .describe("A complete Ledger Contribution Pack JSON object using schema version 1.0."),
};

function toolResponse(structuredContent: Record<string, unknown>, message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    structuredContent,
  };
}

export function createLedgerMcpServer() {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
      websiteUrl: SERVER_WEBSITE_URL,
      icons: [
        {
          src: SERVER_ICON_URL,
          mimeType: "image/png",
          sizes: ["256x256"],
        },
      ],
    },
    {
      instructions:
        "Validate a Contribution Pack before pre-verifying it. All Ledger MCP tools are read-only and deterministic. PM Agent results are advisory only: never describe them as human confirmation, legal ownership, equity, or an Evidence Hash. Final confirmation must be performed by a different authenticated teammate in Ledger.",
    }
  );

  server.registerTool(
    "get_contribution_pack_template",
    {
      title: "Get Contribution Pack template",
      description:
        "Use this when a user needs the canonical Ledger Contribution Pack 1.0 structure before drafting evidence-bound claims.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () =>
      toolResponse(
        { template: contributionPackTemplate },
        "Returned the canonical Contribution Pack 1.0 template. Replace placeholders only with evidence the user explicitly placed in scope."
      )
  );

  server.registerTool(
    "validate_contribution_pack",
    {
      title: "Validate Contribution Pack",
      description:
        "Use this when a user has a Ledger Contribution Pack and needs deterministic schema, reference, and boundary validation before import or PM pre-verification.",
      inputSchema: packInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ pack }) => {
      const result = validateContributionPack(pack);
      const message = result.valid
        ? `Contribution Pack ${result.pack_id} is valid with ${result.claim_count} claim(s) and ${result.evidence_count} evidence item(s).`
        : `Contribution Pack validation failed with ${result.issues.length} issue(s).`;

      return toolResponse(result as unknown as Record<string, unknown>, message);
    }
  );

  server.registerTool(
    "preverify_contribution_pack",
    {
      title: "Pre-verify Contribution Pack",
      description:
        "Use this when a valid Ledger Contribution Pack needs a deterministic PM Agent evidence assessment. This is advisory and never confirms a contribution.",
      inputSchema: packInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ pack }) => {
      const result = preverifyContributionPack(pack);
      const message = result.valid
        ? `Pre-verified ${result.assessments.length} claim(s). Human peer confirmation is still required.`
        : `Pre-verification did not run because the pack has ${result.issues.length} validation issue(s).`;

      return toolResponse(result as unknown as Record<string, unknown>, message);
    }
  );

  return server;
}

async function runStdioServer() {
  const server = createLedgerMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Ledger Contribution MCP server running on stdio");
}

function setCorsHeaders(res: import("node:http").ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "content-type, authorization, mcp-session-id"
  );
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
}

class McpBodyTooLargeError extends Error {}

async function readJsonBody(
  req: import("node:http").IncomingMessage
): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > MCP_MAX_REQUEST_BYTES) {
      throw new McpBodyTooLargeError("MCP request body is too large");
    }
    chunks.push(buffer);
  }

  const body = Buffer.concat(chunks).toString("utf8");
  return body.length === 0 ? undefined : JSON.parse(body);
}

async function runHttpServer() {
  const port = Number(process.env.PORT ?? 8787);
  const httpServer = createHttpServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
      setCorsHeaders(res);
      res.writeHead(204).end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/") {
      res
        .writeHead(200, { "content-type": "application/json" })
        .end(
          JSON.stringify({
            name: SERVER_NAME,
            version: SERVER_VERSION,
            websiteUrl: SERVER_WEBSITE_URL,
            icons: [
              {
                src: SERVER_ICON_URL,
                mimeType: "image/png",
                sizes: ["256x256"],
              },
            ],
            mcp_endpoint: MCP_PATH,
            authentication: "none-demo",
            writes_data: false,
          })
        );
      return;
    }

    const mcpMethods = new Set(["POST", "GET", "DELETE"]);
    if (url.pathname === MCP_PATH && req.method && mcpMethods.has(req.method)) {
      setCorsHeaders(res);

      const remoteAddress = req.socket.remoteAddress ?? "unknown";
      if (!httpRateLimiter.allow(remoteAddress)) {
        res.setHeader("Retry-After", "60");
        res.writeHead(429).end("Too Many Requests");
        return;
      }

      if (!contentLengthWithinLimit(req.headers["content-length"])) {
        res.writeHead(413).end("Request body too large");
        return;
      }

      let requestBody: unknown;
      if (req.method === "POST") {
        try {
          requestBody = await readJsonBody(req);
        } catch (error) {
          if (error instanceof McpBodyTooLargeError) {
            res.writeHead(413).end("Request body too large");
            return;
          }
          res.writeHead(400).end("Invalid JSON request body");
          return;
        }
      }

      const server = createLedgerMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      res.on("close", () => {
        void transport.close();
        void server.close();
      });

      try {
        await server.connect(transport);
        await transport.handleRequest(req, res, requestBody);
      } catch (error) {
        console.error("Ledger MCP request failed:", error);
        if (!res.headersSent) {
          res.writeHead(500).end("Internal server error");
        }
      }
      return;
    }

    res.writeHead(404).end("Not Found");
  });

  httpServer.listen(port, () => {
    console.log(`Ledger MCP server listening on http://localhost:${port}${MCP_PATH}`);
  });
}

if (process.argv.includes("--http")) {
  void runHttpServer();
} else {
  void runStdioServer();
}
