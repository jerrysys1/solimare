# Solimare Troubleshooting Guide

## Table of Contents
1. [Wallet Connection Issues](#wallet-connection-issues)
2. [NFT Minting Errors](#nft-minting-errors)
3. [Transaction Failures](#transaction-failures)
4. [Co-ownership Errors](#co-ownership-errors)
5. [Trip Management Issues](#trip-management-issues)
6. [Authentication Errors](#authentication-errors)
7. [Database/RLS Errors](#databaserls-errors)
8. [Network & RPC Issues](#network--rpc-issues)
9. [UI/Display Problems](#uidisplay-problems)

---

## Wallet Connection Issues

### Error: "Wallet not connected"
**Symptoms:** Unable to perform any blockchain operations

**Causes:**
- Wallet extension not installed
- Wallet not unlocked
- Wrong network selected

**Solutions:**
```
1. Install Phantom or Solflare wallet extension
2. Unlock your wallet
3. Ensure wallet is on Solana Devnet
4. Refresh the page and reconnect
5. Check browser console for specific errors
```

### Error: "User rejected the request"
**Symptoms:** Transaction cancelled

**Causes:**
- User clicked "Cancel" in wallet popup
- Wallet auto-rejected due to security settings

**Solutions:**
```
1. Try transaction again
2. Check wallet is unlocked
3. Ensure sufficient SOL balance
4. Review transaction details before approving
```

### Error: "Phantom was registered as a Standard Wallet"
**Symptoms:** Warning in console

**Impact:** Low - This is a warning, not an error

**Solution:**
```
This is expected behavior when using wallet-adapter.
Can be ignored or removed PhantomWalletAdapter from 
src/components/WalletProvider.tsx if only using standard wallets.
```

---

## NFT Minting Errors

### Error: "Insufficient SOL balance to cover transaction fees"
**Symptoms:** Minting fails immediately

**Causes:**
- Wallet has less than ~0.01 SOL
- Transaction fee calculation failed

**Solutions:**
```bash
# Get Devnet SOL
solana airdrop 2 <YOUR_WALLET_ADDRESS> --url devnet

# Or use web faucet:
# https://faucet.solana.com/
```

**Prevention:**
- Keep at least 0.1 SOL in Devnet wallet
- Monitor balance before operations

### Error: "This boat registration number is already registered"
**Symptoms:** Minting rejected with duplicate error

**Causes:**
- Registration number used before
- Mint PDA collision

**Solutions:**
```
1. Use a unique registration number
2. Check existing boats in Gallery page
3. If testing, append timestamp or random suffix
4. Production: Implement proper registration verification
```

### Error: "Invalid boat type format"
**Symptoms:** Transaction fails during encoding

**Causes:**
- Boat type not properly converted to Anchor enum format
- Custom type in "Other" not provided

**Solutions:**
```typescript
// Correct enum mapping in mintBoatNFT.ts:
const boatTypeEnum = {
  sailboat: {},
  motorboat: {},
  yacht: {},
  catamaran: {},
  other: { _0: customType }
};

// Ensure customType exists if boatType === "Other"
```

### Error: "Failed to send transaction: Transaction simulation failed"
**Symptoms:** Pre-flight simulation rejects transaction

**Causes:**
- Invalid account ownership
- Insufficient funds
- Wrong program ID
- Account already initialized

**Debug Steps:**
```typescript
// Enable detailed logging in mintBoatNFT.ts:
console.log('Mint PDA:', mintPDA.toString());
console.log('Boat NFT PDA:', boatNFTPDA.toString());
console.log('Owner ATA:', ownerATA.toString());

// Check program logs:
if (error.logs) {
  console.error('Program logs:', error.logs);
}
```

### Error: "Transaction already processed"
**Symptoms:** Duplicate mint attempt

**Handling:**
```typescript
// Already handled in code - checks for existing boat:
const existingBoat = await supabase
  .from('boats')
  .select('*')
  .eq('registration_number', registrationNumber)
  .maybeSingle();

if (existingBoat?.data) {
  return { signature: existingBoat.data.transaction_signature, ... };
}
```

---

## Transaction Failures

### Error: "Transaction confirmation timeout"
**Symptoms:** Transaction hangs, never confirms

**Causes:**
- Network congestion
- RPC node issues
- Transaction dropped

**Solutions:**
```typescript
// Increase timeout in connection:
const connection = new Connection(endpoint, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 120000 // 2 minutes
});

// Or check transaction manually:
const signature = await connection.getSignature(txSignature);
```

### Error: "Blockhash not found"
**Symptoms:** Transaction rejected immediately

**Causes:**
- Recent blockhash expired (after ~60 seconds)
- Clock drift between client and network

**Solutions:**
```
1. Retry transaction immediately
2. Ensure system clock is accurate
3. Use getLatestBlockhash() right before sending
```

### Error: "Transaction too large"
**Symptoms:** Transaction exceeds size limit

**Causes:**
- Too many co-owners added at once
- Large metadata in proposal

**Solutions:**
```
1. Limit co-owners to 5-10 per vault
2. Keep metadata under 1KB
3. Split into multiple transactions if needed
```

---

## Co-ownership Errors

### Error: "Share percentages don't add up to 100%"
**Symptoms:** Frontend validation fails

**Causes:**
- Rounding errors
- Missing co-owner shares
- Manual calculation mistakes

**Solutions:**
```typescript
// Validation in MintBoatForm.tsx:
const totalShares = coowners.reduce((sum, co) => 
  sum + parseFloat(co.sharePercentage || '0'), 0
);

if (Math.abs(totalShares - 100) > 0.01) {
  toast.error('Shares must total 100%');
  return;
}
```

### Error: "You are not a co-owner of this vault"
**Symptoms:** Cannot vote on proposals

**Causes:**
- Wallet not in coownership_shares table
- Share percentage is 0
- Vault is inactive

**Debug Query:**
```sql
SELECT * FROM coownership_shares 
WHERE vault_id = '<vault_id>' 
  AND wallet_address = '<your_wallet>';
```

### Error: "Proposal has expired"
**Symptoms:** Cannot vote or execute

**Causes:**
- `expires_at` timestamp passed
- Proposal created with short duration

**Solutions:**
```
1. Create new proposal
2. Set longer expiration (default 7 days)
3. Clean up expired proposals in UI
```

### Error: "Voting threshold not reached"
**Symptoms:** Proposal won't execute

**Causes:**
- Not enough "Yes" votes
- Total share percentage of "Yes" votes < threshold

**Check:**
```sql
SELECT 
  p.id,
  p.voting_threshold,
  SUM(CASE WHEN v.vote = true THEN v.share_percentage ELSE 0 END) as yes_votes
FROM coownership_proposals p
LEFT JOIN coownership_votes v ON v.proposal_id = p.id
WHERE p.id = '<proposal_id>'
GROUP BY p.id;
```

---

## Trip Management Issues

### Error: "Failed to create trip"
**Symptoms:** Trip form submission fails

**Causes:**
- Authentication expired
- Missing required fields
- Invalid date range
- Boat ID doesn't exist

**Solutions:**
```
1. Reconnect wallet (re-authenticate)
2. Verify all required fields filled
3. Ensure date_to > date_from
4. Check boat exists in your gallery
```

### Error: "Cannot add companion"
**Symptoms:** Companion wallet not saving

**Causes:**
- Invalid wallet address format
- RLS policy blocking insert
- Duplicate companion

**Validation:**
```typescript
// Check valid Solana address:
try {
  new PublicKey(companionAddress);
} catch {
  toast.error('Invalid wallet address');
  return;
}

// Check for duplicates:
const exists = companions.some(c => c.wallet === companionAddress);
```

### Error: "Chat messages not loading"
**Symptoms:** TripChatDialog shows no messages

**Causes:**
- RLS policy preventing read
- Real-time subscription not connected
- User not in trip_companions

**Debug:**
```sql
-- Check if user has access:
SELECT * FROM trip_companions 
WHERE trip_id = '<trip_id>' 
  AND (
    companion_wallet_address = '<your_wallet>'
    OR trip_id IN (
      SELECT id FROM trip_offers 
      WHERE wallet_address = '<your_wallet>'
    )
  );

-- Check realtime is enabled:
SELECT * FROM pg_publication_tables 
WHERE tablename = 'trip_messages';
```

### Error: "Trip not visible in Finder"
**Symptoms:** Public trip doesn't show

**Causes:**
- `public_visibility` set to false
- Trip created by authenticated user not showing own trips
- Date filters excluding trip

**Solutions:**
```
1. Edit trip, toggle public visibility ON
2. Check date range is future
3. Verify trip exists in database
```

---

## Authentication Errors

### Error: "Signature verification failed"
**Symptoms:** Cannot authenticate with wallet

**Causes:**
- Wrong message signed
- Signature encoding issue
- Edge function error

**Debug Edge Function:**
```typescript
// In supabase/functions/auth-wallet/index.ts
console.log('Wallet:', walletAddress);
console.log('Message:', message);
console.log('Signature:', signature);

// Verify signature locally:
const signatureUint8 = bs58.decode(signature);
const messageUint8 = new TextEncoder().encode(message);
const publicKeyUint8 = bs58.decode(walletAddress);

const verified = nacl.sign.detached.verify(
  messageUint8,
  signatureUint8,
  publicKeyUint8
);
```

### Error: "User creation failed"
**Symptoms:** Auth succeeds but no session

**Causes:**
- Supabase admin client issue
- Email format invalid
- User already exists but fetch failed

**Solutions:**
```
1. Check edge function logs in Lovable Cloud
2. Verify email format: {wallet}@solana.wallet
3. Try different wallet
4. Clear browser cache and retry
```

### Error: "JWT expired"
**Symptoms:** Authenticated actions fail after time

**Causes:**
- Session expired (default 1 hour)
- Token not refreshed

**Solutions:**
```
1. Reconnect wallet to re-authenticate
2. Implement auto-refresh in useWalletAuth:

useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
      }
    }
  );
  return () => subscription.unsubscribe();
}, []);
```

---

## Database/RLS Errors

### Error: "new row violates row-level security policy"
**Symptoms:** Insert/update fails despite being authenticated

**Causes:**
- RLS policy conditions not met
- Wrong user ID in JWT
- Missing wallet_address in app_metadata

**Debug:**
```sql
-- Check current user's metadata:
SELECT auth.jwt();

-- Test RLS policy:
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "user-id", "app_metadata": {"wallet_address": "your-wallet"}}';
INSERT INTO boats (...) VALUES (...);
```

### Error: "permission denied for table"
**Symptoms:** Query blocked entirely

**Causes:**
- RLS enabled but no policies
- Service role key used incorrectly
- Wrong schema access

**Fix:**
```sql
-- Ensure policies exist:
SELECT * FROM pg_policies WHERE tablename = 'boats';

-- Grant basic access:
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON boats TO authenticated;
```

### Error: "Foreign key constraint violation"
**Symptoms:** Insert fails with FK error

**Causes:**
- Referenced boat_id doesn't exist
- Referenced trip_id deleted
- Vault_id not found

**Solutions:**
```
1. Verify parent record exists
2. Use LEFT JOIN to fetch related data
3. Add ON DELETE CASCADE if appropriate
```

---

## Network & RPC Issues

### Error: "429 Too Many Requests"
**Symptoms:** RPC calls failing frequently

**Causes:**
- Rate limit hit on public RPC
- Too many requests in short time

**Solutions:**
```typescript
// Use custom RPC (Helius, QuickNode, etc.):
const endpoint = 'https://your-custom-rpc.com';

// Or implement retry logic:
const fetchWithRetry = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
};
```

### Error: "Failed to fetch"
**Symptoms:** Network requests fail

**Causes:**
- No internet connection
- CORS issues
- RPC node down
- Supabase outage

**Solutions:**
```
1. Check internet connection
2. Try different RPC endpoint
3. Check Supabase status page
4. Verify CORS settings in edge functions
```

---

## UI/Display Problems

### Error: "Blank screen / White screen"
**Symptoms:** App doesn't load

**Causes:**
- JavaScript error on mount
- Missing environment variables
- Build error

**Debug:**
```
1. Open browser console (F12)
2. Check for red errors
3. Verify .env file exists with:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_PUBLISHABLE_KEY
4. Run: npm run dev
```

### Error: "Images not loading"
**Symptoms:** Broken image icons

**Causes:**
- Import path incorrect
- Asset not in src/assets
- Build didn't copy assets

**Solutions:**
```typescript
// Correct import:
import heroImage from "@/assets/hero-maritime.jpg";

// Use in JSX:
<img src={heroImage} alt="Hero" />

// NOT:
<img src="/src/assets/hero-maritime.jpg" /> // ❌ Wrong
```

### Error: "Spline 3D model not rendering"
**Symptoms:** SplineViewer shows nothing

**Causes:**
- Network blocking spline.design
- Scene URL invalid
- WebGL not supported

**Solutions:**
```
1. Check browser console for WebGL errors
2. Verify scene URL is accessible
3. Test in different browser
4. Disable browser extensions
```

### Error: "Toast notifications not showing"
**Symptoms:** No feedback on actions

**Causes:**
- Toaster component not mounted
- z-index issue
- Toast imported from wrong path

**Fix:**
```typescript
// Ensure Toaster in App.tsx:
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <>
      <Routes>...</Routes>
      <Toaster />
    </>
  );
}

// Use correct import:
import { toast } from "@/hooks/use-toast";
```

---

## General Debugging Tips

### Enable Verbose Logging
```typescript
// In mintBoatNFT.ts or other functions:
const DEBUG = true;

if (DEBUG) {
  console.log('Step 1: Deriving PDAs...');
  console.log('Mint PDA:', mintPDA.toString());
  console.log('Boat NFT PDA:', boatNFTPDA.toString());
}
```

### Check Transaction Logs
```typescript
try {
  const tx = await program.methods.mintBoatNft(...).rpc();
} catch (error) {
  if (error.logs) {
    console.error('Transaction logs:', error.logs);
    // Parse logs for specific error messages
    const logs = error.logs.join(' ');
    if (logs.includes('insufficient funds')) {
      toast.error('Not enough SOL');
    }
  }
}
```

### Inspect Network Requests
```
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Check Supabase API calls
5. Look for 401/403 errors (auth issues)
6. Verify request payloads
```

### Use Solana Explorer
```
1. Copy transaction signature
2. Go to: https://explorer.solana.com/?cluster=devnet
3. Paste signature in search
4. Review:
   - Transaction status
   - Program logs
   - Account changes
   - Fees paid
```

---

## Getting Help

If issues persist:

1. **Check Browser Console** - Most errors appear here first
2. **Review Edge Function Logs** - Via Lovable Cloud backend
3. **Test in Incognito Mode** - Rules out extension conflicts
4. **Try Different Wallet** - Isolates wallet-specific issues
5. **Check Devnet Status** - Solana status page
6. **Search Solana Discord** - Active community support
7. **Review Anchor Docs** - Program-specific errors

**Useful Commands:**
```bash
# Check Solana CLI version
solana --version

# Get current cluster
solana config get

# Check balance
solana balance <ADDRESS> --url devnet

# View recent transactions
solana transaction-history <ADDRESS> --url devnet
```

---

**Last Updated:** 2025-10-30
**Project:** Solimare RWA Platform
