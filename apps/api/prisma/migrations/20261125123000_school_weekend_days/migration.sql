-- AlterTable
ALTER TABLE "School"
ADD COLUMN IF NOT EXISTS "weekendDays" "Weekday"[] NOT NULL DEFAULT ARRAY['SATURDAY', 'SUNDAY']::"Weekday"[];
