-- Important staff ID / registration fields on TeacherProfile
ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "gender" "Gender";
ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "bloodType" TEXT;
ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT;
ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT;
