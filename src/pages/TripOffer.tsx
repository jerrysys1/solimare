import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, Plus, X, Anchor, Users, MessageCircle, Twitter } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { WalletMenu } from "@/components/WalletMenu";
import { Header } from "@/components/Header";
import { Link } from "react-router-dom";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { fetchWalletBoatNFTs, OnChainBoatNFT } from "@/lib/solana/fetchWalletNFTs";

const TRIP_TYPES = [
  "Intensive Sailing",
  "Sightseeing and Relaxing",
  "Relax and Sunbath",
  "Adventure and Exploration",
  "Fishing Trip",
  "Island Hopping",
  "Sunset Cruises",
  "Other"
];

const formSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  place: z.string().trim().min(1, "Location is required").max(100, "Location must be less than 100 characters"),
  planner: z.string().trim().min(1, "Planner name is required").max(60, "Planner name must be less than 60 characters"),
  tripType: z.string().min(1, "Trip type is required"),
  boatId: z.string().optional(),
  maxCrew: z.coerce.number().min(1, "At least 1 crew member required").max(50, "Maximum 50 crew members"),
  dateFrom: z.date({ required_error: "Start date is required" }),
  dateTo: z.date({ required_error: "End date is required" }),
  companions: z.array(z.object({
    userId: z.string().trim().min(1, "Wallet address is required").max(88, "Wallet address must be less than 88 characters")
  })).optional(),
  description: z.string().trim().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
  publicVisibility: z.boolean().default(true),
}).refine((data) => data.dateTo >= data.dateFrom, {
  message: "End date must be after start date",
  path: ["dateTo"],
});

interface Boat {
  mint: string;
  name: string;
  boatType: string;
}

export default function TripOffer() {
  const { toast } = useToast();
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const navigate = useNavigate();
  const [boats, setBoats] = useState<Boat[]>([]);
  const [loadingBoats, setLoadingBoats] = useState(false);
  const { isAuthenticated, authenticate, isAuthenticating } = useWalletAuth();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      place: "",
      planner: "",
      tripType: "",
      boatId: "",
      maxCrew: 4,
      companions: [],
      description: "",
      publicVisibility: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "companions",
  });

  useEffect(() => {
    if (!publicKey) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to create a trip offer",
      });
    } else {
      fetchBoats();
    }
  }, [publicKey, toast]);

  const fetchBoats = async () => {
    if (!publicKey || !anchorWallet) return;

    setLoadingBoats(true);
    try {
      const nfts = await fetchWalletBoatNFTs(connection, anchorWallet, publicKey);
      
      // Map blockchain NFTs to Boat interface
      const mappedBoats: Boat[] = nfts.map(nft => ({
        mint: nft.mint,
        name: nft.name,
        boatType: nft.boatType,
      }));
      
      setBoats(mappedBoats);
    } catch (error: any) {
      console.error('Error fetching boat NFTs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your yacht NFTs from blockchain",
        variant: "destructive",
      });
    } finally {
      setLoadingBoats(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!publicKey) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!isAuthenticated) {
      const authenticated = await authenticate();
      if (!authenticated) return;
    }

    const walletAddress = publicKey.toString();

    try {
      // Ensure profile exists
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ wallet_address: walletAddress }, { onConflict: 'wallet_address' });

      if (profileError) throw profileError;

      // Create trip offer
      const { data: tripData, error: tripError } = await supabase
        .from('trip_offers')
        .insert({
          wallet_address: walletAddress,
          title: values.title,
          place: values.place,
          planner: values.planner,
          trip_type: values.tripType,
          boat_id: values.boatId && values.boatId !== 'none' ? values.boatId : null,
          max_crew: values.maxCrew,
          date_from: format(values.dateFrom, 'yyyy-MM-dd'),
          date_to: format(values.dateTo, 'yyyy-MM-dd'),
          description: values.description,
          public_visibility: values.publicVisibility,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Add companions if any
      if (values.companions && values.companions.length > 0 && tripData) {
        const companionPromises = values.companions
          .filter(c => c.userId.trim())
          .map(companion =>
            supabase.from('trip_companions').insert({
              trip_id: tripData.id,
              companion_wallet_address: companion.userId,
            })
          );

        await Promise.all(companionPromises);
      }
      
      toast({
        title: "Success",
        description: "Trip offer created successfully!",
      });
      
      form.reset();
      navigate('/my-trips');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create trip offer",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 pointer-events-auto flex-1">
        <div className="max-w-4xl mx-auto">
          {!publicKey ? (
            <Card className="bg-transparent border-white/10 shadow-none backdrop-blur-sm">
              <CardContent className="pt-6 text-center">
                <p className="text-white/70 mb-4">Please connect your wallet to create a trip offer.</p>
                <WalletMenu />
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-transparent border-white/5 shadow-none backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white drop-shadow-lg text-3xl">Create Trip Offer</CardTitle>
                <CardDescription className="text-white/90 drop-shadow-md">
                  Share your sailing adventure and find the perfect companions
                </CardDescription>
              </CardHeader>
              <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Trip Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Mediterranean Adventure" 
                          maxLength={100} 
                          {...field} 
                          className="pointer-events-auto bg-background/10 border-white/10 text-white placeholder:text-white/60" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="place"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Location</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Greek Islands" 
                            maxLength={100} 
                            {...field} 
                            className="pointer-events-auto bg-background/10 border-white/10 text-white placeholder:text-white/60" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="planner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Trip Planner</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Your name" 
                            maxLength={60} 
                            {...field} 
                            className="pointer-events-auto bg-background/10 border-white/10 text-white placeholder:text-white/60" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tripType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Trip Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="pointer-events-auto bg-background/10 border-white/10 text-white">
                            <SelectValue placeholder="Select trip type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TRIP_TYPES.map((type) => (
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
                  name="maxCrew"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Max Crew Members
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          max="50"
                          placeholder="e.g., 4" 
                          {...field} 
                          className="pointer-events-auto bg-background/10 border-white/10 text-white placeholder:text-white/60" 
                        />
                      </FormControl>
                      <p className="text-xs text-white/60 mt-1">
                        Total number of people for this adventure (including you)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="boatId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white flex items-center gap-2">
                        <Anchor className="h-4 w-4" />
                        Your Yacht (Optional)
                        {boats.length > 0 && (
                          <span className="text-xs text-primary font-semibold ml-2 px-2 py-0.5 bg-primary/10 rounded-full">
                            Yacht Owner
                          </span>
                        )}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loadingBoats}>
                        <FormControl>
                          <SelectTrigger className="pointer-events-auto bg-background/10 border-white/10 text-white">
                            <SelectValue placeholder={
                              loadingBoats ? "Loading yachts..." : 
                              boats.length === 0 ? "No yachts minted yet" : 
                              "Select your yacht (optional)"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background/95 backdrop-blur-xl border-white/20 z-50">
                          <SelectItem value="none" className="text-white focus:bg-white/10">
                            None (No yacht for this trip)
                          </SelectItem>
                          {boats.map((boat) => (
                            <SelectItem key={boat.mint} value={boat.mint} className="text-white focus:bg-white/10">
                              {boat.name} ({boat.boatType})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {boats.length === 0 && (
                        <p className="text-xs text-white/60 mt-1">
                          Mint a yacht NFT on the <Link to="/mint" className="text-primary hover:underline">mint page</Link> to link it to this trip
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="dateFrom"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-white">Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pointer-events-auto bg-background/10 border-white/10 text-white hover:bg-background/20 pl-3 text-left font-normal",
                                  !field.value && "text-white/60"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateTo"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-white">End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pointer-events-auto bg-background/10 border-white/10 text-white hover:bg-background/20 pl-3 text-left font-normal",
                                  !field.value && "text-white/60"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Companions Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-white">Invite Companions (by Wallet Address)</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ userId: "" })}
                      className="pointer-events-auto bg-background/10 border-white/10 text-white hover:bg-background/20"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Companion
                    </Button>
                  </div>
                  
                  {fields.length === 0 && (
                    <p className="text-white/60 text-sm italic">No companions added yet. Click "Add Companion" to invite someone.</p>
                  )}
                  
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <FormField
                        key={field.id}
                        control={form.control}
                        name={`companions.${index}.userId`}
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input
                                  placeholder="e.g., FaXRDY9zguM6fjsxHs2pispyXyXZ2VeeAaewoY3t2Buu"
                                  maxLength={88}
                                  {...field}
                                  className="pointer-events-auto bg-background/10 border-white/10 text-white placeholder:text-white/60"
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => remove(index)}
                                className="pointer-events-auto bg-background/10 border-white/10 text-white hover:bg-red-500/20 hover:border-red-500/30"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about your trip plans and what kind of companions you're looking for..." 
                          rows={5} 
                          maxLength={500} 
                          {...field} 
                          className="pointer-events-auto bg-background/10 border-white/10 text-white placeholder:text-white/60" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="publicVisibility"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 bg-background/10 p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-white text-base">Public Visibility</FormLabel>
                        <FormDescription className="text-white/60">
                          When enabled, your trip will be visible in Trip Finder for others to discover
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="pointer-events-auto"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full pointer-events-auto" 
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Trip Offer
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
          )}
        </div>
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
}
