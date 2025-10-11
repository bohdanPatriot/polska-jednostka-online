import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProfileEditor } from "@/components/profile/ProfileEditor";

const Profile = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold font-military">Profil</h1>
          <Button variant="outline" size="sm" onClick={() => navigate("/forum")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <ProfileEditor />
      </main>
    </div>
  );
};

export default Profile;