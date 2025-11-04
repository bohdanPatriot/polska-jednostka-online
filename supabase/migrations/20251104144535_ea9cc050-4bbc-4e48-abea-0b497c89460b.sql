-- Add missing RLS policies for Phase 1 security fixes

-- 1. user_sessions: Allow authenticated users to insert their own sessions
CREATE POLICY "Users can insert own sessions"
ON public.user_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. notifications: Allow system to insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. notifications: Allow users to delete their own old notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4. event_participants: Allow users to leave events
CREATE POLICY "Users can leave events"
ON public.event_participants
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);