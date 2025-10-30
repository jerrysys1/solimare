import { WalletMenu } from "@/components/WalletMenu";
import { MintBoatForm } from "@/components/MintBoatForm";
import { Header } from "@/components/Header";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Twitter } from "lucide-react";

const Index = () => {
  const { publicKey } = useWallet();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12 flex-1">
          {/* Mint Section */}
          <section>
            {!publicKey ? (
              <div className="max-w-3xl mx-auto">
                <Card className="bg-transparent border-white/10 shadow-none backdrop-blur-sm">
                  <CardContent className="pt-6 text-center">
                    <p className="text-white/70 mb-4">Please connect your wallet to mint Boat NFTs.</p>
                    <WalletMenu />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto backdrop-blur-sm bg-card/10 rounded-2xl p-8 shadow-2xl border border-white/10">
                <MintBoatForm />
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

export default Index;
