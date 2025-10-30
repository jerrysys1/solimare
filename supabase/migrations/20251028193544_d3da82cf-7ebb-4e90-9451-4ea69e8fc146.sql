-- Add NFT tracking fields to boats table
ALTER TABLE boats 
ADD COLUMN mint_address VARCHAR(44),
ADD COLUMN transaction_signature VARCHAR(88);