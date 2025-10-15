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
	transfer_id: u64,
	shares: u64,
)]
pub struct TransferAssetShares<'info> {
	#[account(
		mut,
	)]
	pub fee_payer: Signer<'info>,

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
		space=114,
		payer=fee_payer,
		seeds = [
			b"transfer",
			asset_id.to_le_bytes().as_ref(),
			transfer_id.to_le_bytes().as_ref(),
		],
		bump,
	)]
	pub transfer: Account<'info, AssetTransfer>,

	pub from_owner: Signer<'info>,

	/// CHECK: implement manual checks if needed
	pub to_owner: UncheckedAccount<'info>,

	pub system_program: Program<'info, System>,
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
pub fn handler(
	ctx: Context<TransferAssetShares>,
	asset_id: u64,
	transfer_id: u64,
	shares: u64,
) -> Result<()> {
    // Validate that the caller is the asset owner
    require!(ctx.accounts.asset.owner == ctx.accounts.from_owner.key(), RwaMarketplaceError::Unauthorized);
    
    // Create the transfer record
    let transfer = &mut ctx.accounts.transfer;
    transfer.asset_id = asset_id;
    transfer.transfer_id = transfer_id;
    transfer.from_owner = ctx.accounts.from_owner.key();
    transfer.to_owner = ctx.accounts.to_owner.key();
    transfer.shares = shares;
    transfer.created_at = Clock::get()?.unix_timestamp;
    transfer.updated_at = Clock::get()?.unix_timestamp;
    transfer.bump = ctx.bumps.transfer;

    Ok(())
}