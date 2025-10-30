import { useState } from "react";
import { WalletMenu } from "@/components/WalletMenu";
import { BoatCard } from "@/components/BoatCard";
import { CoownershipCard } from "@/components/CoownershipCard";
import { CreateCoownershipDialog } from "@/components/CreateCoownershipDialog";
import { Header } from "@/components/Header";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Twitter, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { fetchWalletBoatNFTs } from "@/lib/solana/fetchWalletNFTs";
import { AnchorWallet } from "@solana/wallet-adapter-react";

const Gallery = () => {
  const { publicKey, wallet } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  
  // Fetch co-ownership vaults
  const { data: vaults } = useQuery({
    queryKey: ['coownership-vaults'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boat_coownership_vaults')
        .select('*, boats(*)');
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's co-ownership shares
  const { data: userShares } = useQuery({
    queryKey: ['user-shares', publicKey?.toString()],
    queryFn: async () => {
      if (!publicKey) return [];
      const { data, error } = await supabase
        .from('coownership_shares')
        .select('*, boat_coownership_vaults(*, boats(*))')
        .eq('wallet_address', publicKey.toString());
      if (error) throw error;
      return data;
    },
    enabled: !!publicKey,
  });

  // Fetch all boats from database
  const { data: allBoats, isLoading: isLoadingAllBoats, refetch: refetchAllBoats } = useQuery({
    queryKey: ['all-boats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boats')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching all boats:', error);
        throw error;
      }
      
      return data?.map(boat => ({
        id: boat.id,
        name: boat.name,
        boatType: boat.boat_type,
        description: boat.description,
        registrationNumber: boat.registration_number,
        yearBuilt: boat.year_built,
        lengthFeet: boat.length_feet,
        manufacturer: boat.manufacturer,
        isForSale: false,
        owner: boat.wallet_address.slice(0, 4) + '...' + boat.wallet_address.slice(-4),
        mintAddress: boat.mint_address,
        transactionSignature: boat.transaction_signature,
      })) || [];
    },
  });
  
  // Fetch user's boat NFTs from blockchain
  const { data: userBoats, isLoading, refetch } = useQuery({
    queryKey: ['user-boats-onchain', publicKey?.toString()],
    queryFn: async () => {
      if (!publicKey || !wallet) return [];
      
      try {
        const boats = await fetchWalletBoatNFTs(
          connection,
          wallet.adapter as AnchorWallet,
          publicKey
        );
        
        return boats.map(boat => ({
          name: boat.name,
          boatType: boat.boatType,
          description: boat.description,
          registrationNumber: boat.registrationNumber,
          yearBuilt: boat.yearBuilt,
          lengthFeet: boat.lengthFeet,
          manufacturer: boat.manufacturer,
          isForSale: false,
          owner: boat.owner.slice(0, 4) + '...' + boat.owner.slice(-4),
          mintAddress: boat.mint,
        }));
      } catch (error) {
        console.error('Error fetching boat NFTs:', error);
        toast({
          title: "Error",
          description: "Failed to fetch boat NFTs from blockchain",
          variant: "destructive",
        });
        return [];
      }
    },
    enabled: !!publicKey && !!wallet,
  });

  // Real-time subscription for new boats
  useEffect(() => {
    const channel = supabase
      .channel('boats-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'boats',
        },
        (payload) => {
          console.log('New boat minted:', payload);
          // Removed toast notification to avoid spam
          
          // Refetch all boats
          refetchAllBoats();
          
          // Refetch user boats only if it's the current user's boat
          if (publicKey && payload.new.wallet_address === publicKey.toString()) {
            refetch();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [publicKey, refetch, refetchAllBoats]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 pointer-events-auto flex-1">
        <section>
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-2 text-white drop-shadow-lg">Boat NFT Gallery</h2>
            <p className="text-white/70 drop-shadow-md">Explore registered maritime assets</p>
          </div>
          
          {!publicKey ? (
            <Card className="bg-transparent border-white/10 shadow-none backdrop-blur-sm max-w-2xl mx-auto">
              <CardContent className="pt-6 text-center">
                <p className="text-white/70 mb-4">Please connect your wallet to view the gallery.</p>
                <WalletMenu />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-12">
              {/* User's NFTs Section */}
              <div>
                <h3 className="text-2xl font-bold mb-6 text-white drop-shadow-lg">My RWA NFT</h3>
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="bg-white/5 border-white/10">
                        <CardContent className="p-6">
                          <Skeleton className="h-4 w-3/4 mb-4 bg-white/10" />
                          <Skeleton className="h-4 w-1/2 mb-2 bg-white/10" />
                          <Skeleton className="h-20 w-full bg-white/10" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : userBoats && userBoats.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userBoats.map((boat, index) => {
                      const boatData = allBoats?.find(b => b.mintAddress === boat.mintAddress);
                      const vault = vaults?.find(v => v.boat_id === boatData?.id);
                      return (
                        <div key={index} className="space-y-4">
                          <BoatCard 
                            boat={boat} 
                            showTransferButton={true}
                            onTransferComplete={() => {
                              refetch();
                              refetchAllBoats();
                            }}
                          />
                          {boatData && !vault && (
                            <CreateCoownershipDialog
                              boatId={boatData.id}
                              mintAddress={boat.mintAddress}
                              onSuccess={refetch}
                            />
                          )}
                          {vault && (
                            <CoownershipCard
                              vaultId={vault.id}
                              boatName={boat.name}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="bg-transparent border-white/10 shadow-none backdrop-blur-sm">
                    <CardContent className="pt-6 text-center">
                      <p className="text-white/70">You haven't minted any boat NFTs yet.</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Co-owned Boats Section */}
              <div>
                <h3 className="text-2xl font-bold mb-6 text-white drop-shadow-lg flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Co-owned Boats
                </h3>
                {isLoadingAllBoats ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="bg-white/5 border-white/10">
                        <CardContent className="p-6">
                          <Skeleton className="h-4 w-3/4 mb-4 bg-white/10" />
                          <Skeleton className="h-4 w-1/2 mb-2 bg-white/10" />
                          <Skeleton className="h-20 w-full bg-white/10" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : vaults && vaults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {vaults.map((vault) => {
                      const boat = allBoats?.find(b => b.id === vault.boat_id);
                      const userShare = userShares?.find(
                        s => s.boat_coownership_vaults?.id === vault.id
                      );
                      return boat ? (
                        <BoatCard 
                          key={vault.id} 
                          boat={boat}
                          isCoOwned={true}
                          userSharePercentage={userShare?.share_percentage}
                        />
                      ) : null;
                    })}
                  </div>
                ) : (
                  <Card className="bg-transparent border-white/10 shadow-none backdrop-blur-sm">
                    <CardContent className="pt-6 text-center">
                      <p className="text-white/70">No co-owned boats yet. Create fractional ownership for your boats!</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16 pointer-events-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <p className="text-sm text-white/70">Solimare RWA Adventures • Powered by Solana</p>
            <div className="flex gap-3">
              <a 
                href="https://t.me/sailwithsolimare" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/20"
                aria-label="Telegram"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
              <a 
                href="https://x.com/Solimare2025" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/20"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Gallery;
