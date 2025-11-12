import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { checkRateLimit, formatResetTime } from "@/lib/rateLimit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, UserPlus } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { z } from "zod";
import { MediaUpload } from "@/components/posts/MediaUpload";

const messageSchema = z.object({
  content: z.string().trim().min(1).max(2000, "Wiadomość nie może być dłuższa niż 2000 znaków")
});

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: { username: string; avatar_url?: string };
  recipient?: { username: string; avatar_url?: string };
}

export function DirectMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [recipientUsername, setRecipientUsername] = useState("");
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<Array<{ url: string; type: string }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    
    const channel = supabase
      .channel("direct_messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
        },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("direct_messages")
      .select(`
        *,
        sender:sender_id(username, avatar_url),
        recipient:recipient_id(username, avatar_url)
      `)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (data) {
      setMessages(data as any);
    }
  };

  const sendMessage = async () => {
    try {
      const validated = messageSchema.parse({ content: newMessage });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedChat) return;

      // SECURITY: Rate limiting - max 20 messages per minute
      const rateLimit = checkRateLimit({
        identifier: `message:${user.id}`,
        maxRequests: 20,
        windowMs: 60 * 1000, // 1 minute
      });

      if (!rateLimit.allowed) {
        toast({
          title: "Zbyt wiele wiadomości",
          description: `Poczekaj ${formatResetTime(rateLimit.resetAt!)} przed wysłaniem kolejnej wiadomości.`,
          variant: "destructive",
        });
        return;
      }

      const mediaUrls = uploadedMedia.length > 0 
        ? uploadedMedia.map(m => `[${m.type}](${m.url})`).join('\n')
        : '';
      
      const messageContent = mediaUrls 
        ? `${validated.content}\n\n${mediaUrls}`
        : validated.content;

      const { error } = await supabase.from("direct_messages").insert({
        sender_id: user.id,
        recipient_id: selectedChat,
        content: messageContent,
      });

      if (error) throw error;

      setNewMessage("");
      setUploadedMedia([]);
      fetchMessages();
      toast({ title: "Wiadomość wysłana" });
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startNewChat = async () => {
    try {
      const { data: recipient } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", recipientUsername)
        .single();

      if (!recipient) {
        toast({
          title: "Błąd",
          description: "Nie znaleziono użytkownika",
          variant: "destructive",
        });
        return;
      }

      setSelectedChat(recipient.id);
      setIsNewChatOpen(false);
      setRecipientUsername("");
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const uniqueChats = Array.from(
    new Set(
      messages.map((m) => 
        m.sender_id === selectedChat || m.recipient_id === selectedChat
          ? m.sender_id !== selectedChat ? m.sender_id : m.recipient_id
          : null
      ).filter(Boolean)
    )
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      <Card className="md:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Wiadomości</CardTitle>
            <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nowa wiadomość</DialogTitle>
                  <DialogDescription>
                    Wpisz nazwę użytkownika, do którego chcesz wysłać wiadomość
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Nazwa użytkownika"
                    value={recipientUsername}
                    onChange={(e) => setRecipientUsername(e.target.value)}
                  />
                  <Button onClick={startNewChat}>Rozpocznij czat</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {uniqueChats.map((chatId) => {
              const chatMessages = messages.filter(
                (m) => m.sender_id === chatId || m.recipient_id === chatId
              );
              const lastMessage = chatMessages[0];
              const otherUser =
                lastMessage?.sender_id === chatId
                  ? lastMessage.sender
                  : lastMessage?.recipient;

              return (
                <Button
                  key={chatId}
                  variant={selectedChat === chatId ? "secondary" : "ghost"}
                  className="w-full justify-start mb-2"
                  onClick={() => setSelectedChat(chatId as string)}
                >
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage src={otherUser?.avatar_url} />
                    <AvatarFallback>
                      {otherUser?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{otherUser?.username}</span>
                </Button>
              );
            })}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>
            {selectedChat ? "Czat" : "Wybierz rozmowę"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedChat ? (
            <div className="space-y-4">
              <ScrollArea className="h-[400px] border rounded-md p-4">
                {messages
                  .filter(
                    (m) =>
                      (m.sender_id === selectedChat ||
                        m.recipient_id === selectedChat)
                  )
                  .reverse()
                  .map((message) => (
                    <div
                      key={message.id}
                      className={`mb-4 ${
                        message.sender_id === selectedChat
                          ? "text-left"
                          : "text-right"
                      }`}
                    >
                      <div
                        className={`inline-block p-3 rounded-lg max-w-[70%] ${
                          message.sender_id === selectedChat
                            ? "bg-muted"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {format(new Date(message.created_at), "PPp")}
                        </p>
                      </div>
                    </div>
                  ))}
              </ScrollArea>

              <div className="space-y-2">
                <Textarea
                  placeholder="Napisz wiadomość..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={2}
                />
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <MediaUpload 
                      onUploadComplete={(url, type) => {
                        setUploadedMedia([...uploadedMedia, { url, type }]);
                        toast({ title: "Media dodane", description: "Kliknij wyślij aby wysłać wiadomość" });
                      }}
                    />
                  </div>
                  <Button onClick={sendMessage} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Wybierz rozmowę lub rozpocznij nową
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
