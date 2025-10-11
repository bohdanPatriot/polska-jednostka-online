-- Drop existing foreign keys if they exist
ALTER TABLE IF EXISTS public.user_sessions
DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;

ALTER TABLE IF EXISTS public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_admin_id_fkey;

-- Add foreign keys pointing to profiles table
ALTER TABLE public.user_sessions
ADD CONSTRAINT user_sessions_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_admin_id_fkey 
FOREIGN KEY (admin_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;