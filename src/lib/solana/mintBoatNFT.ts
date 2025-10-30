import { AnchorWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, SystemProgram, SendTransactionError } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { getProgram, getMintPDA, getBoatNFTPDA, mapBoatType } from './program';
import { CONFIG_ADDRESS } from './constants';

export interface MintBoatNFTParams {
  name: string;
  boatType: string;
  registrationNumber: string;
  yearBuilt: number;
  lengthFeet: number;
  manufacturer: string;
  description: string;
  connection: Connection;
  wallet: AnchorWallet;
}

export interface MintBoatNFTResult {
  signature: string;
  mintAddress: string;
}

/**
 * Mint a Boat NFT on the Solana blockchain
 */
export async function mintBoatNFT(
  params: MintBoatNFTParams
): Promise<MintBoatNFTResult> {
  const {
    name,
    boatType,
    registrationNumber,
    yearBuilt,
    lengthFeet,
    manufacturer,
    description,
    connection,
    wallet,
  } = params;

  // Validate inputs
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  if (name.length > 50) {
    throw new Error('Name must be 50 characters or less');
  }

  if (description.length > 200) {
    throw new Error('Description must be 200 characters or less');
  }

  if (registrationNumber.length > 30) {
    throw new Error('Registration number must be 30 characters or less');
  }

  if (manufacturer.length > 50) {
    throw new Error('Manufacturer must be 50 characters or less');
  }

  if (lengthFeet < 1 || lengthFeet > 1000) {
    throw new Error('Length must be between 1 and 1000 feet');
  }

  if (yearBuilt > 65535) {
    throw new Error('Year must be a valid u16 value');
  }

  // Get the program instance
  const program = getProgram(connection, wallet);

  // Derive PDAs
  const [mintPDA] = getMintPDA(wallet.publicKey, registrationNumber);
  const [boatNFTPDA] = getBoatNFTPDA(mintPDA);
  const ownerATA = getAssociatedTokenAddressSync(
    mintPDA,
    wallet.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // Map boat type to enum format
  const boatTypeEnum = mapBoatType(boatType);

  try {
    // Check if boat NFT already exists before attempting to mint
    console.log('Checking if boat NFT already exists...');
    try {
      const existingAccount = await connection.getAccountInfo(boatNFTPDA);
      if (existingAccount) {
        console.log('Boat NFT already exists, fetching signature...');
        // Boat already minted, try to get the signature from recent transactions
        const signatures = await connection.getSignaturesForAddress(boatNFTPDA, { limit: 1 });
        if (signatures.length > 0) {
          console.log('Found existing transaction:', signatures[0].signature);
          return {
            signature: signatures[0].signature,
            mintAddress: mintPDA.toString(),
          };
        }
        // If we can't find signature, return with placeholder
        console.log('NFT exists but no signature found, returning placeholder');
        return {
          signature: 'ALREADY_MINTED',
          mintAddress: mintPDA.toString(),
        };
      }
      console.log('Boat NFT does not exist yet, proceeding with mint...');
    } catch (checkError) {
      console.log('Error checking existing account:', checkError);
      // Continue with minting if check fails
    }

    // Call the mint_boat_nft instruction
    console.log('Calling mint_boat_nft instruction...');
    const tx = await program.methods
      .mintBoatNft(
        name,
        boatTypeEnum,
        description,
        registrationNumber,
        yearBuilt,
        lengthFeet,
        manufacturer
      )
      .accounts({
        owner: wallet.publicKey,
        config: CONFIG_ADDRESS,
        mint: mintPDA,
        boatNft: boatNFTPDA,
        ownerAta: ownerATA,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('Transaction sent, waiting for confirmation...');
    // Wait for confirmation
    await connection.confirmTransaction(tx, 'confirmed');

    console.log('Transaction confirmed:', tx);
    return {
      signature: tx,
      mintAddress: mintPDA.toString(),
    };
  } catch (error: any) {
    console.error('Error minting boat NFT:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error signature:', error.signature);
    
    // Check if transaction was already processed (success case)
    // This can appear in multiple formats
    const errorMsg = error.message || '';
    const isAlreadyProcessed = 
      errorMsg.toLowerCase().includes('already been processed') || 
      errorMsg.toLowerCase().includes('already processed') ||
      errorMsg.toLowerCase().includes('this transaction has already been processed');
    
    if (isAlreadyProcessed) {
      console.log('Transaction already processed - treating as success');
      // Try to get the signature from recent transactions
      try {
        const signatures = await connection.getSignaturesForAddress(boatNFTPDA, { limit: 1 });
        if (signatures.length > 0) {
          console.log('Found existing signature:', signatures[0].signature);
          return {
            signature: signatures[0].signature,
            mintAddress: mintPDA.toString(),
          };
        }
      } catch (sigError) {
        console.log('Could not fetch signature:', sigError);
      }
      
      // If no signature found, the account should exist, return success
      console.log('Returning success - boat already minted');
      return {
        signature: 'ALREADY_MINTED',
        mintAddress: mintPDA.toString(),
      };
    }
    
    // Handle SendTransactionError with full logs
    if (error instanceof SendTransactionError) {
      try {
        const logs = await error.getLogs(connection);
        console.error('Full transaction logs:', logs);
        
        if (logs) {
          const logsStr = logs.join(' ').toLowerCase();
          
          if (logsStr.includes('already been processed') || logsStr.includes('already processed')) {
            console.log('Logs indicate already processed - treating as success');
            // Try to get the signature
            try {
              const signatures = await connection.getSignaturesForAddress(boatNFTPDA, { limit: 1 });
              if (signatures.length > 0) {
                return {
                  signature: signatures[0].signature,
                  mintAddress: mintPDA.toString(),
                };
              }
            } catch (sigError) {
              console.log('Could not fetch signature:', sigError);
            }
            return {
              signature: 'ALREADY_MINTED',
              mintAddress: mintPDA.toString(),
            };
          }
          if (logsStr.includes('insufficient funds') || logsStr.includes('insufficient lamports')) {
            throw new Error('Insufficient SOL balance. Please add Devnet SOL to your wallet.');
          }
          if (logsStr.includes('already in use') || logsStr.includes('already exists')) {
            throw new Error('This boat registration number is already registered.');
          }
        }
      } catch (logError) {
        // If it's a return statement from above, rethrow it
        if (logError && typeof logError === 'object' && 'signature' in logError) {
          return logError as MintBoatNFTResult;
        }
        console.error('Error getting transaction logs:', logError);
      }
    }

    // Handle program errors
    if (error.error?.errorCode) {
      const errorCode = error.error.errorCode;
      const errorMsg = error.error.errorMessage || 'Unknown program error';
      throw new Error(`Program error (${errorCode}): ${errorMsg}`);
    }

    // Handle user rejection
    if (error.message?.includes('User rejected') || error.code === 4001) {
      throw new Error('Transaction cancelled by user');
    }

    // Handle insufficient balance
    if (error.message?.includes('insufficient') || error.message?.includes('Attempt to debit an account')) {
      throw new Error('Insufficient SOL balance. Please add Devnet SOL to your wallet.');
    }

    // Check for errors in logs
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
      const logs = Array.isArray(error.logs) ? error.logs.join(' ').toLowerCase() : String(error.logs).toLowerCase();
      
      if (logs.includes('already been processed') || logs.includes('already processed')) {
        console.log('Error logs indicate already processed - treating as success');
        // Try to get the signature
        try {
          const signatures = await connection.getSignaturesForAddress(boatNFTPDA, { limit: 1 });
          if (signatures.length > 0) {
            return {
              signature: signatures[0].signature,
              mintAddress: mintPDA.toString(),
            };
          }
        } catch (sigError) {
          console.log('Could not fetch signature:', sigError);
        }
        return {
          signature: 'ALREADY_MINTED',
          mintAddress: mintPDA.toString(),
        };
      }
      if (logs.includes('insufficient funds') || logs.includes('insufficient lamports')) {
        throw new Error('Insufficient SOL balance. Please add Devnet SOL to your wallet.');
      }
      if (logs.includes('already in use') || logs.includes('already exists')) {
        throw new Error('This boat registration number is already registered.');
      }
    }

    // Generic error
    throw new Error(error.message || 'Failed to mint boat NFT');
  }
}
