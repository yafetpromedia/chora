/**
 * Transition helper for databases that already match schema.prisma
 * (typically created/evolved via db push) but are missing migration
 * history records for the repaired chain.
 *
 * SAFETY:
 * - Aborts unless `prisma migrate diff --exit-code` reports an empty diff.
 * - Never runs migrate deploy, db push, reset, or seed.
 * - Still only marks the catch-up migration as applied; operators must
 *   baseline ANY other missing folders with `migrate resolve --applied`
 *   before `migrate deploy` (see docs/PRODUCTION_MIGRATION_AUDIT.md).
 *
 * Usage (disposable restore first!):
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

const run = (args, { allowStatuses = [0] } = {}) => {
  const result = spawnSync("npx", args, {
    cwd: apiRoot,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  const status = result.status ?? 1;
  if (!allowStatuses.includes(status)) process.exit(status);
  return status;
};

console.log(
  "Checking schema diff against prisma/schema.prisma (must be empty)...",
);
// Prisma: 0 = empty diff, 2 = non-empty diff, 1 = error
const diffStatus = run(
  [
    "prisma",
    "migrate",
    "diff",
    "--from-url",
    databaseUrl,
    "--to-schema-datamodel",
    "prisma/schema.prisma",
    "--script",
    "--exit-code",
  ],
  { allowStatuses: [0, 2] },
);

if (diffStatus === 2) {
  console.error(
    "\nABORT: schema diff is NOT empty. Do not resolve catch-up until the live schema matches schema.prisma.",
  );
  console.error(
    "Inspect the SQL above, fix the gap on a disposable restore, then re-run this script.",
  );
  process.exit(2);
}

console.log(
  "\nDiff empty. Marking 20260530170000_schema_catchup as applied...",
);
run(["prisma", "migrate", "resolve", "--applied", "20260530170000_schema_catchup"]);

console.log("\nFinal migrate status:");
run(["prisma", "migrate", "status"]);
console.log(
  "\nDone. If status still lists pending migrations, baseline EACH missing folder with",
);
console.log(
  "  npx prisma migrate resolve --applied <migration_folder_name>",
);
console.log(
  "before migrate deploy. Do not use this against production until a disposable restore-test passed.",
);
