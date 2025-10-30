import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { Separator } from "./ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "./ui/form";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/integrations/supabase/client";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { mintBoatNFT } from "@/lib/solana/mintBoatNFT";
import { getExplorerLink } from "@/lib/solana/explorerLink";
import { useState } from "react";
import { createCoownership, CoownershipShare } from "@/lib/solana/coownership";

const BOAT_TYPES = ["Sailboat", "Motorboat", "Yacht", "Catamaran", "Other"];

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
  boatType: z.string().min(1, "Boat type is required"),
  registrationNumber: z.string().trim().min(1, "Registration number is required").max(30, "Registration number must be 30 characters or less"),
  yearBuilt: z.string().min(1, "Year is required").regex(/^\d{4}$/, "Year must be a valid 4-digit number"),
  lengthFeet: z.string().min(1, "Length is required").regex(/^\d+$/, "Length must be a number").refine((val) => {
    const num = parseInt(val);
    return num >= 1 && num <= 1000;
  }, "Length must be between 1 and 1000 feet"),
  manufacturer: z.string().trim().min(1, "Manufacturer is required").max(50, "Manufacturer must be 50 characters or less"),
  description: z.string().trim().min(1, "Description is required").max(200, "Description must be 200 characters or less"),
});

export const MintBoatForm = () => {
  const { toast } = useToast();
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const { isAuthenticated, authenticate, isAuthenticating } = useWalletAuth();
  const [mintingStatus, setMintingStatus] = useState<string>("");
  const [enableCoownership, setEnableCoownership] = useState(false);
  const [votingThreshold, setVotingThreshold] = useState([51]);
  const [coowners, setCoowners] = useState<CoownershipShare[]>([
    { wallet_address: '', share_percentage: 0 },
  ]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      boatType: "",
      description: "",
      registrationNumber: "",
      yearBuilt: "",
      lengthFeet: "",
      manufacturer: "",
    },
  });

  const addCoowner = () => {
    setCoowners([...coowners, { wallet_address: '', share_percentage: 0 }]);
  };

  const removeCoowner = (index: number) => {
    setCoowners(coowners.filter((_, i) => i !== index));
  };

  const updateCoowner = (index: number, field: keyof CoownershipShare, value: string | number) => {
    const updated = [...coowners];
    updated[index] = { ...updated[index], [field]: value };
    setCoowners(updated);
  };

  const totalShares = coowners.reduce((sum, owner) => sum + (owner.share_percentage || 0), 0);
  const isCoownershipValid = !enableCoownership || (
    totalShares === 100 && 
    coowners.every(owner => owner.wallet_address && owner.share_percentage > 0)
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!publicKey || !anchorWallet) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    const walletAddress = publicKey.toString();

    try {
      // Step 1: Authenticate with wallet if not already authenticated
      setMintingStatus("Authenticating...");
      if (!isAuthenticated) {
        const authenticated = await authenticate();
        if (!authenticated) {
          setMintingStatus("");
          return;
        }
      }

      // Step 2: Mint NFT on Solana blockchain
      setMintingStatus("Preparing transaction...");
      
      let mintResult;
      try {
        mintResult = await mintBoatNFT({
          name: values.name,
          boatType: values.boatType,
          registrationNumber: values.registrationNumber,
          yearBuilt: parseInt(values.yearBuilt),
          lengthFeet: parseInt(values.lengthFeet),
          manufacturer: values.manufacturer,
          description: values.description,
          connection,
          wallet: anchorWallet,
        });
      } catch (mintError: any) {
        setMintingStatus("");
        throw new Error(`Minting failed: ${mintError.message}`);
      }

      // Step 3: Save to database with mint information
      setMintingStatus("Saving to database...");
      
      // Ensure profile exists
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ wallet_address: walletAddress }, { onConflict: 'wallet_address' });

      if (profileError) throw profileError;

      // Save boat to database with mint info
      const { error } = await supabase
        .from('boats')
        .insert({
          wallet_address: walletAddress,
          name: values.name,
          boat_type: values.boatType,
          registration_number: values.registrationNumber,
          year_built: parseInt(values.yearBuilt),
          length_feet: parseInt(values.lengthFeet),
          manufacturer: values.manufacturer,
          description: values.description,
          mint_address: mintResult.mintAddress,
          transaction_signature: mintResult.signature,
        });

      if (error) throw error;
      
      // Step 4: Create co-ownership if enabled
      if (enableCoownership && isCoownershipValid) {
        setMintingStatus("Creating co-ownership...");
        
        const { data: boatData } = await supabase
          .from('boats')
          .select('id')
          .eq('mint_address', mintResult.mintAddress)
          .maybeSingle();

        if (boatData) {
          try {
            await createCoownership({
              connection,
              wallet: anchorWallet,
              boatId: boatData.id,
              mintAddress: mintResult.mintAddress,
              ownershipShares: coowners,
              votingThreshold: votingThreshold[0],
            });
          } catch (coownershipError: any) {
            console.error('Co-ownership creation failed:', coownershipError);
            toast({
              title: "Note",
              description: "Boat minted successfully, but co-ownership creation failed. You can create it later from the Gallery.",
              variant: "default",
            });
          }
        }
      }
      
      setMintingStatus("");
      
      toast({
        title: "Success! 🎉",
        description: (
          <div className="space-y-1">
            <p>Boat NFT minted successfully on Solana!</p>
            {enableCoownership && <p className="text-xs">Fractional ownership created with {coowners.length} co-owners</p>}
            {mintResult.signature !== 'ALREADY_MINTED' ? (
              <a 
                href={getExplorerLink(mintResult.signature, 'tx')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline hover:text-primary"
              >
                View transaction on Solana Explorer →
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">
                This boat was already minted. Check your gallery!
              </p>
            )}
          </div>
        ),
      });
      
      form.reset();
      setEnableCoownership(false);
      setCoowners([{ wallet_address: '', share_percentage: 0 }]);
      setVotingThreshold([51]);
    } catch (error: any) {
      setMintingStatus("");
      toast({
        title: "Error",
        description: error.message || "Failed to mint boat NFT",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-transparent border-white/5 shadow-none">
      <CardHeader>
        <CardTitle className="text-white drop-shadow-lg">Mint Boat NFT</CardTitle>
        <CardDescription className="text-white/90 drop-shadow-md">Create a new Real World Asset NFT for your vessel</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Boat Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Sea Breeze" maxLength={50} {...field} className="pointer-events-auto" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="boatType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Boat Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="pointer-events-auto">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BOAT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Registration Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ABC-1234" maxLength={30} {...field} className="pointer-events-auto" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="yearBuilt"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Year Built</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 2020" min="1900" max="2030" maxLength={4} {...field} className="pointer-events-auto" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lengthFeet"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Length (ft)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 40" min="1" max="1000" maxLength={60} {...field} className="pointer-events-auto" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="manufacturer"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Manufacturer</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Bavaria Yachts" maxLength={50} {...field} className="pointer-events-auto" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe your boat..." rows={3} maxLength={200} {...field} className="pointer-events-auto" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Co-ownership Section */}
            <Separator className="my-6" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="coownership" className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Enable Fractional Ownership
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Create co-ownership with multiple wallet addresses
                  </p>
                </div>
                <Switch
                  id="coownership"
                  checked={enableCoownership}
                  onCheckedChange={setEnableCoownership}
                  className="pointer-events-auto"
                />
              </div>

              {enableCoownership && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label>Voting Threshold: {votingThreshold[0]}%</Label>
                    <Slider
                      value={votingThreshold}
                      onValueChange={setVotingThreshold}
                      min={1}
                      max={100}
                      step={1}
                      className="w-full pointer-events-auto"
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum percentage of votes needed to approve proposals
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Co-owners ({coowners.length})</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCoowner}
                        className="gap-2 pointer-events-auto"
                      >
                        <Plus className="h-4 w-4" />
                        Add Co-owner
                      </Button>
                    </div>

                    {coowners.map((owner, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1 space-y-2">
                          <Label>Wallet Address</Label>
                          <Input
                            value={owner.wallet_address}
                            onChange={(e) => updateCoowner(index, 'wallet_address', e.target.value)}
                            placeholder="Enter Solana wallet address"
                            className="pointer-events-auto"
                          />
                        </div>
                        <div className="w-24 space-y-2">
                          <Label>Share %</Label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={owner.share_percentage || ''}
                            onChange={(e) => updateCoowner(index, 'share_percentage', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="pointer-events-auto"
                          />
                        </div>
                        {coowners.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCoowner(index)}
                            className="pointer-events-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}

                    <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                      <span className="font-medium text-sm">Total Shares:</span>
                      <span className={`text-lg font-bold ${totalShares === 100 ? 'text-green-600' : 'text-destructive'}`}>
                        {totalShares}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full pointer-events-auto" 
              disabled={form.formState.isSubmitting || isAuthenticating || !!mintingStatus || !isCoownershipValid}
            >
              {(form.formState.isSubmitting || isAuthenticating || mintingStatus) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mintingStatus || (isAuthenticating ? "Authenticating..." : enableCoownership ? "Mint & Create Co-ownership" : "Mint Boat NFT")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
