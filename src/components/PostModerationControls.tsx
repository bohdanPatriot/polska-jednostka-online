import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PostModerationControlsProps {
  postId: string;
  authorId: string;
  onDelete: () => void;
}

export const PostModerationControls = ({ 
  postId, 
  authorId,
  onDelete 
}: PostModerationControlsProps) => {
  const { toast } = useToast();
  const [isModerator, setIsModerator] = useState(false);
  const [isOwnPost, setIsOwnPost] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setIsOwnPost(session.user.id === authorId);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const hasModAccess = roles?.some(r => r.role === "admin" || r.role === "moderator");
    setIsModerator(hasModAccess || false);
  };

  const handleDelete = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("forum_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć posta",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sukces",
        description: "Post został usunięty",
      });
      onDelete();
    }
    setLoading(false);
  };

  if (!isModerator && !isOwnPost) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={loading}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Czy na pewno?</AlertDialogTitle>
          <AlertDialogDescription>
            Ta akcja jest nieodwracalna. Post zostanie trwale usunięty.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Usuń</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
