import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, ArrowLeft, Eye, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Category = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryNames: { [key: string]: string } = {
    historia: "Historia",
    sprzet: "Sprzęt",
    taktyka: "Taktyka",
    aktualnosci: "Aktualności",
    offtopic: "Off-topic",
  };

  useEffect(() => {
    fetchThreads();
  }, [categoryId]);

  const fetchThreads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("forum_threads")
      .select(`
        *,
        profiles:author_id (username, rank)
      `)
      .eq("category", categoryId as any)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać wątków",
        variant: "destructive",
      });
    } else {
      setThreads(data || []);
    }
    setLoading(false);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/forum")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrót
            </Button>
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold font-military">{categoryNames[categoryId || ""]}</h1>
          </div>
          <Button onClick={() => navigate(`/category/${categoryId}/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Nowy wątek
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <p className="text-center text-muted-foreground">Ładowanie...</p>
        ) : threads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Brak wątków w tej kategorii</p>
              <Button onClick={() => navigate(`/category/${categoryId}/new`)}>
                Utwórz pierwszy wątek
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {threads.map((thread) => (
              <Card 
                key={thread.id}
                className="hover:border-primary transition-colors cursor-pointer"
                onClick={() => navigate(`/thread/${thread.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {thread.is_pinned && (
                          <Badge variant="secondary">Przypięty</Badge>
                        )}
                        {thread.is_locked && (
                          <Badge variant="outline">Zablokowany</Badge>
                        )}
                      </div>
                      <CardTitle className="font-military mb-1">{thread.title}</CardTitle>
                      <CardDescription>
                        przez{" "}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${thread.author_id}`);
                          }}
                          className="hover:underline cursor-pointer"
                        >
                          {thread.profiles?.username}
                        </button>
                        {" • "}{formatDate(thread.created_at)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {thread.views_count}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {thread.replies_count}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Category;
