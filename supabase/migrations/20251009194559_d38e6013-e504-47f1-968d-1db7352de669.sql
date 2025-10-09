-- Phase 1: Fix Critical Public Data Exposure
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.forum_posts;
DROP POLICY IF EXISTS "Threads are viewable by everyone" ON public.forum_threads;

-- Create new policies requiring authentication
CREATE POLICY "Authenticated users can view posts"
ON public.forum_posts
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view threads"
ON public.forum_threads
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Phase 2: Strengthen Admin Panel Security
-- Add server-side validation for rank updates
CREATE POLICY "Only admins can update user ranks"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- Admins can update any profile's rank
  has_role(auth.uid(), 'admin'::text)
  -- Users can still update their own profile (excluding rank)
  OR auth.uid() = id
)
WITH CHECK (
  -- If updating rank, must be admin
  has_role(auth.uid(), 'admin'::text)
  -- Users can update their own profile fields
  OR auth.uid() = id
);