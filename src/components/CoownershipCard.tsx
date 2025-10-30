import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, FileText, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface CoownershipCardProps {
  vaultId: string;
  boatName: string;
}

export function CoownershipCard({ vaultId, boatName }: CoownershipCardProps) {
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
        .eq('status', 'pending');
      if (error) throw error;
      return data;
    },
  });

  if (!vault || !shares) return null;

  const activeProposals = proposals?.length || 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {boatName}
            </CardTitle>
            <Badge variant={vault.is_active ? 'default' : 'secondary'}>
              {vault.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {activeProposals > 0 && (
            <Badge variant="outline" className="gap-1">
              <FileText className="h-3 w-3" />
              {activeProposals} Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Voting Threshold</p>
            <p className="font-semibold">{vault.voting_threshold}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Co-owners</p>
            <p className="font-semibold">{shares.length}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Ownership Distribution</p>
          <div className="space-y-1">
            {shares.slice(0, 3).map((share, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all"
                    style={{ width: `${share.share_percentage}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {share.share_percentage}%
                </span>
              </div>
            ))}
            {shares.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{shares.length - 3} more co-owners
              </p>
            )}
          </div>
        </div>

        <Link to={`/coownership/${vaultId}`}>
          <Button className="w-full gap-2">
            <TrendingUp className="h-4 w-4" />
            Manage Co-ownership
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
