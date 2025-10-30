import { useState } from "react";
import { Anchor, Calendar, Ruler, Ship, ExternalLink, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { getExplorerLink } from "@/lib/solana/explorerLink";
import { TransferNFTDialog } from "./TransferNFTDialog";

interface BoatCardProps {
  boat: {
    id?: string;
    name: string;
    boatType: string;
    description: string;
    registrationNumber: string;
    yearBuilt: number;
    lengthFeet: number;
    manufacturer: string;
    isForSale: boolean;
    owner: string;
    mintAddress?: string;
    transactionSignature?: string;
  };
  showTransferButton?: boolean;
  onTransferComplete?: () => void;
  isCoOwned?: boolean;
  userSharePercentage?: number;
}

export const BoatCard = ({ 
  boat, 
  showTransferButton = false, 
  onTransferComplete,
  isCoOwned = false,
  userSharePercentage
}: BoatCardProps) => {
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg bg-transparent border-white/10 backdrop-blur-sm shadow-2xl">
      <CardHeader className="bg-white/5 border-b border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl text-white">{boat.name}</CardTitle>
            <p className="text-sm text-white/70">{boat.boatType}</p>
          </div>
          <div className="flex flex-col gap-1 items-end">
            {boat.isForSale && (
              <Badge variant="secondary" className="bg-white/20 text-white border-white/20">For Sale</Badge>
            )}
            {isCoOwned && (
              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                Co-owned
              </Badge>
            )}
            {userSharePercentage !== undefined && (
              <Badge variant="default" className="bg-primary text-primary-foreground">
                {userSharePercentage}% Share
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <p className="text-sm text-white/80">{boat.description}</p>
        
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2 text-sm">
            <Anchor className="h-4 w-4 text-white/70" />
            <span className="text-white/70">{boat.registrationNumber}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-white/70" />
            <span className="text-white/70">{boat.yearBuilt}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Ruler className="h-4 w-4 text-white/70" />
            <span className="text-white/70">{boat.lengthFeet}ft</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Ship className="h-4 w-4 text-white/70" />
            <span className="text-white/70 truncate">{boat.manufacturer}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-white/10">
          <p className="text-xs text-white/60 truncate">Owner: {boat.owner}</p>
          <div className="flex gap-2 mt-2">
            {boat.mintAddress && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                asChild
              >
                <a
                  href={getExplorerLink(boat.mintAddress, 'address')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  View on Explorer
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
            {showTransferButton && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                onClick={() => setIsTransferDialogOpen(true)}
              >
                <ArrowRightLeft className="mr-2 h-3 w-3" />
                Transfer Ownership
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <TransferNFTDialog
        open={isTransferDialogOpen}
        onOpenChange={setIsTransferDialogOpen}
        boat={boat}
        onTransferComplete={onTransferComplete}
      />
    </Card>
  );
};
