import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { voteOnProposal, executeProposal } from '@/lib/solana/coownership';
import { ThumbsUp, ThumbsDown, CheckCircle, XCircle } from 'lucide-react';
import { getExplorerLink } from '@/lib/solana/explorerLink';

interface VotingInterfaceProps {
  proposalId: string;
  vaultId: string;
}

export function VotingInterface({ proposalId, vaultId }: VotingInterfaceProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { toast } = useToast();
  const [isVoting, setIsVoting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const { data: proposal, refetch: refetchProposal } = useQuery({
    queryKey: ['proposal', proposalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coownership_proposals')
        .select('*')
        .eq('id', proposalId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: votes, refetch: refetchVotes } = useQuery({
    queryKey: ['votes', proposalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coownership_votes')
        .select('*')
        .eq('proposal_id', proposalId);
      if (error) throw error;
      return data;
    },
  });

  const { data: userShare } = useQuery({
    queryKey: ['userShare', vaultId, wallet.publicKey?.toBase58()],
    queryFn: async () => {
      if (!wallet.publicKey) return null;
      const { data, error } = await supabase
        .from('coownership_shares')
        .select('*')
        .eq('vault_id', vaultId)
        .eq('wallet_address', wallet.publicKey.toBase58())
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!wallet.publicKey,
  });

  const { data: vault } = useQuery({
    queryKey: ['vault', vaultId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boat_coownership_vaults')
        .select('*')
        .eq('id', vaultId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('proposal-votes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coownership_votes',
          filter: `proposal_id=eq.${proposalId}`,
        },
        () => {
          refetchVotes();
          refetchProposal();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [proposalId, refetchVotes, refetchProposal]);

  if (!proposal || !votes || !vault) return null;

  const yesVotes = votes.filter(v => v.vote === true).reduce((sum, v) => sum + v.share_percentage, 0);
  const noVotes = votes.filter(v => v.vote === false).reduce((sum, v) => sum + v.share_percentage, 0);
  const hasVoted = votes.some(v => v.voter_wallet === wallet.publicKey?.toBase58());
  const thresholdMet = yesVotes >= vault.voting_threshold;

  const handleVote = async (vote: boolean) => {
    if (!wallet.publicKey || !wallet.signTransaction || !userShare) {
      toast({
        title: 'Cannot vote',
        description: 'You must be a co-owner to vote',
        variant: 'destructive',
      });
      return;
    }

    setIsVoting(true);
    try {
      const result = await voteOnProposal({
        connection,
        wallet: wallet as any,
        proposalId,
        proposalPda: 'PROPOSAL_PDA', // Would be derived from vault
        vote,
        sharePercentage: userShare.share_percentage,
      });

      toast({
        title: 'Vote recorded',
        description: (
          <div className="space-y-1">
            <p>Your vote has been cast successfully</p>
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

      refetchVotes();
      refetchProposal();
    } catch (error: any) {
      console.error('Failed to vote:', error);
      toast({
        title: 'Failed to vote',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsVoting(false);
    }
  };

  const handleExecute = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) return;

    setIsExecuting(true);
    try {
      const result = await executeProposal(proposalId, connection, wallet as any);

      toast({
        title: 'Proposal executed',
        description: (
          <div className="space-y-1">
            <p>The proposal has been executed successfully</p>
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

      refetchProposal();
    } catch (error: any) {
      console.error('Failed to execute proposal:', error);
      toast({
        title: 'Failed to execute',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="capitalize">{proposal.proposal_type} Proposal</CardTitle>
            <Badge variant={
              proposal.status === 'approved' ? 'default' :
              proposal.status === 'rejected' ? 'destructive' :
              proposal.status === 'executed' ? 'secondary' :
              'outline'
            }>
              {proposal.status}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {new Date(proposal.created_at).toLocaleDateString()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-muted rounded-lg">
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(proposal.proposal_data, null, 2)}
          </pre>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Voting Progress</span>
            <span className="font-medium">{yesVotes}% / {vault.voting_threshold}%</span>
          </div>
          <Progress value={yesVotes} className="h-2" />
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">Yes:</span>
              <span className="font-semibold">{yesVotes}%</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-muted-foreground">No:</span>
              <span className="font-semibold">{noVotes}%</span>
            </div>
          </div>
        </div>

        {proposal.status === 'pending' && userShare && !hasVoted && (
          <div className="flex gap-2">
            <Button
              onClick={() => handleVote(true)}
              disabled={isVoting}
              className="flex-1 gap-2"
            >
              <ThumbsUp className="h-4 w-4" />
              Vote Yes
            </Button>
            <Button
              onClick={() => handleVote(false)}
              disabled={isVoting}
              variant="outline"
              className="flex-1 gap-2"
            >
              <ThumbsDown className="h-4 w-4" />
              Vote No
            </Button>
          </div>
        )}

        {proposal.status === 'approved' && userShare && (
          <Button
            onClick={handleExecute}
            disabled={isExecuting}
            className="w-full"
          >
            {isExecuting ? 'Executing...' : 'Execute Proposal'}
          </Button>
        )}

        {hasVoted && proposal.status === 'pending' && (
          <p className="text-sm text-center text-muted-foreground">
            You have already voted on this proposal
          </p>
        )}
      </CardContent>
    </Card>
  );
}
