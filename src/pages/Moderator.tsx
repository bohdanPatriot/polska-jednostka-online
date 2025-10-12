import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReportQueue } from "@/components/admin/ReportQueue";
import { ActivityChart } from "@/components/analytics/ActivityChart";
import { UserActivityView } from "@/components/admin/UserActivityView";

const Moderator = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    checkModeratorAccess();
  }, []);

  const checkModeratorAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const hasModeratorRole = roles?.some(r => r.role === "moderator" || r.role === "admin");
    
    if (!hasModeratorRole) {
      toast({
        title: "Brak dostępu",
        description: "Tylko moderatorzy mają dostęp do tego panelu",
        variant: "destructive",
      });
      navigate("/forum");
      return;
    }

    setIsModerator(true);
    fetchEvents();
    setLoading(false);
  };

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("start_date", { ascending: false });

    if (data) {
      setEvents(data);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  if (!isModerator) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold font-military">Panel Moderatora</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/forum")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do forum
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reports">Zgłoszenia</TabsTrigger>
            <TabsTrigger value="analytics">Analityka</TabsTrigger>
            <TabsTrigger value="events">Wydarzenia</TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <ReportQueue />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <ActivityChart />
            <UserActivityView />
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle className="font-military">Zarządzanie Wydarzeniami</CardTitle>
                <CardDescription>Przeglądaj i edytuj wydarzenia</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Funkcja zarządzania wydarzeniami będzie dostępna wkrótce.
                  Moderatorzy będą mogli tworzyć, edytować i usuwać wydarzenia.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Moderator;
