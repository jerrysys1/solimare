import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { createCoownership, CoownershipShare } from '@/lib/solana/coownership';
import { Users, Plus, Trash2 } from 'lucide-react';
import { getExplorerLink } from '@/lib/solana/explorerLink';

interface CreateCoownershipDialogProps {
  boatId: string;
  mintAddress: string;
  onSuccess?: () => void;
}

export function CreateCoownershipDialog({ boatId, mintAddress, onSuccess }: CreateCoownershipDialogProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [votingThreshold, setVotingThreshold] = useState([51]);
  const [coowners, setCoowners] = useState<CoownershipShare[]>([
    { wallet_address: '', share_percentage: 0 },
  ]);

  const addCoowner = () => {
    setCoowners([...coowners, { wallet_address: '', share_percentage: 0 }]);
  };

  const removeCoowner = (index: number) => {
    setCoowners(coowners.filter((_, i) => i !== index));
  };

  const updateCoowner = (index: number, field: keyof CoownershipShare, value: string | number) => {
    const updated = [...coowners];
    updated[index] = { ...updated[index], [field]: value };
    setCoowners(updated);
  };

  const totalShares = coowners.reduce((sum, owner) => sum + (owner.share_percentage || 0), 0);
  const isValid = totalShares === 100 && coowners.every(owner => owner.wallet_address && owner.share_percentage > 0);

  const handleCreate = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to create co-ownership',
        variant: 'destructive',
      });
      return;
    }

    if (!isValid) {
      toast({
        title: 'Invalid shares',
        description: 'Total shares must equal 100% and all fields must be filled',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await createCoownership({
        connection,
        wallet: wallet as any,
        boatId,
        mintAddress,
        ownershipShares: coowners,
        votingThreshold: votingThreshold[0],
      });

      toast({
        title: 'Co-ownership created',
        description: (
          <div className="space-y-1">
            <p>Vault PDA: {result.vaultPda.slice(0, 8)}...{result.vaultPda.slice(-8)}</p>
            <a 
              href={getExplorerLink(result.signature, 'tx')} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline block"
            >
              View on Explorer →
            </a>
          </div>
        ),
      });

      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to create co-ownership:', error);
      toast({
        title: 'Failed to create co-ownership',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="h-4 w-4" />
          Create Co-ownership
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Fractional Ownership</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Voting Threshold: {votingThreshold[0]}%</Label>
            <Slider
              value={votingThreshold}
              onValueChange={setVotingThreshold}
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Minimum percentage of votes needed to approve proposals
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Co-owners ({coowners.length})</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCoowner}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Co-owner
              </Button>
            </div>

            {coowners.map((owner, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Wallet Address</Label>
                  <Input
                    value={owner.wallet_address}
                    onChange={(e) => updateCoowner(index, 'wallet_address', e.target.value)}
                    placeholder="Enter Solana wallet address"
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label>Share %</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={owner.share_percentage || ''}
                    onChange={(e) => updateCoowner(index, 'share_percentage', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                {coowners.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCoowner(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="font-medium">Total Shares:</span>
              <span className={`text-lg font-bold ${totalShares === 100 ? 'text-green-600' : 'text-destructive'}`}>
                {totalShares}%
              </span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!isValid || isLoading}>
              {isLoading ? 'Creating...' : 'Create Co-ownership'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
