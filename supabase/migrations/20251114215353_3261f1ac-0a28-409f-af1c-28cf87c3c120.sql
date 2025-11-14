-- Add DELETE policy for admins on user_badges table
CREATE POLICY "Admins can remove badge assignments"
ON public.user_badges
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));