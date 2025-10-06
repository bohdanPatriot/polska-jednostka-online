import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield, Users, MessageSquare, Archive } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/forum");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div 
        className="h-96 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${heroBanner})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        <div className="relative h-full flex flex-col items-center justify-center container mx-auto px-4">
          <Shield className="h-20 w-20 mb-6 text-primary drop-shadow-lg" />
          <h1 className="text-5xl md:text-6xl font-bold font-military text-center mb-4 text-foreground drop-shadow-lg">
            Forum Wojskowe
          </h1>
          <p className="text-xl text-muted-foreground text-center mb-8 max-w-2xl drop-shadow">
            Polska społeczność militarna poświęcona historii, taktyce i nowoczesnej obronie
          </p>
          <div className="flex gap-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="font-military">
              Dołącz do jednostki
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="font-military">
              Zaloguj się
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold font-military mb-2">Społeczność</h3>
            <p className="text-muted-foreground">
              Dołącz do entuzjastów, weteranów i kolekcjonerów polskich sił zbrojnych
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold font-military mb-2">Dyskusje</h3>
            <p className="text-muted-foreground">
              Rozmawiaj o historii, sprzęcie, taktyce i aktualnych wydarzeniach wojskowych
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Archive className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold font-military mb-2">Archiwum</h3>
            <p className="text-muted-foreground">
              Dostęp do dokumentów, zdjęć i map wojskowych w naszym cyfrowym archiwum
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold font-military mb-4">Kategorie Forum</h2>
          <div className="grid md:grid-cols-5 gap-4 mb-8">
            {["Historia", "Sprzęt", "Taktyka", "Aktualności", "Off-topic"].map((cat) => (
              <div key={cat} className="p-4 bg-muted rounded-lg">
                <p className="font-military font-semibold">{cat}</p>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mb-6">
            Dołącz do nas i weź udział w dyskusjach z prawdziwymi pasjonatami militariów
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="font-military">
            Rozpocznij teraz
          </Button>
        </div>
      </div>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="font-military">© 2025 Forum Wojskowe - Polska Społeczność Militarna</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
