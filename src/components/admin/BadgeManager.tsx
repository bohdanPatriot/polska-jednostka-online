import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Award, Plus, Trash2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function BadgeManager() {
  const [badges, setBadges] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedBadge, setSelectedBadge] = useState("");
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBadges();
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserBadges(selectedUser);
    }
  }, [selectedUser]);

  const fetchBadges = async () => {
    const { data } = await supabase
      .from("badges")
      .select("*")
      .order("name");
    if (data) setBadges(data);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .order("username");
    if (data) setProfiles(data);
  };

  const fetchUserBadges = async (userId: string) => {
    const { data } = await supabase
      .from("user_badges")
      .select(`
        *,
        badges:badge_id (*)
      `)
      .eq("user_id", userId);
    if (data) setUserBadges(data);
  };

  const assignBadge = async () => {
    if (!selectedUser || !selectedBadge) {
      toast({
        title: "Błąd",
        description: "Wybierz użytkownika i odznakę",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_badges")
        .insert({
          user_id: selectedUser,
          badge_id: selectedBadge,
        });

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Odznaka została przyznana",
      });

      fetchUserBadges(selectedUser);
      setDialogOpen(false);
      setSelectedBadge("");
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeBadge = async (userBadgeId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę odznakę?")) return;

    try {
      const { error } = await supabase
        .from("user_badges")
        .delete()
        .eq("id", userBadgeId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Odznaka została usunięta",
      });

      fetchUserBadges(selectedUser);
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Zarządzanie odznakami
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="user-select">Wybierz użytkownika</Label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger id="user-select">
              <SelectValue placeholder="Wybierz użytkownika..." />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.display_name || profile.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedUser && (
          <>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Odznaki użytkownika</h3>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="default">
                      <Plus className="h-4 w-4 mr-2" />
                      Przyznaj odznakę
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Przyznaj odznakę</DialogTitle>
                      <DialogDescription>
                        Wybierz odznakę do przyznania użytkownikowi
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="badge-select">Odznaka</Label>
                        <Select value={selectedBadge} onValueChange={setSelectedBadge}>
                          <SelectTrigger id="badge-select">
                            <SelectValue placeholder="Wybierz odznakę..." />
                          </SelectTrigger>
                          <SelectContent>
                            {badges.map((badge) => (
                              <SelectItem key={badge.id} value={badge.id}>
                                <span className="flex items-center gap-2">
                                  <span>{badge.icon}</span>
                                  <span>{badge.name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={assignBadge} disabled={loading} className="w-full">
                        {loading ? "Przyznawanie..." : "Przyznaj"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {userBadges.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Użytkownik nie ma jeszcze odznak
                </p>
              ) : (
                <div className="space-y-2">
                  {userBadges.map((userBadge) => (
                    <div
                      key={userBadge.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{userBadge.badges?.icon}</span>
                        <div>
                          <p className="font-medium">{userBadge.badges?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {userBadge.badges?.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Otrzymano: {new Date(userBadge.earned_at).toLocaleDateString("pl-PL")}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBadge(userBadge.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold mb-3">Dostępne odznaki</h3>
              <div className="grid grid-cols-2 gap-2">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{badge.icon}</span>
                      <p className="font-medium text-sm">{badge.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
