import { expect } from "chai";
import { ethers } from "hardhat";
import { EnhancedMixingAlgorithms } from "../typechain-types";
import { SignerWithAddress } from "@ethersproject/contracts";

describe("EnhancedMixingAlgorithms", function () {
  let enhancedMixingAlgorithms: EnhancedMixingAlgorithms;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    const EnhancedMixingAlgorithmsFactory = await ethers.getContractFactory("EnhancedMixingAlgorithms");
    enhancedMixingAlgorithms = await EnhancedMixingAlgorithmsFactory.deploy();
    await enhancedMixingAlgorithms.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await enhancedMixingAlgorithms.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set correct owner", async function () {
      expect(await enhancedMixingAlgorithms.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero statistics", async function () {
      const stats = await enhancedMixingAlgorithms.getStatistics();
      expect(stats.totalBlindSignatures_).to.equal(0);
      expect(stats.totalMixnetRounds_).to.equal(0);
      expect(stats.totalOnionTransactions_).to.equal(0);
      expect(stats.totalDiningRounds_).to.equal(0);
      expect(stats.totalDifferentialTransactions_).to.equal(0);
      expect(stats.totalTimeLockedWithdrawals_).to.equal(0);
      expect(stats.totalBatchMixing_).to.equal(0);
    });
  });

  describe("Chaumian Blind Signatures", function () {
    it("Should create blind signature successfully", async function () {
      const blindedMessage = ethers.keccak256(ethers.toUtf8Bytes("blinded message"));
      const publicKey = ethers.keccak256(ethers.toUtf8Bytes("public key"));

      await expect(enhancedMixingAlgorithms.createChaumianBlindSignature(blindedMessage, publicKey))
        .to.emit(enhancedMixingAlgorithms, "ChaumianBlindSignatureCreated");

      const stats = await enhancedMixingAlgorithms.getStatistics();
      expect(stats.totalBlindSignatures_).to.equal(1);
    });

    it("Should store blind signature information correctly", async function () {
      const blindedMessage = ethers.keccak256(ethers.toUtf8Bytes("blinded message"));
      const publicKey = ethers.keccak256(ethers.toUtf8Bytes("public key"));

      const blindSignatureId = await enhancedMixingAlgorithms.createChaumianBlindSignature(blindedMessage, publicKey);
      const sigInfo = await enhancedMixingAlgorithms.getBlindSignature(blindSignatureId);

      expect(sigInfo.blindSignatureId_).to.equal(blindSignatureId);
      expect(sigInfo.blindedMessage).to.equal(blindedMessage);
      expect(sigInfo.publicKey).to.equal(publicKey);
      expect(sigInfo.isValid).to.be.true;
      expect(sigInfo.timestamp).to.be.gt(0);
    });
  });

  describe("Mixnet Rounds", function () {
    it("Should start mixnet round successfully", async function () {
      const minParticipants = 5;
      const deadline = (await time()) + 3600; // 1 hour from now

      await expect(enhancedMixingAlgorithms.startMixnetRound(minParticipants, deadline))
        .to.emit(enhancedMixingAlgorithms, "MixnetRoundStarted");

      const stats = await enhancedMixingAlgorithms.getStatistics();
      expect(stats.totalMixnetRounds_).to.equal(1);
    });

    it("Should reject invalid participant count", async function () {
      const tooFewParticipants = 2; // Less than MIN_MIXNET_PARTICIPANTS
      const tooManyParticipants = 150; // More than MAX_MIXNET_PARTICIPANTS
      const deadline = (await time()) + 3600;

      await expect(
        enhancedMixingAlgorithms.startMixnetRound(tooFewParticipants, deadline)
      ).to.be.revertedWith("Invalid participant count");

      await expect(
        enhancedMixingAlgorithms.startMixnetRound(tooManyParticipants, deadline)
      ).to.be.revertedWith("Invalid participant count");
    });

    it("Should reject invalid deadline", async function () {
      const minParticipants = 5;
      const pastDeadline = (await time()) - 3600; // 1 hour ago

      await expect(
        enhancedMixingAlgorithms.startMixnetRound(minParticipants, pastDeadline)
      ).to.be.revertedWith("Invalid deadline");
    });

    it("Should allow users to join mixnet round", async function () {
      const minParticipants = 3;
      const deadline = (await time()) + 3600;
      const amount = ethers.parseEther("0.1");

      await enhancedMixingAlgorithms.startMixnetRound(minParticipants, deadline);
      
      await expect(enhancedMixingAlgorithms.connect(user1).joinMixnetRound(1, amount))
        .to.not.be.reverted;
    });

    it("Should reject joining with invalid amount", async function () {
      const minParticipants = 3;
      const deadline = (await time()) + 3600;
      const tooSmallAmount = ethers.parseEther("0.005"); // Less than MIN_DEPOSIT
      const tooLargeAmount = ethers.parseEther("2000000"); // More than MAX_DEPOSIT

      await enhancedMixingAlgorithms.startMixnetRound(minParticipants, deadline);
      
      await expect(
        enhancedMixingAlgorithms.connect(user1).joinMixnetRound(1, tooSmallAmount)
      ).to.be.revertedWith("Invalid amount");

      await expect(
        enhancedMixingAlgorithms.connect(user1).joinMixnetRound(1, tooLargeAmount)
      ).to.be.revertedWith("Invalid amount");
    });

    it("Should reject joining expired round", async function () {
      const minParticipants = 3;
      const deadline = (await time()) + 1; // 1 second from now
      const amount = ethers.parseEther("0.1");

      await enhancedMixingAlgorithms.startMixnetRound(minParticipants, deadline);
      
      // Wait for deadline to pass
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        enhancedMixingAlgorithms.connect(user1).joinMixnetRound(1, amount)
      ).to.be.revertedWith("Round deadline passed");
    });

    it("Should reject double joining", async function () {
      const minParticipants = 3;
      const deadline = (await time()) + 3600;
      const amount = ethers.parseEther("0.1");

      await enhancedMixingAlgorithms.startMixnetRound(minParticipants, deadline);
      
      await enhancedMixingAlgorithms.connect(user1).joinMixnetRound(1, amount);
      
      await expect(
        enhancedMixingAlgorithms.connect(user1).joinMixnetRound(1, amount)
      ).to.be.revertedWith("Already joined");
    });

    it("Should only allow owner to start rounds", async function () {
      const minParticipants = 5;
      const deadline = (await time()) + 3600;

      await expect(
        enhancedMixingAlgorithms.connect(user1).startMixnetRound(minParticipants, deadline)
      ).to.be.revertedWithCustomError(enhancedMixingAlgorithms, "OwnableUnauthorizedAccount");
    });
  });

  describe("Onion Routing", function () {
    it("Should create onion routing transaction successfully", async function () {
      const route = [user1.address, user2.address, user3.address];
      const encryptedLayers = [
        ethers.keccak256(ethers.toUtf8Bytes("layer1")),
        ethers.keccak256(ethers.toUtf8Bytes("layer2")),
        ethers.keccak256(ethers.toUtf8Bytes("layer3"))
      ];

      await expect(enhancedMixingAlgorithms.createOnionRoutingTransaction(route, encryptedLayers))
        .to.emit(enhancedMixingAlgorithms, "OnionRoutingLayer");

      const stats = await enhancedMixingAlgorithms.getStatistics();
      expect(stats.totalOnionTransactions_).to.equal(1);
    });

    it("Should reject empty route", async function () {
      const emptyRoute: string[] = [];
      const encryptedLayers: string[] = [];

      await expect(
        enhancedMixingAlgorithms.createOnionRoutingTransaction(emptyRoute, encryptedLayers)
      ).to.be.revertedWith("Empty route");
    });

    it("Should reject route and layers mismatch", async function () {
      const route = [user1.address, user2.address];
      const encryptedLayers = [ethers.keccak256(ethers.toUtf8Bytes("layer1"))]; // Only 1 layer

      await expect(
        enhancedMixingAlgorithms.createOnionRoutingTransaction(route, encryptedLayers)
      ).to.be.revertedWith("Route and layers mismatch");
    });

    it("Should store onion transaction information correctly", async function () {
      const route = [user1.address, user2.address];
      const encryptedLayers = [
        ethers.keccak256(ethers.toUtf8Bytes("layer1")),
        ethers.keccak256(ethers.toUtf8Bytes("layer2"))
      ];

      const transactionId = await enhancedMixingAlgorithms.createOnionRoutingTransaction(route, encryptedLayers);
      const txInfo = await enhancedMixingAlgorithms.getOnionTransaction(transactionId);

      expect(txInfo.transactionId_).to.equal(transactionId);
      expect(txInfo.route).to.deep.equal(route);
      expect(txInfo.encryptedLayers).to.deep.equal(encryptedLayers);
      expect(txInfo.currentLayer).to.equal(0);
      expect(txInfo.isDelivered).to.be.false;
      expect(txInfo.timestamp).to.be.gt(0);
    });
  });

  describe("Dining Cryptographers", function () {
    it("Should start dining cryptographers round successfully", async function () {
      const participantCount = 5;

      await expect(enhancedMixingAlgorithms.startDiningCryptographersRound(participantCount))
        .to.emit(enhancedMixingAlgorithms, "DiningCryptographersRound");

      const stats = await enhancedMixingAlgorithms.getStatistics();
      expect(stats.totalDiningRounds_).to.equal(1);
    });

    it("Should reject insufficient participants", async function () {
      const insufficientParticipants = 2; // Less than minimum 3

      await expect(
        enhancedMixingAlgorithms.startDiningCryptographersRound(insufficientParticipants)
      ).to.be.revertedWith("Minimum 3 participants required");
    });

    it("Should only allow owner to start dining rounds", async function () {
      const participantCount = 5;

      await expect(
        enhancedMixingAlgorithms.connect(user1).startDiningCryptographersRound(participantCount)
      ).to.be.revertedWithCustomError(enhancedMixingAlgorithms, "OwnableUnauthorizedAccount");
    });
  });

  describe("Differential Privacy", function () {
    it("Should create differential privacy transaction successfully", async function () {
      const originalAmount = ethers.parseEther("0.1");

      await expect(enhancedMixingAlgorithms.createDifferentialPrivacyTransaction(originalAmount))
        .to.emit(enhancedMixingAlgorithms, "DifferentialPrivacyNoiseAdded");

      const stats = await enhancedMixingAlgorithms.getStatistics();
      expect(stats.totalDifferentialTransactions_).to.equal(1);
    });

    it("Should reject invalid amount", async function () {
      const tooSmallAmount = ethers.parseEther("0.005"); // Less than MIN_DEPOSIT
      const tooLargeAmount = ethers.parseEther("2000000"); // More than MAX_DEPOSIT

      await expect(
        enhancedMixingAlgorithms.createDifferentialPrivacyTransaction(tooSmallAmount)
      ).to.be.revertedWith("Invalid amount");

      await expect(
        enhancedMixingAlgorithms.createDifferentialPrivacyTransaction(tooLargeAmount)
      ).to.be.revertedWith("Invalid amount");
    });

    it("Should store differential privacy transaction information correctly", async function () {
      const originalAmount = ethers.parseEther("0.1");

      const transactionId = await enhancedMixingAlgorithms.createDifferentialPrivacyTransaction(originalAmount);
      const txInfo = await enhancedMixingAlgorithms.getDifferentialTransaction(transactionId);

      expect(txInfo.transactionId_).to.equal(transactionId);
      expect(txInfo.originalAmount).to.equal(originalAmount);
      expect(txInfo.noisyAmount).to.be.gt(originalAmount); // Should have noise added
      expect(txInfo.noiseLevel).to.be.gt(0);
      expect(txInfo.isProcessed).to.be.false;
      expect(txInfo.timestamp).to.be.gt(0);
    });
  });

  describe("Time-Locked Withdrawals", function () {
    it("Should create time-locked withdrawal successfully", async function () {
      const recipient = user1.address;
      const amount = ethers.parseEther("0.1");
      const timeLock = 3600; // 1 hour

      await expect(enhancedMixingAlgorithms.createTimeLockedWithdrawal(recipient, amount, timeLock))
        .to.emit(enhancedMixingAlgorithms, "TimeLockedWithdrawal");

      const stats = await enhancedMixingAlgorithms.getStatistics();
      expect(stats.totalTimeLockedWithdrawals_).to.equal(1);
    });

    it("Should reject invalid recipient", async function () {
      const invalidRecipient = ethers.ZeroAddress;
      const amount = ethers.parseEther("0.1");
      const timeLock = 3600;

      await expect(
        enhancedMixingAlgorithms.createTimeLockedWithdrawal(invalidRecipient, amount, timeLock)
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should reject invalid amount", async function () {
      const recipient = user1.address;
      const tooSmallAmount = ethers.parseEther("0.005"); // Less than MIN_DEPOSIT
      const tooLargeAmount = ethers.parseEther("2000000"); // More than MAX_DEPOSIT
      const timeLock = 3600;

      await expect(
        enhancedMixingAlgorithms.createTimeLockedWithdrawal(recipient, tooSmallAmount, timeLock)
      ).to.be.revertedWith("Invalid amount");

      await expect(
        enhancedMixingAlgorithms.createTimeLockedWithdrawal(recipient, tooLargeAmount, timeLock)
      ).to.be.revertedWith("Invalid amount");
    });

    it("Should reject invalid time lock", async function () {
      const recipient = user1.address;
      const amount = ethers.parseEther("0.1");
      const tooShortTimeLock = 1800; // Less than MIN_TIME_LOCK (1 hour)
      const tooLongTimeLock = 2592000; // More than MAX_TIME_LOCK (30 days)

      await expect(
        enhancedMixingAlgorithms.createTimeLockedWithdrawal(recipient, amount, tooShortTimeLock)
      ).to.be.revertedWith("Invalid time lock");

      await expect(
        enhancedMixingAlgorithms.createTimeLockedWithdrawal(recipient, amount, tooLongTimeLock)
      ).to.be.revertedWith("Invalid time lock");
    });

    it("Should store time-locked withdrawal information correctly", async function () {
      const recipient = user1.address;
      const amount = ethers.parseEther("0.1");
      const timeLock = 3600;

      const withdrawalId = await enhancedMixingAlgorithms.createTimeLockedWithdrawal(recipient, amount, timeLock);
      const withdrawalInfo = await enhancedMixingAlgorithms.getTimeLockedWithdrawal(withdrawalId);

      expect(withdrawalInfo.withdrawalId_).to.equal(withdrawalId);
      expect(withdrawalInfo.recipient).to.equal(recipient);
      expect(withdrawalInfo.amount).to.equal(amount);
      expect(withdrawalInfo.unlockTime).to.equal((await time()) + timeLock);
      expect(withdrawalInfo.isWithdrawn).to.be.false;
      expect(withdrawalInfo.timestamp).to.be.gt(0);
    });

    it("Should allow withdrawal after time lock expires", async function () {
      const recipient = user1.address;
      const amount = ethers.parseEther("0.1");
      const timeLock = 1; // 1 second

      const withdrawalId = await enhancedMixingAlgorithms.createTimeLockedWithdrawal(recipient, amount, timeLock);
      
      // Wait for time lock to expire
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);

      await expect(enhancedMixingAlgorithms.connect(user1).withdrawTimeLocked(withdrawalId))
        .to.not.be.reverted;
    });

    it("Should reject withdrawal before time lock expires", async function () {
      const recipient = user1.address;
      const amount = ethers.parseEther("0.1");
      const timeLock = 3600; // 1 hour

      const withdrawalId = await enhancedMixingAlgorithms.createTimeLockedWithdrawal(recipient, amount, timeLock);
      
      await expect(
        enhancedMixingAlgorithms.connect(user1).withdrawTimeLocked(withdrawalId)
      ).to.be.revertedWith("Time lock not expired");
    });

    it("Should reject withdrawal by non-recipient", async function () {
      const recipient = user1.address;
      const amount = ethers.parseEther("0.1");
      const timeLock = 1; // 1 second

      const withdrawalId = await enhancedMixingAlgorithms.createTimeLockedWithdrawal(recipient, amount, timeLock);
      
      // Wait for time lock to expire
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        enhancedMixingAlgorithms.connect(user2).withdrawTimeLocked(withdrawalId)
      ).to.be.revertedWith("Not the recipient");
    });

    it("Should reject double withdrawal", async function () {
      const recipient = user1.address;
      const amount = ethers.parseEther("0.1");
      const timeLock = 1; // 1 second

      const withdrawalId = await enhancedMixingAlgorithms.createTimeLockedWithdrawal(recipient, amount, timeLock);
      
      // Wait for time lock to expire
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);

      await enhancedMixingAlgorithms.connect(user1).withdrawTimeLocked(withdrawalId);
      
      await expect(
        enhancedMixingAlgorithms.connect(user1).withdrawTimeLocked(withdrawalId)
      ).to.be.revertedWith("Already withdrawn");
    });
  });

  describe("Batch Mixing", function () {
    it("Should create batch mixing successfully", async function () {
      const transactionIds = [1, 2, 3, 4, 5];
      const randomDelay = 300; // 5 minutes

      await expect(enhancedMixingAlgorithms.createBatchMixing(transactionIds, randomDelay))
        .to.emit(enhancedMixingAlgorithms, "BatchMixingCompleted");

      const stats = await enhancedMixingAlgorithms.getStatistics();
      expect(stats.totalBatchMixing_).to.equal(1);
    });

    it("Should reject invalid batch size", async function () {
      const tooSmallBatch = [1, 2, 3, 4]; // Less than MIN_BATCH_SIZE (5)
      const tooLargeBatch = Array.from({length: 1001}, (_, i) => i + 1); // More than MAX_BATCH_SIZE (1000)
      const randomDelay = 300;

      await expect(
        enhancedMixingAlgorithms.createBatchMixing(tooSmallBatch, randomDelay)
      ).to.be.revertedWith("Invalid batch size");

      await expect(
        enhancedMixingAlgorithms.createBatchMixing(tooLargeBatch, randomDelay)
      ).to.be.revertedWith("Invalid batch size");
    });

    it("Should reject invalid delay", async function () {
      const transactionIds = [1, 2, 3, 4, 5];
      const tooShortDelay = 30; // Less than 1 minute
      const tooLongDelay = 86401; // More than 24 hours

      await expect(
        enhancedMixingAlgorithms.createBatchMixing(transactionIds, tooShortDelay)
      ).to.be.revertedWith("Invalid delay");

      await expect(
        enhancedMixingAlgorithms.createBatchMixing(transactionIds, tooLongDelay)
      ).to.be.revertedWith("Invalid delay");
    });

    it("Should store batch mixing information correctly", async function () {
      const transactionIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const randomDelay = 300;

      const batchId = await enhancedMixingAlgorithms.createBatchMixing(transactionIds, randomDelay);
      const batchInfo = await enhancedMixingAlgorithms.getBatchMixing(batchId);

      expect(batchInfo.batchId_).to.equal(batchId);
      expect(batchInfo.batchSize).to.equal(transactionIds.length);
      expect(batchInfo.anonymitySet).to.equal(transactionIds.length);
      expect(batchInfo.transactionIds).to.deep.equal(transactionIds);
      expect(batchInfo.isProcessed).to.be.false;
      expect(batchInfo.randomDelay).to.equal(randomDelay);
      expect(batchInfo.timestamp).to.be.gt(0);
    });

    it("Should process batch mixing after delay", async function () {
      const transactionIds = [1, 2, 3, 4, 5];
      const randomDelay = 300;

      const batchId = await enhancedMixingAlgorithms.createBatchMixing(transactionIds, randomDelay);
      
      // Try to process before delay
      await expect(
        enhancedMixingAlgorithms.processBatchMixing(batchId)
      ).to.be.revertedWith("Delay not met");

      // Wait for delay to pass
      await ethers.provider.send("evm_increaseTime", [300]);
      await ethers.provider.send("evm_mine", []);

      // Process batch
      await expect(enhancedMixingAlgorithms.processBatchMixing(batchId)).to.not.be.reverted;
    });

    it("Should reject processing non-existent batch", async function () {
      const nonExistentBatchId = 999;

      await expect(
        enhancedMixingAlgorithms.processBatchMixing(nonExistentBatchId)
      ).to.be.revertedWith("Batch not found");
    });

    it("Should reject processing already processed batch", async function () {
      const transactionIds = [1, 2, 3, 4, 5];
      const randomDelay = 300;

      const batchId = await enhancedMixingAlgorithms.createBatchMixing(transactionIds, randomDelay);
      
      // Wait for delay and process
      await ethers.provider.send("evm_increaseTime", [300]);
      await ethers.provider.send("evm_mine", []);
      await enhancedMixingAlgorithms.processBatchMixing(batchId);

      // Try to process again
      await expect(
        enhancedMixingAlgorithms.processBatchMixing(batchId)
      ).to.be.revertedWith("Batch already processed");
    });

    it("Should only allow owner to create and process batches", async function () {
      const transactionIds = [1, 2, 3, 4, 5];
      const randomDelay = 300;

      await expect(
        enhancedMixingAlgorithms.connect(user1).createBatchMixing(transactionIds, randomDelay)
      ).to.be.revertedWithCustomError(enhancedMixingAlgorithms, "OwnableUnauthorizedAccount");

      const batchId = await enhancedMixingAlgorithms.createBatchMixing(transactionIds, randomDelay);
      
      // Wait for delay
      await ethers.provider.send("evm_increaseTime", [300]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        enhancedMixingAlgorithms.connect(user1).processBatchMixing(batchId)
      ).to.be.revertedWithCustomError(enhancedMixingAlgorithms, "OwnableUnauthorizedAccount");
    });
  });

  describe("Emergency Controls", function () {
    it("Should pause and resume contract", async function () {
      // Pause
      await expect(enhancedMixingAlgorithms.emergencyPause()).to.not.be.reverted;
      expect(await enhancedMixingAlgorithms.paused()).to.be.true;

      // Resume
      await expect(enhancedMixingAlgorithms.resume()).to.not.be.reverted;
      expect(await enhancedMixingAlgorithms.paused()).to.be.false;
    });

    it("Should reject operations when paused", async function () {
      await enhancedMixingAlgorithms.emergencyPause();

      const blindedMessage = ethers.keccak256(ethers.toUtf8Bytes("blinded message"));
      const publicKey = ethers.keccak256(ethers.toUtf8Bytes("public key"));

      await expect(
        enhancedMixingAlgorithms.createChaumianBlindSignature(blindedMessage, publicKey)
      ).to.be.revertedWith("Pausable: paused");

      const originalAmount = ethers.parseEther("0.1");

      await expect(
        enhancedMixingAlgorithms.createDifferentialPrivacyTransaction(originalAmount)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should only allow owner to pause/resume", async function () {
      await expect(
        enhancedMixingAlgorithms.connect(user1).emergencyPause()
      ).to.be.revertedWithCustomError(enhancedMixingAlgorithms, "OwnableUnauthorizedAccount");

      await expect(
        enhancedMixingAlgorithms.connect(user1).resume()
      ).to.be.revertedWithCustomError(enhancedMixingAlgorithms, "OwnableUnauthorizedAccount");
    });
  });

  describe("Statistics", function () {
    it("Should track all statistics correctly", async function () {
      // Create blind signature
      const blindedMessage = ethers.keccak256(ethers.toUtf8Bytes("blinded message"));
      const publicKey = ethers.keccak256(ethers.toUtf8Bytes("public key"));
      await enhancedMixingAlgorithms.createChaumianBlindSignature(blindedMessage, publicKey);

      // Start mixnet round
      const minParticipants = 3;
      const deadline = (await time()) + 3600;
      await enhancedMixingAlgorithms.startMixnetRound(minParticipants, deadline);

      // Create onion routing transaction
      const route = [user1.address, user2.address];
      const encryptedLayers = [
        ethers.keccak256(ethers.toUtf8Bytes("layer1")),
        ethers.keccak256(ethers.toUtf8Bytes("layer2"))
      ];
      await enhancedMixingAlgorithms.createOnionRoutingTransaction(route, encryptedLayers);

      // Start dining cryptographers round
      const participantCount = 5;
      await enhancedMixingAlgorithms.startDiningCryptographersRound(participantCount);

      // Create differential privacy transaction
      const originalAmount = ethers.parseEther("0.1");
      await enhancedMixingAlgorithms.createDifferentialPrivacyTransaction(originalAmount);

      // Create time-locked withdrawal
      const recipient = user1.address;
      const amount = ethers.parseEther("0.1");
      const timeLock = 3600;
      await enhancedMixingAlgorithms.createTimeLockedWithdrawal(recipient, amount, timeLock);

      // Create batch mixing
      const transactionIds = [1, 2, 3, 4, 5];
      const randomDelay = 300;
      await enhancedMixingAlgorithms.createBatchMixing(transactionIds, randomDelay);

      const stats = await enhancedMixingAlgorithms.getStatistics();
      expect(stats.totalBlindSignatures_).to.equal(1);
      expect(stats.totalMixnetRounds_).to.equal(1);
      expect(stats.totalOnionTransactions_).to.equal(1);
      expect(stats.totalDiningRounds_).to.equal(1);
      expect(stats.totalDifferentialTransactions_).to.equal(1);
      expect(stats.totalTimeLockedWithdrawals_).to.equal(1);
      expect(stats.totalBatchMixing_).to.equal(1);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple blind signatures", async function () {
      for (let i = 0; i < 10; i++) {
        const blindedMessage = ethers.keccak256(ethers.toUtf8Bytes(`blinded message ${i}`));
        const publicKey = ethers.keccak256(ethers.toUtf8Bytes(`public key ${i}`));
        await enhancedMixingAlgorithms.createChaumianBlindSignature(blindedMessage, publicKey);
      }

      const stats = await enhancedMixingAlgorithms.getStatistics();
      expect(stats.totalBlindSignatures_).to.equal(10);
    });

    it("Should handle multiple differential privacy transactions", async function () {
      for (let i = 0; i < 8; i++) {
        const originalAmount = ethers.parseEther("0.1");
        await enhancedMixingAlgorithms.createDifferentialPrivacyTransaction(originalAmount);
      }

      const stats = await enhancedMixingAlgorithms.getStatistics();
      expect(stats.totalDifferentialTransactions_).to.equal(8);
    });

    it("Should handle multiple time-locked withdrawals", async function () {
      for (let i = 0; i < 5; i++) {
        const recipient = user1.address;
        const amount = ethers.parseEther("0.1");
        const timeLock = 3600;
        await enhancedMixingAlgorithms.createTimeLockedWithdrawal(recipient, amount, timeLock);
      }

      const stats = await enhancedMixingAlgorithms.getStatistics();
      expect(stats.totalTimeLockedWithdrawals_).to.equal(5);
    });

    it("Should handle multiple batch mixing", async function () {
      for (let i = 0; i < 3; i++) {
        const transactionIds = [1, 2, 3, 4, 5];
        const randomDelay = 300;
        await enhancedMixingAlgorithms.createBatchMixing(transactionIds, randomDelay);
      }

      const stats = await enhancedMixingAlgorithms.getStatistics();
      expect(stats.totalBatchMixing_).to.equal(3);
    });
  });

  // Helper function to get current timestamp
  async function time(): Promise<number> {
    return (await ethers.provider.getBlock("latest"))!.timestamp;
  }
}); 