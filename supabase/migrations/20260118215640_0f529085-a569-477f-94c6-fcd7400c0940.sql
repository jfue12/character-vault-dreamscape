-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload post images
CREATE POLICY "Users can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow anyone to view post images (public bucket)
CREATE POLICY "Anyone can view post images"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

-- Allow users to delete their own post images
CREATE POLICY "Users can delete their own post images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);