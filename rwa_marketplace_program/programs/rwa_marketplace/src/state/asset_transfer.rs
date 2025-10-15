
use anchor_lang::prelude::*;

#[account]
pub struct AssetTransfer {
	pub asset_id: u64,
	pub transfer_id: u64,
	pub from_owner: Pubkey,
	pub to_owner: Pubkey,
	pub shares: u64,
	pub status: u8,
	pub created_at: i64,
	pub updated_at: i64,
	pub bump: u8,
}
