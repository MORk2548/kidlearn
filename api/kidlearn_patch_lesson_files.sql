-- ไฟล์แนบบทเรียน (PDF, Word, PowerPoint, Excel, .txt) รันหลัง kidlearn_patch_lessons.sql รันซ้ำได้
-- ใช้ bucket แยกจาก kidlearn-images เพราะ bucket รูปรับเฉพาะ MIME รูปภาพ

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kidlearn-files', 'kidlearn-files', true, 10485760, ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

-- [{path, name, size}] ไฟล์อยู่ใน bucket kidlearn-files และมีแถวใน image_assets
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]';
