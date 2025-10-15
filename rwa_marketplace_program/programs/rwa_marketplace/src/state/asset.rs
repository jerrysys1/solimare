
use anchor_lang::prelude::*;

#[account]
pub struct Asset {
	pub asset_id: u64,
	pub owner: Pubkey,
	pub name: String,
	pub description: String,
	pub asset_type: u8,
	pub value_usd: u64,
	pub metadata_uri: String,
	pub is_listed: bool,
	pub is_verified: bool,
	pub created_at: i64,
	pub bump: u8,
}
