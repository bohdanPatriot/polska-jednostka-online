import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { BlogEditor } from "@/components/profile/BlogEditor";

const Profile = () => {
  const navigate = useNavigate();
  const [blogPosts, setBlogPosts] = useState<any[]>([]);

  useEffect(() => {
    fetchBlogPosts();
  }, []);

  const fetchBlogPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_blog_posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setBlogPosts(data);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold font-military">Profil</h1>
          <Button variant="outline" size="sm" onClick={() => navigate("/forum")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <ProfileEditor />
        <BlogEditor posts={blogPosts} onPostsChange={fetchBlogPosts} />
      </main>
    </div>
  );
};

export default Profile;