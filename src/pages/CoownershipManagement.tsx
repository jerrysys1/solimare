import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ProposalDialog } from '@/components/ProposalDialog';
import { VotingInterface } from '@/components/VotingInterface';
import { ArrowLeft, Users, Anchor } from 'lucide-react';

export default function CoownershipManagement() {
  const { vaultId } = useParams<{ vaultId: string }>();

  const { data: vault } = useQuery({
    queryKey: ['vault', vaultId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boat_coownership_vaults')
        .select('*, boats(*)')
        .eq('id', vaultId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: shares } = useQuery({
    queryKey: ['shares', vaultId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coownership_shares')
        .select('*')
        .eq('vault_id', vaultId)
        .order('share_percentage', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: proposals } = useQuery({
    queryKey: ['proposals', vaultId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coownership_proposals')
        .select('*')
        .eq('vault_id', vaultId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!vault || !shares) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  const activeProposals = proposals?.filter(p => p.status === 'pending') || [];
  const historyProposals = proposals?.filter(p => p.status !== 'pending') || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Link to="/gallery">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Anchor className="h-8 w-8" />
              {vault.boats?.name || 'Boat'} - Co-ownership
            </h1>
            <p className="text-muted-foreground">
              Manage fractional ownership and vote on proposals
            </p>
          </div>
          <ProposalDialog
            vaultId={vaultId!}
            vaultPda={vault.vault_pda}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Voting Threshold</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{vault.voting_threshold}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Co-owners</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{shares.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Proposals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{activeProposals.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Ownership Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {shares.map((share, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs">
                      {share.wallet_address.slice(0, 8)}...{share.wallet_address.slice(-8)}
                    </span>
                    <span className="font-semibold">{share.share_percentage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${share.share_percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {activeProposals.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Active Proposals</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {activeProposals.map(proposal => (
                <VotingInterface
                  key={proposal.id}
                  proposalId={proposal.id}
                  vaultId={vaultId!}
                />
              ))}
            </div>
          </div>
        )}

        {historyProposals.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Proposal History</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {historyProposals.map(proposal => (
                  <VotingInterface
                    key={proposal.id}
                    proposalId={proposal.id}
                    vaultId={vaultId!}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
