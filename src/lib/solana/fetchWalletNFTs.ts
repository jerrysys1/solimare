import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { getProgram, getBoatNFTPDA } from './program';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export interface OnChainBoatNFT {
  mint: string;
  owner: string;
  name: string;
  boatType: string;
  description: string;
  registrationNumber: string;
  yearBuilt: number;
  lengthFeet: number;
  manufacturer: string;
  createdAt: number;
}

/**
 * Fetch all boat NFTs owned by a wallet from the Solana blockchain
 */
export async function fetchWalletBoatNFTs(
  connection: Connection,
  wallet: AnchorWallet,
  walletPublicKey: PublicKey
): Promise<OnChainBoatNFT[]> {
  try {
    const program = getProgram(connection, wallet);
    
    // Get all token accounts owned by the wallet
    const tokenAccounts = await connection.getTokenAccountsByOwner(
      walletPublicKey,
      { programId: TOKEN_PROGRAM_ID }
    );

    const boats: OnChainBoatNFT[] = [];

    // Process each token account
    for (const { account, pubkey } of tokenAccounts.value) {
      try {
        // Parse token account data
        const accountData = account.data;
        const mint = new PublicKey(accountData.slice(0, 32));
        const amount = Number(accountData.readBigUInt64LE(64));

        // NFTs have amount = 1
        if (amount !== 1) continue;

        // Try to derive and fetch the boat NFT PDA
        const [boatNftPDA] = getBoatNFTPDA(mint);
        
        try {
          const boatNftAccount: any = await (program.account as any).boatNft.fetch(boatNftPDA);
          
          // Map boat type enum to string
          const boatType = Object.keys(boatNftAccount.boatType)[0];
          const boatTypeStr = boatType.charAt(0).toUpperCase() + boatType.slice(1);
          
          boats.push({
            mint: mint.toString(),
            owner: boatNftAccount.owner.toString(),
            name: boatNftAccount.name,
            boatType: boatTypeStr,
            description: boatNftAccount.description,
            registrationNumber: boatNftAccount.registrationNumber,
            yearBuilt: boatNftAccount.yearBuilt,
            lengthFeet: boatNftAccount.length,
            manufacturer: boatNftAccount.manufacturer,
            createdAt: boatNftAccount.createdAt.toNumber(),
          });
        } catch (pdaError) {
          // Not a boat NFT from our program, skip
          continue;
        }
      } catch (error) {
        console.error('Error processing token account:', error);
        continue;
      }
    }

    return boats;
  } catch (error) {
    console.error('Error fetching wallet boat NFTs:', error);
    throw error;
  }
}
