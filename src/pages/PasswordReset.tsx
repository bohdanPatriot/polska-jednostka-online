import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowLeft } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";
import { z } from "zod";
import { useNavigate } from "react-router-dom";

const emailSchema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
});

const PasswordReset = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse({ email });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Błąd walidacji",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });

    if (error) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEmailSent(true);
      toast({
        title: "Email wysłany",
        description: "Sprawdź swoją skrzynkę email i kliknij w link resetujący hasło.",
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div 
        className="h-64 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${heroBanner})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 to-background" />
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl font-bold font-military text-foreground">Forum Wojskowe</h1>
            <p className="text-muted-foreground mt-2">Resetowanie Hasła</p>
          </div>
        </div>
      </div>

      <div className="container max-w-md mx-auto py-8 px-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/auth")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Powrót do logowania
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Zapomniałeś hasła?</CardTitle>
            <CardDescription>
              {emailSent 
                ? "Link resetujący został wysłany na Twój email"
                : "Wprowadź swój email, a wyślemy Ci link do resetowania hasła"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!emailSent ? (
              <form onSubmit={handleResetRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="twoj@email.pl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Wysyłanie..." : "Wyślij link resetujący"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Link resetujący hasło został wysłany na adres <strong>{email}</strong>.
                  Sprawdź swoją skrzynkę odbiorczą (oraz folder spam).
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                  }}
                >
                  Wyślij ponownie
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PasswordReset;
