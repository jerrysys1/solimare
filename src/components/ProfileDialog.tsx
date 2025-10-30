import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Upload, User } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useWalletAuth } from '@/hooks/useWalletAuth';

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

const profileSchema = z.object({
  displayName: z.string().trim().max(50, "Nickname must be less than 50 characters").optional(),
  bio: z.string().trim().max(500, "Description must be less than 500 characters").optional(),
  interestedTripTypes: z.array(z.string()).optional(),
});

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileDialog = ({ open, onOpenChange }: ProfileDialogProps) => {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const { isAuthenticated, isAuthenticating, authenticate } = useWalletAuth();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      interestedTripTypes: [],
    },
  });

  useEffect(() => {
    if (open && publicKey) {
      fetchProfile();
    }
  }, [open, publicKey]);

  const fetchProfile = async () => {
    if (!publicKey) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', publicKey.toString())
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        form.reset({
          displayName: data.display_name || "",
          bio: data.bio || "",
          interestedTripTypes: data.interested_trip_types || [],
        });
        setAvatarUrl(data.avatar_url || "");
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !publicKey) return;

    // Ensure session is tied to the currently connected wallet
    const { data: { session } } = await supabase.auth.getSession();
    const sessionWallet = session?.user?.app_metadata?.wallet_address as string | undefined;

    if (!isAuthenticated || sessionWallet !== publicKey.toString()) {
      if (isAuthenticated && sessionWallet && sessionWallet !== publicKey.toString()) {
        // Switch session to current wallet
        await supabase.auth.signOut();
      }
      toast({
        title: "Authentication required",
        description: "Please authenticate with your connected wallet to upload an avatar",
      });
      const authenticated = await authenticate();
      if (!authenticated) return;
    }

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${publicKey.toString()}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);

      toast({
        title: "Avatar uploaded",
        description: "Your avatar has been uploaded successfully",
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!publicKey) return;

    // Ensure session is tied to the currently connected wallet
    const { data: { session } } = await supabase.auth.getSession();
    const sessionWallet = session?.user?.app_metadata?.wallet_address as string | undefined;

    if (!isAuthenticated || sessionWallet !== publicKey.toString()) {
      if (isAuthenticated && sessionWallet && sessionWallet !== publicKey.toString()) {
        await supabase.auth.signOut();
      }
      toast({
        title: "Authentication required",
        description: "Please authenticate with your connected wallet to save your profile",
      });
      const authenticated = await authenticate();
      if (!authenticated) return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          wallet_address: publicKey.toString(),
          display_name: values.displayName || null,
          bio: values.bio || null,
          interested_trip_types: values.interestedTripTypes || [],
          avatar_url: avatarUrl || null,
        }, {
          onConflict: 'wallet_address'
        });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully",
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card backdrop-blur-2xl border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-card-foreground text-2xl font-bold">My Profile</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Customize your sailing profile
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
              <User className="h-12 w-12" />
            </AvatarFallback>
          </Avatar>
          <label htmlFor="avatar-upload">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading || isAuthenticating}
              onClick={() => document.getElementById('avatar-upload')?.click()}
            >
              {(uploading || isAuthenticating) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {(uploading || isAuthenticating) ? 'Please wait...' : 'Upload Avatar'}
            </Button>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </label>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-card-foreground font-medium">Nickname</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your sailing nickname"
                      {...field}
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-ring transition-all"
                    />
                  </FormControl>
                  <FormDescription className="text-muted-foreground text-sm">
                    This will be displayed next to your wallet address
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-card-foreground font-medium">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell others about your sailing experience..."
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-ring transition-all min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="interestedTripTypes"
              render={() => (
                <FormItem>
                  <FormLabel className="text-card-foreground font-medium">Interested Trip Types</FormLabel>
                  <FormDescription className="text-muted-foreground text-sm">
                    Select the types of sailing adventures you enjoy
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {TRIP_TYPES.map((type) => (
                      <FormField
                        key={type}
                        control={form.control}
                        name="interestedTripTypes"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(type)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  const updated = checked
                                    ? [...current, type]
                                    : current.filter((t) => t !== type);
                                  field.onChange(updated);
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal text-card-foreground cursor-pointer">
                              {type}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Profile
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
