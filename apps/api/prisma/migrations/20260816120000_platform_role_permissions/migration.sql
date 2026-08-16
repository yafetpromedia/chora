-- Editable platform role permission matrix (JSON).
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "rolePermissions" JSONB;
