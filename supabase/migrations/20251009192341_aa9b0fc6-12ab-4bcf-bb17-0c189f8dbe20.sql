-- Drop the public access policy on military_archive
DROP POLICY IF EXISTS "Archive is viewable by everyone" ON public.military_archive;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can view archive"
ON public.military_archive
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Add comment explaining the security requirement
COMMENT ON POLICY "Authenticated users can view archive" ON public.military_archive IS 'Restricts access to military documents to authenticated users only, preventing public exposure of sensitive materials';