import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MediaUpload } from "@/components/posts/MediaUpload";

const NewThread = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [firstPostId, setFirstPostId] = useState<string | null>(null);

  const categoryNames: { [key: string]: string } = {
    historia: "Historia",
    sprzet: "Sprzęt",
    taktyka: "Taktyka",
    aktualnosci: "Aktualności",
    offtopic: "Off-topic",
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);

    // Create thread
    const { data: thread, error: threadError } = await supabase
      .from("forum_threads")
      .insert({
        title,
        category: categoryId as any,
        author_id: userId,
      })
      .select()
      .single();

    if (threadError) {
      toast({
        title: "Błąd",
        description: "Nie udało się utworzyć wątku",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Create first post
    const { data: post, error: postError } = await supabase
      .from("forum_posts")
      .insert({
        thread_id: thread.id,
        author_id: userId,
        content,
      })
      .select()
      .single();

    if (postError) {
      toast({
        title: "Błąd",
        description: "Nie udało się dodać pierwszego postu",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setFirstPostId(post.id);

    toast({
      title: "Sukces",
      description: "Wątek został utworzony",
    });

    navigate(`/thread/${thread.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/category/${categoryId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Button>
          <h1 className="text-2xl font-bold font-military">
            Nowy wątek - {categoryNames[categoryId || ""]}
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="font-military">Utwórz nowy wątek</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Tytuł wątku</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Wprowadź tytuł..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Treść</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Napisz swoją wiadomość..."
                  rows={12}
                  required
                />
              </div>
              
              {firstPostId && (
                <div className="space-y-2">
                  <Label>Załączniki (opcjonalnie)</Label>
                  <MediaUpload postId={firstPostId} />
                </div>
              )}
              <div className="flex gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? "Tworzenie..." : "Utwórz wątek"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/category/${categoryId}`)}
                >
                  Anuluj
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NewThread;
