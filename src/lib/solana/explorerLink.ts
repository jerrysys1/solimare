import { EXPLORER_BASE_URL, NETWORK } from './constants';

/**
 * Generate Solana Explorer link for transactions or addresses
 */
export function getExplorerLink(
  signatureOrAddress: string,
  type: 'tx' | 'address' = 'tx'
): string {
  const cluster = NETWORK === 'devnet' ? '?cluster=devnet' : NETWORK === 'testnet' ? '?cluster=testnet' : '';
  return `${EXPLORER_BASE_URL}/${type}/${signatureOrAddress}${cluster}`;
}
