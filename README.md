<div align="center">
  <h1>Solimare</h1>
  <p>🚤 Fractional Boat Ownership on Solana</p>

  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Solana](https://img.shields.io/badge/built%20on-Solana-319795?logo=solana)](https://solana.com)
  [![Next.js](https://img.shields.io/badge/built%20with-Next.js-000000?logo=next.js)](https://nextjs.org)
  [![Supabase](https://img.shields.io/badge/powered%20by-Supabase-3ECF8E?logo=supabase)](https://supabase.com)

  <br />

  <a href="https://solimare.gitbook.io/solimare">📖 Technical Documentation</a>
  ·
  <a href="https://github.com/jerrysys1/solimare/issues">🐛 Report Bug</a>
  ·
  <a href="https://github.com/jerrysys1/solimare/discussions">💬 Ask Question</a>
</div>

---

## 🌊 Introduction

Solimare is a **Real-World Asset (RWA) platform** built on **Solana**, enabling fractional boat ownership via **NFT-backed vaults** with co-ownership management, trip planning, and secure on-chain transactions.

### 🔹 Key Features
- ✅ **Fractional Ownership** – Split boat ownership into NFT-backed shares
- ✅ **Co-Ownership Vaults** – Secure on-chain management with voting & proposals
- ✅ **Trip Coordination** – Plan & book trips with companions
- ✅ **Proposal System** – Vote on maintenance, sales, and usage rules
- ✅ **Real-Time Chat** – In-app messaging for trip coordination
- ✅ **Wallet Auth** – Sign-in with **Phantom, Solflare**

---

## 🛠️ Technical Stack

| Category       | Technologies                                                                 |
|---------------|-----------------------------------------------------------------------------|
| **Blockchain** | Solana (Devnet), Anchor Framework, SPL Token Program, Associated Token Accounts |
| **Frontend**   | Next.js 14 (App Router), TypeScript, Tailwind CSS, ShadCN UI, TanStack Query, Spline 3D |
| **Backend**    | Supabase (PostgreSQL + Auth + Realtime), Edge Functions, Lovable Cloud     |
| **DevOps**     | Docker, Vercel, GitHub Actions                                              |

---

## 🚀 Getting Started

### ✅ Prerequisites
| Tool          | Version  | Purpose                     |
|--------------|---------|----------------------------|
| Node.js      | ≥18.x   | Frontend runtime           |
| npm / pnpm   | Latest  | Package manager            |
| Solana CLI   | ≥1.16   | Blockchain interactions    |
| Anchor       | ≥0.29   | Smart contract development |
| Docker       | Latest  | Local Supabase setup        |
| Phantom Wallet| Latest  | Browser extension for testing |

### 📥 Installation
```bash
git clone https://github.com/jerrysys1/solimare
cd solimare
pnpm install  # or npm install
🔧 Setup

Solana CLI
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/devnet.json  # If no wallet
solana airdrop 2  # Get test SOL

Local Supabase (Optional)
docker compose up -d  # Uses docker-compose.yml

Environment Variables
Copy .env.example to .env and update:
# Frontend
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-key
VITE_SOLANA_NETWORK=devnet
VITE_PROGRAM_ID=your-program-id

# Supabase (Local Dev)
SUPABASE_DB_PASSWORD=your-password



🏗️ Smart Contracts
The RWA Boat NFT Program (rwa_boat_nft_program) handles:

Boat NFT minting (with metadata)
Ownership transfers
Co-ownership vaults
Proposal voting

🔑 Key Accounts



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


📜 Instructions



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
Initialize co-ownership shares
array of % allocations


create_proposal
Start a vote
title, description, threshold


cast_vote
Vote on a proposal
vote (bool)



📂 Frontend Structure
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
🌐 Key Pages



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



🗃️ Database Schema (Supabase)



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


🔒 RLS Policies
All tables use Row-Level Security to restrict access:

boats: Only visible to owners or public boats.
trips: Only accessible to organizers/companions.
proposals: Only vault members can view/vote.

Example:
-- Allow boat owners to update their boats
CREATE POLICY "Boat owners can update" ON boats
FOR UPDATE USING (auth.uid() = owner_id);

🧪 Testing



Type
Command
Coverage



Unit Tests (Frontend)
pnpm test
Wallet connection flows, form validation, API hooks


Anchor Tests (Smart Contracts)
anchor test
NFT minting, ownership transfers, proposal voting


E2E Tests (Playwright)
pnpm e2e
Full minting flow, trip creation, voting



🤝 Contributing

Fork the repository
Create a feature branch:git checkout -b feat/your-feature

Commit changes:git commit -m "feat: add X"

Push & open a Pull Request

📜 Code Guidelines

TypeScript: Strict typing for all functions
Anchor: Follow Anchor best practices
Supabase: Use RLS for all tables
Git: Use Conventional Commits


🆘 Troubleshooting
See TROUBLESHOOTING.md for common issues:

Wallet connection errors
NFT minting failures
Transaction errors
Database/RLS issues


<div align="center">
  <sub>Built with ❤️ by <a href="https://solima.re">Solimare Team</a></sub>
</div>
