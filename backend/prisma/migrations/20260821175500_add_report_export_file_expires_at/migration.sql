-- Migration: add_report_export_file_expires_at
-- Adds fileExpiresAt to report_exports for 30-day Supabase Storage retention tracking.

ALTER TABLE "report_exports"
  ADD COLUMN "fileExpiresAt" TIMESTAMP(3);

CREATE INDEX "report_exports_fileExpiresAt_idx" ON "report_exports"("fileExpiresAt");
