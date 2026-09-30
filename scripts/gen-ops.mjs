#!/usr/bin/env node
// Generates src/ops.generated.ts (OpIntent & friends) from the timeline operation catalog.
// The schema is the timeline operation catalog (`ops.schema.json`, the same document
// `getVideoOpsCatalog()` serves as `schema`). Pass its path explicitly:
//   npm run gen:ops -- path/to/ops.schema.json
//   OPS_SCHEMA=path/to/ops.schema.json npm run gen:ops
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";

const here = dirname(fileURLToPath(import.meta.url));
const schemaArg = process.argv[2] ?? process.env.OPS_SCHEMA;
if (!schemaArg) {
  console.error("usage: npm run gen:ops -- <path/to/ops.schema.json>  (or set OPS_SCHEMA)");
  process.exit(1);
}
const schemaPath = resolve(schemaArg);
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
