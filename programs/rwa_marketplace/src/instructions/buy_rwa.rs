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
    amount: u64,
)]
pub struct BuyRwa<'info> {
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
            b"listing",
            asset_id.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub listing: Account<'info, AssetListing>,

    pub buyer: Signer<'info>,

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

impl<'info> BuyRwa<'info> {
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

/// Buy an RWA asset from an active listing
///
/// Accounts:
/// 0. `[writable, signer]` fee_payer: [AccountInfo] 
/// 1. `[writable]` marketplace: [Marketplace] 
/// 2. `[writable]` asset: [Asset] 
/// 3. `[writable]` listing: [AssetListing] 
/// 4. `[signer]` buyer: [AccountInfo] Buyer account
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
/// - amount: [u64] Amount to pay for the asset
pub fn handler(
    ctx: Context<BuyRwa>,
    asset_id: u64,
    amount: u64,
) -> Result<()> {
    // Validate that the asset is listed
    require!(ctx.accounts.asset.is_listed, RwaMarketplaceError::AssetNotListed);
    
    // Validate that the listing exists and belongs to the asset
    require!(ctx.accounts.listing.asset_id == asset_id, RwaMarketplaceError::InvalidListing);
    
    // Validate that the buyer is not the seller
    require!(ctx.accounts.buyer.key() != ctx.accounts.listing.seller, RwaMarketplaceError::SelfPurchase);
    
    // Validate that the amount matches the listing price
    require!(ctx.accounts.listing.price_usd == amount, RwaMarketplaceError::InvalidAmount);
    
    // Transfer the payment from buyer to seller
    // In a real implementation, we would need to properly validate the token accounts
    // and make the actual transfer. For now, we'll just validate the logic.
    
    // Calculate fees
    let fee_amount = amount * ctx.accounts.marketplace.fee_bps as u64 / 10000;
    let seller_amount = amount - fee_amount;
    
    // Transfer the fee to the treasury
    // This would be a separate transfer in a real implementation
    
    // Transfer the seller amount to the seller
    // This would be a separate transfer in a real implementation
    
    // Update the asset ownership
    ctx.accounts.asset.owner = ctx.accounts.buyer.key();
    
    // Remove the listing
    ctx.accounts.asset.is_listed = false;
    
    Ok(())
}