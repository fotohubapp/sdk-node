#!/usr/bin/env node
// Generates src/ops.generated.ts (OpIntent & friends) from the timeline operation catalog.
//   npm run gen:ops                      -> reads the default catalog path below
//   npm run gen:ops -- path/to/ops.schema.json
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCHEMA =
  "/home/ubuntu/fotohub/fotohubv22/.claude/worktrees/video-ds-c/server/timeline-service/catalog/ops.schema.json";
const schemaPath = resolve(process.argv[2] ?? process.env.OPS_SCHEMA ?? DEFAULT_SCHEMA);
const out = resolve(here, "../src/ops.generated.ts");

const schema = JSON.parse(await readFile(schemaPath, "utf8"));
const ts = await compile(schema, schema.title ?? "ApplyEditInput", {
  bannerComment: [
    "/* eslint-disable */",
    "/**",
    " * GENERATED FILE - do not edit by hand. Run `npm run gen:ops` after the operation",
    " * catalog changes. Source: timeline-service catalog/ops.schema.json.",
    " */",
  ].join("\n"),
  additionalProperties: false,
  unreachableDefinitions: true,
  style: { singleQuote: false },
});
await writeFile(out, `${ts}\n/** One timeline operation, as accepted by {@link FotoHub.applyVideoOps}. */\nexport type OpIntent = ${schema.title ?? "ApplyEditInput"}["ops"][number];\n`);
console.log(`wrote ${out} from ${schemaPath}`);
