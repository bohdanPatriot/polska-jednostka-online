import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  is_active: boolean;
  profiles: { username: string };
  participant_count?: number;
}

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select(`
        *,
        profiles(username)
      `)
      .eq("is_active", true)
      .order("start_date", { ascending: true });

    if (!error && data) {
      const eventsWithCounts = await Promise.all(
        data.map(async (event) => {
          const { count } = await supabase
            .from("event_participants")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id)
            .eq("status", "attending");

          return { ...event, participant_count: count || 0 };
        })
      );

      setEvents(eventsWithCounts as any);
    }
    setLoading(false);
  };

  const joinEvent = async (eventId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("event_participants").upsert({
      event_id: eventId,
      user_id: user.id,
      status: "attending",
    });

    fetchEvents();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold font-military">Wydarzenia</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/forum")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <p className="text-center">Ładowanie...</p>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Brak nadchodzących wydarzeń
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <CardTitle className="font-military">{event.title}</CardTitle>
                  <Badge variant="outline">
                    {format(new Date(event.start_date), "PPp")}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {event.description && (
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  )}
                  
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    {event.participant_count} uczestników
                  </div>

                  <Button onClick={() => joinEvent(event.id)} className="w-full">
                    Dołącz
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Events;