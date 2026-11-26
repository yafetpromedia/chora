const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  await p.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "TeacherPhotoReviewStatus" AS ENUM ('NONE', 'PENDING', 'REJECTED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  const stmts = [
    `ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "pendingPhotoUrl" TEXT`,
    `ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "photoReviewStatus" "TeacherPhotoReviewStatus" NOT NULL DEFAULT 'NONE'`,
    `ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "photoSubmittedAt" TIMESTAMP(3)`,
    `ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "photoReviewedAt" TIMESTAMP(3)`,
    `ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "photoReviewedById" TEXT`,
    `ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "photoReviewNote" TEXT`,
    `CREATE INDEX IF NOT EXISTS "TeacherProfile_schoolId_photoReviewStatus_idx" ON "TeacherProfile"("schoolId", "photoReviewStatus")`,
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
