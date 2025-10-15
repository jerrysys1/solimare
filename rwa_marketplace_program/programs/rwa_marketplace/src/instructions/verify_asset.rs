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
pub struct VerifyAsset<'info> {
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

	pub admin: Signer<'info>,

	pub system_program: Program<'info, System>,
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
pub fn handler(
	ctx: Context<VerifyAsset>,
	asset_id: u64,
) -> Result<()> {
    // Validate that the caller is the marketplace admin
    require!(ctx.accounts.marketplace.admin == ctx.accounts.admin.key(), RwaMarketplaceError::Unauthorized);
    
    // Validate that the asset exists
    require!(ctx.accounts.asset.asset_id == asset_id, RwaMarketplaceError::InvalidListing);
    
    // Verify the asset
    ctx.accounts.asset.is_verified = true;

    Ok(())
}