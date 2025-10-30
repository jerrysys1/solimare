use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("11111111111111111111111111111112");

#[program]
pub mod rwa_boat_nft_program {
    use super::*;

    // fee_bps: Number, Admin fee percentage, 250 = 2.5%
    // treasury: Address, Fee collection address, Authority wallet
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        fee_bps: u16,
        treasury: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.bump = ctx.bumps.config;
        config.authority = ctx.accounts.authority.key();
        config.is_active = true;
        config.is_paused = false;
        config.fee_bps = fee_bps;
        config.treasury = treasury;
        config.version = 1;
        Ok(())
    }

    // name: String, Boat name, "Ocean Master 45"
    // boat_type: BoatType, Type of vessel, BoatType::Yacht
    // description: String, Boat description, "2021 45ft luxury yacht"
    // registration_number: String, Legal ID, "PL-YT-2021-001" 
    // year_built: Number, Manufacturing year, 2021
    // length: Number, Length in feet, 45 = 45ft
    // manufacturer: String, Builder name, "Beneteau"
    // price: Number, Mint price in lamports, 1000000000 = 1 SOL
    pub fn mint_boat_nft(
        ctx: Context<MintBoatNft>,
        name: String,
        boat_type: BoatType,
        description: String,
        registration_number: String,
        year_built: u16,
        length: u32,
        manufacturer: String,
        price: u64,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        let owner_key = ctx.accounts.owner.key();
        let mint_key = ctx.accounts.mint.key();
        
        require!(config.is_active && !config.is_paused, ErrorCode::ConfigInactive);
        require!(name.len() <= 50, ErrorCode::NameTooLong);
        require!(description.len() <= 200, ErrorCode::DescriptionTooLong);
        require!(registration_number.len() <= 30, ErrorCode::RegistrationTooLong);
        require!(manufacturer.len() <= 50, ErrorCode::ManufacturerTooLong);
        require!(year_built > 1900 && year_built <= 2030, ErrorCode::InvalidYear);
        require!(length > 0 && length <= 1000, ErrorCode::InvalidLength);
        require!(price > 0, ErrorCode::InvalidAmount);

        // Calculate protocol fee using u128 to prevent overflow
        let fee_bps = config.fee_bps as u128;
        let price_u128 = price as u128;
        let fee_u128 = price_u128
            .checked_mul(fee_bps)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(10000u128)
            .ok_or(ErrorCode::MathOverflow)?;
        let fee: u64 = fee_u128 as u64;

        // Verify treasury account matches configured treasury
        require_keys_eq!(
            ctx.accounts.treasury_account.key(),
            config.treasury,
            ErrorCode::InvalidTreasury
        );

        // Transfer protocol fee from payer to treasury if fee > 0
        if fee > 0 {
            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.owner.key(),
                &ctx.accounts.treasury_account.key(),
                fee,
            );
            anchor_lang::solana_program::program::invoke(
                &ix,
                &[
                    ctx.accounts.owner.to_account_info(),
                    ctx.accounts.treasury_account.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;

            emit!(FeeCollected {
                mint: mint_key,
                payer: owner_key,
                amount: fee,
            });
        }

        // Mint NFT to owner
        let mint_bump = [ctx.bumps.mint];
        let mint_seeds = &[b"mint", owner_key.as_ref(), registration_number.as_bytes(), &mint_bump];
        let signer_seeds: &[&[&[u8]]] = &[mint_seeds];
        
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.owner_token_account.to_account_info(),
                    authority: ctx.accounts.mint.to_account_info(),
                },
                signer_seeds,
            ),
            1,
        )?;
        
        // Store boat NFT metadata
        let boat_nft = &mut ctx.accounts.boat_nft;
        boat_nft.bump = ctx.bumps.boat_nft;
        boat_nft.mint = mint_key;
        boat_nft.owner = owner_key;
        boat_nft.name = name.clone();
        boat_nft.boat_type = boat_type.clone();
        boat_nft.description = description.clone();
        boat_nft.registration_number = registration_number.clone();
        boat_nft.year_built = year_built;
        boat_nft.length = length;
        boat_nft.manufacturer = manufacturer.clone();
        boat_nft.last_maintenance_date = Clock::get()?.unix_timestamp;
        boat_nft.is_for_sale = false;
        boat_nft.created_at = Clock::get()?.unix_timestamp;

        emit!(BoatMinted {
            mint: mint_key,
            owner: owner_key,
            name,
            boat_type,
            registration_number,
            price,
            fee,
        });

        Ok(())
    }

    // maintenance_date: Number, Unix timestamp, 1672531200 = Jan 1 2023
    // is_for_sale: Boolean, Sale status, true/false
    // description: String, Updated description, "Recently serviced yacht"
    pub fn update_boat_metadata(
        ctx: Context<UpdateBoatMetadata>,
        new_description: Option<String>,
        new_maintenance_date: Option<i64>,
        new_is_for_sale: Option<bool>,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        let boat_nft = &ctx.accounts.boat_nft;
        let owner_key = ctx.accounts.owner.key();
        
        require!(config.is_active && !config.is_paused, ErrorCode::ConfigInactive);
        require!(boat_nft.owner == owner_key, ErrorCode::Unauthorized);
        
        if let Some(description) = &new_description {
            require!(description.len() <= 200, ErrorCode::DescriptionTooLong);
        }
        
        let boat_nft = &mut ctx.accounts.boat_nft;
        
        if let Some(description) = new_description {
            boat_nft.description = description.clone();
            emit!(MetadataUpdated {
                mint: boat_nft.mint,
                field: "description".to_string(),
                new_value: description,
            });
        }
        
        if let Some(maintenance_date) = new_maintenance_date {
            boat_nft.last_maintenance_date = maintenance_date;
            emit!(MetadataUpdated {
                mint: boat_nft.mint,
                field: "last_maintenance_date".to_string(),
                new_value: maintenance_date.to_string(),
            });
        }
        
        if let Some(is_for_sale) = new_is_for_sale {
            boat_nft.is_for_sale = is_for_sale;
            emit!(MetadataUpdated {
                mint: boat_nft.mint,
                field: "is_for_sale".to_string(),
                new_value: is_for_sale.to_string(),
            });
        }

        Ok(())
    }

    pub fn transfer_boat_ownership(ctx: Context<TransferBoatOwnership>) -> Result<()> {
        let from_owner_key = ctx.accounts.from_owner.key();
        let to_owner_key = ctx.accounts.to_owner.key();
        let mint_key = ctx.accounts.mint.key();
        
        require!(
            ctx.accounts.from_token_account.owner == from_owner_key,
            ErrorCode::Unauthorized
        );
        require!(
            ctx.accounts.from_token_account.amount == 1,
            ErrorCode::InsufficientFunds
        );
        
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.from_token_account.to_account_info(),
                    to: ctx.accounts.to_token_account.to_account_info(),
                    authority: ctx.accounts.from_owner.to_account_info(),
                },
            ),
            1,
        )?;

        let boat_nft = &mut ctx.accounts.boat_nft;
        boat_nft.owner = to_owner_key;
        boat_nft.is_for_sale = false;

        emit!(OwnershipTransferred {
            mint: mint_key,
            from: from_owner_key,
            to: to_owner_key,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        seeds = [b"config", authority.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + Config::LEN
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    name: String,
    boat_type: BoatType,
    description: String,
    registration_number: String,
    year_built: u16,
    length: u32,
    manufacturer: String,
    price: u64,
)]
pub struct MintBoatNft<'info> {
    #[account(
        constraint = config.is_active @ ErrorCode::ConfigInactive
    )]
    pub config: Account<'info, Config>,
    
    #[account(
        init,
        seeds = [b"boat", mint.key().as_ref()],
        bump,
        payer = owner,
        space = 8 + BoatNFT::LEN
    )]
    pub boat_nft: Account<'info, BoatNFT>,
    
    #[account(
        init,
        seeds = [b"mint", owner.key().as_ref(), registration_number.as_bytes()],
        bump,
        payer = owner,
        mint::decimals = 0,
        mint::authority = mint,
    )]
    pub mint: Account<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = mint,
        associated_token::authority = owner,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    /// CHECK: Verified in instruction against config.treasury
    #[account(mut)]
    pub treasury_account: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateBoatMetadata<'info> {
    #[account(
        constraint = config.is_active @ ErrorCode::ConfigInactive
    )]
    pub config: Account<'info, Config>,
    
    #[account(
        mut,
        seeds = [b"boat", boat_nft.mint.as_ref()],
        bump = boat_nft.bump,
    )]
    pub boat_nft: Account<'info, BoatNFT>,
    
    #[account(
        constraint = owner_token_account.mint == boat_nft.mint @ ErrorCode::InvalidMint,
        constraint = owner_token_account.owner == owner.key() @ ErrorCode::Unauthorized,
        constraint = owner_token_account.amount == 1 @ ErrorCode::InsufficientFunds,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,
    
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct TransferBoatOwnership<'info> {
    #[account(
        mut,
        seeds = [b"boat", mint.key().as_ref()],
        bump = boat_nft.bump,
    )]
    pub boat_nft: Account<'info, BoatNFT>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = from_owner,
    )]
    pub from_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = from_owner,
        associated_token::mint = mint,
        associated_token::authority = to_owner,
    )]
    pub to_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub from_owner: Signer<'info>,
    /// CHECK: Validated through associated token account constraint
    pub to_owner: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Config {
    pub bump: u8,
    pub authority: Pubkey,
    pub is_active: bool,
    pub is_paused: bool,
    pub fee_bps: u16,
    pub treasury: Pubkey,
    pub version: u8,
}

impl Config {
    pub const LEN: usize = 1 + 32 + 1 + 1 + 2 + 32 + 1;
}

#[account]
pub struct BoatNFT {
    pub bump: u8,
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub name: String,
    pub boat_type: BoatType,
    pub description: String,
    pub registration_number: String,
    pub year_built: u16,
    pub length: u32,
    pub manufacturer: String,
    pub last_maintenance_date: i64,
    pub is_for_sale: bool,
    pub created_at: i64,
}

impl BoatNFT {
    pub const LEN: usize = 1 + 32 + 32 + (4 + 50) + (1 + 4 + 30) + (4 + 200) + (4 + 30) + 2 + 4 + (4 + 50) + 8 + 1 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BoatType {
    Sailboat,
    Motorboat,
    Yacht,
    Catamaran,
    Other(String),
}

#[event]
pub struct BoatMinted {
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub name: String,
    pub boat_type: BoatType,
    pub registration_number: String,
    pub price: u64,
    pub fee: u64,
}

#[event]
pub struct FeeCollected {
    pub mint: Pubkey,
    pub payer: Pubkey,
    pub amount: u64,
}

#[event]
pub struct MetadataUpdated {
    pub mint: Pubkey,
    pub field: String,
    pub new_value: String,
}

#[event]
pub struct OwnershipTransferred {
    pub mint: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Config is inactive")]
    ConfigInactive,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Name too long (max 50 characters)")]
    NameTooLong,
    #[msg("Description too long (max 200 characters)")]
    DescriptionTooLong,
    #[msg("Registration number too long (max 30 characters)")]
    RegistrationTooLong,
    #[msg("Manufacturer name too long (max 50 characters)")]
    ManufacturerTooLong,
    #[msg("Invalid year (must be 1900-2030)")]
    InvalidYear,
    #[msg("Invalid length (must be 1-1000ft)")]
    InvalidLength,
    #[msg("Invalid mint")]
    InvalidMint,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Math overflow while calculating fee")]
    MathOverflow,
    #[msg("Treasury account does not match configured treasury")]
    InvalidTreasury,
}
