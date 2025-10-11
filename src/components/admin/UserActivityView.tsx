import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { format } from "date-fns";

interface Activity {
  type: string;
  content: string;
  created_at: string;
  id: string;
}

export function UserActivityView() {
  const [username, setUsername] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const searchUserActivity = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .single();

      if (!profile) {
        setActivities([]);
        return;
      }

      const [threadsRes, postsRes] = await Promise.all([
        supabase
          .from("forum_threads")
          .select("id, title, created_at")
          .eq("author_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("forum_posts")
          .select("id, content, created_at")
          .eq("author_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(50)
      ]);

      const allActivities: Activity[] = [
        ...(threadsRes.data || []).map(t => ({
          type: "Wątek",
          content: t.title,
          created_at: t.created_at,
          id: t.id
        })),
        ...(postsRes.data || []).map(p => ({
          type: "Post",
          content: p.content.substring(0, 100) + "...",
          created_at: p.created_at,
          id: p.id
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivities(allActivities);
    } catch (error) {
      console.error("Error fetching user activity:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktywność użytkownika</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Nazwa użytkownika..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchUserActivity()}
          />
          <Button onClick={searchUserActivity} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            Szukaj
          </Button>
        </div>

        {activities.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Typ</TableHead>
                <TableHead>Treść</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-medium">{activity.type}</TableCell>
                  <TableCell>{activity.content}</TableCell>
                  <TableCell>{format(new Date(activity.created_at), "PPp")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {activities.length === 0 && !loading && username && (
          <p className="text-center text-muted-foreground py-8">Nie znaleziono aktywności</p>
        )}
      </CardContent>
    </Card>
  );
}