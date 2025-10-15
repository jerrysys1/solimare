pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use std::str::FromStr;

pub use constants::*;
pub use instructions::*;
pub use state::*;
pub use error::*;

declare_id!("56yP47TcGCJ16JV6NGiv5fUNAYsYaG1zy7YhKV9CDcZ9");

#[program]
pub mod rwa_marketplace {
    use super::*;

    /// Initialize the marketplace with admin and fee configuration
    ///
    /// Accounts:
    /// 0. `[writable, signer]` fee_payer: [AccountInfo] 
    /// 1. `[writable]` marketplace: [Marketplace] 
    /// 2. `[signer]` admin: [AccountInfo] Admin account for marketplace
    /// 3. `[]` system_program: [AccountInfo] Auto-generated, for account initialization
    ///
    /// Data:
    /// - treasury: [Pubkey] Treasury account for collecting fees
    /// - fee_bps: [u16] Fee in basis points
    pub fn initialize_marketplace(ctx: Context<InitializeMarketplace>, treasury: Pubkey, fee_bps: u16) -> Result<()> {
        initialize_marketplace::handler(ctx, treasury, fee_bps)
    }

    /// Create a new RWA asset
    ///
    /// Accounts:
    /// 0. `[writable, signer]` fee_payer: [AccountInfo] 
    /// 1. `[writable]` marketplace: [Marketplace] 
    /// 2. `[writable]` asset: [Asset] 
    /// 3. `[signer]` owner: [AccountInfo] Owner account for the asset
    /// 4. `[]` system_program: [AccountInfo] Auto-generated, for account initialization
    ///
    /// Data:
    /// - asset_id: [u64] Unique identifier for the asset
    /// - name: [String] Name of the asset
    /// - description: [String] type
    /// - asset_type: [u8] Type of asset
    /// - value_usd: [u64] Current USD value of the asset
    /// - metadata_uri: [String] URI to asset metadata
    pub fn create_asset(ctx: Context<CreateAsset>, asset_id: u64, name: String, description: String, asset_type: u8, value_usd: u64, metadata_uri: String) -> Result<()> {
        create_asset::handler(ctx, asset_id, name, description, asset_type, value_usd, metadata_uri)
    }

    /// Create a new RWA asset (alternative instruction)
    ///
    /// Accounts:
    /// 0. `[writable, signer]` fee_payer: [AccountInfo] 
    /// 1. `[writable]` marketplace: [Marketplace] 
    /// 2. `[writable]` asset: [Asset] 
    /// 3. `[signer]` owner: [AccountInfo] Owner account for the asset
    /// 4. `[]` system_program: [AccountInfo] Auto-generated, for account initialization
    ///
    /// Data:
    /// - asset_id: [u64] Unique identifier for the asset
    /// - name: [String] Name of the asset
    /// - description: [String] type
    /// - asset_type: [u8] Type of asset
    /// - value_usd: [u64] Current USD value of the asset
    /// - metadata_uri: [String] URI to asset metadata
    pub fn create_rwa(ctx: Context<CreateRwa>, asset_id: u64, name: String, description: String, asset_type: u8, value_usd: u64, metadata_uri: String) -> Result<()> {
        create_rwa::handler(ctx, asset_id, name, description, asset_type, value_usd, metadata_uri)
    }

    /// Verify an asset by the marketplace admin
    ///
    /// Accounts:
    /// 0. `[writable, signer]` fee_payer: [AccountInfo] 
    /// 1. `[writable]` marketplace: [Marketplace] 
    /// 2. `[writable]` asset: [Asset] 
    /// 3. `[signer]` admin: [AccountInfo] Admin account
    ///
    /// Data:
    /// - asset_id: [u64] Asset identifier
    pub fn verify_asset(ctx: Context<VerifyAsset>, asset_id: u64) -> Result<()> {
        verify_asset::handler(ctx, asset_id)
    }

    /// List an asset for sale
    ///
    /// Accounts:
    /// 0. `[writable, signer]` fee_payer: [AccountInfo] 
    /// 1. `[writable]` marketplace: [Marketplace] 
    /// 2. `[writable]` asset: [Asset] 
    /// 3. `[writable]` listing: [AssetListing] 
    /// 4. `[signer]` seller: [AccountInfo] Seller account
    /// 5. `[]` system_program: [AccountInfo] Auto-generated, for account initialization
    ///
    /// Data:
    /// - asset_id: [u64] Asset identifier
    /// - price_usd: [u64] Listing price in USD
    /// - currency: [String] Currency code
    pub fn list_asset(ctx: Context<ListAsset>, asset_id: u64, price_usd: u64, currency: String) -> Result<()> {
        list_asset::handler(ctx, asset_id, price_usd, currency)
    }

    /// Create a listing for an RWA asset
    ///
    /// Accounts:
    /// 0. `[writable, signer]` fee_payer: [AccountInfo] 
    /// 1. `[writable]` marketplace: [Marketplace] 
    /// 2. `[writable]` asset: [Asset] 
    /// 3. `[writable]` listing: [AssetListing] 
    /// 4. `[signer]` seller: [AccountInfo] Seller account
    /// 5. `[]` system_program: [AccountInfo] Auto-generated, for account initialization
    ///
    /// Data:
    /// - asset_id: [u64] Asset identifier
    /// - price_usd: [u64] Listing price in USD
    /// - currency: [String] Currency code
    pub fn create_listing(ctx: Context<CreateListing>, asset_id: u64, price_usd: u64, currency: String) -> Result<()> {
        create_listing::handler(ctx, asset_id, price_usd, currency)
    }

    /// Cancel an active listing
    ///
    /// Accounts:
    /// 0. `[writable, signer]` fee_payer: [AccountInfo] 
    /// 1. `[writable]` marketplace: [Marketplace] 
    /// 2. `[writable]` asset: [Asset] 
    /// 3. `[writable]` listing: [AssetListing] 
    /// 4. `[signer]` seller: [AccountInfo] Seller account
    ///
    /// Data:
    /// - asset_id: [u64] Asset identifier
    pub fn cancel_listing(ctx: Context<CancelListing>, asset_id: u64) -> Result<()> {
        cancel_listing::handler(ctx, asset_id)
    }

    /// Purchase an asset from an active listing
    ///
    /// Accounts:
    /// 0. `[writable, signer]` fee_payer: [AccountInfo] 
    /// 1. `[writable]` marketplace: [Marketplace] 
    /// 2. `[writable]` asset: [Asset] 
    /// 3. `[writable]` listing: [AssetListing] 
    /// 4. `[signer]` buyer: [AccountInfo] Buyer account
    /// 5. `[writable]` buyer_usdc_account: [AccountInfo] Buyer's USDC token account
    /// 6. `[writable]` seller_usdc_account: [AccountInfo] Seller's USDC token account
    /// 7. `[writable]` treasury_usdc_account: [AccountInfo] Treasury's USDC token account
    /// 8. `[]` usdc_mint: [Mint] USDC mint account
    /// 9. `[writable]` source: [AccountInfo] The source account.
    /// 10. `[]` mint: [Mint] The token mint.
    /// 11. `[writable]` destination: [AccountInfo] The destination account.
    /// 12. `[signer]` authority: [AccountInfo] The source account's owner/delegate.
    /// 13. `[]` token_program: [AccountInfo] Auto-generated, TokenProgram
    ///
    /// Data:
    /// - asset_id: [u64] Asset identifier
    /// - amount: [u64] Amount to pay for the asset
    pub fn buy_asset(ctx: Context<BuyAsset>, asset_id: u64, amount: u64) -> Result<()> {
        buy_asset::handler(ctx, asset_id, amount)
    }

    /// Buy an RWA asset from an active listing
    ///
    /// Accounts:
    /// 0. `[writable, signer]` fee_payer: [AccountInfo] 
    /// 1. `[writable]` marketplace: [Marketplace] 
    /// 2. `[writable]` asset: [Asset] 
    /// 3. `[writable]` listing: [AssetListing] 
    /// 4. `[signer]` buyer: [AccountInfo] Buyer account
    /// 5. `[writable]` buyer_usdc_account: [AccountInfo] Buyer's USDC token account
    /// 6. `[writable]` seller_usdc_account: [AccountInfo] Seller's USDC token account
    /// 7. `[writable]` treasury_usdc_account: [AccountInfo] Treasury's USDC token account
    /// 8. `[]` usdc_mint: [Mint] USDC mint account
    /// 9. `[writable]` source: [AccountInfo] The source account.
    /// 10. `[]` mint: [Mint] The token mint.
    /// 11. `[writable]` destination: [AccountInfo] The destination account.
    /// 12. `[signer]` authority: [AccountInfo] The source account's owner/delegate.
    /// 13. `[]` token_program: [AccountInfo] Auto-generated, TokenProgram
    ///
    /// Data:
    /// - asset_id: [u64] Asset identifier
    /// - amount: [u64] Amount to pay for the asset
    pub fn buy_rwa(ctx: Context<BuyRwa>, asset_id: u64, amount: u64) -> Result<()> {
        buy_rwa::handler(ctx, asset_id, amount)
    }

    /// Make an offer on an asset
    ///
    /// Accounts:
    /// 0. `[writable, signer]` fee_payer: [AccountInfo] 
    /// 1. `[writable]` marketplace: [Marketplace] 
    /// 2. `[writable]` asset: [Asset] 
    /// 3. `[writable]` offer: [AssetOffer] 
    /// 4. `[signer]` buyer: [AccountInfo] Buyer account
    /// 5. `[]` system_program: [AccountInfo] Auto-generated, for account initialization
    ///
    /// Data:
    /// - asset_id: [u64] Asset identifier
    /// - offer_id: [u64] Unique offer identifier
    /// - price_usd: [u64] Offer price in USD
    /// - currency: [String] Currency code
    pub fn make_offer(ctx: Context<MakeOffer>, asset_id: u64, offer_id: u64, price_usd: u64, currency: String) -> Result<()> {
        make_offer::handler(ctx, asset_id, offer_id, price_usd, currency)
    }

    /// Accept a buyer's offer
    ///
    /// Accounts:
    /// 0. `[writable, signer]` fee_payer: [AccountInfo] 
    /// 1. `[writable]` marketplace: [Marketplace] 
    /// 2. `[writable]` asset: [Asset] 
    /// 3. `[writable]` offer: [AssetOffer] 
    /// 4. `[signer]` seller: [AccountInfo] Seller account
    /// 5. `[writable]` buyer_usdc_account: [AccountInfo] Buyer's USDC token account
    /// 6. `[writable]` seller_usdc_account: [AccountInfo] Seller's USDC token account
    /// 7. `[writable]` treasury_usdc_account: [AccountInfo] Treasury's USDC token account
    /// 8. `[]` usdc_mint: [Mint] USDC mint account
    /// 9. `[writable]` source: [AccountInfo] The source account.
    /// 10. `[]` mint: [Mint] The token mint.
    /// 11. `[writable]` destination: [AccountInfo] The destination account.
    /// 12. `[signer]` authority: [AccountInfo] The source account's owner/delegate.
    /// 13. `[]` token_program: [AccountInfo] Auto-generated, TokenProgram
    ///
    /// Data:
    /// - asset_id: [u64] Asset identifier
    /// - offer_id: [u64] Offer identifier
    /// - amount: [u64] Amount to pay for the asset
    pub fn accept_offer(ctx: Context<AcceptOffer>, asset_id: u64, offer_id: u64, amount: u64) -> Result<()> {
        accept_offer::handler(ctx, asset_id, offer_id, amount)
    }

    /// Create an asset ownership record
    ///
    /// Accounts:
    /// 0. `[writable, signer]` fee_payer: [AccountInfo] 
    /// 1. `[writable]` asset_owner: [AssetOwner] 
    /// 2. `[signer]` owner: [AccountInfo] Owner account
    /// 3. `[]` system_program: [AccountInfo] Auto-generated, for account initialization
    ///
    /// Data:
    /// - asset_id: [u64] Asset identifier
    /// - shares: [u64] Number of shares owned
    pub fn create_asset_owner(ctx: Context<CreateAssetOwner>, asset_id: u64, shares: u64) -> Result<()> {
        create_asset_owner::handler(ctx, asset_id, shares)
    }

    /// Transfer asset shares between owners
    ///
    /// Accounts:
    /// 0. `[writable, signer]` fee_payer: [AccountInfo] 
    /// 1. `[writable]` asset: [Asset] 
    /// 2. `[writable]` transfer: [AssetTransfer] 
    /// 3. `[signer]` from_owner: [AccountInfo] From owner account
    /// 4. `[]` to_owner: [AccountInfo] To owner account
    /// 5. `[]` system_program: [AccountInfo] Auto-generated, for account initialization
    ///
    /// Data:
    /// - asset_id: [u64] Asset identifier
    /// - transfer_id: [u64] Unique transfer identifier
    /// - shares: [u64] Number of shares to transfer
    pub fn transfer_asset_shares(ctx: Context<TransferAssetShares>, asset_id: u64, transfer_id: u64, shares: u64) -> Result<()> {
        transfer_asset_shares::handler(ctx, asset_id, transfer_id, shares)
    }

    /// Transfer ownership of an RWA asset
    ///
    /// Accounts:
    /// 0. `[writable, signer]` fee_payer: [AccountInfo] 
    /// 1. `[writable]` asset: [Asset] 
    /// 2. `[signer]` owner: [AccountInfo] Current owner account
    /// 3. `[]` system_program: [AccountInfo] Auto-generated, for account initialization
    ///
    /// Data:
    /// - asset_id: [u64] Asset identifier
    /// - new_owner: [Pubkey] New owner's public key
    pub fn transfer_ownership(ctx: Context<TransferOwnership>, asset_id: u64, new_owner: Pubkey) -> Result<()> {
        transfer_ownership::handler(ctx, asset_id, new_owner)
    }

    /// Lock an RWA asset (prevent further transfers)
    ///
    /// Accounts:
    /// 0. `[writable, signer]` fee_payer: [AccountInfo] 
    /// 1. `[writable]` asset: [Asset] 
    /// 2. `[signer]` owner: [AccountInfo] Owner account
    /// 3. `[]` system_program: [AccountInfo] Auto-generated, for account initialization
    ///
    /// Data:
    /// - asset_id: [u64] Asset identifier
    pub fn lock_rwa(ctx: Context<LockRwa>, asset_id: u64) -> Result<()> {
        lock_rwa::handler(ctx, asset_id)
    }

    /// Unlock an RWA asset (allow transfers again)
    ///
    /// Accounts:
    /// 0. `[writable, signer]` fee_payer: [AccountInfo] 
    /// 1. `[writable]` asset: [Asset] 
    /// 2. `[signer]` owner: [AccountInfo] Owner account
    /// 3. `[]` system_program: [AccountInfo] Auto-generated, for account initialization
    ///
    /// Data:
    /// - asset_id: [u64] Asset identifier
    pub fn unlock_rwa(ctx: Context<UnlockRwa>, asset_id: u64) -> Result<()> {
        unlock_rwa::handler(ctx, asset_id)
    }
}