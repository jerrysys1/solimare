import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, Loader2, User } from 'lucide-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfileDisplay } from '@/hooks/useProfileDisplay';

interface Message {
  id: string;
  sender_wallet_address: string;
  message: string;
  created_at: string;
}

interface TripChatDialogProps {
  tripId: string;
  tripTitle: string;
}

export const TripChatDialog = ({ tripId, tripTitle }: TripChatDialogProps) => {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const { isAuthenticated, authenticate } = useWalletAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Verify wallet signature on dialog open
  const verifyWalletSignature = async () => {
    if (!publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to access chat",
        variant: "destructive"
      });
      return false;
    }

    setIsVerifying(true);
    try {
      // Use the authentication hook instead of manual signature verification
      if (!isAuthenticated) {
        const authenticated = await authenticate();
        if (!authenticated) {
          return false;
        }
      }

      setIsVerified(true);
      toast({
        title: "Wallet verified",
        description: "You can now send messages",
      });
      return true;
    } catch (error) {
      console.error('Authentication error:', error);
      toast({
        title: "Verification failed",
        description: "Could not authenticate with wallet",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  // Fetch messages when dialog opens
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_messages')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error loading messages",
        description: "Could not load chat history",
        variant: "destructive"
      });
    }
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!isOpen || !isVerified) return;

    fetchMessages();

    const channel = supabase
      .channel(`trip_chat_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_messages',
          filter: `trip_id=eq.${tripId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, isVerified, tripId]);

  // Handle dialog open
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setIsVerified(false);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !publicKey || !isVerified) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('trip_messages')
        .insert({
          trip_id: tripId,
          sender_wallet_address: publicKey.toBase58(),
          message: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const MessageDisplay = ({ msg, isOwnMessage }: { msg: Message; isOwnMessage: boolean }) => {
    const { displayName, avatarUrl } = useProfileDisplay(msg.sender_wallet_address);

    return (
      <div className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
        {!isOwnMessage && (
          <Avatar className="h-8 w-8 mt-1">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              <User className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
        )}
        <div
          className={`max-w-[70%] rounded-lg px-4 py-2 ${
            isOwnMessage
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold ${isOwnMessage ? 'text-primary-foreground' : 'text-foreground'}`}>
              {isOwnMessage ? 'You' : displayName}
            </span>
            <span className="text-xs opacity-70">
              {formatTimestamp(msg.created_at)}
            </span>
          </div>
          <p className="text-sm break-words">{msg.message}</p>
        </div>
        {isOwnMessage && (
          <Avatar className="h-8 w-8 mt-1">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              <User className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-card-foreground">Trip Chat: {tripTitle}</DialogTitle>
        </DialogHeader>

        {isVerifying ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Verifying wallet signature...</p>
            </div>
          </div>
        ) : !isVerified ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">Wallet verification required to access chat</p>
              <Button onClick={verifyWalletSignature} className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Verify Wallet
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwnMessage = publicKey?.toBase58() === msg.sender_wallet_address;
                    return <MessageDisplay key={msg.id} msg={msg} isOwnMessage={isOwnMessage} />;
                  })
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-2 pt-4 border-t border-border">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isSending}
                maxLength={2000}
                className="bg-input border-border text-foreground"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
                size="icon"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
