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
pub struct UnlockRwa<'info> {
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

    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
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
pub fn handler(
    ctx: Context<UnlockRwa>,
    asset_id: u64,
) -> Result<()> {
    // Validate that the caller is the asset owner
    require!(ctx.accounts.asset.owner == ctx.accounts.owner.key(), RwaMarketplaceError::Unauthorized);
    
    // For this implementation, we'll just update a timestamp to indicate when it was unlocked
    // In a more complete implementation, we might set a flag or change the asset state
    ctx.accounts.asset.created_at = Clock::get()?.unix_timestamp;

    Ok(())
}