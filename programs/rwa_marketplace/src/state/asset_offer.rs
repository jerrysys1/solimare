
use anchor_lang::prelude::*;

#[account]
pub struct AssetOffer {
	pub asset_id: u64,
	pub offer_id: u64,
	pub buyer: Pubkey,
	pub price_usd: u64,
	pub currency: String,
	pub status: u8,
	pub created_at: i64,
	pub updated_at: i64,
	pub bump: u8,
}
