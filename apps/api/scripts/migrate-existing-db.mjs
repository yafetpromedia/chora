/**
 * Transition helper for databases that already match schema.prisma
 * (typically created/evolved via db push) but are missing the
 * 20260530170000_schema_catchup migration record.
 *
 * Usage (disposable DB first!):
 *   DATABASE_URL=postgresql://... node ./scripts/migrate-existing-db.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Set DATABASE_URL to the target PostgreSQL database.");
  process.exit(1);
}

const run = (args) => {
  const result = spawnSync("npx", args, {
    cwd: apiRoot,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

console.log("Checking schema diff against prisma/schema.prisma...");
run([
  "prisma",
  "migrate",
  "diff",
  "--from-url",
  databaseUrl,
  "--to-schema-datamodel",
  "prisma/schema.prisma",
  "--script",
]);

console.log(
  "\nIf the diff above is empty (or only says empty migration), marking catch-up as applied..."
);
run([
  "prisma",
  "migrate",
  "resolve",
  "--applied",
  "20260530170000_schema_catchup",
]);

console.log("\nFinal migrate status:");
run(["prisma", "migrate", "status"]);
console.log("\nDone. Do not use this against production until a disposable restore-test passed.");
