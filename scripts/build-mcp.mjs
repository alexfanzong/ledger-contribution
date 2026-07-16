import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outfile = resolve(
  root,
  "plugins/ledger-contribution/mcp/server.mjs"
);

await build({
  entryPoints: [resolve(root, "mcp/server.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  tsconfig: resolve(root, "tsconfig.json"),
  banner: { js: "#!/usr/bin/env node" }
});

const bundle = await readFile(outfile, "utf8");
await writeFile(outfile, bundle.replace(/[ \t]+$/gm, ""));
