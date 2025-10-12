import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User, Upload, Image as ImageIcon } from "lucide-react";
import { Label } from "@/components/ui/label";

export function ProfileEditor() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [signature, setSignature] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [signatureImageUrl, setSignatureImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("display_name, bio, signature, avatar_url, signature_image_url")
      .eq("id", user.id)
      .single();

    if (data) {
      setDisplayName(data.display_name || "");
      setBio(data.bio || "");
      setSignature(data.signature || "");
      setAvatarUrl(data.avatar_url || "");
      setSignatureImageUrl(data.signature_image_url || "");
    }
  };

  const uploadFile = async (file: File, bucket: string, folder: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${folder}/${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Błąd",
        description: "Proszę wybrać plik obrazu",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file, 'avatars', 'avatar');
      setAvatarUrl(url);
      toast({
        title: "Sukces",
        description: "Awatar został przesłany",
      });
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSignatureImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Błąd",
        description: "Proszę wybrać plik obrazu",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file, 'signature-images', 'signature');
      setSignatureImageUrl(url);
      toast({
        title: "Sukces",
        description: "Obrazek do sygnatury został przesłany",
      });
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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
          avatar_url: avatarUrl,
          signature_image_url: signatureImageUrl,
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
          <Label className="text-sm font-medium">Zdjęcie profilowe</Label>
          <div className="flex items-center gap-4 mt-2">
            {avatarUrl && (
              <img src={avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover" />
            )}
            <div className="flex-1">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {avatarUrl ? "Zmień awatar" : "Prześlij awatar"}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Wyświetlana nazwa</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Twoja wyświetlana nazwa"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Bio</Label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Opowiedz coś o sobie..."
            rows={4}
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Sygnatura (tekst)</Label>
          <Textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Sygnatura wyświetlana pod postami"
            rows={2}
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Obrazek do sygnatury</Label>
          <div className="flex items-center gap-4 mt-2">
            {signatureImageUrl && (
              <img src={signatureImageUrl} alt="Signature" className="max-h-16 object-contain" />
            )}
            <div className="flex-1">
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/*"
                onChange={handleSignatureImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => signatureInputRef.current?.click()}
                disabled={uploading}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                {signatureImageUrl ? "Zmień obrazek" : "Dodaj obrazek"}
              </Button>
            </div>
          </div>
        </div>

        <Button onClick={saveProfile} disabled={loading || uploading}>
          Zapisz zmiany
        </Button>
      </CardContent>
    </Card>
  );
}