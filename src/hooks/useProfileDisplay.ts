import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProfileInfo {
  displayName?: string;
  avatarUrl?: string;
}

export const useProfileDisplay = (walletAddress: string) => {
  const [profile, setProfile] = useState<ProfileInfo>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('wallet_address', walletAddress)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        setProfile({
          displayName: data?.display_name || undefined,
          avatarUrl: data?.avatar_url || undefined,
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [walletAddress]);

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const displayName = profile.displayName
    ? `${formatWalletAddress(walletAddress)} (${profile.displayName})`
    : formatWalletAddress(walletAddress);

  return {
    displayName,
    avatarUrl: profile.avatarUrl,
    loading,
  };
};
