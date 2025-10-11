import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";

export function BulkActions() {
  const [userIds, setUserIds] = useState("");
  const [action, setAction] = useState<"rank" | "ban">("rank");
  const [rankValue, setRankValue] = useState("szeregowy");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const executeBulkAction = async () => {
    setLoading(true);
    try {
      const ids = userIds.split("\n").map(id => id.trim()).filter(Boolean);
      
      if (action === "rank") {
        const { error } = await supabase
          .from("profiles")
          .update({ rank: rankValue as any })
          .in("id", ids);

        if (error) throw error;

        toast({
          title: "Sukces",
          description: `Zaktualizowano rangę dla ${ids.length} użytkowników`,
        });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const bans = ids.map(userId => ({
          user_id: userId,
          banned_by: user.id,
          ban_type: "permanent",
          reason: "Bulk ban",
          is_active: true
        }));

        const { error } = await supabase
          .from("user_bans")
          .insert(bans);

        if (error) throw error;

        toast({
          title: "Sukces",
          description: `Zbanowano ${ids.length} użytkowników`,
        });
      }

      setUserIds("");
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
        <CardTitle>Akcje grupowe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Typ akcji</label>
          <Select value={action} onValueChange={(v: any) => setAction(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rank">Zmiana rangi</SelectItem>
              <SelectItem value="ban">Ban użytkowników</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {action === "rank" && (
          <div>
            <label className="text-sm font-medium">Nowa ranga</label>
            <Select value={rankValue} onValueChange={setRankValue}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rekrut">Rekrut</SelectItem>
                <SelectItem value="szeregowy">Szeregowy</SelectItem>
                <SelectItem value="kapral">Kapral</SelectItem>
                <SelectItem value="sierżant">Sierżant</SelectItem>
                <SelectItem value="podporucznik">Podporucznik</SelectItem>
                <SelectItem value="porucznik">Porucznik</SelectItem>
                <SelectItem value="kapitan">Kapitan</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="pułkownik">Pułkownik</SelectItem>
                <SelectItem value="general">Generał</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <label className="text-sm font-medium">ID użytkowników (jeden na linię)</label>
          <Textarea
            placeholder="UUID1&#10;UUID2&#10;UUID3"
            value={userIds}
            onChange={(e) => setUserIds(e.target.value)}
            rows={6}
          />
        </div>

        <Button onClick={executeBulkAction} disabled={loading || !userIds.trim()}>
          <Users className="h-4 w-4 mr-2" />
          Wykonaj akcję
        </Button>
      </CardContent>
    </Card>
  );
}