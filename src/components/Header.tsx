import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ChevronDown } from "lucide-react";
import { WalletMenu } from "@/components/WalletMenu";
import { ProfileDialog } from "@/components/ProfileDialog";
import logo from "@/assets/solimare-logo.png";

export const Header = () => {
  const { publicKey } = useWallet();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();
  
  const isOwnershipActive = location.pathname === '/mint' || location.pathname === '/gallery';

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/30 border-b border-white/10 pointer-events-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img src={logo} alt="Solimare" className="h-12 w-12" />
              <div>
                <h1 className="text-xl font-bold text-white">Solimare</h1>
                <p className="text-xs text-white/70">RWA Adventures</p>
              </div>
            </Link>
            <div className="flex items-center gap-6">
              <nav className="hidden md:flex gap-6 items-center">
                {publicKey && (
                  <>
                    <Link 
                      to="/trip-offer" 
                      className={`text-sm font-medium transition-colors ${
                        location.pathname === '/trip-offer' ? 'text-white' : 'text-white/80 hover:text-white'
                      }`}
                    >
                      Create Trip
                    </Link>
                    <Link 
                      to="/trip-finder" 
                      className={`text-sm font-medium transition-colors ${
                        location.pathname === '/trip-finder' ? 'text-white' : 'text-white/80 hover:text-white'
                      }`}
                    >
                      Trip Finder
                    </Link>
                    <Link 
                      to="/my-trips" 
                      className={`text-sm font-medium transition-colors ${
                        location.pathname === '/my-trips' ? 'text-white' : 'text-white/80 hover:text-white'
                      }`}
                    >
                      My Trips
                    </Link>
                    <HoverCard openDelay={0} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <button className={`text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                          isOwnershipActive ? 'text-white' : 'text-white/80 hover:text-white'
                        }`}>
                          Ownership
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-48 bg-popover backdrop-blur-xl border-border p-2 z-50">
                        <div className="flex flex-col gap-1">
                          <Link 
                            to="/mint" 
                            className={`text-sm px-3 py-2 rounded transition-colors ${
                              location.pathname === '/mint' 
                                ? 'bg-accent text-popover-foreground' 
                                : 'text-popover-foreground hover:bg-accent'
                            }`}
                          >
                            Mint NFT
                          </Link>
                          <Link 
                            to="/gallery" 
                            className={`text-sm px-3 py-2 rounded transition-colors ${
                              location.pathname === '/gallery' 
                                ? 'bg-accent text-popover-foreground' 
                                : 'text-popover-foreground hover:bg-accent'
                            }`}
                          >
                            Gallery
                          </Link>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                    <button 
                      onClick={() => setIsProfileOpen(true)}
                      className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                    >
                      Profile
                    </button>
                  </>
                )}
              </nav>
              <WalletMenu />
            </div>
          </div>
        </div>
      </header>
      <ProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </>
  );
};
