import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";
import { format } from "date-fns";

interface ThreadPollProps {
  threadId: string;
}

interface Poll {
  id: string;
  question: string;
  options: string[];
  expires_at: string | null;
}

interface VoteCounts {
  [optionIndex: number]: number;
}

export function ThreadPoll({ threadId }: ThreadPollProps) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({});
  const [userVote, setUserVote] = useState<number | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    fetchPoll();
  }, [threadId]);

  const fetchPoll = async () => {
    const { data: pollData } = await supabase
      .from("polls")
      .select("*")
      .eq("thread_id", threadId)
      .single();

    if (!pollData) return;

    const pollWithArrayOptions = {
      ...pollData,
      options: Array.isArray(pollData.options) ? pollData.options : [],
    };

    setPoll(pollWithArrayOptions as Poll);

    const { data: votes } = await supabase
      .from("poll_votes")
      .select("option_index, user_id")
      .eq("poll_id", pollData.id);

    if (votes) {
      const counts: VoteCounts = {};
      votes.forEach((vote) => {
        counts[vote.option_index] = (counts[vote.option_index] || 0) + 1;
      });
      setVoteCounts(counts);
      setTotalVotes(votes.length);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userVoteData = votes.find((v) => v.user_id === user.id);
        if (userVoteData) {
          setUserVote(userVoteData.option_index);
        }
      }
    }
  };

  const castVote = async (optionIndex: number) => {
    if (!poll) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("poll_votes").insert({
      poll_id: poll.id,
      user_id: user.id,
      option_index: optionIndex,
    });

    fetchPoll();
  };

  if (!poll) return null;

  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {poll.question}
        </CardTitle>
        {poll.expires_at && (
          <p className="text-sm text-muted-foreground">
            {isExpired ? "Zakończona" : `Do ${format(new Date(poll.expires_at), "PPp")}`}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {poll.options.map((option, index) => {
          const votes = voteCounts[index] || 0;
          const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{option}</span>
                <span className="text-sm text-muted-foreground">
                  {votes} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="space-y-1">
                <Progress value={percentage} />
                {!isExpired && userVote === null && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => castVote(index)}
                    className="w-full"
                  >
                    Głosuj
                  </Button>
                )}
                {userVote === index && (
                  <Badge variant="default">Twój głos</Badge>
                )}
              </div>
            </div>
          );
        })}
        <p className="text-sm text-muted-foreground mt-4">
          Łącznie głosów: {totalVotes}
        </p>
      </CardContent>
    </Card>
  );
}