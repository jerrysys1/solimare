use crate::*;
use anchor_lang::prelude::*;
use std::str::FromStr;

use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

#[derive(Accounts)]
#[instruction(
	asset_id: u64,
	price_usd: u64,
	currency: String,
)]
pub struct ListAsset<'info> {
	#[account(
		mut,
	)]
	pub fee_payer: Signer<'info>,

	#[account(
		mut,
		seeds = [
			b"marketplace",
		],
		bump,
	)]
	pub marketplace: Account<'info, Marketplace>,

	#[account(
		mut,
		seeds = [
			b"asset",
			asset_id.to_le_bytes().as_ref(),
		],
		bump,
	)]
	pub asset: Account<'info, Asset>,

	#[account(
		init,
		space=86,
		payer=fee_payer,
		seeds = [
			b"listing",
			asset_id.to_le_bytes().as_ref(),
		],
		bump,
	)]
	pub listing: Account<'info, AssetListing>,

	pub seller: Signer<'info>,

	pub system_program: Program<'info, System>,
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
pub fn handler(
	ctx: Context<ListAsset>,
	asset_id: u64,
	price_usd: u64,
	currency: String,
) -> Result<()> {
    // Validate that the seller is the asset owner
    require!(ctx.accounts.asset.owner == ctx.accounts.seller.key(), RwaMarketplaceError::Unauthorized);
    
    // Validate that the asset is verified
    require!(ctx.accounts.asset.is_verified, RwaMarketplaceError::AssetNotVerified);
    
    // Validate that the asset is not already listed
    require!(!ctx.accounts.asset.is_listed, RwaMarketplaceError::AssetAlreadyListed);
    
    // Create the listing
    let listing = &mut ctx.accounts.listing;
    listing.asset_id = asset_id;
    listing.price_usd = price_usd;
    listing.currency = currency;
    listing.seller = ctx.accounts.seller.key();
    listing.created_at = Clock::get()?.unix_timestamp;
    listing.updated_at = Clock::get()?.unix_timestamp;
    listing.status = 0; // Active status
    listing.bump = ctx.bumps.listing;
    
    // Mark the asset as listed
    ctx.accounts.asset.is_listed = true;

    Ok(())
}