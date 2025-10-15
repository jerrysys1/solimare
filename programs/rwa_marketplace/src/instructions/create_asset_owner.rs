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
	shares: u64,
)]
pub struct CreateAssetOwner<'info> {
	#[account(
		mut,
	)]
	pub fee_payer: Signer<'info>,

	#[account(
		init,
		space=64,
		payer=fee_payer,
		seeds = [
			b"asset_owner",
			asset_id.to_le_bytes().as_ref(),
			owner.key().as_ref(),
		],
		bump,
	)]
	pub asset_owner: Account<'info, AssetOwner>,

	pub owner: Signer<'info>,

	pub system_program: Program<'info, System>,
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
pub fn handler(
	ctx: Context<CreateAssetOwner>,
	asset_id: u64,
	shares: u64,
) -> Result<()> {
    // Create the asset owner record
    let asset_owner = &mut ctx.accounts.asset_owner;
    asset_owner.asset_id = asset_id;
    asset_owner.owner = ctx.accounts.owner.key();
    asset_owner.shares = shares;
    asset_owner.bump = ctx.bumps.asset_owner;

    Ok(())
}