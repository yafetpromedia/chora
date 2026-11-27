const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const stmts = [
    `ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "gender" "Gender"`,
    `ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3)`,
    `ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "bloodType" TEXT`,
    `ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "address" TEXT`,
    `ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT`,
    `ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT`,
  ];
  for (const sql of stmts) {
    await p.$executeRawUnsafe(sql);
  }
  console.log("ok");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());
