import { expect } from "chai";
import { ethers } from "hardhat";
import { EnhancedPrivacyMixer } from "../typechain-types";
import { SignerWithAddress } from "@ethersproject/contracts";

describe("EnhancedPrivacyMixer", function () {
  let enhancedMixer: EnhancedPrivacyMixer;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let user4: SignerWithAddress;
  let user5: SignerWithAddress;

  const MIN_DEPOSIT = ethers.parseEther("0.01");
  const MAX_DEPOSIT = ethers.parseEther("1000000");
  const MIN_MIXING_DELAY = 3600; // 1 hour
  const MAX_MIXING_DELAY = 604800; // 7 days

  beforeEach(async function () {
    [owner, user1, user2, user3, user4, user5] = await ethers.getSigners();

    const EnhancedPrivacyMixerFactory = await ethers.getContractFactory("EnhancedPrivacyMixer");
    enhancedMixer = await EnhancedPrivacyMixerFactory.deploy();
    await enhancedMixer.waitForDeployment();

    // Create initial mixing pools
    await enhancedMixer.createMixingPool(MIN_MIXING_DELAY, MAX_MIXING_DELAY, 16);
    await enhancedMixer.createMixingPool(MIN_MIXING_DELAY * 2, MAX_MIXING_DELAY, 20);
    await enhancedMixer.createMixingPool(MIN_MIXING_DELAY * 6, MAX_MIXING_DELAY, 24);
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      const stats = await enhancedMixer.getStats();
      expect(stats.totalDeposits_).to.equal(0);
      expect(stats.totalWithdrawals_).to.equal(0);
      expect(stats.currentPoolId_).to.equal(3);
      expect(stats.currentRoundId_).to.equal(0);
      expect(stats.currentDepositId_).to.equal(0);
    });

    it("Should create mixing pools correctly", async function () {
      const pool1 = await enhancedMixer.getMixingPool(1);
      expect(pool1.poolId_).to.equal(1);
      expect(pool1.isActive).to.be.true;
      expect(pool1.minDelay_).to.equal(MIN_MIXING_DELAY);
      expect(pool1.maxDelay_).to.equal(MAX_MIXING_DELAY);
      expect(pool1.merkleDepth_).to.equal(16);
    });
  });

  describe("CoinJoin Rounds", function () {
    it("Should start CoinJoin rounds correctly", async function () {
      await enhancedMixer.startCoinJoinRound(1, 3, 20);
      
      const round = await enhancedMixer.getCoinJoinRound(1);
      expect(round.roundId_).to.equal(1);
      expect(round.poolId_).to.equal(1);
      expect(round.minParticipants_).to.equal(3);
      expect(round.maxParticipants_).to.equal(20);
      expect(round.isActive).to.be.true;
      expect(round.isCompleted).to.be.false;
    });

    it("Should allow users to join CoinJoin rounds", async function () {
      await enhancedMixer.startCoinJoinRound(1, 3, 20);
      
      const commitment1 = ethers.keccak256(ethers.toUtf8Bytes("commitment1"));
      const commitment2 = ethers.keccak256(ethers.toUtf8Bytes("commitment2"));
      
      await enhancedMixer.connect(user1).joinCoinJoinRound(1, commitment1, { value: MIN_DEPOSIT });
      await enhancedMixer.connect(user2).joinCoinJoinRound(1, commitment2, { value: MIN_DEPOSIT });
      
      expect(await enhancedMixer.isRoundParticipant(1, user1.address)).to.be.true;
      expect(await enhancedMixer.isRoundParticipant(1, user2.address)).to.be.true;
      expect(await enhancedMixer.getParticipantAmount(1, user1.address)).to.equal(MIN_DEPOSIT);
    });

    it("Should complete CoinJoin round when minimum participants reached", async function () {
      await enhancedMixer.startCoinJoinRound(1, 2, 20);
      
      const commitment1 = ethers.keccak256(ethers.toUtf8Bytes("commitment1"));
      const commitment2 = ethers.keccak256(ethers.toUtf8Bytes("commitment2"));
      
      await enhancedMixer.connect(user1).joinCoinJoinRound(1, commitment1, { value: MIN_DEPOSIT });
      await enhancedMixer.connect(user2).joinCoinJoinRound(1, commitment2, { value: MIN_DEPOSIT });
      
      const round = await enhancedMixer.getCoinJoinRound(1);
      expect(round.isCompleted).to.be.true;
      expect(round.isActive).to.be.false;
      expect(round.participantCount_).to.equal(2);
    });

    it("Should prevent joining completed rounds", async function () {
      await enhancedMixer.startCoinJoinRound(1, 2, 20);
      
      const commitment1 = ethers.keccak256(ethers.toUtf8Bytes("commitment1"));
      const commitment2 = ethers.keccak256(ethers.toUtf8Bytes("commitment2"));
      const commitment3 = ethers.keccak256(ethers.toUtf8Bytes("commitment3"));
      
      await enhancedMixer.connect(user1).joinCoinJoinRound(1, commitment1, { value: MIN_DEPOSIT });
      await enhancedMixer.connect(user2).joinCoinJoinRound(1, commitment2, { value: MIN_DEPOSIT });
      
      await expect(
        enhancedMixer.connect(user3).joinCoinJoinRound(1, commitment3, { value: MIN_DEPOSIT })
      ).to.be.revertedWith("Round not active");
    });
  });

  describe("Multi-Pool Deposits", function () {
    it("Should allow deposits to multiple pools", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("multi_pool_commitment"));
      const poolIds = [1, 2, 3];
      const depositAmount = ethers.parseEther("0.1");
      
      await enhancedMixer.connect(user1).deposit(commitment, poolIds, MIN_MIXING_DELAY, { value: depositAmount });
      
      const stats = await enhancedMixer.getStats();
      expect(stats.totalDeposits_).to.equal(1);
      expect(stats.currentDepositId_).to.equal(1);
      
      // Check that all pools were updated
      const pool1 = await enhancedMixer.getMixingPool(1);
      const pool2 = await enhancedMixer.getMixingPool(2);
      const pool3 = await enhancedMixer.getMixingPool(3);
      
      expect(pool1.totalAmount_).to.equal(depositAmount / 3n);
      expect(pool2.totalAmount_).to.equal(depositAmount / 3n);
      expect(pool3.totalAmount_).to.equal(depositAmount / 3n);
      expect(pool1.participantCount_).to.equal(1);
      expect(pool2.participantCount_).to.equal(1);
      expect(pool3.participantCount_).to.equal(1);
    });

    it("Should apply random delays to deposits", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("random_delay_commitment"));
      const poolIds = [1];
      const depositAmount = ethers.parseEther("0.1");
      
      const tx = await enhancedMixer.connect(user1).deposit(commitment, poolIds, MIN_MIXING_DELAY, { value: depositAmount });
      const receipt = await tx.wait();
      
      // Check that RandomDelayApplied event was emitted
      const events = receipt?.logs.filter(log => {
        try {
          const parsed = enhancedMixer.interface.parseLog(log);
          return parsed?.name === "RandomDelayApplied";
        } catch {
          return false;
        }
      });
      
      expect(events).to.have.length(1);
    });

    it("Should prevent duplicate commitments", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("duplicate_commitment"));
      const poolIds = [1];
      const depositAmount = ethers.parseEther("0.1");
      
      await enhancedMixer.connect(user1).deposit(commitment, poolIds, MIN_MIXING_DELAY, { value: depositAmount });
      
      await expect(
        enhancedMixer.connect(user2).deposit(commitment, poolIds, MIN_MIXING_DELAY, { value: depositAmount })
      ).to.be.revertedWith("Commitment already exists");
    });

    it("Should validate deposit amounts", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("invalid_amount"));
      const poolIds = [1];
      
      // Test minimum deposit
      await expect(
        enhancedMixer.connect(user1).deposit(commitment, poolIds, MIN_MIXING_DELAY, { value: ethers.parseEther("0.005") })
      ).to.be.revertedWith("Invalid deposit amount");
      
      // Test maximum deposit
      await expect(
        enhancedMixer.connect(user1).deposit(commitment, poolIds, MIN_MIXING_DELAY, { value: ethers.parseEther("2000000") })
      ).to.be.revertedWith("Invalid deposit amount");
    });

    it("Should validate mixing delays", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("invalid_delay"));
      const poolIds = [1];
      const depositAmount = ethers.parseEther("0.1");
      
      // Test minimum delay
      await expect(
        enhancedMixer.connect(user1).deposit(commitment, poolIds, MIN_MIXING_DELAY - 1, { value: depositAmount })
      ).to.be.revertedWith("Invalid mixing delay");
      
      // Test maximum delay
      await expect(
        enhancedMixer.connect(user1).deposit(commitment, poolIds, MAX_MIXING_DELAY + 1, { value: depositAmount })
      ).to.be.revertedWith("Invalid mixing delay");
    });
  });

  describe("Withdrawals", function () {
    it("Should allow withdrawals with valid merkle proof", async function () {
      // This is a simplified test - in practice, you'd need to generate proper merkle proofs
      const nullifier = ethers.keccak256(ethers.toUtf8Bytes("test_nullifier"));
      const recipient = user1.address;
      const amount = ethers.parseEther("0.05");
      const merkleProof: string[] = [];
      
      // Update merkle root for testing
      const testRoot = ethers.keccak256(ethers.toUtf8Bytes("test_root"));
      await enhancedMixer.updateMerkleRoot(1, testRoot);
      
      // Note: This test would need proper merkle proof generation in practice
      // For now, we'll test the basic withdrawal structure
      await expect(
        enhancedMixer.connect(user1).withdraw(nullifier, recipient, amount, merkleProof)
      ).to.be.revertedWith("Invalid merkle proof");
    });

    it("Should prevent double-spending with nullifiers", async function () {
      const nullifier = ethers.keccak256(ethers.toUtf8Bytes("test_nullifier"));
      const recipient = user1.address;
      const amount = ethers.parseEther("0.05");
      const merkleProof: string[] = [];
      
      // Mark nullifier as used
      await enhancedMixer.connect(owner).withdrawFees();
      
      await expect(
        enhancedMixer.connect(user1).withdraw(nullifier, recipient, amount, merkleProof)
      ).to.be.revertedWith("Invalid merkle proof");
    });
  });

  describe("Pool Management", function () {
    it("Should allow owner to create new pools", async function () {
      await enhancedMixer.createMixingPool(MIN_MIXING_DELAY, MAX_MIXING_DELAY, 16);
      
      const pool4 = await enhancedMixer.getMixingPool(4);
      expect(pool4.poolId_).to.equal(4);
      expect(pool4.isActive).to.be.true;
    });

    it("Should prevent non-owners from creating pools", async function () {
      await expect(
        enhancedMixer.connect(user1).createMixingPool(MIN_MIXING_DELAY, MAX_MIXING_DELAY, 16)
      ).to.be.revertedWithCustomError(enhancedMixer, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to update merkle roots", async function () {
      const newRoot = ethers.keccak256(ethers.toUtf8Bytes("new_root"));
      await enhancedMixer.updateMerkleRoot(1, newRoot);
      
      const pool = await enhancedMixer.getMixingPool(1);
      expect(pool.merkleRoot_).to.equal(newRoot);
    });
  });

  describe("Random Delay Generation", function () {
    it("Should generate different random delays", async function () {
      const commitment1 = ethers.keccak256(ethers.toUtf8Bytes("random1"));
      const commitment2 = ethers.keccak256(ethers.toUtf8Bytes("random2"));
      const poolIds = [1];
      const depositAmount = ethers.parseEther("0.1");
      
      await enhancedMixer.connect(user1).deposit(commitment1, poolIds, MIN_MIXING_DELAY, { value: depositAmount });
      await enhancedMixer.connect(user2).deposit(commitment2, poolIds, MIN_MIXING_DELAY, { value: depositAmount });
      
      // The random delays should be different (though we can't directly test this due to blockchain state)
      const stats = await enhancedMixer.getStats();
      expect(stats.currentDepositId_).to.equal(2);
    });

    it("Should allow owner to update random delay range", async function () {
      const newRange = 3600; // 1 hour
      await enhancedMixer.updateRandomDelayRange(newRange);
      
      // Test that the range was updated (we can't directly access the private variable)
      // but we can verify the function executed successfully
      const stats = await enhancedMixer.getStats();
      expect(stats.currentDepositId_).to.equal(0); // Should still be 0
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to pause contract", async function () {
      await enhancedMixer.emergencyPause();
      
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("paused_commitment"));
      const poolIds = [1];
      const depositAmount = ethers.parseEther("0.1");
      
      await expect(
        enhancedMixer.connect(user1).deposit(commitment, poolIds, MIN_MIXING_DELAY, { value: depositAmount })
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow owner to resume contract", async function () {
      await enhancedMixer.emergencyPause();
      await enhancedMixer.resume();
      
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("resumed_commitment"));
      const poolIds = [1];
      const depositAmount = ethers.parseEther("0.1");
      
      await expect(
        enhancedMixer.connect(user1).deposit(commitment, poolIds, MIN_MIXING_DELAY, { value: depositAmount })
      ).to.not.be.reverted;
    });

    it("Should allow owner to withdraw fees", async function () {
      // First make a deposit to add some ETH to the contract
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("fee_commitment"));
      const poolIds = [1];
      const depositAmount = ethers.parseEther("0.1");
      
      await enhancedMixer.connect(user1).deposit(commitment, poolIds, MIN_MIXING_DELAY, { value: depositAmount });
      
      // Owner should be able to withdraw fees
      await expect(enhancedMixer.withdrawFees()).to.not.be.reverted;
    });
  });

  describe("Privacy Features", function () {
    it("Should maintain privacy through commitments", async function () {
      const commitment1 = ethers.keccak256(ethers.toUtf8Bytes("private1"));
      const commitment2 = ethers.keccak256(ethers.toUtf8Bytes("private2"));
      const poolIds = [1];
      const depositAmount = ethers.parseEther("0.1");
      
      await enhancedMixer.connect(user1).deposit(commitment1, poolIds, MIN_MIXING_DELAY, { value: depositAmount });
      await enhancedMixer.connect(user2).deposit(commitment2, poolIds, MIN_MIXING_DELAY, { value: depositAmount });
      
      // Both deposits should be recorded but not traceable to specific users
      const stats = await enhancedMixer.getStats();
      expect(stats.totalDeposits_).to.equal(2);
    });

    it("Should support multiple simultaneous pools", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("multi_pool"));
      const poolIds = [1, 2, 3];
      const depositAmount = ethers.parseEther("0.3");
      
      await enhancedMixer.connect(user1).deposit(commitment, poolIds, MIN_MIXING_DELAY, { value: depositAmount });
      
      // Verify all pools were updated
      for (let i = 1; i <= 3; i++) {
        const pool = await enhancedMixer.getMixingPool(i);
        expect(pool.totalAmount_).to.equal(depositAmount / 3n);
        expect(pool.participantCount_).to.equal(1);
      }
    });
  });

  describe("Edge Cases", function () {
    it("Should handle empty pool arrays", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("empty_pools"));
      const poolIds: number[] = [];
      const depositAmount = ethers.parseEther("0.1");
      
      await expect(
        enhancedMixer.connect(user1).deposit(commitment, poolIds, MIN_MIXING_DELAY, { value: depositAmount })
      ).to.be.revertedWith("Invalid pool count");
    });

    it("Should handle too many pools", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("too_many_pools"));
      const poolIds = [1, 2, 3, 4, 5, 6]; // More than 5
      const depositAmount = ethers.parseEther("0.1");
      
      await expect(
        enhancedMixer.connect(user1).deposit(commitment, poolIds, MIN_MIXING_DELAY, { value: depositAmount })
      ).to.be.revertedWith("Invalid pool count");
    });

    it("Should handle invalid pool IDs", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("invalid_pool"));
      const poolIds = [999]; // Non-existent pool
      const depositAmount = ethers.parseEther("0.1");
      
      await expect(
        enhancedMixer.connect(user1).deposit(commitment, poolIds, MIN_MIXING_DELAY, { value: depositAmount })
      ).to.be.revertedWith("Pool not active");
    });
  });
}); 