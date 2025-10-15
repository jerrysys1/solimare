
use anchor_lang::prelude::*;

#[account]
pub struct Marketplace {
	pub admin: Pubkey,
	pub treasury: Pubkey,
	pub fee_bps: u16,
	pub total_assets: u64,
	pub total_listings: u64,
	pub bump: u8,
}
