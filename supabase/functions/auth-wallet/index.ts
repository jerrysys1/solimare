import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import nacl from "https://esm.sh/tweetnacl@1.0.3";
import bs58 from "https://esm.sh/bs58@6.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, signature, message } = await req.json();

    console.log('Auth request for wallet:', walletAddress);

    // Verify Solana signature
    const publicKeyBytes = bs58.decode(walletAddress);
    const signatureBytes = bs58.decode(signature);
    const messageBytes = new TextEncoder().encode(message);

    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!verified) {
      console.error('Signature verification failed');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signature verified successfully');

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Use wallet address as email (Supabase requires email format)
    const email = `${walletAddress}@solana.wallet`;

    console.log('Processing authentication for wallet');

    // Try to create user - provides constant-time response (prevents timing attacks)
    // If user exists, catch error and fetch existing user
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      app_metadata: {
        wallet_address: walletAddress
      }
    });
    
    // For existing users, we don't need to fetch user data
    // The session generation will handle authentication
    let userData = null;

    if (createError) {
      // User already exists - handle gracefully without fetching all users
      const msg = (createError as any)?.message ?? '';
      const code = (createError as any)?.status ?? (createError as any)?.code;
      const normalized = String(msg).toLowerCase();
      const isAlreadyRegistered =
        code === 422 ||
        normalized.includes('already been registered') ||
        normalized.includes('already registered') ||
        normalized.includes('email_exists');

      if (isAlreadyRegistered) {
        console.log('User already exists, proceeding with session generation');
        // User exists, no need to fetch their data
      } else {
        console.error('Error during authentication:', msg);
        return new Response(
          JSON.stringify({ error: 'Authentication failed' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // New user created successfully
      userData = createData.user;
    }

    // Generate session token
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`
      }
    });

    if (sessionError) {
      console.error('Error generating session:', sessionError);
      return new Response(
        JSON.stringify({ error: sessionError.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Session generated successfully');

    // Create a proper session by signing in
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Use OTP to create session
    const { data: { session }, error: signInError } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false
      }
    });

    // For immediate access, create session directly
    const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email
    });

    if (verifyError) {
      console.error('Error creating access:', verifyError);
    }

    return new Response(
      JSON.stringify({ 
        user: userData,
        wallet_address: walletAddress,
        properties: verifyData?.properties
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in auth-wallet function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
