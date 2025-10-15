# 🛒 NFT Marketplace (Anchor)

A full-featured NFT Marketplace built on the Solana blockchain using the [Anchor framework](https://book.anchor-lang.com/). This project serves as a template for developers to build, extend, or learn from an on-chain NFT platform with essential marketplace mechanics such as listing, purchasing, delisting, and metadata verification.

---

## ✨ Features

- **NFT Listing & Delisting**  
  Users can list NFTs for sale and remove them from sale at any time.

- **NFT Purchase**  
  Buyers can purchase NFTs directly using SOL.

- **Escrow Vault System**  
  NFTs are securely escrowed in a program-owned account until they are sold or delisted.

- **On-Chain Metadata Parsing**  
  Verifies collection, creator, and metadata using the Metaplex token metadata standard.

- **Custom Marketplace Fee Support**  
  Configure protocol-level fees and set a treasury account to collect them.

---

## 🧱 Program Structure

**state** 
  - `marketplace.rs`
  - `listing.rs`
  - `mod.rs`

**instructions**
  - `initialize_marketplace.rs`
  - `list_nft.rs`
  - `delist_nft.rs`
  - `purchase_nft.rs`
  - `update_fee.rs`
  - `mod.rs`


---

## 🗂 State Accounts

### `marketplace.rs`
**Purpose**: Defines the global state of the marketplace, storing configuration and authority.

**Key Fields**:
- `authority`: Admin with permissions to update the marketplace.
- `fee_bps`: Marketplace fee in basis points (e.g., `250` = 2.5%).
- `treasury`: Account that collects protocol fees.
- `marketplace_bump`: PDA bump for the marketplace.
- `treasury_bump`: PDA bump for the treasury.

---

### `listing.rs`
**Purpose**: Represents a single NFT listing. Tracks NFT details, price, and status.

**Key Fields**:
- `maker`: Wallet address of the NFT owner.
- `nft_mint`: Mint address of the NFT.
- `price`: Asking price in SOL.
- `metadata`: PDA for verifying metadata.
- `bump`: PDA bump for the listing.
- `status`: Enum indicating if the listing is active, sold, or delisted.

---

## 🛠 Instructions

### `initialize_marketplace.rs`
**Functionality**:  
Initializes the marketplace with configuration details. Called once by the admin.

**Key Tasks**:
- Create and initialize the `Marketplace` account.
- Set the `authority`, `fee_bps`, and `treasury` address.
- Derive and verify PDAs using bump seeds.

---

### `list_nft.rs`
**Functionality**:  
Allows a user to list their NFT by transferring it into escrow.

**Key Tasks**:
- Verify NFT ownership and delegate rights.
- Transfer NFT to program-owned vault.
- Create and initialize the `Listing` account.
- Store price and metadata.

---

### `delist_nft.rs`
**Functionality**:  
Allows the maker to cancel a listing and retrieve their NFT.

**Key Tasks**:
- Validate that the requester owns the listing.
- Transfer NFT from escrow back to the maker.
- Close the listing account or mark it as inactive.

---

### `purchase_nft.rs`
**Functionality**:  
Allows a buyer to purchase a listed NFT by paying SOL. Handles fee routing and NFT transfer.

**Key Tasks**:
- Validate the listing is still active.
- Transfer SOL to the maker and fee to the treasury.
- Transfer NFT to the buyer.
- Close or update the listing as sold.

---

### `update_fee.rs`
**Functionality**:  
Lets the marketplace authority update the fee or treasury configuration.

**Key Tasks**:
- Confirm signer is the current authority.
- Update `fee_bps` and optionally the `treasury` address.

---

