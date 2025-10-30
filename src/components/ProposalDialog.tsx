import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createProposal } from '@/lib/solana/coownership';
import { FilePlus } from 'lucide-react';
import { getExplorerLink } from '@/lib/solana/explorerLink';

interface ProposalDialogProps {
  vaultId: string;
  vaultPda: string;
  onSuccess?: () => void;
}

type ProposalType = 'sale' | 'transfer' | 'maintenance' | 'update_metadata';

export function ProposalDialog({ vaultId, vaultPda, onSuccess }: ProposalDialogProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [proposalType, setProposalType] = useState<ProposalType>('sale');
  const [formData, setFormData] = useState<any>({});

  const handleCreate = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to create a proposal',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await createProposal({
        connection,
        wallet: wallet as any,
        vaultId,
        vaultPda,
        proposalType,
        proposalData: formData,
      });

      toast({
        title: 'Proposal created',
        description: (
          <div className="space-y-1">
            <p>Co-owners can now vote on this proposal</p>
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
      setFormData({});
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to create proposal:', error);
      toast({
        title: 'Failed to create proposal',
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
          <FilePlus className="h-4 w-4" />
          Create Proposal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Proposal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Proposal Type</Label>
            <Select value={proposalType} onValueChange={(value) => setProposalType(value as ProposalType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="transfer">Transfer Ownership</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="update_metadata">Update Metadata</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {proposalType === 'sale' && (
            <>
              <div className="space-y-2">
                <Label>Buyer Address</Label>
                <Input
                  value={formData.buyer || ''}
                  onChange={(e) => setFormData({ ...formData, buyer: e.target.value })}
                  placeholder="Enter buyer's wallet address"
                />
              </div>
              <div className="space-y-2">
                <Label>Price (SOL)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
            </>
          )}

          {proposalType === 'transfer' && (
            <>
              <div className="space-y-2">
                <Label>New Owner Address</Label>
                <Input
                  value={formData.new_owner || ''}
                  onChange={(e) => setFormData({ ...formData, new_owner: e.target.value })}
                  placeholder="Enter new owner's wallet address"
                />
              </div>
              <div className="space-y-2">
                <Label>Share Percentage to Transfer</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.share_amount || ''}
                  onChange={(e) => setFormData({ ...formData, share_amount: parseInt(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </>
          )}

          {proposalType === 'maintenance' && (
            <>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the maintenance work needed"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Estimated Cost (SOL)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost || ''}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
            </>
          )}

          {proposalType === 'update_metadata' && (
            <>
              <div className="space-y-2">
                <Label>Field to Update</Label>
                <Input
                  value={formData.field || ''}
                  onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                  placeholder="e.g., name, description"
                />
              </div>
              <div className="space-y-2">
                <Label>New Value</Label>
                <Input
                  value={formData.value || ''}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="Enter new value"
                />
              </div>
            </>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Proposal'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
