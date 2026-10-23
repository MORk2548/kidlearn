-- Store profile pictures as Supabase Storage URLs so they follow the account across devices.
-- Apply after kidlearn_patch_v4.sql. Uploaded files go to the public `kidlearn-images` bucket
-- through api/backend.php?action=upload_image and are recorded in public.image_assets.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('kidlearn-images', 'kidlearn-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;
