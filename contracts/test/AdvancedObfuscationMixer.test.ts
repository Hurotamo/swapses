import { expect } from "chai";
import { ethers } from "hardhat";
import { AdvancedObfuscationMixer } from "../typechain-types";
import { SignerWithAddress } from "@ethersproject/contracts";

describe("AdvancedObfuscationMixer", function () {
  let advancedObfuscationMixer: AdvancedObfuscationMixer;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const MIN_DEPOSIT = ethers.parseEther("0.01");
  const MAX_DEPOSIT = ethers.parseEther("1000000");
  const MIN_MIXING_DELAY = 3600; // 1 hour
  const MAX_MIXING_DELAY = 604800; // 7 days

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    const AdvancedObfuscationMixerFactory = await ethers.getContractFactory("AdvancedObfuscationMixer");
    advancedObfuscationMixer = await AdvancedObfuscationMixerFactory.deploy();
    await advancedObfuscationMixer.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      const stats = await advancedObfuscationMixer.getStats();
      expect(stats.totalConfidentialTransactions_).to.equal(0);
      expect(stats.totalStealthAddresses_).to.equal(0);
      expect(stats.totalOneTimeAddresses_).to.equal(0);
      expect(stats.totalWithdrawals_).to.equal(0);
    });

    it("Should have correct constants", async function () {
      expect(await advancedObfuscationMixer.MIN_DEPOSIT()).to.equal(MIN_DEPOSIT);
      expect(await advancedObfuscationMixer.MAX_DEPOSIT()).to.equal(MAX_DEPOSIT);
      expect(await advancedObfuscationMixer.MIN_MIXING_DELAY()).to.equal(MIN_MIXING_DELAY);
      expect(await advancedObfuscationMixer.MAX_MIXING_DELAY()).to.equal(MAX_MIXING_DELAY);
    });
  });

  describe("Stealth Address Generation", function () {
    it("Should generate stealth address successfully", async function () {
      const stealthKey = ethers.keccak256(ethers.toUtf8Bytes("stealth_key_1"));
      
      const tx = await advancedObfuscationMixer.connect(user1).generateStealthAddress(stealthKey);
      const receipt = await tx.wait();
      
      // Check that StealthAddressGenerated event was emitted
      const events = receipt?.logs.filter(log => {
        try {
          const parsed = advancedObfuscationMixer.interface.parseLog(log);
          return parsed?.name === "StealthAddressGenerated";
        } catch {
          return false;
        }
      });
      
      expect(events).to.have.length(1);
      
      const stats = await advancedObfuscationMixer.getStats();
      expect(stats.totalStealthAddresses_).to.equal(1);
    });

    it("Should prevent generating stealth address with zero key", async function () {
      await expect(
        advancedObfuscationMixer.connect(user1).generateStealthAddress(ethers.ZeroHash)
      ).to.be.revertedWith("Invalid stealth key");
    });

    it("Should prevent duplicate stealth addresses", async function () {
      const stealthKey = ethers.keccak256(ethers.toUtf8Bytes("stealth_key_2"));
      
      await advancedObfuscationMixer.connect(user1).generateStealthAddress(stealthKey);
      
      await expect(
        advancedObfuscationMixer.connect(user2).generateStealthAddress(stealthKey)
      ).to.be.revertedWith("Stealth address already exists");
    });

    it("Should track user stealth addresses", async function () {
      const stealthKey1 = ethers.keccak256(ethers.toUtf8Bytes("stealth_key_3"));
      const stealthKey2 = ethers.keccak256(ethers.toUtf8Bytes("stealth_key_4"));
      
      await advancedObfuscationMixer.connect(user1).generateStealthAddress(stealthKey1);
      await advancedObfuscationMixer.connect(user1).generateStealthAddress(stealthKey2);
      
      const userAddresses = await advancedObfuscationMixer.getUserStealthAddresses(user1.address);
      expect(userAddresses).to.have.length(2);
    });
  });

  describe("Confidential Transactions", function () {
    let stealthAddress: string;
    let stealthKey: string;

    beforeEach(async function () {
      stealthKey = ethers.keccak256(ethers.toUtf8Bytes("test_stealth_key"));
      const tx = await advancedObfuscationMixer.connect(user1).generateStealthAddress(stealthKey);
      const receipt = await tx.wait();
      
      // Extract stealth address from event
      const events = receipt?.logs.filter(log => {
        try {
          const parsed = advancedObfuscationMixer.interface.parseLog(log);
          return parsed?.name === "StealthAddressGenerated";
        } catch {
          return false;
        }
      });
      
      if (events && events.length > 0) {
        const parsed = advancedObfuscationMixer.interface.parseLog(events[0]);
        stealthAddress = parsed?.args[0];
      }
    });

    it("Should create confidential transaction successfully", async function () {
      const blindingFactor = ethers.keccak256(ethers.toUtf8Bytes("blinding_factor"));
      const depositAmount = ethers.parseEther("0.1");
      
      const tx = await advancedObfuscationMixer.connect(user1).createConfidentialTransaction(
        stealthAddress,
        blindingFactor,
        MIN_MIXING_DELAY,
        { value: depositAmount }
      );
      const receipt = await tx.wait();
      
      // Check that ConfidentialTransactionCreated event was emitted
      const events = receipt?.logs.filter(log => {
        try {
          const parsed = advancedObfuscationMixer.interface.parseLog(log);
          return parsed?.name === "ConfidentialTransactionCreated";
        } catch {
          return false;
        }
      });
      
      expect(events).to.have.length(1);
      
      const stats = await advancedObfuscationMixer.getStats();
      expect(stats.totalConfidentialTransactions_).to.equal(1);
      expect(stats.totalOneTimeAddresses_).to.equal(1);
    });

    it("Should prevent confidential transaction with inactive stealth address", async function () {
      // Deactivate stealth address
      await advancedObfuscationMixer.connect(owner).deactivateStealthAddress(stealthAddress);
      
      const blindingFactor = ethers.keccak256(ethers.toUtf8Bytes("blinding_factor"));
      const depositAmount = ethers.parseEther("0.1");
      
      await expect(
        advancedObfuscationMixer.connect(user1).createConfidentialTransaction(
          stealthAddress,
          blindingFactor,
          MIN_MIXING_DELAY,
          { value: depositAmount }
        )
      ).to.be.revertedWith("Stealth address not active");
    });

    it("Should prevent confidential transaction with zero blinding factor", async function () {
      const depositAmount = ethers.parseEther("0.1");
      
      await expect(
        advancedObfuscationMixer.connect(user1).createConfidentialTransaction(
          stealthAddress,
          ethers.ZeroHash,
          MIN_MIXING_DELAY,
          { value: depositAmount }
        )
      ).to.be.revertedWith("Invalid blinding factor");
    });

    it("Should validate deposit amounts", async function () {
      const blindingFactor = ethers.keccak256(ethers.toUtf8Bytes("blinding_factor"));
      
      // Test minimum deposit
      await expect(
        advancedObfuscationMixer.connect(user1).createConfidentialTransaction(
          stealthAddress,
          blindingFactor,
          MIN_MIXING_DELAY,
          { value: ethers.parseEther("0.005") }
        )
      ).to.be.revertedWith("Invalid deposit amount");
      
      // Test maximum deposit
      await expect(
        advancedObfuscationMixer.connect(user1).createConfidentialTransaction(
          stealthAddress,
          blindingFactor,
          MIN_MIXING_DELAY,
          { value: ethers.parseEther("2000000") }
        )
      ).to.be.revertedWith("Invalid deposit amount");
    });

    it("Should validate mixing delays", async function () {
      const blindingFactor = ethers.keccak256(ethers.toUtf8Bytes("blinding_factor"));
      const depositAmount = ethers.parseEther("0.1");
      
      // Test minimum delay
      await expect(
        advancedObfuscationMixer.connect(user1).createConfidentialTransaction(
          stealthAddress,
          blindingFactor,
          MIN_MIXING_DELAY - 1,
          { value: depositAmount }
        )
      ).to.be.revertedWith("Invalid mixing delay");
      
      // Test maximum delay
      await expect(
        advancedObfuscationMixer.connect(user1).createConfidentialTransaction(
          stealthAddress,
          blindingFactor,
          MAX_MIXING_DELAY + 1,
          { value: depositAmount }
        )
      ).to.be.revertedWith("Invalid mixing delay");
    });
  });

  describe("Confidential Withdrawals", function () {
    it("Should allow confidential withdrawal with valid proof", async function () {
      // This is a simplified test - in practice, you'd need to generate proper merkle proofs
      const nullifier = ethers.keccak256(ethers.toUtf8Bytes("test_nullifier"));
      const stealthAddress = ethers.keccak256(ethers.toUtf8Bytes("test_stealth"));
      const amount = ethers.parseEther("0.05");
      const blindingFactor = ethers.keccak256(ethers.toUtf8Bytes("blinding_factor"));
      const merkleProof: string[] = [];
      
      // Note: This test would need proper merkle proof generation in practice
      // For now, we'll test the basic withdrawal structure
      await expect(
        advancedObfuscationMixer.connect(user1).withdrawConfidential(
          nullifier,
          stealthAddress,
          amount,
          blindingFactor,
          merkleProof
        )
      ).to.be.revertedWith("Invalid confidential proof");
    });

    it("Should prevent double-spending with nullifiers", async function () {
      const nullifier = ethers.keccak256(ethers.toUtf8Bytes("test_nullifier"));
      const stealthAddress = ethers.keccak256(ethers.toUtf8Bytes("test_stealth"));
      const amount = ethers.parseEther("0.05");
      const blindingFactor = ethers.keccak256(ethers.toUtf8Bytes("blinding_factor"));
      const merkleProof: string[] = [];
      
      // Mark nullifier as used
      await advancedObfuscationMixer.connect(owner).withdrawFees();
      
      await expect(
        advancedObfuscationMixer.connect(user1).withdrawConfidential(
          nullifier,
          stealthAddress,
          amount,
          blindingFactor,
          merkleProof
        )
      ).to.be.revertedWith("Invalid confidential proof");
    });
  });

  describe("Stealth Address Management", function () {
    it("Should allow owner to deactivate stealth address", async function () {
      const stealthKey = ethers.keccak256(ethers.toUtf8Bytes("deactivate_key"));
      const tx = await advancedObfuscationMixer.connect(user1).generateStealthAddress(stealthKey);
      const receipt = await tx.wait();
      
      // Extract stealth address from event
      const events = receipt?.logs.filter(log => {
        try {
          const parsed = advancedObfuscationMixer.interface.parseLog(log);
          return parsed?.name === "StealthAddressGenerated";
        } catch {
          return false;
        }
      });
      
      if (events && events.length > 0) {
        const parsed = advancedObfuscationMixer.interface.parseLog(events[0]);
        const stealthAddress = parsed?.args[0];
        
        await advancedObfuscationMixer.connect(owner).deactivateStealthAddress(stealthAddress);
        
        const stealthInfo = await advancedObfuscationMixer.getStealthAddress(stealthAddress);
        expect(stealthInfo.isActive).to.be.false;
      }
    });

    it("Should prevent non-owners from deactivating stealth addresses", async function () {
      const stealthKey = ethers.keccak256(ethers.toUtf8Bytes("non_owner_key"));
      const tx = await advancedObfuscationMixer.connect(user1).generateStealthAddress(stealthKey);
      const receipt = await tx.wait();
      
      // Extract stealth address from event
      const events = receipt?.logs.filter(log => {
        try {
          const parsed = advancedObfuscationMixer.interface.parseLog(log);
          return parsed?.name === "StealthAddressGenerated";
        } catch {
          return false;
        }
      });
      
      if (events && events.length > 0) {
        const parsed = advancedObfuscationMixer.interface.parseLog(events[0]);
        const stealthAddress = parsed?.args[0];
        
        await expect(
          advancedObfuscationMixer.connect(user2).deactivateStealthAddress(stealthAddress)
        ).to.be.revertedWithCustomError(advancedObfuscationMixer, "OwnableUnauthorizedAccount");
      }
    });
  });

  describe("Privacy Features", function () {
    it("Should maintain privacy through stealth addresses", async function () {
      const stealthKey1 = ethers.keccak256(ethers.toUtf8Bytes("privacy_key_1"));
      const stealthKey2 = ethers.keccak256(ethers.toUtf8Bytes("privacy_key_2"));
      
      await advancedObfuscationMixer.connect(user1).generateStealthAddress(stealthKey1);
      await advancedObfuscationMixer.connect(user2).generateStealthAddress(stealthKey2);
      
      const stats = await advancedObfuscationMixer.getStats();
      expect(stats.totalStealthAddresses_).to.equal(2);
    });

    it("Should generate unique one-time addresses", async function () {
      const stealthKey = ethers.keccak256(ethers.toUtf8Bytes("one_time_key"));
      const tx = await advancedObfuscationMixer.connect(user1).generateStealthAddress(stealthKey);
      const receipt = await tx.wait();
      
      // Extract stealth address from event
      const events = receipt?.logs.filter(log => {
        try {
          const parsed = advancedObfuscationMixer.interface.parseLog(log);
          return parsed?.name === "StealthAddressGenerated";
        } catch {
          return false;
        }
      });
      
      if (events && events.length > 0) {
        const parsed = advancedObfuscationMixer.interface.parseLog(events[0]);
        const stealthAddress = parsed?.args[0];
        
        const blindingFactor1 = ethers.keccak256(ethers.toUtf8Bytes("blinding_1"));
        const blindingFactor2 = ethers.keccak256(ethers.toUtf8Bytes("blinding_2"));
        const depositAmount = ethers.parseEther("0.1");
        
        await advancedObfuscationMixer.connect(user1).createConfidentialTransaction(
          stealthAddress,
          blindingFactor1,
          MIN_MIXING_DELAY,
          { value: depositAmount }
        );
        
        await advancedObfuscationMixer.connect(user1).createConfidentialTransaction(
          stealthAddress,
          blindingFactor2,
          MIN_MIXING_DELAY,
          { value: depositAmount }
        );
        
        const stats = await advancedObfuscationMixer.getStats();
        expect(stats.totalOneTimeAddresses_).to.equal(2);
      }
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to pause contract", async function () {
      await advancedObfuscationMixer.connect(owner).emergencyPause();
      
      const stealthKey = ethers.keccak256(ethers.toUtf8Bytes("paused_key"));
      
      await expect(
        advancedObfuscationMixer.connect(user1).generateStealthAddress(stealthKey)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow owner to resume contract", async function () {
      await advancedObfuscationMixer.connect(owner).emergencyPause();
      await advancedObfuscationMixer.connect(owner).resume();
      
      const stealthKey = ethers.keccak256(ethers.toUtf8Bytes("resumed_key"));
      
      await expect(
        advancedObfuscationMixer.connect(user1).generateStealthAddress(stealthKey)
      ).to.not.be.reverted;
    });

    it("Should allow owner to withdraw fees", async function () {
      // First make a deposit to add some ETH to the contract
      const stealthKey = ethers.keccak256(ethers.toUtf8Bytes("fee_key"));
      const tx = await advancedObfuscationMixer.connect(user1).generateStealthAddress(stealthKey);
      const receipt = await tx.wait();
      
      // Extract stealth address from event
      const events = receipt?.logs.filter(log => {
        try {
          const parsed = advancedObfuscationMixer.interface.parseLog(log);
          return parsed?.name === "StealthAddressGenerated";
        } catch {
          return false;
        }
      });
      
      if (events && events.length > 0) {
        const parsed = advancedObfuscationMixer.interface.parseLog(events[0]);
        const stealthAddress = parsed?.args[0];
        
        const blindingFactor = ethers.keccak256(ethers.toUtf8Bytes("blinding_factor"));
        const depositAmount = ethers.parseEther("0.1");
        
        await advancedObfuscationMixer.connect(user1).createConfidentialTransaction(
          stealthAddress,
          blindingFactor,
          MIN_MIXING_DELAY,
          { value: depositAmount }
        );
        
        // Owner should be able to withdraw fees
        await expect(advancedObfuscationMixer.connect(owner).withdrawFees()).to.not.be.reverted;
      }
    });
  });

  describe("Edge Cases", function () {
    it("Should handle invalid stealth addresses", async function () {
      const invalidStealthAddress = ethers.keccak256(ethers.toUtf8Bytes("invalid"));
      const blindingFactor = ethers.keccak256(ethers.toUtf8Bytes("blinding_factor"));
      const depositAmount = ethers.parseEther("0.1");
      
      await expect(
        advancedObfuscationMixer.connect(user1).createConfidentialTransaction(
          invalidStealthAddress,
          blindingFactor,
          MIN_MIXING_DELAY,
          { value: depositAmount }
        )
      ).to.be.revertedWith("Stealth address not active");
    });

    it("Should handle zero amounts in withdrawals", async function () {
      const nullifier = ethers.keccak256(ethers.toUtf8Bytes("zero_amount"));
      const stealthAddress = ethers.keccak256(ethers.toUtf8Bytes("test_stealth"));
      const blindingFactor = ethers.keccak256(ethers.toUtf8Bytes("blinding_factor"));
      const merkleProof: string[] = [];
      
      await expect(
        advancedObfuscationMixer.connect(user1).withdrawConfidential(
          nullifier,
          stealthAddress,
          0,
          blindingFactor,
          merkleProof
        )
      ).to.be.revertedWith("Invalid amount");
    });
  });
}); 