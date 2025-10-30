import { AnchorWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { getProgram, getBoatNFTPDA } from './program';

export interface TransferBoatNFTParams {
  mintAddress: string;
  recipientAddress: string;
  connection: Connection;
  wallet: AnchorWallet;
}

export interface TransferBoatNFTResult {
  signature: string;
}

/**
 * Transfer a Boat NFT ownership to a new owner on the Solana blockchain
 */
export async function transferBoatNFT(
  params: TransferBoatNFTParams
): Promise<TransferBoatNFTResult> {
  const {
    mintAddress,
    recipientAddress,
    connection,
    wallet,
  } = params;

  // Validate inputs
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  let mintPubkey: PublicKey;
  let recipientPubkey: PublicKey;

  try {
    mintPubkey = new PublicKey(mintAddress);
    recipientPubkey = new PublicKey(recipientAddress);
  } catch (error) {
    throw new Error('Invalid mint or recipient address');
  }

  // Get the program instance
  const program = getProgram(connection, wallet);

  // Derive PDAs
  const [boatNFTPDA] = getBoatNFTPDA(mintPubkey);
  
  // Get token accounts for from and to owners
  const fromTokenAccount = getAssociatedTokenAddressSync(
    mintPubkey,
    wallet.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const toTokenAccount = getAssociatedTokenAddressSync(
    mintPubkey,
    recipientPubkey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  try {
    // Call the transfer_boat_ownership instruction
    const tx = await program.methods
      .transferBoatOwnership()
      .accounts({
        boatNft: boatNFTPDA,
        mint: mintPubkey,
        fromTokenAccount: fromTokenAccount,
        toTokenAccount: toTokenAccount,
        fromOwner: wallet.publicKey,
        toOwner: recipientPubkey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Wait for confirmation
    await connection.confirmTransaction(tx, 'confirmed');

    return {
      signature: tx,
    };
  } catch (error: any) {
    console.error('Error transferring boat NFT:', error);

    // Handle user rejection
    if (error.message?.includes('User rejected') || error.code === 4001) {
      throw new Error('Transaction cancelled by user');
    }

    // Handle insufficient balance
    if (error.message?.includes('insufficient') || error.message?.includes('Attempt to debit an account')) {
      throw new Error('Insufficient SOL balance to cover transaction fees');
    }

    // Handle ownership errors
    if (error.message?.includes('ConstraintTokenOwner')) {
      throw new Error('You are not the owner of this NFT');
    }

    // Check for errors in logs
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
      const logs = Array.isArray(error.logs) ? error.logs.join(' ') : String(error.logs);
      
      if (logs.includes('insufficient funds') || logs.includes('insufficient lamports')) {
        throw new Error('Insufficient SOL balance to cover transaction fees');
      }
      if (logs.includes('ConstraintTokenOwner')) {
        throw new Error('You are not the owner of this NFT');
      }
      if (logs.includes('AccountNotInitialized')) {
        throw new Error('NFT account not found or not initialized');
      }
    }

    // Generic error
    throw new Error(error.message || 'Failed to transfer boat NFT');
  }
}
