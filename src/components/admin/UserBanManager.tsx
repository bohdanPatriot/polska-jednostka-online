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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ban, Trash2 } from "lucide-react";

interface UserBanManagerProps {
  userId: string;
  username: string;
  onBanComplete?: () => void;
}

export function UserBanManager({ userId, username, onBanComplete }: UserBanManagerProps) {
  const [open, setOpen] = useState(false);
  const [banType, setBanType] = useState<"temporary" | "permanent" | "soft_delete">("temporary");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("7");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleBan = async () => {
    if (!reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for the ban",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let endDate = null;
      if (banType === "temporary") {
        const durationDays = parseInt(duration);
        endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);
      }

      const { error: banError } = await supabase.from("user_bans").insert({
        user_id: userId,
        banned_by: user.id,
        ban_type: banType,
        reason: reason,
        end_date: endDate?.toISOString(),
        is_active: true,
      });

      if (banError) throw banError;

      // Log the admin action
      await supabase.rpc("log_admin_action", {
        p_admin_id: user.id,
        p_action_type: "user_ban",
        p_target_type: "user",
        p_target_id: userId,
        p_new_value: { ban_type: banType, duration: duration, end_date: endDate },
        p_reason: reason,
      });

      toast({
        title: "Success",
        description: `User ${username} has been ${banType === "soft_delete" ? "soft deleted" : "banned"}`,
      });

      setOpen(false);
      setReason("");
      setBanType("temporary");
      setDuration("7");
      onBanComplete?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete user ${username}? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Log the admin action before deletion
      await supabase.rpc("log_admin_action", {
        p_admin_id: user.id,
        p_action_type: "user_delete",
        p_target_type: "user",
        p_target_id: userId,
        p_reason: "Permanent deletion",
      });

      // Delete user's posts
      const { error: postsError } = await supabase
        .from("forum_posts")
        .delete()
        .eq("author_id", userId);

      if (postsError) throw postsError;

      // Delete user's threads
      const { error: threadsError } = await supabase
        .from("forum_threads")
        .delete()
        .eq("author_id", userId);

      if (threadsError) throw threadsError;

      // Delete profile (cascades to auth.users)
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: `User ${username} has been permanently deleted`,
      });

      setOpen(false);
      onBanComplete?.();
    } catch (error: any) {
      toast({
        title: "Error",
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
        <Button variant="destructive" size="sm">
          <Ban className="h-4 w-4 mr-1" />
          Ban/Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban or Delete User: {username}</DialogTitle>
          <DialogDescription>
            Choose the type of action to take against this user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ban-type">Action Type</Label>
            <Select value={banType} onValueChange={(value: any) => setBanType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="temporary">Temporary Ban</SelectItem>
                <SelectItem value="permanent">Permanent Ban</SelectItem>
                <SelectItem value="soft_delete">Soft Delete (Hide)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {banType === "temporary" && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              placeholder="Provide a detailed reason for this action..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Permanent Delete
          </Button>
          <Button onClick={handleBan} disabled={loading} className="w-full sm:w-auto">
            <Ban className="h-4 w-4 mr-2" />
            Apply {banType === "soft_delete" ? "Soft Delete" : "Ban"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
