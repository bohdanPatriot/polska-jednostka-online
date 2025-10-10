import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { format } from "date-fns";

interface UserSession {
  id: string;
  user_id: string;
  ip_address: string;
  city: string | null;
  region: string | null;
  country: string | null;
  created_at: string;
  username?: string;
}

export function UserSessionTracker() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("user_sessions")
        .select(`
          *,
          profiles!user_sessions_user_id_fkey(username)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedSessions = data.map((session: any) => ({
        ...session,
        username: session.profiles?.username || "Unknown",
      }));

      setSessions(formattedSessions);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Loading sessions...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent User Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Login Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No sessions found
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.username}</TableCell>
                  <TableCell className="font-mono text-sm">{session.ip_address}</TableCell>
                  <TableCell>
                    {session.city || session.region || session.country ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {[session.city, session.region, session.country]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(session.created_at), "PPp")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
