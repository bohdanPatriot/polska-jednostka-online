-- Fix Issue #1: Enable realtime for direct_messages
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;

-- Fix Issue #2: Create notification system for reports
CREATE OR REPLACE FUNCTION notify_moderators_on_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert notifications for all moderators and admins
  INSERT INTO notifications (user_id, type, title, content, related_id)
  SELECT 
    ur.user_id,
    'report',
    'Nowe zgłoszenie',
    'Otrzymano nowe zgłoszenie: ' || NEW.reason || ' (' || NEW.target_type || ')',
    NEW.id
  FROM user_roles ur
  WHERE ur.role IN ('admin', 'moderator');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_moderators_on_report
AFTER INSERT ON reports
FOR EACH ROW
EXECUTE FUNCTION notify_moderators_on_report();

-- Fix Issue #2: Enable realtime for reports table so moderators get live updates
ALTER PUBLICATION supabase_realtime ADD TABLE reports;

-- Fix Issue #4: Enforce bans across all tables by updating RLS policies

-- Forum threads - prevent banned users from creating threads
DROP POLICY IF EXISTS "Authenticated users can create threads" ON forum_threads;
CREATE POLICY "Authenticated users can create threads"
ON forum_threads FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id 
  AND NOT is_user_banned(auth.uid())
);

-- Forum posts - prevent banned users from creating posts
DROP POLICY IF EXISTS "Authenticated users can create posts" ON forum_posts;
CREATE POLICY "Authenticated users can create posts"
ON forum_posts FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id 
  AND NOT is_user_banned(auth.uid())
);

-- Direct messages - prevent banned users from sending messages
DROP POLICY IF EXISTS "Users can send messages" ON direct_messages;
CREATE POLICY "Users can send messages"
ON direct_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id 
  AND NOT is_user_banned(auth.uid())
);

-- Reports - prevent banned users from creating reports
DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports"
ON reports FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reporter_id 
  AND NOT is_user_banned(auth.uid())
);

-- Polls - prevent banned users from creating polls
DROP POLICY IF EXISTS "Users can create polls in own threads" ON polls;
CREATE POLICY "Users can create polls in own threads"
ON polls FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM forum_threads ft 
    WHERE ft.id = polls.thread_id 
    AND ft.author_id = auth.uid()
  )
  AND NOT is_user_banned(auth.uid())
);

-- Poll votes - prevent banned users from voting
DROP POLICY IF EXISTS "Users can cast own votes" ON poll_votes;
CREATE POLICY "Users can cast own votes"
ON poll_votes FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND NOT is_user_banned(auth.uid())
);

-- Post reactions - prevent banned users from reacting
DROP POLICY IF EXISTS "Users can add own reactions" ON post_reactions;
CREATE POLICY "Users can add own reactions"
ON post_reactions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND NOT is_user_banned(auth.uid())
);

-- Enable realtime for notifications so moderators get live updates
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;