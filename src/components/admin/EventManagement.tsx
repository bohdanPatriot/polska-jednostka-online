import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Plus, Edit, Trash2, Users } from "lucide-react";
import { format } from "date-fns";

const eventSchema = z.object({
  title: z.string().trim().min(1, "Tytuł jest wymagany").max(200, "Tytuł może mieć maksymalnie 200 znaków"),
  description: z.string().trim().max(2000, "Opis może mieć maksymalnie 2000 znaków").optional(),
  start_date: z.string().datetime("Nieprawidłowa data rozpoczęcia"),
  end_date: z.string().datetime("Nieprawidłowa data zakończenia").optional(),
  location: z.string().trim().max(500, "Lokalizacja może mieć maksymalnie 500 znaków").optional(),
  is_active: z.boolean()
});

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  participant_count?: number;
}

export function EventManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    location: "",
    is_active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;

      if (data) {
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
        setEvents(eventsWithCounts);
      }
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać wydarzeń",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const logAuditAction = async (actionType: string, targetId: string, oldValue?: any, newValue?: any, reason?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc("log_admin_action", {
        p_admin_id: user.id,
        p_action_type: actionType,
        p_target_type: "event",
        p_target_id: targetId,
        p_old_value: oldValue || null,
        p_new_value: newValue || null,
        p_reason: reason || null
      });
    } catch (error) {
      console.error("Failed to log audit action:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate input
      const validated = eventSchema.parse({
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nie jesteś zalogowany");

      if (editingEvent) {
        // Update existing event
        const { error } = await supabase
          .from("events")
          .update({
            title: validated.title,
            description: validated.description || null,
            start_date: validated.start_date,
            end_date: validated.end_date || null,
            location: validated.location || null,
            is_active: validated.is_active,
          })
          .eq("id", editingEvent.id);

        if (error) throw error;

        await logAuditAction(
          "update_event",
          editingEvent.id,
          editingEvent,
          validated,
          "Aktualizacja wydarzenia przez moderatora"
        );

        toast({
          title: "Sukces",
          description: "Wydarzenie zostało zaktualizowane",
        });
      } else {
        // Create new event
        const { data, error } = await supabase
          .from("events")
          .insert({
            title: validated.title,
            description: validated.description || null,
            start_date: validated.start_date,
            end_date: validated.end_date || null,
            location: validated.location || null,
            is_active: validated.is_active,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          await logAuditAction(
            "create_event",
            data.id,
            null,
            validated,
            "Utworzenie nowego wydarzenia przez moderatora"
          );
        }

        toast({
          title: "Sukces",
          description: "Wydarzenie zostało utworzone",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchEvents();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Błąd walidacji",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Błąd",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = async (event: Event) => {
    if (!confirm(`Czy na pewno chcesz usunąć wydarzenie "${event.title}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id);

      if (error) throw error;

      await logAuditAction(
        "delete_event",
        event.id,
        event,
        null,
        "Usunięcie wydarzenia przez moderatora"
      );

      toast({
        title: "Sukces",
        description: "Wydarzenie zostało usunięte",
      });

      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      start_date: new Date(event.start_date).toISOString().slice(0, 16),
      end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : "",
      location: event.location || "",
      is_active: event.is_active,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingEvent(null);
    setFormData({
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      location: "",
      is_active: true,
    });
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setDialogOpen(open);
  };

  if (loading) {
    return <p className="text-center">Ładowanie...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-military">Zarządzanie Wydarzeniami</h2>
          <p className="text-sm text-muted-foreground">Twórz i zarządzaj wydarzeniami społeczności</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nowe wydarzenie
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Edytuj wydarzenie" : "Utwórz nowe wydarzenie"}</DialogTitle>
              <DialogDescription>
                Wypełnij poniższe pola. Wszystkie dane będą zapisane w logu audytu.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tytuł *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength={200}
                  required
                />
                <p className="text-xs text-muted-foreground">{formData.title.length}/200</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Opis</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  maxLength={2000}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">{formData.description.length}/2000</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data rozpoczęcia *</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">Data zakończenia</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Lokalizacja</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">{formData.location.length}/500</p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_active">Wydarzenie aktywne</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                  Anuluj
                </Button>
                <Button type="submit">
                  {editingEvent ? "Zaktualizuj" : "Utwórz"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Brak wydarzeń. Utwórz pierwsze wydarzenie.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="font-military">{event.title}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={event.is_active ? "default" : "secondary"}>
                        {event.is_active ? "Aktywne" : "Nieaktywne"}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {event.participant_count || 0}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(event)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(event)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {event.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(event.start_date), "PPp")}
                </div>
                {event.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
