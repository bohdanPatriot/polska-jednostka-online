import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Pin, Lock, Unlock, Trash2, PinOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ModerationControlsProps {
  threadId: string;
  isPinned: boolean;
  isLocked: boolean;
  onUpdate: () => void;
}

export const ModerationControls = ({ 
  threadId, 
  isPinned, 
  isLocked, 
  onUpdate 
}: ModerationControlsProps) => {
  const { toast } = useToast();
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkModeratorAccess();
  }, []);

  const checkModeratorAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const hasModAccess = roles?.some(r => r.role === "admin" || r.role === "moderator");
    setIsModerator(hasModAccess || false);
  };

  const handleTogglePin = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("forum_threads")
      .update({ is_pinned: !isPinned })
      .eq("id", threadId);

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić statusu przypięcia",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sukces",
        description: isPinned ? "Wątek odpięty" : "Wątek przypięty",
      });
      onUpdate();
    }
    setLoading(false);
  };

  const handleToggleLock = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("forum_threads")
      .update({ is_locked: !isLocked })
      .eq("id", threadId);

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić statusu blokady",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sukces",
        description: isLocked ? "Wątek odblokowany" : "Wątek zablokowany",
      });
      onUpdate();
    }
    setLoading(false);
  };

  if (!isModerator) return null;

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleTogglePin}
        disabled={loading}
      >
        {isPinned ? (
          <>
            <PinOff className="h-4 w-4 mr-2" />
            Odepnij
          </>
        ) : (
          <>
            <Pin className="h-4 w-4 mr-2" />
            Przypnij
          </>
        )}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggleLock}
        disabled={loading}
      >
        {isLocked ? (
          <>
            <Unlock className="h-4 w-4 mr-2" />
            Odblokuj
          </>
        ) : (
          <>
            <Lock className="h-4 w-4 mr-2" />
            Zablokuj
          </>
        )}
      </Button>
    </div>
  );
};
