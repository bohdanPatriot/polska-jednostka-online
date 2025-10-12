import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flag } from "lucide-react";

interface ReportButtonProps {
  targetId: string;
  targetType: "thread" | "post" | "user";
  size?: "sm" | "default";
}

export function ReportButton({ targetId, targetType, size = "sm" }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleReport = async () => {
    if (!reason) {
      toast({
        title: "Błąd",
        description: "Wybierz powód zgłoszenia",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nie jesteś zalogowany");

      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        target_id: targetId,
        target_type: targetType,
        reason: reason,
        description: description,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Zgłoszenie zostało wysłane",
      });

      setOpen(false);
      setReason("");
      setDescription("");
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size={size}>
          <Flag className="h-4 w-4 mr-1" />
          Zgłoś
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zgłoś {targetType === "thread" ? "wątek" : targetType === "post" ? "post" : "użytkownika"}</DialogTitle>
          <DialogDescription>
            Opisz dlaczego zgłaszasz tę treść. Twoje zgłoszenie zostanie sprawdzone przez moderatorów.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Powód *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz powód" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="harassment">Nękanie</SelectItem>
                <SelectItem value="inappropriate">Nieodpowiednia treść</SelectItem>
                <SelectItem value="misinformation">Dezinformacja</SelectItem>
                <SelectItem value="other">Inne</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Szczegóły (opcjonalnie)</Label>
            <Textarea
              id="description"
              placeholder="Dodatkowe informacje..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleReport} disabled={loading}>
            Wyślij zgłoszenie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
