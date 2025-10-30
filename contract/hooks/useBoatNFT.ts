import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { getProgram, PROGRAM_ID } from '../lib/solana';
import * as anchor from '@coral-xyz/anchor';

export const useBoatNFT = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);

  const mintBoatNFT = async (boatData: {
    name: string;
    boatType: any;
    description: string;
    registrationNumber: string;
    yearBuilt: number;
    length: number;
    manufacturer: string;
  }) => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    try {
      const program = getProgram(wallet);
      
      // Get authority (you'll need to set this to your authority keypair)
      const authority = wallet.publicKey; // For demo - in production use proper authority
      
      // Derive PDAs
      const [configPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("config"), authority.toBuffer()],
        PROGRAM_ID
      );

      const [mintPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint"), wallet.publicKey.toBuffer(), Buffer.from(boatData.registrationNumber)],
        PROGRAM_ID
      );

      const [boatNftPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("boat"), mintPDA.toBuffer()],
        PROGRAM_ID
      );

      const userTokenAccount = await getAssociatedTokenAddress(
        mintPDA,
        wallet.publicKey
      );

      // Check if user has enough SOL (devnet check)
      const balance = await connection.getBalance(wallet.publicKey);
      if (balance < 0.1 * LAMPORTS_PER_SOL) {
        throw new Error('Insufficient SOL balance. Get devnet SOL from faucet.');
      }

      const tx = await program.methods
        .mintBoatNft(
          boatData.name,
          boatData.boatType,
          boatData.description,
          boatData.registrationNumber,
          boatData.yearBuilt,
          boatData.length,
          boatData.manufacturer
        )
        .accounts({
          config: configPDA,
          boatNft: boatNftPDA,
          mint: mintPDA,
          ownerTokenAccount: userTokenAccount,
          owner: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Mint transaction signature:', tx);
      return { signature: tx, mintAddress: mintPDA.toString() };
      
    } catch (error: any) {
      console.error('Minting failed:', error);
      
      // Devnet specific error handling
      if (error.message.includes('Attempt to debit an account but found no record of a prior credit')) {
        throw new Error('Insufficient SOL balance. Get devnet SOL from https://faucet.solana.com/');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const requestDevnetSOL = async () => {
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // Request airdrop (devnet only)
      const signature = await connection.requestAirdrop(
        wallet.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      
      await connection.confirmTransaction(signature);
      console.log('Devnet SOL airdrop successful:', signature);
      return signature;
    } catch (error) {
      console.error('Airdrop failed:', error);
      throw new Error('Airdrop failed. Use web faucet: https://faucet.solana.com/');
    }
  };

  return {
    mintBoatNFT,
    requestDevnetSOL,
    loading,
  };
};
