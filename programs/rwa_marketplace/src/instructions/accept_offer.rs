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
	offer_id: u64,
	amount: u64,
)]
pub struct AcceptOffer<'info> {
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
		mut,
		seeds = [
			b"asset",
			asset_id.to_le_bytes().as_ref(),
		],
		bump,
	)]
	pub asset: Account<'info, Asset>,

	#[account(
		mut,
		seeds = [
			b"offer",
			asset_id.to_le_bytes().as_ref(),
			offer_id.to_le_bytes().as_ref(),
		],
		bump,
	)]
	pub offer: Account<'info, AssetOffer>,

	pub seller: Signer<'info>,

	#[account(
		mut,
	)]
	/// CHECK: implement manual checks if needed
	pub buyer_usdc_account: UncheckedAccount<'info>,

	#[account(
		mut,
	)]
	/// CHECK: implement manual checks if needed
	pub seller_usdc_account: UncheckedAccount<'info>,

	#[account(
		mut,
	)]
	/// CHECK: implement manual checks if needed
	pub treasury_usdc_account: UncheckedAccount<'info>,

	pub usdc_mint: Account<'info, Mint>,

	#[account(
		mut,
	)]
	/// CHECK: implement manual checks if needed
	pub source: UncheckedAccount<'info>,

	pub mint: Account<'info, Mint>,

	#[account(
		mut,
	)]
	/// CHECK: implement manual checks if needed
	pub destination: UncheckedAccount<'info>,

	pub authority: Signer<'info>,

	pub token_program: Program<'info, Token>,
}

impl<'info> AcceptOffer<'info> {
	pub fn cpi_token_transfer_checked(&self, amount: u64, decimals: u8) -> Result<()> {
		anchor_spl::token::transfer_checked(
			CpiContext::new(self.token_program.to_account_info(), 
				anchor_spl::token::TransferChecked {
					from: self.source.to_account_info(),
					mint: self.mint.to_account_info(),
					to: self.destination.to_account_info(),
					authority: self.authority.to_account_info()
				}
			),
			amount, 
			decimals, 
		)
	}
}

/// Accept a buyer's offer
///
/// Accounts:
/// 0. `[writable, signer]` fee_payer: [AccountInfo] 
/// 1. `[writable]` marketplace: [Marketplace] 
/// 2. `[writable]` asset: [Asset] 
/// 3. `[writable]` offer: [AssetOffer] 
/// 4. `[signer]` seller: [AccountInfo] Seller account
/// 5. `[writable]` buyer_usdc_account: [AccountInfo] Buyer's USDC token account
/// 6. `[writable]` seller_usdc_account: [AccountInfo] Seller's USDC token account
/// 7. `[writable]` treasury_usdc_account: [AccountInfo] Treasury's USDC token account
/// 8. `[]` usdc_mint: [Mint] USDC mint account
/// 9. `[writable]` source: [AccountInfo] The source account.
/// 10. `[]` mint: [Mint] The token mint.
/// 11. `[writable]` destination: [AccountInfo] The destination account.
/// 12. `[signer]` authority: [AccountInfo] The source account's owner/delegate.
/// 13. `[]` token_program: [AccountInfo] Auto-generated, TokenProgram
///
/// Data:
/// - asset_id: [u64] Asset identifier
/// - offer_id: [u64] Offer identifier
/// - amount: [u64] Amount to pay for the asset
pub fn handler(
	ctx: Context<AcceptOffer>,
	asset_id: u64,
	offer_id: u64,
	amount: u64,
) -> Result<()> {
    // Validate that the seller is the asset owner
    require!(ctx.accounts.asset.owner == ctx.accounts.seller.key(), RwaMarketplaceError::Unauthorized);
    
    // Validate that the offer exists and belongs to the asset
    require!(ctx.accounts.offer.asset_id == asset_id, RwaMarketplaceError::InvalidListing);
    require!(ctx.accounts.offer.offer_id == offer_id, RwaMarketplaceError::OfferNotFound);
    
    // Validate that the offer is active
    require!(ctx.accounts.offer.status == 0, RwaMarketplaceError::InvalidOfferStatus);
    
    // Validate that the amount matches the offer price
    require!(ctx.accounts.offer.price_usd == amount, RwaMarketplaceError::InvalidAmount);
    
    // In a real implementation, we would perform the token transfers here
    // For now, we'll just validate the logic
    
    // Calculate fees
    let fee_amount = amount * ctx.accounts.marketplace.fee_bps as u64 / 10000;
    let buyer_amount = amount - fee_amount;
    
    // Update the asset ownership
    ctx.accounts.asset.owner = ctx.accounts.offer.buyer;
    
    // Mark the offer as accepted
    ctx.accounts.offer.status = 1; // Accepted status
    
    Ok(())
}