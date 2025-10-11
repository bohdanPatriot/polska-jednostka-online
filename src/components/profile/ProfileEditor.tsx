import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User } from "lucide-react";

export function ProfileEditor() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("display_name, bio, signature")
      .eq("id", user.id)
      .single();

    if (data) {
      setDisplayName(data.display_name || "");
      setBio(data.bio || "");
      setSignature(data.signature || "");
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          bio,
          signature,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Profil zaktualizowany",
      });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Edytuj profil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Wyświetlana nazwa</label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Twoja wyświetlana nazwa"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Bio</label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Opowiedz coś o sobie..."
            rows={4}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Sygnatura</label>
          <Textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Sygnatura wyświetlana pod postami"
            rows={2}
          />
        </div>

        <Button onClick={saveProfile} disabled={loading}>
          Zapisz zmiany
        </Button>
      </CardContent>
    </Card>
  );
}