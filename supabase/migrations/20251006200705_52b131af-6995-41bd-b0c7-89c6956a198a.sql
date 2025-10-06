-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user ranks
CREATE TYPE user_rank AS ENUM ('rekrut', 'starszy_szeregowy', 'kapral', 'plutonowy', 'sierzant', 'starszy_sierzant', 'mlodszy_chorazy', 'chorazy', 'starszy_chorazy', 'podporucznik', 'porucznik', 'kapitan', 'major', 'podpulkownik', 'pulkownik', 'general');

-- Create enum for forum categories
CREATE TYPE forum_category AS ENUM ('historia', 'sprzet', 'taktyka', 'aktualnosci', 'offtopic');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  rank user_rank DEFAULT 'rekrut',
  bio TEXT,
  avatar_url TEXT,
  posts_count INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Create forum threads table
CREATE TABLE public.forum_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category forum_category NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0
);

-- Enable RLS on threads
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;

-- Threads policies
CREATE POLICY "Threads are viewable by everyone" 
  ON public.forum_threads FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create threads" 
  ON public.forum_threads FOR INSERT 
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own threads" 
  ON public.forum_threads FOR UPDATE 
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete own threads" 
  ON public.forum_threads FOR DELETE 
  USING (auth.uid() = author_id);

-- Create forum posts table
CREATE TABLE public.forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES public.forum_threads(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT false
);

-- Enable RLS on posts
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Posts are viewable by everyone" 
  ON public.forum_posts FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create posts" 
  ON public.forum_posts FOR INSERT 
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own posts" 
  ON public.forum_posts FOR UPDATE 
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete own posts" 
  ON public.forum_posts FOR DELETE 
  USING (auth.uid() = author_id);

-- Create private messages table
CREATE TABLE public.private_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on messages
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- Messages policies
CREATE POLICY "Users can view own messages" 
  ON public.private_messages FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" 
  ON public.private_messages FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update message read status" 
  ON public.private_messages FOR UPDATE 
  USING (auth.uid() = recipient_id);

-- Create military archive table
CREATE TABLE public.military_archive (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on archive
ALTER TABLE public.military_archive ENABLE ROW LEVEL SECURITY;

-- Archive policies
CREATE POLICY "Archive is viewable by everyone" 
  ON public.military_archive FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can upload to archive" 
  ON public.military_archive FOR INSERT 
  WITH CHECK (auth.uid() = uploaded_by);

-- Create user roles table for admin
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'user')),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- User roles policies
CREATE POLICY "Roles are viewable by everyone" 
  ON public.user_roles FOR SELECT 
  USING (true);

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, rank)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'rekrut'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update thread reply count
CREATE OR REPLACE FUNCTION public.update_thread_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_threads
    SET replies_count = replies_count + 1,
        updated_at = NOW()
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_threads
    SET replies_count = GREATEST(replies_count - 1, 0)
    WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for reply count
CREATE TRIGGER update_thread_replies
  AFTER INSERT OR DELETE ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_thread_reply_count();

-- Create function to update user posts count
CREATE OR REPLACE FUNCTION public.update_user_posts_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET posts_count = posts_count + 1
    WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET posts_count = GREATEST(posts_count - 1, 0)
    WHERE id = OLD.author_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for user posts count
CREATE TRIGGER update_user_posts
  AFTER INSERT OR DELETE ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_posts_count();