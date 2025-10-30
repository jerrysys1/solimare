'use client';

import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export const DevnetFaucet: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  const requestAirdrop = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const signature = await connection.requestAirdrop(
        publicKey,
        2 * LAMPORTS_PER_SOL
      );
      
      await connection.confirmTransaction(signature);
      
      // Update balance
      const newBalance = await connection.getBalance(publicKey);
      setBalance(newBalance / LAMPORTS_PER_SOL);
      
      alert(`Airdrop successful! Signature: ${signature}`);
    } catch (error) {
      console.error('Airdrop failed:', error);
      alert('Airdrop failed. Try the web faucet: https://faucet.solana.com/');
    } finally {
      setLoading(false);
    }
  };

  const checkBalance = async () => {
    if (!publicKey) return;
    
    const balanceInLamports = await connection.getBalance(publicKey);
    setBalance(balanceInLamports / LAMPORTS_PER_SOL);
  };

  React.useEffect(() => {
    if (publicKey) {
      checkBalance();
    }
  }, [publicKey]);

  if (!publicKey) {
    return (
      <div className="p-4 bg-yellow-100 rounded-lg">
        <p>Connect your wallet to use devnet faucet</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Devnet SOL Faucet</h3>
      <p className="text-sm text-gray-600 mb-2">
        Wallet: {publicKey.toString().slice(0, 8)}...
      </p>
      {balance !== null && (
        <p className="text-sm mb-3">Balance: {balance.toFixed(4)} SOL</p>
      )}
      
      <div className="space-y-2">
        <button
          onClick={requestAirdrop}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Requesting...' : 'Request 2 SOL'}
        </button>
        
        <button
          onClick={checkBalance}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 ml-2"
        >
          Check Balance
        </button>
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        Alternative: <a 
          href="https://faucet.solana.com/" 
          target="_blank" 
          className="text-blue-600 hover:underline"
        >
          Web Faucet
        </a>
      </p>
    </div>
  );
};
