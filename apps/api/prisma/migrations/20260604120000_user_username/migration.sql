-- Add username for sign-in; email remains contact info.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

UPDATE "User"
SET "username" = UPPER("externalRef")
WHERE "externalRef" IS NOT NULL AND TRIM("externalRef") <> '';

UPDATE "User"
SET "username" = LOWER(SPLIT_PART("email", '@', 1))
WHERE "username" IS NULL;

UPDATE "User"
SET "username" = 'user_' || SUBSTRING("id", 1, 12)
WHERE "username" IS NULL OR TRIM("username") = '';

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "User_schoolId_username_key" ON "User"("schoolId", "username");
