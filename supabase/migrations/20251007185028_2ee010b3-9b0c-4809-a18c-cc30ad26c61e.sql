-- Phase 1: Restrict profile access to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Phase 2: Add moderation capabilities

-- Allow moderators and admins to update thread status (pin/lock)
CREATE POLICY "Moderators can update thread status"
ON public.forum_threads
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Allow moderators and admins to delete any post
CREATE POLICY "Moderators can delete any post"
ON public.forum_posts
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Allow moderators and admins to update any post
CREATE POLICY "Moderators can update any post"
ON public.forum_posts
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Create moderator role enum value if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  ELSE
    -- Add moderator if it doesn't exist
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;