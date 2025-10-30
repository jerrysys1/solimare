import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { WalletMenu } from "@/components/WalletMenu";
import { CompanionDisplay } from "@/components/CompanionDisplay";
import { Header } from "@/components/Header";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Calendar, Edit, Trash2, MapPin, CalendarDays, Users, UserPlus, X, MessageCircle, Twitter } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TripChatDialog } from "@/components/TripChatDialog";

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
  title: z.string().trim().min(1, "Title is required"),
  place: z.string().trim().min(1, "Location is required"),
  planner: z.string().trim().min(1, "Planner name is required"),
  tripType: z.string().min(1, "Trip type is required"),
  maxCrew: z.coerce.number().min(1, "At least 1 crew member required").max(50, "Maximum 50 crew members"),
  dateFrom: z.date({ required_error: "Start date is required" }),
  dateTo: z.date({ required_error: "End date is required" }),
  description: z.string().trim().min(1, "Description is required"),
}).refine((data) => data.dateTo >= data.dateFrom, {
  message: "End date must be after start date",
  path: ["dateTo"],
});

interface Trip {
  id: string;
  title: string;
  place: string;
  planner: string;
  trip_type: string;
  max_crew: number;
  date_from: string;
  date_to: string;
  description: string;
  wallet_address: string;
  created_at: string;
}

export default function MyTrips() {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [companions, setCompanions] = useState<string[]>([]);
  const [newCompanionWallet, setNewCompanionWallet] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }
    fetchTrips();
  }, [publicKey]);

  const fetchTrips = async () => {
    if (!publicKey) return;

    const walletAddress = publicKey.toString();

    try {
      // Fetch trips where user is the creator OR a companion
      const { data: createdTrips, error: createdError } = await supabase
        .from('trip_offers')
        .select('*')
        .eq('wallet_address', walletAddress);

      if (createdError) throw createdError;

      // Fetch trips where user is invited as a companion
      const { data: companionTrips, error: companionError } = await supabase
        .from('trip_companions')
        .select('trip_id')
        .eq('companion_wallet_address', walletAddress);

      if (companionError) throw companionError;

      // Get full trip data for companion trips
      let invitedTrips: Trip[] = [];
      if (companionTrips && companionTrips.length > 0) {
        const tripIds = companionTrips.map(c => c.trip_id);
        const { data: invitedTripsData, error: invitedError } = await supabase
          .from('trip_offers')
          .select('*')
          .in('id', tripIds);

        if (invitedError) throw invitedError;
        invitedTrips = invitedTripsData || [];
      }

      // Combine and deduplicate trips
      const allTrips = [...(createdTrips || []), ...invitedTrips];
      const uniqueTrips = Array.from(
        new Map(allTrips.map(trip => [trip.id, trip])).values()
      );

      // Sort by created_at descending
      uniqueTrips.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTrips(uniqueTrips);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (trip: Trip) => {
    setEditingTrip(trip);
    form.reset({
      title: trip.title,
      place: trip.place,
      planner: trip.planner,
      tripType: trip.trip_type,
      maxCrew: trip.max_crew || 4,
      dateFrom: new Date(trip.date_from),
      dateTo: new Date(trip.date_to),
      description: trip.description,
    });
    
    // Fetch companions for this trip
    try {
      const { data, error } = await supabase
        .from('trip_companions')
        .select('companion_wallet_address')
        .eq('trip_id', trip.id);
      
      if (error) throw error;
      setCompanions(data?.map(c => c.companion_wallet_address) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load companions",
        variant: "destructive",
      });
    }
    
    setIsDialogOpen(true);
  };

  const handleDelete = async (tripId: string) => {
    if (!confirm("Are you sure you want to delete this trip?")) return;

    try {
      const { error } = await supabase
        .from('trip_offers')
        .delete()
        .eq('id', tripId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Trip deleted successfully",
      });
      fetchTrips();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addCompanion = async () => {
    if (!newCompanionWallet.trim()) {
      toast({
        title: "Error",
        description: "Please enter a wallet address",
        variant: "destructive",
      });
      return;
    }

    if (companions.includes(newCompanionWallet)) {
      toast({
        title: "Error",
        description: "This companion is already added",
        variant: "destructive",
      });
      return;
    }

    if (!editingTrip) return;

    try {
      const { error } = await supabase
        .from('trip_companions')
        .insert({
          trip_id: editingTrip.id,
          companion_wallet_address: newCompanionWallet.trim(),
        });

      if (error) throw error;

      setCompanions([...companions, newCompanionWallet.trim()]);
      setNewCompanionWallet("");
      toast({
        title: "Success",
        description: "Companion added successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeCompanion = async (walletAddress: string) => {
    if (!editingTrip) return;

    try {
      const { error } = await supabase
        .from('trip_companions')
        .delete()
        .eq('trip_id', editingTrip.id)
        .eq('companion_wallet_address', walletAddress);

      if (error) throw error;

      setCompanions(companions.filter(c => c !== walletAddress));
      toast({
        title: "Success",
        description: "Companion removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { error } = await supabase
        .from('trip_offers')
        .update({
          title: values.title,
          place: values.place,
          planner: values.planner,
          trip_type: values.tripType,
          max_crew: values.maxCrew,
          date_from: format(values.dateFrom, 'yyyy-MM-dd'),
          date_to: format(values.dateTo, 'yyyy-MM-dd'),
          description: values.description,
        })
        .eq('id', editingTrip?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Trip updated successfully",
      });
      setIsDialogOpen(false);
      fetchTrips();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 pointer-events-auto flex-1">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-white drop-shadow-lg mb-2">My Trips</h2>
            <p className="text-white/70 drop-shadow-md">Manage your sailing adventures</p>
          </div>

          {!publicKey ? (
            <Card className="bg-transparent border-white/10 shadow-none backdrop-blur-sm">
              <CardContent className="pt-6 text-center">
                <p className="text-white/70 mb-4">Please connect your wallet to view your trips.</p>
                <WalletMenu />
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : trips.length === 0 ? (
            <Card className="bg-transparent border-white/10 shadow-none backdrop-blur-sm">
              <CardContent className="pt-6 text-center">
                <p className="text-white/70 mb-4">You haven't created any trips yet.</p>
                <Link to="/trip-offer">
                  <Button className="pointer-events-auto">Create Your First Trip</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip) => (
                <Card key={trip.id} className="bg-transparent border-white/10 shadow-none backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white text-xl">{trip.title}</CardTitle>
                    <CardDescription className="text-white/70">
                      <div className="flex items-center gap-2 mt-2">
                        <MapPin className="h-4 w-4" />
                        {trip.place}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <CalendarDays className="h-4 w-4" />
                      {format(new Date(trip.date_from), 'MMM d')} - {format(new Date(trip.date_to), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <Users className="h-4 w-4" />
                      {trip.trip_type}
                    </div>
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <Users className="h-4 w-4" />
                      Max crew: {trip.max_crew || 4} people
                    </div>
                    <p className="text-white/60 text-sm line-clamp-2">{trip.description}</p>
                    <div className="flex gap-2 pt-2">
                      <TripChatDialog tripId={trip.id} tripTitle={trip.title} />
                      {/* Only show edit/delete buttons if user is the creator */}
                      {trip.wallet_address === publicKey?.toString() && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(trip)}
                            className="flex-1 bg-background/10 border-white/10 text-white hover:bg-background/20"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(trip.id)}
                            className="flex-1 bg-background/10 border-white/10 text-white hover:bg-red-500/20 hover:border-red-500/30"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card backdrop-blur-2xl border-border shadow-2xl animate-scale-in">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 rounded-lg pointer-events-none" />
          <div className="relative z-10">
            <DialogHeader>
              <DialogTitle className="text-card-foreground text-2xl font-bold">Edit Trip</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Update your trip details
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-card-foreground font-medium">Trip Title</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-ring transition-all" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="place"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-card-foreground font-medium">Location</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-ring transition-all" />
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
                        <FormLabel className="text-card-foreground font-medium">Planner</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-ring transition-all" />
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
                      <FormLabel className="text-card-foreground font-medium">Trip Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-input border-border text-foreground focus:border-ring transition-all">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover backdrop-blur-xl border-border">
                          {TRIP_TYPES.map((type) => (
                            <SelectItem key={type} value={type} className="text-popover-foreground focus:bg-accent">{type}</SelectItem>
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
                      <FormLabel className="text-card-foreground font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Max Crew Members
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          max="50"
                          {...field} 
                          className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-ring transition-all" 
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total number of people for this adventure (including you)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dateFrom"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-card-foreground font-medium">Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "bg-input border-border text-foreground hover:bg-accent hover:border-ring pl-3 text-left font-normal transition-all",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-popover backdrop-blur-xl border-border">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
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
                        <FormLabel className="text-card-foreground font-medium">End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "bg-input border-border text-foreground hover:bg-accent hover:border-ring pl-3 text-left font-normal transition-all",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-popover backdrop-blur-xl border-border">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
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

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-card-foreground font-medium">Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-ring transition-all resize-none" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Crew Members Section */}
                <div className="space-y-3 pt-2">
                  <div>
                    <FormLabel className="text-card-foreground font-medium">Invite Companions (by Wallet Address)</FormLabel>
                    <p className="text-muted-foreground text-sm mt-1">
                      Add friends to join you on this sailing adventure by entering their Solana wallet address
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., FaXRDY9zguM6fjsxHs2pispyXyXZ2VeeAaewoY3t2Buu"
                      maxLength={88}
                      value={newCompanionWallet}
                      onChange={(e) => setNewCompanionWallet(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCompanion();
                        }
                      }}
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-ring transition-all"
                    />
                    <Button
                      type="button"
                      onClick={addCompanion}
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                  {companions.length > 0 && (
                    <div className="space-y-2">
                      {companions.map((wallet) => (
                        <div
                          key={wallet}
                          className="flex items-center justify-between p-3 bg-background/50 rounded-md border border-border"
                        >
                          <CompanionDisplay walletAddress={wallet} className="flex-1 mr-2" />
                          <Button
                            type="button"
                            onClick={() => removeCompanion(wallet)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 hover:bg-destructive/20 hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1 transition-all"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg shadow-primary/20"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

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
