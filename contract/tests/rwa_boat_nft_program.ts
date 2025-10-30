import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RwaBoatNftProgram } from "../target/types/rwa_boat_nft_program";
import { expect } from "chai";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("rwa_boat_nft_program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.RwaBoatNftProgram as Program<RwaBoatNftProgram>;

  let authority: Keypair;
  let user1: Keypair;
  let user2: Keypair;
  let configPDA: PublicKey;
  let treasury: Keypair;

  before(async () => {
    authority = Keypair.generate();
    user1 = Keypair.generate();
    user2 = Keypair.generate();
    treasury = Keypair.generate();

    // Add delay to prevent rate limiting
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Fund authority
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(authority.publicKey, 100 * LAMPORTS_PER_SOL)
    );
    await sleep(1000);
    
    // Fund user1
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user1.publicKey, 100 * LAMPORTS_PER_SOL)
    );
    await sleep(1000);
    
    // Fund user2  
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user2.publicKey, 100 * LAMPORTS_PER_SOL)
    );
    await sleep(1000);

    // Verify balances before proceeding
    const authorityBalance = await provider.connection.getBalance(authority.publicKey);
    const user1Balance = await provider.connection.getBalance(user1.publicKey);
    const user2Balance = await provider.connection.getBalance(user2.publicKey);
    
    console.log("Authority balance:", authorityBalance / LAMPORTS_PER_SOL, "SOL");
    console.log("User1 balance:", user1Balance / LAMPORTS_PER_SOL, "SOL");
    console.log("User2 balance:", user2Balance / LAMPORTS_PER_SOL, "SOL");
    
    // Ensure minimum balance
    if (authorityBalance < 50 * LAMPORTS_PER_SOL) {
      throw new Error("Authority account insufficiently funded");
    }
    if (user1Balance < 50 * LAMPORTS_PER_SOL) {
      throw new Error("User1 account insufficiently funded");
    }

    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), authority.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Initialize Config", async () => {
    await program.methods
      .initializeConfig(250, treasury.publicKey) // 2.5% fee
      .accounts({
        config: configPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const config = await program.account.config.fetch(configPDA);
    expect(config.isActive).to.be.true;
    expect(config.isPaused).to.be.false;
    expect(Number(config.feeBps)).to.equal(250);
    expect(config.treasury.toString()).to.equal(treasury.publicKey.toString());
    expect(config.authority.toString()).to.equal(authority.publicKey.toString());
  });

  it("Mint Boat NFT with Fee", async () => {
    const registrationNumber = "PL-YT-2021-001";
    const boatName = "Ocean Master 45";
    const description = "2021 45ft luxury yacht with twin 400HP engines";
    const manufacturer = "Beneteau";
    const price = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL

    const [mintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), user1.publicKey.toBuffer(), Buffer.from(registrationNumber)],
      program.programId
    );

    const [boatNftPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("boat"), mintPDA.toBuffer()],
      program.programId
    );

    const userTokenAccount = await getAssociatedTokenAddress(
      mintPDA,
      user1.publicKey
    );

    const boatType = { yacht: {} };

    // Get initial balances
    const initialUserBalance = await provider.connection.getBalance(user1.publicKey);
    const initialTreasuryBalance = await provider.connection.getBalance(treasury.publicKey);

    await program.methods
      .mintBoatNft(
        boatName,
        boatType,
        description,
        registrationNumber,
        new anchor.BN(2021),
        new anchor.BN(45),
        manufacturer,
        price
      )
      .accounts({
        config: configPDA,
        boatNft: boatNftPDA,
        mint: mintPDA,
        ownerTokenAccount: userTokenAccount,
        owner: user1.publicKey,
        treasuryAccount: treasury.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    // Check NFT was minted correctly
    const boatNft = await program.account.boatNft.fetch(boatNftPDA);
    expect(boatNft.name).to.equal(boatName);
    expect(boatNft.registrationNumber).to.equal(registrationNumber);
    expect(Number(boatNft.yearBuilt)).to.equal(2021);
    expect(Number(boatNft.length)).to.equal(45);
    expect(boatNft.manufacturer).to.equal(manufacturer);
    expect(boatNft.isForSale).to.be.false;

    const tokenAccount = await getAccount(provider.connection, userTokenAccount);
    expect(Number(tokenAccount.amount)).to.equal(1);

    // Check fee was transferred
    const finalUserBalance = await provider.connection.getBalance(user1.publicKey);
    const finalTreasuryBalance = await provider.connection.getBalance(treasury.publicKey);
    
    const expectedFee = Number(price) * 250 / 10000; // 2.5% of 1 SOL
    const treasuryIncrease = finalTreasuryBalance - initialTreasuryBalance;
    
    expect(treasuryIncrease).to.equal(expectedFee);
    console.log(`✅ Fee collected: ${expectedFee / LAMPORTS_PER_SOL} SOL`);
  });

  it("Mint with Zero Fee (Small Price)", async () => {
    const registrationNumber = "ZERO-FEE-001";
    const boatName = "Small Boat";
    const description = "Small boat with minimal fee";
    const manufacturer = "Test Manufacturer";
    const price = new anchor.BN(10); // Very small price -> fee rounds to 0

    const [mintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), user1.publicKey.toBuffer(), Buffer.from(registrationNumber)],
      program.programId
    );

    const [boatNftPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("boat"), mintPDA.toBuffer()],
      program.programId
    );

    const userTokenAccount = await getAssociatedTokenAddress(
      mintPDA,
      user1.publicKey
    );

    const boatType = { motorboat: {} };

    const initialTreasuryBalance = await provider.connection.getBalance(treasury.publicKey);

    await program.methods
      .mintBoatNft(
        boatName,
        boatType,
        description,
        registrationNumber,
        new anchor.BN(2020),
        new anchor.BN(30),
        manufacturer,
        price
      )
      .accounts({
        config: configPDA,
        boatNft: boatNftPDA,
        mint: mintPDA,
        ownerTokenAccount: userTokenAccount,
        owner: user1.publicKey,
        treasuryAccount: treasury.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    // Verify NFT minted but no fee transferred
    const boatNft = await program.account.boatNft.fetch(boatNftPDA);
    expect(boatNft.name).to.equal(boatName);

    const finalTreasuryBalance = await provider.connection.getBalance(treasury.publicKey);
    expect(finalTreasuryBalance).to.equal(initialTreasuryBalance); // No fee collected
    
    console.log(`✅ Zero fee correctly handled for small price: ${Number(price)} lamports`);
  });

  it("Fail: Invalid Treasury Account", async () => {
    const registrationNumber = "INVALID-TREASURY-001";
    const boatName = "Invalid Treasury Test";
    const description = "Test for invalid treasury";
    const manufacturer = "Test Manufacturer";
    const price = new anchor.BN(1 * LAMPORTS_PER_SOL);
    const fakeTreasury = Keypair.generate();

    const [mintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), user1.publicKey.toBuffer(), Buffer.from(registrationNumber)],
      program.programId
    );

    const [boatNftPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("boat"), mintPDA.toBuffer()],
      program.programId
    );

    const userTokenAccount = await getAssociatedTokenAddress(
      mintPDA,
      user1.publicKey
    );

    const boatType = { yacht: {} };

    try {
      await program.methods
        .mintBoatNft(
          boatName,
          boatType,
          description,
          registrationNumber,
          new anchor.BN(2021),
          new anchor.BN(45),
          manufacturer,
          price
        )
        .accounts({
          config: configPDA,
          boatNft: boatNftPDA,
          mint: mintPDA,
          ownerTokenAccount: userTokenAccount,
          owner: user1.publicKey,
          treasuryAccount: fakeTreasury.publicKey, // Wrong treasury!
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();
      expect.fail("Should have failed with invalid treasury error");
    } catch (error) {
      expect(error).to.be.instanceOf(anchor.AnchorError);
      const anchorError = error as anchor.AnchorError;
      expect(anchorError.error.errorCode.code).to.equal("InvalidTreasury");
    }
  });

  it("Fail: Zero Price", async () => {
    const registrationNumber = "ZERO-PRICE-001";
    const boatName = "Zero Price Test";
    const description = "Test for zero price";
    const manufacturer = "Test Manufacturer";
    const price = new anchor.BN(0);

    const [mintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), user1.publicKey.toBuffer(), Buffer.from(registrationNumber)],
      program.programId
    );

    const [boatNftPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("boat"), mintPDA.toBuffer()],
      program.programId
    );

    const userTokenAccount = await getAssociatedTokenAddress(
      mintPDA,
      user1.publicKey
    );

    const boatType = { sailboat: {} };

    try {
      await program.methods
        .mintBoatNft(
          boatName,
          boatType,
          description,
          registrationNumber,
          new anchor.BN(2020),
          new anchor.BN(30),
          manufacturer,
          price
        )
        .accounts({
          config: configPDA,
          boatNft: boatNftPDA,
          mint: mintPDA,
          ownerTokenAccount: userTokenAccount,
          owner: user1.publicKey,
          treasuryAccount: treasury.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();
      expect.fail("Should have failed with invalid amount error");
    } catch (error) {
      expect(error).to.be.instanceOf(anchor.AnchorError);
      const anchorError = error as anchor.AnchorError;
      expect(anchorError.error.errorCode.code).to.equal("InvalidAmount");
    }
  });

  it("Update Boat Metadata", async () => {
    const registrationNumber = "PL-YT-2021-001";

    const [mintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), user1.publicKey.toBuffer(), Buffer.from(registrationNumber)],
      program.programId
    );

    const [boatNftPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("boat"), mintPDA.toBuffer()],
      program.programId
    );

    const userTokenAccount = await getAssociatedTokenAddress(
      mintPDA,
      user1.publicKey
    );

    const newDescription = "Recently serviced luxury yacht, ready for charter";
    const newMaintenanceDate = Math.floor(Date.now() / 1000);

    await program.methods
      .updateBoatMetadata(
        newDescription,
        new anchor.BN(newMaintenanceDate),
        true
      )
      .accounts({
        config: configPDA,
        boatNft: boatNftPDA,
        ownerTokenAccount: userTokenAccount,
        owner: user1.publicKey,
      })
      .signers([user1])
      .rpc();

    const boatNft = await program.account.boatNft.fetch(boatNftPDA);
    expect(boatNft.description).to.equal(newDescription);
    expect(Number(boatNft.lastMaintenanceDate)).to.equal(newMaintenanceDate);
    expect(boatNft.isForSale).to.be.true;
  });

  it("Transfer Boat Ownership", async () => {
    const registrationNumber = "PL-YT-2021-001";

    const [mintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), user1.publicKey.toBuffer(), Buffer.from(registrationNumber)],
      program.programId
    );

    const [boatNftPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("boat"), mintPDA.toBuffer()],
      program.programId
    );

    const fromTokenAccount = await getAssociatedTokenAddress(
      mintPDA,
      user1.publicKey
    );

    const toTokenAccount = await getAssociatedTokenAddress(
      mintPDA,
      user2.publicKey
    );

    await program.methods
      .transferBoatOwnership()
      .accounts({
        boatNft: boatNftPDA,
        mint: mintPDA,
        fromTokenAccount: fromTokenAccount,
        toTokenAccount: toTokenAccount,
        fromOwner: user1.publicKey,
        toOwner: user2.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    const boatNft = await program.account.boatNft.fetch(boatNftPDA);
    expect(boatNft.owner.toString()).to.equal(user2.publicKey.toString());
    expect(boatNft.isForSale).to.be.false;

    const fromAccount = await getAccount(provider.connection, fromTokenAccount);
    expect(Number(fromAccount.amount)).to.equal(0);

    const toAccount = await getAccount(provider.connection, toTokenAccount);
    expect(Number(toAccount.amount)).to.equal(1);
  });

  it("Transfer NFT Between Users", async () => {
    // Create a new boat NFT for this test
    const registrationNumber = "TRANSFER-TEST-001";
    const boatName = "Transfer Test Yacht";
    const description = "Test yacht for transfer functionality";
    const manufacturer = "Test Manufacturer";
    const price = new anchor.BN(0.5 * LAMPORTS_PER_SOL); // 0.5 SOL

    const [mintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), user1.publicKey.toBuffer(), Buffer.from(registrationNumber)],
      program.programId
    );

    const [boatNftPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("boat"), mintPDA.toBuffer()],
      program.programId
    );

    const user1TokenAccount = await getAssociatedTokenAddress(
      mintPDA,
      user1.publicKey
    );

    const boatType = { motorboat: {} };

    // First, mint the NFT to user1
    await program.methods
      .mintBoatNft(
        boatName,
        boatType,
        description,
        registrationNumber,
        new anchor.BN(2020),
        new anchor.BN(35),
        manufacturer,
        price
      )
      .accounts({
        config: configPDA,
        boatNft: boatNftPDA,
        mint: mintPDA,
        ownerTokenAccount: user1TokenAccount,
        owner: user1.publicKey,
        treasuryAccount: treasury.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    // Verify initial ownership
    const initialBoatNft = await program.account.boatNft.fetch(boatNftPDA);
    expect(initialBoatNft.owner.toString()).to.equal(user1.publicKey.toString());
    expect(initialBoatNft.isForSale).to.be.false;

    // Now transfer from user1 to user2
    const user2TokenAccount = await getAssociatedTokenAddress(
      mintPDA,
      user2.publicKey
    );

    await program.methods
      .transferBoatOwnership()
      .accounts({
        boatNft: boatNftPDA,
        mint: mintPDA,
        fromTokenAccount: user1TokenAccount,
        toTokenAccount: user2TokenAccount,
        fromOwner: user1.publicKey,
        toOwner: user2.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    // Verify the transfer completed successfully
    const transferredBoatNft = await program.account.boatNft.fetch(boatNftPDA);
    expect(transferredBoatNft.owner.toString()).to.equal(user2.publicKey.toString());
    expect(transferredBoatNft.isForSale).to.be.false;

    // Verify token balances
    const user1Account = await getAccount(provider.connection, user1TokenAccount);
    expect(Number(user1Account.amount)).to.equal(0);

    const user2Account = await getAccount(provider.connection, user2TokenAccount);
    expect(Number(user2Account.amount)).to.equal(1);

    console.log(`✅ NFT successfully transferred from ${user1.publicKey.toString().slice(0, 8)}... to ${user2.publicKey.toString().slice(0, 8)}...`);
  });

  it("Fail: Unauthorized Update", async () => {
    const registrationNumber = "PL-YT-2021-001";

    const [mintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), user1.publicKey.toBuffer(), Buffer.from(registrationNumber)],
      program.programId
    );

    const [boatNftPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("boat"), mintPDA.toBuffer()],
      program.programId
    );

    const userTokenAccount = await getAssociatedTokenAddress(
      mintPDA,
      user1.publicKey
    );

    try {
      await program.methods
        .updateBoatMetadata("Unauthorized update", null, null)
        .accounts({
          config: configPDA,
          boatNft: boatNftPDA,
          ownerTokenAccount: userTokenAccount,
          owner: user2.publicKey, // Non-owner trying to update
        })
        .signers([user2])
        .rpc();
      expect.fail("Should have failed with unauthorized error");
    } catch (error) {
      expect(error).to.be.instanceOf(anchor.AnchorError);
      const anchorError = error as anchor.AnchorError;

      // Check for custom error code
      expect(anchorError.error.errorCode.code).to.equal("Unauthorized");
    }
  });

  it("Fail: Invalid Token Account Owner (Constraint Violation)", async () => {
    const registrationNumber = "PL-YT-2021-001";

    const [mintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), user1.publicKey.toBuffer(), Buffer.from(registrationNumber)],
      program.programId
    );

    const [boatNftPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("boat"), mintPDA.toBuffer()],
      program.programId
    );

    // Use user2's token account which doesn't own the NFT (constraint violation)
    const user2TokenAccount = await getAssociatedTokenAddress(
    mintPDA,
    user2.publicKey
  );

    try {
      await program.methods
        .updateBoatMetadata("Test", null, null)
        .accounts({
          config: configPDA,
          boatNft: boatNftPDA,
          ownerTokenAccount: user2TokenAccount, // user2 doesn't own this NFT
          owner: user1.publicKey,
        })
        .signers([user1])
        .rpc();
      expect.fail("Should have failed due to constraint violation");
    } catch (error) {
      expect(error).to.be.instanceOf(anchor.AnchorError);
      const anchorError = error as anchor.AnchorError;
      expect(anchorError.error.errorCode.code).to.equal("Unauthorized");
    }
  });

  it("Fail: Invalid Name Length", async () => {
    const registrationNumber = "TEST-LONG-NAME";
    const longName = "A".repeat(51); // 51 characters, exceeds limit
    const price = new anchor.BN(1 * LAMPORTS_PER_SOL);

    const [mintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), user1.publicKey.toBuffer(), Buffer.from(registrationNumber)],
      program.programId
    );

    const [boatNftPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("boat"), mintPDA.toBuffer()],
      program.programId
    );

    const userTokenAccount = await getAssociatedTokenAddress(
      mintPDA,
      user1.publicKey
    );

    const boatType = { sailboat: {} };

    try {
      await program.methods
        .mintBoatNft(
          longName,
          boatType,
          "Valid description",
          registrationNumber,
          new anchor.BN(2020),
          new anchor.BN(30),
          "Valid Manufacturer",
          price
        )
        .accounts({
          config: configPDA,
          boatNft: boatNftPDA,
          mint: mintPDA,
          ownerTokenAccount: userTokenAccount,
          owner: user1.publicKey,
          treasuryAccount: treasury.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();
      expect.fail("Should have failed with name too long error");
    } catch (error) {
      expect(error).to.be.instanceOf(anchor.AnchorError);
      const anchorError = error as anchor.AnchorError;
      expect(anchorError.error.errorCode.code).to.equal("NameTooLong");
    }
  });
});
