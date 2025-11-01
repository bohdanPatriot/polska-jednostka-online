import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, XCircle } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  is_verified: boolean;
}

export function UserVerificationManager() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, is_verified")
      .order("username", { ascending: true });

    if (!error && data) {
      setProfiles(data as any);
    }
  };

  const toggleVerification = async (userId: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_verified: !currentStatus } as any)
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: `Status weryfikacji został ${!currentStatus ? "nadany" : "usunięty"}`,
      });

      fetchProfiles();
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
        <CardTitle>Zarządzanie weryfikacją użytkowników</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Użytkownik</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback>
                        {profile.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{profile.username}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {profile.is_verified ? (
                    <Badge variant="default">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Zweryfikowany
                    </Badge>
                  ) : (
                    <Badge variant="outline">Niezweryfikowany</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant={profile.is_verified ? "destructive" : "default"}
                    onClick={() => toggleVerification(profile.id, profile.is_verified)}
                    disabled={loading}
                  >
                    {profile.is_verified ? (
                      <>
                        <XCircle className="h-4 w-4 mr-1" />
                        Usuń weryfikację
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Zweryfikuj
                      </>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
