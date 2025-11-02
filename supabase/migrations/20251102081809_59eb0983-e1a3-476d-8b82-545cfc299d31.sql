-- Add is_verified field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON public.profiles(is_verified);

-- Only admins and moderators can update is_verified status
CREATE POLICY "Only admins can verify users"
  ON public.profiles FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator')
  );