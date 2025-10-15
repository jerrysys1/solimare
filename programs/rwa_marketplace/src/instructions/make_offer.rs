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
	offer_id: u64,
	price_usd: u64,
	currency: String,
)]
pub struct MakeOffer<'info> {
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
		space=100,
		payer=fee_payer,
		seeds = [
			b"offer",
			asset_id.to_le_bytes().as_ref(),
			offer_id.to_le_bytes().as_ref(),
		],
		bump,
	)]
	pub offer: Account<'info, AssetOffer>,

	pub buyer: Signer<'info>,

	pub system_program: Program<'info, System>,
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
pub fn handler(
	ctx: Context<MakeOffer>,
	asset_id: u64,
	offer_id: u64,
	price_usd: u64,
	currency: String,
) -> Result<()> {
    // Validate that the asset is verified
    require!(ctx.accounts.asset.is_verified, RwaMarketplaceError::AssetNotVerified);
    
    // Create the offer
    let offer = &mut ctx.accounts.offer;
    offer.asset_id = asset_id;
    offer.offer_id = offer_id;
    offer.buyer = ctx.accounts.buyer.key();
    offer.price_usd = price_usd;
    offer.currency = currency;
    offer.status = 0; // Active status
    offer.created_at = Clock::get()?.unix_timestamp;
    offer.bump = ctx.bumps.offer;

    Ok(())
}