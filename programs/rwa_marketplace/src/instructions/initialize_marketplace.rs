use crate::*;
use anchor_lang::prelude::*;
use std::str::FromStr;

use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct InitializeMarketplace<'info> {
	#[account(
		mut,
	)]
	pub fee_payer: Signer<'info>,

	#[account(
		init,
		space=8 + 32 + 32 + 2 + 8 + 8 + 1,
		payer=fee_payer,
		seeds = [
			b"marketplace",
		],
		bump,
	)]
	pub marketplace: Account<'info, Marketplace>,

	pub admin: Signer<'info>,

	pub system_program: Program<'info, System>,
}

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
pub fn handler(
	ctx: Context<InitializeMarketplace>,
	treasury: Pubkey,
	fee_bps: u16,
) -> Result<()> {
    let marketplace = &mut ctx.accounts.marketplace;
    marketplace.admin = ctx.accounts.admin.key();
    marketplace.treasury = treasury;
    marketplace.fee_bps = fee_bps;
    marketplace.total_assets = 0;
    marketplace.total_listings = 0;
    marketplace.bump = ctx.bumps.marketplace;

    Ok(())
}