-- Fix user_roles security issues

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Roles are viewable by everyone" ON public.user_roles;

-- Create restricted SELECT policy: users see only their own roles, admins see all
CREATE POLICY "Users can view own roles or admins view all"
ON public.user_roles
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- Create admin-only INSERT policy for role assignment
CREATE POLICY "Only admins can assign roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- Create admin-only UPDATE policy for role modification
CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Create admin-only DELETE policy for role removal
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
);