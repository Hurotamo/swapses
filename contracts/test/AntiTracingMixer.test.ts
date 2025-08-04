import { expect } from "chai";
import { ethers } from "hardhat";
import { AntiTracingMixer } from "../typechain-types";
import { SignerWithAddress } from "@ethersproject/contracts";

describe("AntiTracingMixer", function () {
  let antiTracingMixer: AntiTracingMixer;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    const AntiTracingMixerFactory = await ethers.getContractFactory("AntiTracingMixer");
    antiTracingMixer = await AntiTracingMixerFactory.deploy();
    await antiTracingMixer.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await antiTracingMixer.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set correct owner", async function () {
      expect(await antiTracingMixer.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero statistics", async function () {
      const stats = await antiTracingMixer.getStatistics();
      expect(stats.totalBatches_).to.equal(0);
      expect(stats.totalFakeTransactions_).to.equal(0);
      expect(stats.totalTransactions_).to.equal(0);
      expect(stats.totalAddressRotations_).to.equal(0);
    });
  });

  describe("Transaction Batching", function () {
    it("Should create transaction batch with random ordering", async function () {
      const transactionIds = [1, 2, 3, 4, 5];
      const randomDelay = 300; // 5 minutes

      await expect(antiTracingMixer.createTransactionBatch(transactionIds, randomDelay))
        .to.emit(antiTracingMixer, "TransactionBatchCreated")
        .and.to.emit(antiTracingMixer, "RandomOrderingApplied");

      const stats = await antiTracingMixer.getStatistics();
      expect(stats.totalBatches_).to.equal(1);
    });

    it("Should reject empty transaction batch", async function () {
      const emptyArray: number[] = [];
      const randomDelay = 300;

      await expect(
        antiTracingMixer.createTransactionBatch(emptyArray, randomDelay)
      ).to.be.revertedWith("Empty transaction batch");
    });

    it("Should reject invalid delay", async function () {
      const transactionIds = [1, 2, 3];
      const tooShortDelay = 30; // Less than MIN_BATCH_DELAY
      const tooLongDelay = 7200; // More than MAX_BATCH_DELAY

      await expect(
        antiTracingMixer.createTransactionBatch(transactionIds, tooShortDelay)
      ).to.be.revertedWith("Invalid delay");

      await expect(
        antiTracingMixer.createTransactionBatch(transactionIds, tooLongDelay)
      ).to.be.revertedWith("Invalid delay");
    });

    it("Should only allow owner to create batches", async function () {
      const transactionIds = [1, 2, 3];
      const randomDelay = 300;

      await expect(
        antiTracingMixer.connect(user1).createTransactionBatch(transactionIds, randomDelay)
      ).to.be.revertedWithCustomError(antiTracingMixer, "OwnableUnauthorizedAccount");
    });
  });

  describe("Fake Transactions", function () {
    it("Should add fake transaction successfully", async function () {
      const from = user1.address;
      const to = user2.address;
      const amount = ethers.parseEther("0.1");

      await expect(antiTracingMixer.addFakeTransaction(from, to, amount))
        .to.emit(antiTracingMixer, "FakeTransactionAdded")
        .withArgs(1, from, to, amount, await time());

      const stats = await antiTracingMixer.getStatistics();
      expect(stats.totalFakeTransactions_).to.equal(1);
    });

    it("Should reject invalid fake transaction amount", async function () {
      const from = user1.address;
      const to = user2.address;
      const tooSmallAmount = ethers.parseEther("0.0005"); // Less than MIN_FAKE_TX_AMOUNT
      const tooLargeAmount = ethers.parseEther("2"); // More than MAX_FAKE_TX_AMOUNT

      await expect(
        antiTracingMixer.addFakeTransaction(from, to, tooSmallAmount)
      ).to.be.revertedWith("Invalid amount");

      await expect(
        antiTracingMixer.addFakeTransaction(from, to, tooLargeAmount)
      ).to.be.revertedWith("Invalid amount");
    });

    it("Should reject invalid addresses", async function () {
      const validAmount = ethers.parseEther("0.1");
      const zeroAddress = ethers.ZeroAddress;

      await expect(
        antiTracingMixer.addFakeTransaction(zeroAddress, user2.address, validAmount)
      ).to.be.revertedWith("Invalid addresses");

      await expect(
        antiTracingMixer.addFakeTransaction(user1.address, zeroAddress, validAmount)
      ).to.be.revertedWith("Invalid addresses");
    });

    it("Should only allow owner to add fake transactions", async function () {
      const from = user1.address;
      const to = user2.address;
      const amount = ethers.parseEther("0.1");

      await expect(
        antiTracingMixer.connect(user1).addFakeTransaction(from, to, amount)
      ).to.be.revertedWithCustomError(antiTracingMixer, "OwnableUnauthorizedAccount");
    });

    it("Should retrieve fake transaction information", async function () {
      const from = user1.address;
      const to = user2.address;
      const amount = ethers.parseEther("0.1");

      await antiTracingMixer.addFakeTransaction(from, to, amount);

      const fakeTx = await antiTracingMixer.getFakeTransaction(1);
      expect(fakeTx.fakeTxId_).to.equal(1);
      expect(fakeTx.from).to.equal(from);
      expect(fakeTx.to).to.equal(to);
      expect(fakeTx.amount).to.equal(amount);
      expect(fakeTx.isActive).to.be.true;
    });
  });

  describe("Address Rotation", function () {
    it("Should rotate address successfully", async function () {
      const oldAddress = user1.address;

      await expect(antiTracingMixer.connect(user1).rotateAddress(oldAddress))
        .to.emit(antiTracingMixer, "AddressRotated")
        .withArgs(oldAddress, await antiTracingMixer.connect(user1).callStatic._generateNewAddress(oldAddress), await time());

      const stats = await antiTracingMixer.getStatistics();
      expect(stats.totalAddressRotations_).to.equal(1);
    });

    it("Should reject zero address rotation", async function () {
      await expect(
        antiTracingMixer.rotateAddress(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("Should store address rotation history", async function () {
      const oldAddress = user1.address;

      await antiTracingMixer.connect(user1).rotateAddress(oldAddress);

      const rotations = await antiTracingMixer.getAddressRotations(oldAddress);
      expect(rotations.length).to.equal(1);
      expect(rotations[0].oldAddress).to.equal(oldAddress);
      expect(rotations[0].isActive).to.be.true;
    });
  });

  describe("Intermediate Addresses", function () {
    it("Should add intermediate addresses successfully", async function () {
      const transactionId = 1;
      const addresses = [user1.address, user2.address, user3.address];

      await expect(antiTracingMixer.addIntermediateAddresses(transactionId, addresses))
        .to.emit(antiTracingMixer, "IntermediateAddressUsed")
        .and.to.emit(antiTracingMixer, "IntermediateAddressUsed")
        .and.to.emit(antiTracingMixer, "IntermediateAddressUsed");
    });

    it("Should reject invalid transaction ID", async function () {
      const invalidTransactionId = 0;
      const addresses = [user1.address];

      await expect(
        antiTracingMixer.addIntermediateAddresses(invalidTransactionId, addresses)
      ).to.be.revertedWith("Invalid transaction ID");
    });

    it("Should reject empty address array", async function () {
      const transactionId = 1;
      const emptyArray: string[] = [];

      await expect(
        antiTracingMixer.addIntermediateAddresses(transactionId, emptyArray)
      ).to.be.revertedWith("Empty address array");
    });

    it("Should only allow owner to add intermediate addresses", async function () {
      const transactionId = 1;
      const addresses = [user1.address];

      await expect(
        antiTracingMixer.connect(user1).addIntermediateAddresses(transactionId, addresses)
      ).to.be.revertedWithCustomError(antiTracingMixer, "OwnableUnauthorizedAccount");
    });
  });

  describe("Batch Processing", function () {
    beforeEach(async function () {
      const transactionIds = [1, 2, 3];
      const randomDelay = 300;
      await antiTracingMixer.createTransactionBatch(transactionIds, randomDelay);
    });

    it("Should process batch after delay", async function () {
      const batchId = 1;
      
      // Try to process before delay
      await expect(
        antiTracingMixer.processBatch(batchId)
      ).to.be.revertedWith("Delay not met");

      // Wait for delay to pass
      await ethers.provider.send("evm_increaseTime", [300]);
      await ethers.provider.send("evm_mine", []);

      // Process batch
      await expect(antiTracingMixer.processBatch(batchId)).to.not.be.reverted;
    });

    it("Should reject processing non-existent batch", async function () {
      const nonExistentBatchId = 999;

      await expect(
        antiTracingMixer.processBatch(nonExistentBatchId)
      ).to.be.revertedWith("Batch not found");
    });

    it("Should reject processing already processed batch", async function () {
      const batchId = 1;
      
      // Wait for delay and process
      await ethers.provider.send("evm_increaseTime", [300]);
      await ethers.provider.send("evm_mine", []);
      await antiTracingMixer.processBatch(batchId);

      // Try to process again
      await expect(
        antiTracingMixer.processBatch(batchId)
      ).to.be.revertedWith("Batch already processed");
    });

    it("Should only allow owner to process batches", async function () {
      const batchId = 1;
      
      // Wait for delay
      await ethers.provider.send("evm_increaseTime", [300]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        antiTracingMixer.connect(user1).processBatch(batchId)
      ).to.be.revertedWithCustomError(antiTracingMixer, "OwnableUnauthorizedAccount");
    });
  });

  describe("Batch Information", function () {
    it("Should retrieve batch information", async function () {
      const transactionIds = [1, 2, 3, 4, 5];
      const randomDelay = 300;

      await antiTracingMixer.createTransactionBatch(transactionIds, randomDelay);

      const batch = await antiTracingMixer.getBatch(1);
      expect(batch.batchId_).to.equal(1);
      expect(batch.transactionIds).to.deep.equal(transactionIds);
      expect(batch.randomDelay).to.equal(randomDelay);
      expect(batch.isProcessed).to.be.false;
      expect(batch.shuffledOrder.length).to.equal(transactionIds.length);
    });
  });

  describe("Emergency Controls", function () {
    it("Should pause and resume contract", async function () {
      // Pause
      await expect(antiTracingMixer.emergencyPause()).to.not.be.reverted;
      expect(await antiTracingMixer.paused()).to.be.true;

      // Resume
      await expect(antiTracingMixer.resume()).to.not.be.reverted;
      expect(await antiTracingMixer.paused()).to.be.false;
    });

    it("Should reject operations when paused", async function () {
      await antiTracingMixer.emergencyPause();

      const transactionIds = [1, 2, 3];
      const randomDelay = 300;

      await expect(
        antiTracingMixer.createTransactionBatch(transactionIds, randomDelay)
      ).to.be.revertedWith("Pausable: paused");

      await expect(
        antiTracingMixer.addFakeTransaction(user1.address, user2.address, ethers.parseEther("0.1"))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should only allow owner to pause/resume", async function () {
      await expect(
        antiTracingMixer.connect(user1).emergencyPause()
      ).to.be.revertedWithCustomError(antiTracingMixer, "OwnableUnauthorizedAccount");

      await expect(
        antiTracingMixer.connect(user1).resume()
      ).to.be.revertedWithCustomError(antiTracingMixer, "OwnableUnauthorizedAccount");
    });
  });

  describe("Statistics", function () {
    it("Should track all statistics correctly", async function () {
      // Create batch
      await antiTracingMixer.createTransactionBatch([1, 2, 3], 300);

      // Add fake transaction
      await antiTracingMixer.addFakeTransaction(user1.address, user2.address, ethers.parseEther("0.1"));

      // Rotate address
      await antiTracingMixer.connect(user1).rotateAddress(user1.address);

      // Add intermediate addresses
      await antiTracingMixer.addIntermediateAddresses(1, [user1.address, user2.address]);

      const stats = await antiTracingMixer.getStatistics();
      expect(stats.totalBatches_).to.equal(1);
      expect(stats.totalFakeTransactions_).to.equal(1);
      expect(stats.totalAddressRotations_).to.equal(1);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle large transaction arrays", async function () {
      const largeTransactionIds = Array.from({length: 100}, (_, i) => i + 1);
      const randomDelay = 300;

      await expect(
        antiTracingMixer.createTransactionBatch(largeTransactionIds, randomDelay)
      ).to.not.be.reverted;
    });

    it("Should handle multiple fake transactions", async function () {
      for (let i = 0; i < 10; i++) {
        await antiTracingMixer.addFakeTransaction(
          user1.address,
          user2.address,
          ethers.parseEther("0.1")
        );
      }

      const stats = await antiTracingMixer.getStatistics();
      expect(stats.totalFakeTransactions_).to.equal(10);
    });

    it("Should handle multiple address rotations", async function () {
      for (let i = 0; i < 5; i++) {
        await antiTracingMixer.connect(user1).rotateAddress(user1.address);
      }

      const stats = await antiTracingMixer.getStatistics();
      expect(stats.totalAddressRotations_).to.equal(5);
    });
  });

  // Helper function to get current timestamp
  async function time(): Promise<number> {
    return (await ethers.provider.getBlock("latest"))!.timestamp;
  }
}); 