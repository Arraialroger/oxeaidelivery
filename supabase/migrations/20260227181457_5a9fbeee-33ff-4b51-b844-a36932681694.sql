
-- Allow authenticated users to upload to the onboarding/ folder in restaurants bucket
CREATE POLICY "Authenticated users can upload onboarding assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'restaurants'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'onboarding'
);
