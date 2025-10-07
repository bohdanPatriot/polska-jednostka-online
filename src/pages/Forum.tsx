import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, MessageSquare, FileText, Newspaper, MessageCircle, LogOut, User as UserIcon, Settings } from "lucide-react";

const categories = [
  { id: "historia", name: "Historia", icon: FileText, description: "Dyskusje o historii polskiego wojska" },
  { id: "sprzet", name: "Sprzęt", icon: Shield, description: "Uzbrojenie, pojazdy i wyposażenie" },
  { id: "taktyka", name: "Taktyka", icon: MessageSquare, description: "Strategia i taktyka wojskowa" },
  { id: "aktualnosci", name: "Aktualności", icon: Newspaper, description: "Bieżące wydarzenia wojskowe" },
  { id: "offtopic", name: "Off-topic", icon: MessageCircle, description: "Rozmowy pozawojskowe" },
];

const Forum = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (data) {
      setProfile(data);
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    setIsAdmin(roles?.some(r => r.role === "admin") || false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold font-military">Forum Wojskowe</h1>
          </div>
          <div className="flex items-center gap-4">
            {profile && (
              <div className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{profile.username}</span>
                <Badge variant="outline">{getRankDisplay(profile.rank)}</Badge>
              </div>
            )}
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                <Settings className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Wyloguj
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold font-military mb-2">Kategorie Forum</h2>
          <p className="text-muted-foreground">Wybierz kategorię aby rozpocząć dyskusję</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Card 
                key={category.id}
                className="hover:border-primary transition-colors cursor-pointer"
                onClick={() => navigate(`/category/${category.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="font-military">{category.name}</CardTitle>
                  </div>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>0 wątków</span>
                    <span>0 postów</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Forum;
