-- Create co-ownership vaults table
CREATE TABLE public.boat_coownership_vaults (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  boat_id UUID NOT NULL REFERENCES public.boats(id) ON DELETE CASCADE,
  mint_address VARCHAR NOT NULL,
  vault_pda VARCHAR NOT NULL,
  total_shares INTEGER NOT NULL DEFAULT 100,
  voting_threshold INTEGER NOT NULL DEFAULT 51,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(boat_id),
  UNIQUE(mint_address)
);

-- Create ownership shares table
CREATE TABLE public.coownership_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_id UUID NOT NULL REFERENCES public.boat_coownership_vaults(id) ON DELETE CASCADE,
  wallet_address VARCHAR NOT NULL,
  share_percentage INTEGER NOT NULL CHECK (share_percentage > 0 AND share_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vault_id, wallet_address)
);

-- Create proposals table
CREATE TABLE public.coownership_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_id UUID NOT NULL REFERENCES public.boat_coownership_vaults(id) ON DELETE CASCADE,
  proposal_type VARCHAR NOT NULL CHECK (proposal_type IN ('sale', 'transfer', 'maintenance', 'update_metadata')),
  proposal_data JSONB NOT NULL,
  proposer_wallet VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Create votes table
CREATE TABLE public.coownership_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.coownership_proposals(id) ON DELETE CASCADE,
  voter_wallet VARCHAR NOT NULL,
  vote BOOLEAN NOT NULL,
  share_percentage INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(proposal_id, voter_wallet)
);

-- Enable Row Level Security
ALTER TABLE public.boat_coownership_vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coownership_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coownership_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coownership_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for boat_coownership_vaults
CREATE POLICY "Anyone can view vaults"
ON public.boat_coownership_vaults
FOR SELECT
USING (true);

CREATE POLICY "Boat owners can create vaults"
ON public.boat_coownership_vaults
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.boats
    WHERE boats.id = boat_coownership_vaults.boat_id
    AND boats.wallet_address = (auth.jwt() -> 'app_metadata')::jsonb ->> 'wallet_address'
  )
);

CREATE POLICY "Vault creators can update vaults"
ON public.boat_coownership_vaults
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.boats
    WHERE boats.id = boat_coownership_vaults.boat_id
    AND boats.wallet_address = (auth.jwt() -> 'app_metadata')::jsonb ->> 'wallet_address'
  )
);

-- RLS Policies for coownership_shares
CREATE POLICY "Anyone can view shares"
ON public.coownership_shares
FOR SELECT
USING (true);

CREATE POLICY "Vault creators can insert shares"
ON public.coownership_shares
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.boat_coownership_vaults v
    JOIN public.boats b ON b.id = v.boat_id
    WHERE v.id = coownership_shares.vault_id
    AND b.wallet_address = (auth.jwt() -> 'app_metadata')::jsonb ->> 'wallet_address'
  )
);

-- RLS Policies for coownership_proposals
CREATE POLICY "Anyone can view proposals"
ON public.coownership_proposals
FOR SELECT
USING (true);

CREATE POLICY "Co-owners can create proposals"
ON public.coownership_proposals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.coownership_shares
    WHERE coownership_shares.vault_id = coownership_proposals.vault_id
    AND coownership_shares.wallet_address = (auth.jwt() -> 'app_metadata')::jsonb ->> 'wallet_address'
  )
);

CREATE POLICY "Proposers can update their proposals"
ON public.coownership_proposals
FOR UPDATE
USING (
  proposer_wallet = (auth.jwt() -> 'app_metadata')::jsonb ->> 'wallet_address'
);

-- RLS Policies for coownership_votes
CREATE POLICY "Anyone can view votes"
ON public.coownership_votes
FOR SELECT
USING (true);

CREATE POLICY "Co-owners can vote"
ON public.coownership_votes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.coownership_shares cs
    JOIN public.coownership_proposals cp ON cp.vault_id = cs.vault_id
    WHERE cp.id = coownership_votes.proposal_id
    AND cs.wallet_address = (auth.jwt() -> 'app_metadata')::jsonb ->> 'wallet_address'
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_boat_coownership_vaults_updated_at
BEFORE UPDATE ON public.boat_coownership_vaults
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coownership_shares_updated_at
BEFORE UPDATE ON public.coownership_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.boat_coownership_vaults;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coownership_shares;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coownership_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coownership_votes;