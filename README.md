Introduction
Solimare is a Real-World Asset (RWA) platform built on Solana, enabling:

Fractional boat ownership via NFT-backed vaults.
Co-ownership management with voting and proposals.
Trip planning & coordination for boat usage.
Secure on-chain transactions with SPL tokens.

The platform bridges traditional boat ownership with Web3, allowing users to:
✔ Mint Boat NFTs (backed by real-world assets)
✔ Manage co-ownership shares
✔ Plan & book trips with companions
✔ Vote on proposals (maintenance, sales, usage)
✔ Transfer ownership securely

Key Features



Feature
Description



Boat NFT Minting
Create NFTs representing real-world boats with metadata (registration, type, maintenance history).


Fractional Ownership
Split ownership into shares (e.g., 50/50, 30/30/40) with voting rights.


Co-Ownership Vaults
Secure on-chain vaults managing shared assets and proposals.


Trip Management
Plan trips, invite companions, and coordinate boat usage.


Proposal System
Vote on maintenance, sales, or usage rules (e.g., "Sell boat for $X").


Real-Time Chat
In-app messaging for trip coordination.


Wallet Auth
Sign-in with Solana wallets (Phantom, Solflare).


Row-Level Security (RLS)
Supabase RLS policies ensure data privacy.



Technical Stack
Blockchain

Solana (Devnet)
Anchor Framework (Smart contracts)
SPL Token Program (NFT-backed ownership)
Associated Token Accounts (ATA) (Token management)

Frontend

Next.js 14 (App Router)
TypeScript
Tailwind CSS + ShadCN UI (Components)
TanStack Query (React Query) (Data fetching)
Spline 3D (Boat model visualization)
Wallet Adapter (Phantom, Solflare support)

Backend & Database

Supabase (PostgreSQL + Auth + Realtime)
Row-Level Security (RLS) (Data permissions)
Edge Functions (Wallet authentication)
Lovable Cloud (Hosting)

DevOps

Docker (Local PostgreSQL)
Vercel (Frontend hosting)
GitHub Actions (CI/CD)


Getting Started
Prerequisites



Tool
Version
Purpose



Node.js
≥18.x
Frontend runtime


npm / pnpm
Latest
Package manager


Solana CLI
≥1.16
Blockchain interactions


Anchor
≥0.29
Smart contract development


Docker
Latest
Local Supabase setup


Phantom Wallet
Latest
Browser extension for testing


Installation

Clone the repository:
git clone https://github.com/jerrysys1/solimare
cd solimare

Install dependencies:
pnpm install  # or npm install

Set up Solana CLI:
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/devnet.json  # If no wallet
solana airdrop 2  # Get test SOL

Start local Supabase (optional):
docker compose up -d  # Uses docker-compose.yml


Environment Setup
Copy .env.example to .env and update:
# Frontend
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-key
VITE_SOLANA_NETWORK=devnet
VITE_PROGRAM_ID=your-program-id

# Supabase (for local dev)
SUPABASE_DB_PASSWORD=your-password

Smart Contracts
The RWA Boat NFT Program (rwa_boat_nft_program) handles:

Boat NFT minting (with metadata)
Ownership transfers
Co-ownership vaults
Proposal voting

Key Accounts



Account
Purpose
PDA Seeds



Config
Global program settings
["config", authority_pubkey]


BoatNFT
Boat metadata storage
["boat", mint_pubkey]


Vault
Co-ownership shares
["vault", boat_mint_pubkey]


Proposal
Voting proposals
["proposal", vault_pubkey, proposal_id]


Instructions



Instruction
Description
Args



initialize_config
Set up program (fees, treasury)
fee_bps, treasury


mint_boat_nft
Create a new Boat NFT
name, boat_type, registration_number, ...


transfer_ownership
Move NFT to new owner
new_owner


create_vault
Initialize co-ownership
shares (array of % allocations)


create_proposal
Start a vote
title, description, threshold


cast_vote
Vote on a proposal
vote (bool)


Building & Deploying
# Build
anchor build

# Test locally
anchor test

# Deploy to Devnet
anchor deploy --provider.cluster devnet

Frontend Structure
src/
├── app/               # Next.js 14 App Router
│   ├── (auth)/        # Authenticated routes
│   ├── (public)/      # Public routes
│   ├── gallery/       # Boat NFT gallery
│   ├── trips/         # Trip management
│   └── vaults/        # Co-ownership vaults
├── components/        # Reusable UI (WalletProvider, BoatCard)
├── hooks/             # Custom hooks (useWalletAuth, useBoatNFT)
├── lib/               # Utilities (solana-client, supabase)
├── stores/            # Zustand state management
└── styles/            # Global CSS
Key Pages



Route
Purpose



/
Landing page (public)


/gallery
Boat NFT gallery


/mint
Mint a new Boat NFT


/vaults/[id]
Co-ownership vault dashboard


/trips
Trip management


/trips/[id]
Trip details & chat



Database Schema
Supabase Tables



Table
Purpose
Key Columns



boats
Boat metadata
id, mint_address, registration_number, owner_wallet


coownership_shares
Vault shares
vault_id, wallet_address, share_percentage


coownership_proposals
Voting proposals
vault_id, title, voting_threshold, expires_at


coownership_votes
Vote records
proposal_id, wallet_address, vote (bool)


trips
Trip data
boat_id, date_from, date_to, organizer_wallet


trip_companions
Trip participants
trip_id, companion_wallet


trip_messages
Chat messages
trip_id, sender_wallet, content


RLS Policies
All tables use Row-Level Security to restrict access:

boats: Only visible to owners or public boats.
trips: Only accessible to organizers/companions.
proposals: Only vault members can view/vote.

Example policy:
-- Allow boat owners to update their boats
CREATE POLICY "Boat owners can update"
ON boats FOR UPDATE
USING (auth.uid() = owner_id);

Testing
Unit Tests (Frontend)
pnpm test

Uses Vitest + React Testing Library.
Covers:
Wallet connection flows
Form validation
API hooks



Anchor Tests (Smart Contracts)
anchor test

Tests:
NFT minting
Ownership transfers
Proposal voting
Edge cases (duplicate mints, invalid shares)



E2E Tests (Playwright)
pnpm e2e

Tests:
Full minting flow
Trip creation
Voting on proposals




Troubleshooting
See TROUBLESHOOTING.md for common issues:

Wallet Connection Issues
NFT Minting Errors
Transaction Failures
Database/RLS Errors


Contributing

Fork the repository.
Create a feature branch:git checkout -b feat/your-feature

Commit changes:git commit -m "feat: add X"

Push & open a PR.

Code Guidelines

TypeScript: Strict typing for all functions.
Anchor: Follow Anchor best practices.
Supabase: Use RLS for all tables.
Git: Use Conventional Commits.


License
MIT License – See LICENSE.

© 2025 Solimare. All rights reserved.