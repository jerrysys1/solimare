import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";
import { transferBoatNFT } from "@/lib/solana/transferBoatNFT";
import { getExplorerLink } from "@/lib/solana/explorerLink";
import { supabase } from "@/integrations/supabase/client";

interface TransferNFTDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boat: {
    id?: string;
    name: string;
    boatType: string;
    mintAddress?: string;
  };
  onTransferComplete?: () => void;
}

export const TransferNFTDialog = ({ open, onOpenChange, boat, onTransferComplete }: TransferNFTDialogProps) => {
  const { publicKey } = useWallet();
  const wallet = useWallet() as unknown as AnchorWallet;
  const { connection } = useConnection();
  const { toast } = useToast();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const handleTransfer = async () => {
    if (!publicKey || !wallet.signTransaction || !boat.mintAddress) {
      toast({
        title: "Error",
        description: "Wallet not connected or mint address missing",
        variant: "destructive",
      });
      return;
    }

    // Validate recipient address
    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(recipientAddress);
      
      // Check if recipient is not the same as sender
      if (recipientPubkey.equals(publicKey)) {
        toast({
          title: "Error",
          description: "Cannot transfer to yourself",
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid recipient address",
        variant: "destructive",
      });
      return;
    }

    setIsTransferring(true);
    try {
      // Transfer the NFT on-chain
      const result = await transferBoatNFT({
        mintAddress: boat.mintAddress,
        recipientAddress: recipientAddress,
        connection,
        wallet,
      });

      // Update database with new owner
      if (boat.id) {
        const { error: updateError } = await supabase
          .from('boats')
          .update({ 
            wallet_address: recipientAddress,
            updated_at: new Date().toISOString()
          })
          .eq('id', boat.id);

        if (updateError) {
          console.error('Error updating database:', updateError);
          toast({
            title: "Warning",
            description: "NFT transferred on-chain but database update failed. Please refresh.",
            variant: "default",
          });
        }
      }

      toast({
        title: "Success! 🎉",
        description: (
          <div className="space-y-1">
            <p>Successfully transferred {boat.name}!</p>
            <a 
              href={getExplorerLink(result.signature, 'tx')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline hover:text-primary"
            >
              View transaction on Solana Explorer →
            </a>
          </div>
        ),
      });
      
      onOpenChange(false);
      setRecipientAddress("");
      
      // Call the callback to refresh the gallery
      if (onTransferComplete) {
        onTransferComplete();
      }
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to transfer NFT",
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-sm border-white/10 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground">Transfer NFT Ownership</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Transfer "{boat.name}" ({boat.boatType}) to a new owner
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="recipient" className="text-foreground">Recipient Wallet Address</Label>
            <Input
              id="recipient"
              placeholder="Enter Solana wallet address"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              className="bg-white/5 border-white/20 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Transfer Details</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Boat: {boat.name}</p>
              <p>Type: {boat.boatType}</p>
              {boat.mintAddress && (
                <p className="truncate">Mint: {boat.mintAddress}</p>
              )}
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <p className="text-xs text-primary">
              💰 A 5% transfer fee is applied by the smart contract
            </p>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-xs text-destructive">
              ⚠️ Warning: This action cannot be undone. Make sure you trust the recipient address.
            </p>
          </div>

          <div className="flex gap-3 pt-2 px-4 pb-4">
            <Button
              variant="outline"
              className="flex-1 bg-white/5 border-white/20 text-foreground hover:bg-white/10"
              onClick={() => onOpenChange(false)}
              disabled={isTransferring}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleTransfer}
              disabled={!recipientAddress || isTransferring}
            >
              {isTransferring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Transfer Ownership
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
