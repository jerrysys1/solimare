import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider, web3, Idl } from '@coral-xyz/anchor';
import { RwaBoatNftProgram } from '../types/rwa_boat_nft_program';

// Network configuration
export const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK as web3.Cluster || 'devnet';
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl(NETWORK);
export const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);

// Connection setup
export const connection = new Connection(RPC_URL, 'confirmed');

// Get program instance
export const getProgram = (wallet: any): Program<RwaBoatNftProgram> => {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
  
  return new Program(
    require('../target/idl/rwa_boat_nft_program.json') as Idl,
    PROGRAM_ID,
    provider
  ) as Program<RwaBoatNftProgram>;
};

// Devnet-specific configurations
export const DEVNET_CONFIG = {
  network: NETWORK,
  rpcUrl: RPC_URL,
  programId: PROGRAM_ID.toString(),
  commitment: 'confirmed' as web3.Commitment,
  preflightCommitment: 'confirmed' as web3.Commitment,
};

console.log('Solana Config:', {
  network: NETWORK,
  rpc: RPC_URL,
  programId: PROGRAM_ID.toString(),
});
