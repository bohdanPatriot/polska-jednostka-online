import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Thread = () => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [thread, setThread] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });

    fetchThread();
    fetchPosts();
  }, [threadId, navigate]);

  const fetchThread = async () => {
    const { data, error } = await supabase
      .from("forum_threads")
      .select(`
        *,
        profiles:author_id (username, rank)
      `)
      .eq("id", threadId)
      .single();

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać wątku",
        variant: "destructive",
      });
    } else {
      setThread(data);
    }
    setLoading(false);
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("forum_posts")
      .select(`
        *,
        profiles:author_id (username, rank)
      `)
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać postów",
        variant: "destructive",
      });
    } else {
      setPosts(data || []);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newPost.trim()) return;

    setSubmitting(true);

    const { error } = await supabase
      .from("forum_posts")
      .insert({
        thread_id: threadId,
        author_id: userId,
        content: newPost,
      });

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się dodać odpowiedzi",
        variant: "destructive",
      });
    } else {
      setNewPost("");
      fetchPosts();
      toast({
        title: "Sukces",
        description: "Odpowiedź została dodana",
      });
    }

    setSubmitting(false);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  if (loading || !thread) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/category/${thread.category}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              {thread.is_pinned && <Badge variant="secondary">Przypięty</Badge>}
              {thread.is_locked && <Badge variant="outline">Zablokowany</Badge>}
            </div>
            <CardTitle className="text-3xl font-military">{thread.title}</CardTitle>
            <p className="text-muted-foreground">
              przez {thread.profiles?.username} • {formatDate(thread.created_at)}
            </p>
          </CardHeader>
        </Card>

        <div className="space-y-4 mb-8">
          {posts.map((post, index) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{post.profiles?.username}</p>
                    <Badge variant="outline" className="mt-1">
                      {getRankDisplay(post.profiles?.rank)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {index === 0 ? "Pierwotny post" : `#${index + 1}`} • {formatDate(post.created_at)}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{post.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {!thread.is_locked && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-military">
                <MessageSquare className="h-5 w-5" />
                Dodaj odpowiedź
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitPost} className="space-y-4">
                <Textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Napisz swoją odpowiedź..."
                  rows={6}
                  required
                />
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Wysyłanie..." : "Wyślij odpowiedź"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Thread;
