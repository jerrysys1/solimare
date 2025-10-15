use anchor_lang::prelude::*;

#[error_code]
pub enum RwaMarketplaceError {
	#[msg("Unauthorized access")]
	Unauthorized,
	#[msg("Asset is not currently listed")]
	AssetNotListed,
	#[msg("Asset is already listed")]
	AssetAlreadyListed,
	#[msg("Invalid listing status")]
	InvalidListingStatus,
	#[msg("Insufficient funds for purchase")]
	InsufficientFunds,
	#[msg("Asset has not been verified")]
	AssetNotVerified,
	#[msg("Invalid offer status")]
	InvalidOfferStatus,
	#[msg("Offer not found")]
	OfferNotFound,
	#[msg("Invalid transfer status")]
	InvalidTransferStatus,
	#[msg("Insufficient shares for transfer")]
	InsufficientShares,
	#[msg("Asset with this ID already exists")]
	AssetAlreadyExists,
	#[msg("Self purchase not allowed")]
	SelfPurchase,
	#[msg("Invalid amount for purchase")]
	InvalidAmount,
	#[msg("Invalid listing")]
	InvalidListing,
	#[msg("Same owner not allowed")]
	SameOwner,
	#[msg("Asset is locked")]
	AssetLocked,
}