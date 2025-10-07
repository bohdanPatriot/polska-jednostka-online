import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ArrowLeft, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const hasAdminRole = roles?.some(r => r.role === "admin");
    
    if (!hasAdminRole) {
      toast({
        title: "Brak dostępu",
        description: "Nie masz uprawnień administratora",
        variant: "destructive",
      });
      navigate("/forum");
      return;
    }

    setIsAdmin(true);
    fetchUsers();
  };

  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("joined_at", { ascending: false });

    if (profiles) {
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id);
          
          return {
            ...profile,
            roles: roles?.map(r => r.role) || [],
          };
        })
      );
      setUsers(usersWithRoles);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Remove existing role
    const oldRole = user.roles[0] || "user";
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", oldRole);

    // Add new role
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: newRole });

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić roli",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sukces",
        description: "Rola została zmieniona",
      });
      fetchUsers();
    }
  };

  const getRankDisplay = (rank: string) => {
    const rankMap: { [key: string]: string } = {
      rekrut: "Rekrut",
      starszy_szeregowy: "Starszy Szeregowy",
      kapral: "Kapral",
      plutonowy: "Plutonowy",
      sierzant: "Sierżant",
      starszy_sierzant: "Starszy Sierżant",
      mlodszy_chorazy: "Młodszy Chorąży",
      chorazy: "Chorąży",
      starszy_chorazy: "Starszy Chorąży",
      podporucznik: "Podporucznik",
      porucznik: "Porucznik",
      kapitan: "Kapitan",
      major: "Major",
      podpulkownik: "Podpułkownik",
      pulkownik: "Pułkownik",
      general: "Generał",
    };
    return rankMap[rank] || rank;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold font-military">Panel Administracyjny</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/forum")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do forum
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-military">Zarządzanie Użytkownikami</CardTitle>
            <CardDescription>Przypisuj role użytkownikom forum</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Użytkownik</TableHead>
                  <TableHead>Stopień</TableHead>
                  <TableHead>Posty</TableHead>
                  <TableHead>Dołączył</TableHead>
                  <TableHead>Rola</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        {user.username}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getRankDisplay(user.rank)}</Badge>
                    </TableCell>
                    <TableCell>{user.posts_count}</TableCell>
                    <TableCell>
                      {new Date(user.joined_at).toLocaleDateString("pl-PL")}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.roles[0] || "user"}
                        onValueChange={(value) => handleRoleChange(user.id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Użytkownik</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
