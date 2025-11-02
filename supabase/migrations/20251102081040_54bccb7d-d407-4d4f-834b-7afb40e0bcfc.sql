-- Create direct_messages table for private messaging
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT content_length CHECK (char_length(content) BETWEEN 1 AND 2000)
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for direct_messages
CREATE POLICY "Users can send messages"
  ON public.direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view own messages"
  ON public.direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Recipients can mark as read"
  ON public.direct_messages FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Indexes for performance
CREATE INDEX idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX idx_direct_messages_recipient ON public.direct_messages(recipient_id);
CREATE INDEX idx_direct_messages_created_at ON public.direct_messages(created_at DESC);

-- Create post_attachments table for media uploads
CREATE TABLE public.post_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.post_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_attachments
CREATE POLICY "Users can view attachments"
  ON public.post_attachments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authors can add attachments to own posts"
  ON public.post_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forum_posts
      WHERE id = post_id AND author_id = auth.uid()
    )
  );

CREATE POLICY "Authors can delete own post attachments"
  ON public.post_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.forum_posts
      WHERE id = post_id AND author_id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX idx_post_attachments_post ON public.post_attachments(post_id);

-- Storage bucket for post media (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for DM attachments (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dm-attachments',
  'dm-attachments',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for post-media bucket
CREATE POLICY "Authenticated users can upload post media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-media' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can view post media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

CREATE POLICY "Users can delete own post media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for dm-attachments bucket
CREATE POLICY "Users can upload DM attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dm-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own DM attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dm-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own DM attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'dm-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add blog post length constraints
ALTER TABLE public.user_blog_posts
  ADD CONSTRAINT title_length CHECK (char_length(title) BETWEEN 1 AND 200),
  ADD CONSTRAINT content_length_blog CHECK (char_length(content) BETWEEN 10 AND 50000);

-- Add trigger for direct_messages updated_at
CREATE OR REPLACE FUNCTION update_direct_messages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_direct_messages_timestamp
  BEFORE UPDATE ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_direct_messages_updated_at();