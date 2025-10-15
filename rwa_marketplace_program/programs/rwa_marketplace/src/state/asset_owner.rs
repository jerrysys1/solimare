
use anchor_lang::prelude::*;

#[account]
pub struct AssetOwner {
	pub asset_id: u64,
	pub owner: Pubkey,
	pub shares: u64,
	pub bump: u8,
}
