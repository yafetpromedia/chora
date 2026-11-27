const { PrismaClient } = require("@prisma/client");

const p = new PrismaClient();

async function main() {
  await p.$executeRawUnsafe(`
    ALTER TABLE "School"
    ADD COLUMN IF NOT EXISTS "weekendDays" "Weekday"[]
    NOT NULL DEFAULT ARRAY['SATURDAY', 'SUNDAY']::"Weekday"[];
  `);
  const sample = await p.$queryRawUnsafe(`
    SELECT id, name, "weekendDays"
    FROM "School"
    LIMIT 1
  `);
  console.log("ok", sample);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());
