-- Create storage buckets for avatars and signature images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('signature-images', 'signature-images', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

-- RLS policies for avatars bucket
CREATE POLICY "Users can view all avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for signature-images bucket
CREATE POLICY "Users can view all signature images"
ON storage.objects FOR SELECT
USING (bucket_id = 'signature-images');

CREATE POLICY "Users can upload their own signature image"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'signature-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own signature image"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'signature-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own signature image"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'signature-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create user_blog_posts table for personal blogs
CREATE TABLE IF NOT EXISTS public.user_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_blog_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for blog posts
CREATE POLICY "Anyone can view published blog posts"
ON public.user_blog_posts FOR SELECT
USING (is_published = true);

CREATE POLICY "Users can view their own blog posts"
ON public.user_blog_posts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own blog posts"
ON public.user_blog_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blog posts"
ON public.user_blog_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blog posts"
ON public.user_blog_posts FOR DELETE
USING (auth.uid() = user_id);

-- Add signature_image_url column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_image_url TEXT;