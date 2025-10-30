import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { Buffer } from 'buffer';
import IDL from '../idl.json';
import { PROGRAM_ID } from './constants';

// Ensure Buffer is available globally
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

export type RwaBoatNftProgram = Program;

/**
 * Get the Anchor program instance
 */
export function getProgram(
  connection: Connection,
  wallet: AnchorWallet
): RwaBoatNftProgram {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
  
  return new Program(IDL as any, provider);
}

/**
 * Convert string to Uint8Array for PDA seeds
 */
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Derive the config PDA
 * Seeds: ["config", authority]
 */
export function getConfigPDA(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [stringToBytes('config'), authority.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive the mint PDA
 * Seeds: ["mint", owner, registration_number]
 */
export function getMintPDA(
  owner: PublicKey,
  registrationNumber: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      stringToBytes('mint'),
      owner.toBuffer(),
      stringToBytes(registrationNumber),
    ],
    PROGRAM_ID
  );
}

/**
 * Derive the boat NFT PDA
 * Seeds: ["boat", mint]
 */
export function getBoatNFTPDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [stringToBytes('boat'), mint.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive the vault PDA for co-ownership
 * Seeds: ["vault", mint]
 */
export function getVaultPDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [stringToBytes('vault'), mint.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive the proposal PDA
 * Seeds: ["proposal", vault, proposal_id]
 */
export function getProposalPDA(
  vault: PublicKey,
  proposalId: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      stringToBytes('proposal'),
      vault.toBuffer(),
      stringToBytes(proposalId),
    ],
    PROGRAM_ID
  );
}

/**
 * Map form boat type to IDL enum format
 */
export function mapBoatType(boatType: string): any {
  const typeMap: { [key: string]: any } = {
    'Sailboat': { sailboat: {} },
    'Motorboat': { motorboat: {} },
    'Yacht': { yacht: {} },
    'Catamaran': { catamaran: {} },
    'Other': { other: { _0: boatType } },
  };
  
  return typeMap[boatType] || typeMap['Other'];
}
