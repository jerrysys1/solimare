import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import bs58 from 'bs58';
import { useToast } from '@/hooks/use-toast';

export const useWalletAuth = () => {
  const { publicKey, signMessage } = useWallet();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const authenticate = async () => {
    if (!publicKey || !signMessage) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return false;
    }

    setIsAuthenticating(true);

    try {
      // Create message to sign
      const message = `Sign this message to authenticate with Solimare.\n\nWallet: ${publicKey.toString()}\nTimestamp: ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);
      
      // Sign message with wallet
      const signature = await signMessage(encodedMessage);
      
      // Send to backend for verification and session creation
      const { data, error } = await supabase.functions.invoke('auth-wallet', {
        body: {
          walletAddress: publicKey.toString(),
          signature: bs58.encode(signature),
          message
        }
      });

      if (error) {
        throw error;
      }

      if (data?.properties) {
        // Use the verification token to sign in
        const { error: signInError } = await supabase.auth.verifyOtp({
          token_hash: data.properties.hashed_token,
          type: 'magiclink'
        });

        if (signInError) {
          throw signInError;
        }
      }

      setIsAuthenticated(true);
      
      toast({
        title: "Authentication successful",
        description: "You are now authenticated with your wallet",
      });

      return true;
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        title: "Authentication failed",
        description: error.message || "Failed to authenticate with wallet",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    isAuthenticated,
    isAuthenticating,
    authenticate
  };
};
