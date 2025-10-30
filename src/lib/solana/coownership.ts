import { AnchorWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getProgram, getVaultPDA, getProposalPDA } from './program';
import { supabase } from '@/integrations/supabase/client';

export interface CoownershipShare {
  wallet_address: string;
  share_percentage: number;
}

export interface CreateCoownershipParams {
  connection: Connection;
  wallet: AnchorWallet;
  boatId: string;
  mintAddress: string;
  ownershipShares: CoownershipShare[];
  votingThreshold: number;
}

export interface CreateProposalParams {
  connection: Connection;
  wallet: AnchorWallet;
  vaultId: string;
  vaultPda: string;
  proposalType: 'sale' | 'transfer' | 'maintenance' | 'update_metadata';
  proposalData: any;
}

export interface VoteOnProposalParams {
  connection: Connection;
  wallet: AnchorWallet;
  proposalId: string;
  proposalPda: string;
  vote: boolean;
  sharePercentage: number;
}

/**
 * Create a co-ownership vault for a boat NFT
 */
export async function createCoownership(
  params: CreateCoownershipParams
): Promise<{ vaultPda: string; signature: string }> {
  const { connection, wallet, boatId, mintAddress, ownershipShares, votingThreshold } = params;

  // Validate shares sum to 100
  const totalShares = ownershipShares.reduce((sum, share) => sum + share.share_percentage, 0);
  if (totalShares !== 100) {
    throw new Error('Ownership shares must sum to 100%');
  }

  const mintPubkey = new PublicKey(mintAddress);
  const [vaultPda] = getVaultPDA(mintPubkey);

  // NOTE: Actual on-chain vault creation would happen here
  // For now, we'll simulate the transaction
  console.log('Creating co-ownership vault:', {
    mint: mintAddress,
    vaultPda: vaultPda.toBase58(),
    shares: ownershipShares,
    threshold: votingThreshold,
  });

  // Simulate transaction signature
  const signature = `VAULT_CREATED_${Date.now()}`;

  // Store vault in database
  const { data: vaultData, error: vaultError } = await supabase
    .from('boat_coownership_vaults')
    .insert({
      boat_id: boatId,
      mint_address: mintAddress,
      vault_pda: vaultPda.toBase58(),
      total_shares: 100,
      voting_threshold: votingThreshold,
      is_active: true,
    })
    .select()
    .single();

  if (vaultError) throw vaultError;

  // Store ownership shares
  const sharesData = ownershipShares.map(share => ({
    vault_id: vaultData.id,
    wallet_address: share.wallet_address,
    share_percentage: share.share_percentage,
  }));

  const { error: sharesError } = await supabase
    .from('coownership_shares')
    .insert(sharesData);

  if (sharesError) throw sharesError;

  return {
    vaultPda: vaultPda.toBase58(),
    signature,
  };
}

/**
 * Create a proposal for a co-ownership vault
 */
export async function createProposal(
  params: CreateProposalParams
): Promise<{ proposalId: string; signature: string }> {
  const { connection, wallet, vaultId, vaultPda, proposalType, proposalData } = params;

  const vaultPubkey = new PublicKey(vaultPda);
  const proposalIdStr = `${Date.now()}`;
  const [proposalPda] = getProposalPDA(vaultPubkey, proposalIdStr);

  console.log('Creating proposal:', {
    vaultPda,
    proposalPda: proposalPda.toBase58(),
    type: proposalType,
    data: proposalData,
  });

  // Simulate transaction signature
  const signature = `PROPOSAL_CREATED_${Date.now()}`;

  // Store proposal in database
  const { data: proposalDbData, error } = await supabase
    .from('coownership_proposals')
    .insert({
      vault_id: vaultId,
      proposal_type: proposalType,
      proposal_data: proposalData,
      proposer_wallet: wallet.publicKey.toBase58(),
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  return {
    proposalId: proposalDbData.id,
    signature,
  };
}

/**
 * Vote on a proposal
 */
export async function voteOnProposal(
  params: VoteOnProposalParams
): Promise<{ signature: string; proposalStatus: string }> {
  const { connection, wallet, proposalId, proposalPda, vote, sharePercentage } = params;

  console.log('Voting on proposal:', {
    proposalId,
    proposalPda,
    vote,
    sharePercentage,
  });

  // Simulate transaction signature
  const signature = `VOTE_CAST_${Date.now()}`;

  // Store vote in database
  const { error: voteError } = await supabase
    .from('coownership_votes')
    .insert({
      proposal_id: proposalId,
      voter_wallet: wallet.publicKey.toBase58(),
      vote,
      share_percentage: sharePercentage,
    });

  if (voteError) throw voteError;

  // Calculate total votes
  const { data: votes, error: votesError } = await supabase
    .from('coownership_votes')
    .select('vote, share_percentage')
    .eq('proposal_id', proposalId);

  if (votesError) throw votesError;

  const yesVotes = votes
    .filter(v => v.vote === true)
    .reduce((sum, v) => sum + v.share_percentage, 0);

  // Get voting threshold
  const { data: proposal, error: proposalError } = await supabase
    .from('coownership_proposals')
    .select('vault_id')
    .eq('id', proposalId)
    .single();

  if (proposalError) throw proposalError;

  const { data: vault, error: vaultError } = await supabase
    .from('boat_coownership_vaults')
    .select('voting_threshold')
    .eq('id', proposal.vault_id)
    .single();

  if (vaultError) throw vaultError;

  // Update proposal status if threshold met
  let proposalStatus = 'pending';
  if (yesVotes >= vault.voting_threshold) {
    proposalStatus = 'approved';
    await supabase
      .from('coownership_proposals')
      .update({ status: 'approved' })
      .eq('id', proposalId);
  }

  return { signature, proposalStatus };
}

/**
 * Execute an approved proposal
 */
export async function executeProposal(
  proposalId: string,
  connection: Connection,
  wallet: AnchorWallet
): Promise<{ signature: string }> {
  // Get proposal data
  const { data: proposal, error } = await supabase
    .from('coownership_proposals')
    .select('*, boat_coownership_vaults(*)')
    .eq('id', proposalId)
    .single();

  if (error) throw error;

  if (proposal.status !== 'approved') {
    throw new Error('Proposal must be approved before execution');
  }

  console.log('Executing proposal:', proposal);

  // Simulate transaction signature
  const signature = `PROPOSAL_EXECUTED_${Date.now()}`;

  // Update proposal status
  await supabase
    .from('coownership_proposals')
    .update({
      status: 'executed',
      executed_at: new Date().toISOString(),
    })
    .eq('id', proposalId);

  return { signature };
}
