import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Shield, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PostReactionsProps {
  postId: string;
}

const reactionTypes = [
  { type: "like", icon: ThumbsUp, label: "Lubię" },
  { type: "dislike", icon: ThumbsDown, label: "Nie lubię" },
  { type: "salute", icon: Shield, label: "Salut" },
  { type: "agree", icon: Check, label: "Zgadzam się" },
  { type: "disagree", icon: X, label: "Nie zgadzam się" },
];

export function PostReactions({ postId }: PostReactionsProps) {
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchReactions();
  }, [postId]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from("post_reactions")
      .select("reaction_type, user_id")
      .eq("post_id", postId);

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((r) => {
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
      });
      setReactions(counts);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userR = data.find((r) => r.user_id === user.id);
        setUserReaction(userR?.reaction_type || null);
      }
    }
  };

  const toggleReaction = async (reactionType: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Błąd",
        description: "Musisz być zalogowany",
        variant: "destructive",
      });
      return;
    }

    if (userReaction === reactionType) {
      await supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .eq("reaction_type", reactionType);
    } else {
      if (userReaction) {
        await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      }
      
      await supabase.from("post_reactions").insert({
        post_id: postId,
        user_id: user.id,
        reaction_type: reactionType,
      });
    }

    fetchReactions();
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {reactionTypes.map(({ type, icon: Icon, label }) => (
        <Button
          key={type}
          variant={userReaction === type ? "default" : "outline"}
          size="sm"
          onClick={() => toggleReaction(type)}
          className="gap-1"
        >
          <Icon className="h-4 w-4" />
          {reactions[type] || 0}
        </Button>
      ))}
    </div>
  );
}