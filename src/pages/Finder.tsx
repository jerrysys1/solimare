import { useState, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Heart, MapPin, Wallet, MessageCircle, Twitter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import intensiveSailingImage from "@/assets/intensive-sailing.png";
import sightseeingRelaxingImage from "@/assets/sightseeing-relaxing.png";
import relaxSunbathImage from "@/assets/relax-sunbath.png";
import adventureExplorationImage from "@/assets/adventure-exploration.png";
import fishingTripImage from "@/assets/fishing-trip.png";
import islandHoppingImage from "@/assets/island-hopping.png";
import sunsetCruisesImage from "@/assets/sunset-cruises.png";

interface TripOffer {
  id: string;
  title: string;
  description: string;
  place: string;
  planner: string;
  date_from: string;
  date_to: string;
  max_crew: number;
  trip_type: string;
  wallet_address: string;
}

export default function Finder() {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const [trips, setTrips] = useState<TripOffer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (publicKey) {
      fetchTrips();
    }
  }, [publicKey]);

  const fetchTrips = async () => {
    const { data, error } = await supabase
      .from("trip_offers")
      .select("*")
      .eq("public_visibility", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load trips",
        variant: "destructive",
      });
      return;
    }

    setTrips(data || []);
  };

  const currentTrip = trips[currentIndex];

  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    setDragOffset({
      x: clientX - centerX,
      y: clientY - centerY,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);

    if (Math.abs(dragOffset.x) > 100) {
      if (dragOffset.x > 0) {
        handleLike();
      } else {
        handleReject();
      }
    }

    setDragOffset({ x: 0, y: 0 });
  };

  const handleReject = () => {
    if (!currentTrip) return;
    setCurrentIndex((prev) => prev + 1);
    setDragOffset({ x: 0, y: 0 });
    toast({
      title: "Passed",
      description: "Trip skipped",
    });
  };

  const handleLike = () => {
    if (!currentTrip) return;
    setCurrentIndex((prev) => prev + 1);
    setDragOffset({ x: 0, y: 0 });
    toast({
      title: "Trip saved!",
      description: "Check My Trips to view it",
    });
  };

  const rotation = dragOffset.x * 0.05;
  const opacity = 1 - Math.abs(dragOffset.x) / 300;

  // Show connect wallet prompt for unauthorized users
  if (!publicKey) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-lg p-8">
              <Wallet className="h-16 w-16 mx-auto mb-4 text-primary" />
              <h1 className="text-3xl font-bold mb-4 text-white">Connect Your Wallet</h1>
              <p className="text-white/70">
                Please connect your wallet to browse and book amazing sailing trips
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const getTripTypeColor = (tripType: string) => {
    const colors: Record<string, string> = {
      "Intensive Sailing": "bg-blue-500/90 text-white border-blue-400",
      "Sightseeing and Relaxing": "bg-purple-500/90 text-white border-purple-400",
      "Relax and Sunbath": "bg-amber-500/90 text-white border-amber-400",
      "Adventure and Exploration": "bg-emerald-500/90 text-white border-emerald-400",
      "Fishing Trip": "bg-cyan-500/90 text-white border-cyan-400",
      "Island Hopping": "bg-pink-500/90 text-white border-pink-400",
      "Sunset Cruises": "bg-orange-500/90 text-white border-orange-400",
    };
    return colors[tripType] || "bg-secondary text-secondary-foreground";
  };

  if (!currentTrip) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4 text-white">No more trips!</h1>
            <p className="text-white/70">Check back later for new adventures</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-md flex-1">
        <div className="relative h-[600px]">
          <Card
            ref={cardRef}
            className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing select-none bg-transparent border-white/10 shadow-none backdrop-blur-sm"
            style={{
              transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
              opacity: opacity,
              transition: isDragging ? "none" : "transform 0.3s ease, opacity 0.3s ease",
            }}
            onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={handleDragEnd}
          >
            <div className="relative h-full">
              {currentTrip.trip_type === "Intensive Sailing" && (
                <div className="absolute top-0 left-0 right-0 h-96 overflow-hidden">
                  <img 
                    src={intensiveSailingImage} 
                    alt="Intensive Sailing" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {currentTrip.trip_type === "Sightseeing and Relaxing" && (
                <div className="absolute top-0 left-0 right-0 h-96 overflow-hidden">
                  <img 
                    src={sightseeingRelaxingImage} 
                    alt="Sightseeing and Relaxing" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {currentTrip.trip_type === "Relax and Sunbath" && (
                <div className="absolute top-0 left-0 right-0 h-96 overflow-hidden">
                  <img 
                    src={relaxSunbathImage} 
                    alt="Relax and Sunbath" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {currentTrip.trip_type === "Adventure and Exploration" && (
                <div className="absolute top-0 left-0 right-0 h-96 overflow-hidden">
                  <img 
                    src={adventureExplorationImage} 
                    alt="Adventure and Exploration" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {currentTrip.trip_type === "Fishing Trip" && (
                <div className="absolute top-0 left-0 right-0 h-96 overflow-hidden">
                  <img 
                    src={fishingTripImage} 
                    alt="Fishing Trip" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {currentTrip.trip_type === "Island Hopping" && (
                <div className="absolute top-0 left-0 right-0 h-96 overflow-hidden">
                  <img 
                    src={islandHoppingImage} 
                    alt="Island Hopping" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {currentTrip.trip_type === "Sunset Cruises" && (
                <div className="absolute top-0 left-0 right-0 h-96 overflow-hidden">
                  <img 
                    src={sunsetCruisesImage} 
                    alt="Sunset Cruises" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />
              
              <CardContent className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="mb-4">
                  <h2 className="text-4xl font-bold mb-2">{currentTrip.title}</h2>
                  <p className="text-xl opacity-90 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {currentTrip.place}
                  </p>
                </div>

                <div className="mb-4 space-y-2">
                  <p className="text-sm opacity-80">
                    Hosted by {currentTrip.planner} • {currentTrip.max_crew} crew members
                  </p>
                  <p className="text-sm opacity-80">
                    {new Date(currentTrip.date_from).toLocaleDateString()} - {new Date(currentTrip.date_to).toLocaleDateString()}
                  </p>
                </div>

                <div className="mb-4">
                  <Badge className={`text-sm px-3 py-1 ${getTripTypeColor(currentTrip.trip_type)}`}>
                    {currentTrip.trip_type}
                  </Badge>
                </div>

                <p className="text-sm line-clamp-3 opacity-90">
                  {currentTrip.description}
                </p>
              </CardContent>

              {dragOffset.x > 50 && (
                <div className="absolute top-8 right-8 bg-green-500 text-white px-6 py-3 rounded-lg font-bold text-2xl transform rotate-12">
                  LIKE
                </div>
              )}
              {dragOffset.x < -50 && (
                <div className="absolute top-8 left-8 bg-red-500 text-white px-6 py-3 rounded-lg font-bold text-2xl transform -rotate-12">
                  NOPE
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="flex justify-center items-center gap-8 mt-8">
          <button
            onClick={handleReject}
            className="w-20 h-20 rounded-full bg-card hover:bg-accent flex items-center justify-center transition-all hover:scale-110 shadow-lg"
          >
            <X className="h-10 w-10 text-red-500" />
          </button>

          <button
            onClick={handleLike}
            className="w-20 h-20 rounded-full bg-card hover:bg-accent flex items-center justify-center transition-all hover:scale-110 shadow-lg"
          >
            <Heart className="h-10 w-10 text-green-500" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-auto pointer-events-auto">
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
}
