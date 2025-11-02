import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Calendar, MessageSquare, Award, BookOpen, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PublicProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchBadges();
      fetchBlogPosts();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać profilu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBadges = async () => {
    try {
      const { data } = await supabase
        .from("user_badges")
        .select(`
          *,
          badges:badge_id (*)
        `)
        .eq("user_id", userId);

      if (data) {
        setBadges(data);
      }
    } catch (error) {
      console.error("Failed to fetch badges:", error);
    }
  };

  const fetchBlogPosts = async () => {
    try {
      const { data } = await supabase
        .from("user_blog_posts")
        .select("*")
        .eq("user_id", userId)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (data) {
        setBlogPosts(data);
      }
    } catch (error) {
      console.error("Failed to fetch blog posts:", error);
    }
  };

  const getRankDisplay = (rank: string) => {
    const rankMap: { [key: string]: string } = {
      rekrut: "Rekrut",
      starszy_szeregowy: "Starszy Szeregowy",
      kapral: "Kapral",
      plutonowy: "Plutonowy",
      sierzant: "Sierżant",
      starszy_sierzant: "Starszy Sierżant",
      mlodszy_chorazy: "Młodszy Chorąży",
      chorazy: "Chorąży",
      starszy_chorazy: "Starszy Chorąży",
      podporucznik: "Podporucznik",
      porucznik: "Porucznik",
      kapitan: "Kapitan",
      major: "Major",
      podpulkownik: "Podpułkownik",
      pulkownik: "Pułkownik",
      general: "Generał",
    };
    return rankMap[rank] || rank;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Profil nie został znaleziony</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Button>
          <Button onClick={() => navigate('/messages')} variant="default" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Wyślij wiadomość
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start gap-4">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || profile.username}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-10 w-10 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-3xl font-military">
                    {profile.display_name || profile.username}
                  </CardTitle>
                  {profile.is_verified && (
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  )}
                </div>
                {profile.display_name && profile.display_name !== profile.username && (
                  <p className="text-muted-foreground mb-2">@{profile.username}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-lg">
                    {getRankDisplay(profile.rank)}
                  </Badge>
                  {profile.reputation_score > 0 && (
                    <Badge variant="secondary">
                      <Award className="h-3 w-3 mr-1" />
                      Reputacja: {profile.reputation_score}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.bio && (
              <div>
                <h3 className="font-semibold mb-2">O mnie</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>{profile.posts_count}</strong> postów
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Dołączył {new Date(profile.joined_at).toLocaleDateString("pl-PL")}
                </span>
              </div>
            </div>

            {badges.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3">Odznaki</h3>
                <div className="flex flex-wrap gap-2">
                  {badges.map((userBadge: any) => (
                    <Badge key={userBadge.id} variant="secondary" className="text-sm">
                      {userBadge.badges?.icon} {userBadge.badges?.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.signature && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Sygnatura</h3>
                <p className="text-sm text-muted-foreground italic">{profile.signature}</p>
                {profile.signature_image_url && (
                  <img
                    src={profile.signature_image_url}
                    alt="Signature"
                    className="mt-2 max-h-16 object-contain"
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {blogPosts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Blog
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {blogPosts.map((post) => (
                  <div key={post.id} className="border-b pb-4 last:border-0">
                    <h3 className="font-semibold mb-2">{post.title}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {post.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(post.created_at).toLocaleDateString("pl-PL")}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default PublicProfile;
