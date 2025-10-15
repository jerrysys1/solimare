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
)]
pub struct CancelListing<'info> {
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
		mut,
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
pub fn handler(
	ctx: Context<CancelListing>,
	asset_id: u64,
) -> Result<()> {
    // Validate that the seller is the asset owner
    require!(ctx.accounts.asset.owner == ctx.accounts.seller.key(), RwaMarketplaceError::Unauthorized);
    
    // Validate that the listing exists and belongs to the asset
    require!(ctx.accounts.listing.asset_id == asset_id, RwaMarketplaceError::InvalidListing);
    
    // Validate that the listing is active
    require!(ctx.accounts.asset.is_listed, RwaMarketplaceError::AssetNotListed);
    
    // Remove the listing
    ctx.accounts.asset.is_listed = false;

    Ok(())
}