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
    new_owner: Pubkey,
)]
pub struct TransferOwnership<'info> {
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
pub fn handler(
    ctx: Context<TransferOwnership>,
    asset_id: u64,
    new_owner: Pubkey,
) -> Result<()> {
    // Validate that the caller is the current owner
    require!(ctx.accounts.asset.owner == ctx.accounts.owner.key(), RwaMarketplaceError::Unauthorized);
    
    // Validate that the new owner is not the same as the current owner
    require!(ctx.accounts.asset.owner != new_owner, RwaMarketplaceError::SameOwner);
    
    // Update the asset owner
    ctx.accounts.asset.owner = new_owner;

    Ok(())
}