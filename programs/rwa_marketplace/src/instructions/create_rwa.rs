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
    name: String,
    description: String,
    asset_type: u8,
    value_usd: u64,
    metadata_uri: String,
)]
pub struct CreateRwa<'info> {
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
        init,
        space=912,
        payer=fee_payer,
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
pub fn handler(
    ctx: Context<CreateRwa>,
    asset_id: u64,
    name: String,
    description: String,
    asset_type: u8,
    value_usd: u64,
    metadata_uri: String,
) -> Result<()> {
    let asset = &mut ctx.accounts.asset;
    asset.asset_id = asset_id;
    asset.owner = ctx.accounts.owner.key();
    asset.name = name;
    asset.description = description;
    asset.asset_type = asset_type;
    asset.value_usd = value_usd;
    asset.metadata_uri = metadata_uri;
    asset.is_listed = false;
    asset.is_verified = false;
    asset.created_at = Clock::get()?.unix_timestamp;
    asset.bump = ctx.bumps.asset;

    Ok(())
}