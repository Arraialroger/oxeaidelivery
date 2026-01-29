-- Create storage bucket for restaurant images (logos, banners, gallery)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'restaurants',
  'restaurants',
  true,
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated admins to upload images
CREATE POLICY "Admins can upload restaurant images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'restaurants' AND
  public.has_role(auth.uid(), 'admin')
);

-- Allow authenticated admins to update their images
CREATE POLICY "Admins can update restaurant images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'restaurants' AND
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'restaurants' AND
  public.has_role(auth.uid(), 'admin')
);

-- Allow authenticated admins to delete their images
CREATE POLICY "Admins can delete restaurant images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'restaurants' AND
  public.has_role(auth.uid(), 'admin')
);

-- Allow public to view restaurant images
CREATE POLICY "Public can view restaurant images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'restaurants');