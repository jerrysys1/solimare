# 🏢 RWA Marketplace - Real World Asset Trading Platform

A comprehensive Real World Asset (RWA) marketplace built on the Solana blockchain using the [Anchor framework](https://book.anchor-lang.com/). This platform enables the tokenization, trading, and management of real-world assets such as real estate, commodities, art, and other physical assets on-chain.

---

## ✨ Features

### 🎯 Core Marketplace Functions
- **Asset Creation & Tokenization**: Create digital representations of real-world assets
- **Asset Verification**: Admin-controlled verification system for asset authenticity
- **Listing & Trading**: List assets for sale with flexible pricing mechanisms
- **Offer System**: Make and accept offers on assets
- **Ownership Management**: Track and transfer asset ownership with share-based system
- **Asset Locking**: Secure assets by preventing unauthorized transfers

### 🔐 Security & Compliance
- **USDC-based Transactions**: All payments processed in USDC for stability
- **Fee Management**: Configurable marketplace fees collected by treasury
- **Access Controls**: Role-based permissions for different operations
- **Asset Verification**: Mandatory verification process for asset legitimacy

### 💼 Advanced Features
- **Fractional Ownership**: Support for share-based asset ownership
- **Transfer History**: Complete audit trail of asset transfers
- **Metadata Support**: Rich metadata storage with IPFS integration
- **Multi-currency Support**: Flexible currency options for listings

---

## 🏗️ Architecture Overview

### Program ID
```
56yP47TcGCJ16JV6NGiv5fUNAYsYaG1zy7YhKV9CDcZ9
```

### State Accounts

#### 📊 Marketplace
Global marketplace configuration and statistics
```rust
pub struct Marketplace {
    pub admin: Pubkey,           // Marketplace administrator
    pub treasury: Pubkey,        // Fee collection account
    pub fee_bps: u16,           // Fee in basis points (e.g., 250 = 2.5%)
    pub total_assets: u64,      // Total assets created
    pub total_listings: u64,    // Total listings created
    pub bump: u8,               // PDA bump seed
}
```

#### 🏠 Asset
Individual real-world asset representation
```rust
pub struct Asset {
    pub asset_id: u64,          // Unique asset identifier
    pub owner: Pubkey,          // Current asset owner
    pub name: String,           // Asset name
    pub description: String,    // Asset description
    pub asset_type: u8,         // Asset category (0=Real Estate, 1=Art, etc.)
    pub value_usd: u64,         // Current USD valuation
    pub metadata_uri: String,   // IPFS metadata URI
    pub is_listed: bool,        // Currently listed for sale
    pub is_verified: bool,      // Verified by marketplace admin
    pub created_at: i64,        // Creation timestamp
    pub bump: u8,               // PDA bump seed
}
```

#### 🏷️ Asset Listing
Active marketplace listings
```rust
pub struct AssetListing {
    pub asset_id: u64,          // Associated asset ID
    pub seller: Pubkey,         // Seller's wallet
    pub price_usd: u64,         // Listing price in USD
    pub currency: String,       // Payment currency
    pub created_at: i64,        // Listing creation time
    pub is_active: bool,        // Listing status
    pub bump: u8,               // PDA bump seed
}
```

#### 💰 Asset Offer
Buyer offers on assets
```rust
pub struct AssetOffer {
    pub asset_id: u64,          // Target asset ID
    pub offer_id: u64,          // Unique offer identifier
    pub buyer: Pubkey,          // Buyer's wallet
    pub price_usd: u64,         // Offer amount in USD
    pub currency: String,       // Payment currency
    pub created_at: i64,        // Offer creation time
    pub is_active: bool,        // Offer status
    pub bump: u8,               // PDA bump seed
}
```

#### 👥 Asset Owner
Ownership tracking with share support
```rust
pub struct AssetOwner {
    pub asset_id: u64,          // Associated asset ID
    pub owner: Pubkey,          // Owner's wallet
    pub shares: u64,            // Number of shares owned
    pub acquired_at: i64,       // Acquisition timestamp
    pub bump: u8,               // PDA bump seed
}
```

#### 🔄 Asset Transfer
Transfer history and tracking
```rust
pub struct AssetTransfer {
    pub asset_id: u64,          // Associated asset ID
    pub transfer_id: u64,       // Unique transfer identifier
    pub from_owner: Pubkey,     // Previous owner
    pub to_owner: Pubkey,       // New owner
    pub shares: u64,            // Shares transferred
    pub transfer_date: i64,     // Transfer timestamp
    pub bump: u8,               // PDA bump seed
}
```

---

## 🛠️ Instructions

### 🚀 Marketplace Management

#### `initialize_marketplace`
Initialize the marketplace with admin and fee configuration
```rust
pub fn initialize_marketplace(
    ctx: Context<InitializeMarketplace>,
    treasury: Pubkey,
    fee_bps: u16
) -> Result<()>
```

### 🏠 Asset Management

#### `create_asset` / `create_rwa`
Create a new real-world asset
```rust
pub fn create_asset(
    ctx: Context<CreateAsset>,
    asset_id: u64,
    name: String,
    description: String,
    asset_type: u8,
    value_usd: u64,
    metadata_uri: String
) -> Result<()>
```

#### `verify_asset`
Verify an asset (admin only)
```rust
pub fn verify_asset(
    ctx: Context<VerifyAsset>,
    asset_id: u64
) -> Result<()>
```

#### `lock_rwa` / `unlock_rwa`
Lock/unlock asset transfers
```rust
pub fn lock_rwa(ctx: Context<LockRwa>, asset_id: u64) -> Result<()>
pub fn unlock_rwa(ctx: Context<UnlockRwa>, asset_id: u64) -> Result<()>
```

### 🏷️ Trading Operations

#### `list_asset` / `create_listing`
List an asset for sale
```rust
pub fn list_asset(
    ctx: Context<ListAsset>,
    asset_id: u64,
    price_usd: u64,
    currency: String
) -> Result<()>
```

#### `cancel_listing`
Cancel an active listing
```rust
pub fn cancel_listing(
    ctx: Context<CancelListing>,
    asset_id: u64
) -> Result<()>
```

#### `buy_asset` / `buy_rwa`
Purchase an asset from listing
```rust
pub fn buy_asset(
    ctx: Context<BuyAsset>,
    asset_id: u64,
    amount: u64
) -> Result<()>
```

### 💰 Offer System

#### `make_offer`
Make an offer on an asset
```rust
pub fn make_offer(
    ctx: Context<MakeOffer>,
    asset_id: u64,
    offer_id: u64,
    price_usd: u64,
    currency: String
) -> Result<()>
```

#### `accept_offer`
Accept a buyer's offer
```rust
pub fn accept_offer(
    ctx: Context<AcceptOffer>,
    asset_id: u64,
    offer_id: u64,
    amount: u64
) -> Result<()>
```

### 👥 Ownership Management

#### `create_asset_owner`
Create ownership record
```rust
pub fn create_asset_owner(
    ctx: Context<CreateAssetOwner>,
    asset_id: u64,
    shares: u64
) -> Result<()>
```

#### `transfer_asset_shares`
Transfer asset shares between owners
```rust
pub fn transfer_asset_shares(
    ctx: Context<TransferAssetShares>,
    asset_id: u64,
    transfer_id: u64,
    shares: u64
) -> Result<()>
```

#### `transfer_ownership`
Transfer complete asset ownership
```rust
pub fn transfer_ownership(
    ctx: Context<TransferOwnership>,
    asset_id: u64,
    new_owner: Pubkey
) -> Result<()>
```

---

## 🚨 Error Codes

| Error | Description |
|-------|-------------|
| `Unauthorized` | Unauthorized access to protected operation |
| `AssetNotListed` | Asset is not currently listed for sale |
| `AssetAlreadyListed` | Asset is already listed |
| `InsufficientFunds` | Insufficient funds for purchase |
| `AssetNotVerified` | Asset has not been verified by admin |
| `OfferNotFound` | Specified offer does not exist |
| `InsufficientShares` | Insufficient shares for transfer |
| `AssetAlreadyExists` | Asset with this ID already exists |
| `SelfPurchase` | Cannot purchase your own asset |
| `AssetLocked` | Asset is locked and cannot be transferred |

---

## 🛡️ Security Features

### Access Control
- **Admin-only operations**: Asset verification, marketplace configuration
- **Owner-only operations**: Asset listing, transfer, locking
- **Buyer protections**: Verified asset requirements, escrow system

### Financial Security
- **USDC Integration**: Stable currency for all transactions
- **Fee Management**: Transparent fee structure with treasury collection
- **Escrow System**: Secure fund handling during transactions

### Asset Protection
- **Verification System**: Admin-controlled asset authenticity verification
- **Lock Mechanism**: Prevent unauthorized transfers when needed
- **Audit Trail**: Complete transaction and ownership history

---

## 🚀 Getting Started

### Prerequisites
- [Rust](https://rustup.rs/)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor Framework](https://book.anchor-lang.com/getting_started/installation.html)
- [Node.js](https://nodejs.org/) (for frontend)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd rwa_marketplace_program
```

2. **Install dependencies**
```bash
npm install
```

3. **Build the program**
```bash
anchor build
```

4. **Deploy to localnet**
```bash
anchor deploy
```

5. **Run tests**
```bash
anchor test
```

### Frontend Development

1. **Start development server**
```bash
npm run dev
```

2. **Build for production**
```bash
npm run build
```

---

## 🧪 Testing

The project includes comprehensive tests covering:
- Marketplace initialization
- Asset creation and verification
- Listing and trading operations
- Offer system functionality
- Ownership transfers
- Error handling scenarios

Run tests with:
```bash
anchor test
```

---

## 📁 Project Structure

```
rwa_marketplace_program/
├── programs/
│   └── rwa_marketplace/
│       ├── src/
│       │   ├── instructions/     # Program instructions
│       │   ├── state/           # Account structures
│       │   ├── error.rs         # Error definitions
│       │   ├── constants.rs     # Program constants
│       │   └── lib.rs          # Main program entry
│       └── Cargo.toml
├── app/                        # React frontend
├── tests/                      # Integration tests
├── Anchor.toml                # Anchor configuration
└── package.json               # Node.js dependencies
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the Codigo Terms of Service.

---

## 🔗 Resources

- [Anchor Documentation](https://book.anchor-lang.com/)
- [Solana Documentation](https://docs.solana.com/)
- [SPL Token Program](https://spl.solana.com/token)
- [Metaplex Documentation](https://docs.metaplex.com/)

---

## 📞 Support

For questions and support, please open an issue in the repository or contact the development team.

---

*Built with ❤️ on Solana*
