-- Phase 4: Reactions System
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'salute', 'agree', 'disagree')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

CREATE INDEX idx_post_reactions_post ON public.post_reactions(post_id);
CREATE INDEX idx_post_reactions_user ON public.post_reactions(user_id);

-- Phase 4: Notifications System
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mention', 'reply', 'pm', 'badge', 'system')),
  title TEXT NOT NULL,
  content TEXT,
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- Phase 4: Badges/Achievements System
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  criteria JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Phase 4: Enhance profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS signature TEXT,
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'auto')),
ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_last_online BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0;

-- Phase 5: Message Attachments (leverage existing private_messages)
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.private_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 5: Polls System
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Phase 5: Events System
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  location TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'attending' CHECK (status IN ('attending', 'maybe', 'declined')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Phase 2: Reports System
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'thread', 'user', 'pm')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  assigned_to UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_assigned ON public.reports(assigned_to);

-- RLS Policies for new tables

-- post_reactions
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions" ON public.post_reactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can add own reactions" ON public.post_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions" ON public.post_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- badges (read-only for users)
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges" ON public.badges
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage badges" ON public.badges
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- user_badges
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view badges" ON public.user_badges
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can assign badges" ON public.user_badges
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- message_attachments
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own message attachments" ON public.message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.private_messages pm
      WHERE pm.id = message_id AND (pm.sender_id = auth.uid() OR pm.recipient_id = auth.uid())
    )
  );

-- polls
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view polls" ON public.polls
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create polls in own threads" ON public.polls
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forum_threads ft
      WHERE ft.id = thread_id AND ft.author_id = auth.uid()
    )
  );

-- poll_votes
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view poll votes" ON public.poll_votes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can cast own votes" ON public.poll_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active events" ON public.events
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage events" ON public.events
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- event_participants
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants" ON public.event_participants
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can join events" ON public.event_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation" ON public.event_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports" ON public.reports
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can manage reports" ON public.reports
  FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- Insert default badges
INSERT INTO public.badges (name, description, icon, criteria) VALUES
  ('First Post', 'Posted your first message', 'MessageSquare', '{"posts": 1}'::jsonb),
  ('Century Club', 'Made 100 posts', 'Award', '{"posts": 100}'::jsonb),
  ('Veteran', 'Member for 1 year', 'Medal', '{"days": 365}'::jsonb),
  ('Top Contributor', 'Reputation score over 500', 'Trophy', '{"reputation": 500}'::jsonb)
ON CONFLICT (name) DO NOTHING;