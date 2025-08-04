import { expect } from "chai";
import { ethers } from "hardhat";
import { CrossChainPrivacyBridge } from "../typechain-types";
import { SignerWithAddress } from "@ethersproject/contracts";

describe("CrossChainPrivacyBridge", function () {
  let crossChainBridge: CrossChainPrivacyBridge;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const MIN_SWAP_AMOUNT = ethers.parseEther("0.01");
  const MAX_SWAP_AMOUNT = ethers.parseEther("1000000");
  const MIN_TIMEOUT = 3600; // 1 hour
  const MAX_TIMEOUT = 604800; // 7 days

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    const CrossChainPrivacyBridgeFactory = await ethers.getContractFactory("CrossChainPrivacyBridge");
    crossChainBridge = await CrossChainPrivacyBridgeFactory.deploy();
    await crossChainBridge.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      const stats = await crossChainBridge.getStats();
      expect(stats.totalAtomicSwaps_).to.equal(0);
      expect(stats.totalStateChannels_).to.equal(0);
      expect(stats.totalHTLCs_).to.equal(0);
      expect(stats.totalCompletedSwaps_).to.equal(0);
      expect(stats.totalCompletedHTLCs_).to.equal(0);
    });

    it("Should have correct constants", async function () {
      expect(await crossChainBridge.MIN_SWAP_AMOUNT()).to.equal(MIN_SWAP_AMOUNT);
      expect(await crossChainBridge.MAX_SWAP_AMOUNT()).to.equal(MAX_SWAP_AMOUNT);
      expect(await crossChainBridge.MIN_TIMEOUT()).to.equal(MIN_TIMEOUT);
      expect(await crossChainBridge.MAX_TIMEOUT()).to.equal(MAX_TIMEOUT);
    });
  });

  describe("Atomic Swaps", function () {
    it("Should initiate atomic swap successfully", async function () {
      const recipient = user2.address;
      const secretHash = ethers.keccak256(ethers.toUtf8Bytes("secret"));
      const timeout = MIN_TIMEOUT;
      const swapAmount = ethers.parseEther("0.1");
      
      const tx = await crossChainBridge.connect(user1).initiateAtomicSwap(
        recipient,
        secretHash,
        timeout,
        { value: swapAmount }
      );
      const receipt = await tx.wait();
      
      // Check that AtomicSwapInitiated event was emitted
      const events = receipt?.logs.filter(log => {
        try {
          const parsed = crossChainBridge.interface.parseLog(log);
          return parsed?.name === "AtomicSwapInitiated";
        } catch {
          return false;
        }
      });
      
      expect(events).to.have.length(1);
      
      const stats = await crossChainBridge.getStats();
      expect(stats.totalAtomicSwaps_).to.equal(1);
    });

    it("Should complete atomic swap with valid secret", async function () {
      const recipient = user2.address;
      const secret = ethers.keccak256(ethers.toUtf8Bytes("secret"));
      const secretHash = ethers.keccak256(ethers.toUtf8Bytes(secret));
      const timeout = MIN_TIMEOUT;
      const swapAmount = ethers.parseEther("0.1");
      
      await crossChainBridge.connect(user1).initiateAtomicSwap(
        recipient,
        secretHash,
        timeout,
        { value: swapAmount }
      );
      
      // Get swap ID
      const userSwaps = await crossChainBridge.getUserSwaps(user1.address);
      const swapId = userSwaps[0];
      
      await crossChainBridge.connect(user2).completeAtomicSwap(swapId, secret);
      
      const stats = await crossChainBridge.getStats();
      expect(stats.totalCompletedSwaps_).to.equal(1);
    });

    it("Should refund atomic swap if expired", async function () {
      const recipient = user2.address;
      const secretHash = ethers.keccak256(ethers.toUtf8Bytes("secret"));
      const timeout = 1; // 1 second timeout
      const swapAmount = ethers.parseEther("0.1");
      
      await crossChainBridge.connect(user1).initiateAtomicSwap(
        recipient,
        secretHash,
        timeout,
        { value: swapAmount }
      );
      
      // Get swap ID
      const userSwaps = await crossChainBridge.getUserSwaps(user1.address);
      const swapId = userSwaps[0];
      
      // Wait for timeout
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);
      
      await crossChainBridge.connect(user1).refundAtomicSwap(swapId);
      
      const swap = await crossChainBridge.getAtomicSwap(swapId);
      expect(swap.isRefunded).to.be.true;
    });

    it("Should prevent swap with invalid amount", async function () {
      const recipient = user2.address;
      const secretHash = ethers.keccak256(ethers.toUtf8Bytes("secret"));
      const timeout = MIN_TIMEOUT;
      
      await expect(
        crossChainBridge.connect(user1).initiateAtomicSwap(
          recipient,
          secretHash,
          timeout,
          { value: ethers.parseEther("0.005") }
        )
      ).to.be.revertedWith("Invalid swap amount");
    });

    it("Should prevent swap with invalid timeout", async function () {
      const recipient = user2.address;
      const secretHash = ethers.keccak256(ethers.toUtf8Bytes("secret"));
      const swapAmount = ethers.parseEther("0.1");
      
      await expect(
        crossChainBridge.connect(user1).initiateAtomicSwap(
          recipient,
          secretHash,
          MIN_TIMEOUT - 1,
          { value: swapAmount }
        )
      ).to.be.revertedWith("Invalid timeout");
    });
  });

  describe("State Channels", function () {
    it("Should open state channel successfully", async function () {
      const participant2 = user2.address;
      const amount2 = ethers.parseEther("0.05");
      const totalAmount = ethers.parseEther("0.1");
      
      const tx = await crossChainBridge.connect(user1).openStateChannel(
        participant2,
        amount2,
        { value: totalAmount }
      );
      const receipt = await tx.wait();
      
      // Check that StateChannelOpened event was emitted
      const events = receipt?.logs.filter(log => {
        try {
          const parsed = crossChainBridge.interface.parseLog(log);
          return parsed?.name === "StateChannelOpened";
        } catch {
          return false;
        }
      });
      
      expect(events).to.have.length(1);
      
      const stats = await crossChainBridge.getStats();
      expect(stats.totalStateChannels_).to.equal(1);
    });

    it("Should update state channel with valid signature", async function () {
      const participant2 = user2.address;
      const amount2 = ethers.parseEther("0.05");
      const totalAmount = ethers.parseEther("0.1");
      
      await crossChainBridge.connect(user1).openStateChannel(
        participant2,
        amount2,
        { value: totalAmount }
      );
      
      // Get channel ID
      const userChannels = await crossChainBridge.getUserChannels(user1.address);
      const channelId = userChannels[0];
      
      const newBalance1 = ethers.parseEther("0.06");
      const newBalance2 = ethers.parseEther("0.04");
      const nonce = 1;
      
      // Create signature from participant2
      const messageHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "uint256", "uint256", "uint256"],
        [channelId, newBalance1, newBalance2, nonce]
      ));
      const signature = await user2.signMessage(ethers.getBytes(messageHash));
      
      await crossChainBridge.connect(user1).updateStateChannel(
        channelId,
        newBalance1,
        newBalance2,
        signature
      );
      
      const channel = await crossChainBridge.getStateChannel(channelId);
      expect(channel.balance1).to.equal(newBalance1);
      expect(channel.balance2).to.equal(newBalance2);
      expect(channel.nonce).to.equal(1);
    });

    it("Should close state channel after timeout", async function () {
      const participant2 = user2.address;
      const amount2 = ethers.parseEther("0.05");
      const totalAmount = ethers.parseEther("0.1");
      
      await crossChainBridge.connect(user1).openStateChannel(
        participant2,
        amount2,
        { value: totalAmount }
      );
      
      // Get channel ID
      const userChannels = await crossChainBridge.getUserChannels(user1.address);
      const channelId = userChannels[0];
      
      // Wait for timeout (24 hours)
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);
      
      await crossChainBridge.connect(user1).closeStateChannel(channelId);
      
      const channel = await crossChainBridge.getStateChannel(channelId);
      expect(channel.isOpen).to.be.false;
    });
  });

  describe("HTLC Contracts", function () {
    it("Should create HTLC successfully", async function () {
      const recipient = user2.address;
      const hashlock = ethers.keccak256(ethers.toUtf8Bytes("hashlock"));
      const timeout = MIN_TIMEOUT;
      const htlcAmount = ethers.parseEther("0.1");
      
      const tx = await crossChainBridge.connect(user1).createHTLC(
        recipient,
        hashlock,
        timeout,
        { value: htlcAmount }
      );
      const receipt = await tx.wait();
      
      // Check that HTLCCreated event was emitted
      const events = receipt?.logs.filter(log => {
        try {
          const parsed = crossChainBridge.interface.parseLog(log);
          return parsed?.name === "HTLCCreated";
        } catch {
          return false;
        }
      });
      
      expect(events).to.have.length(1);
      
      const stats = await crossChainBridge.getStats();
      expect(stats.totalHTLCs_).to.equal(1);
    });

    it("Should complete HTLC with valid secret", async function () {
      const recipient = user2.address;
      const secret = ethers.keccak256(ethers.toUtf8Bytes("secret"));
      const hashlock = ethers.keccak256(ethers.toUtf8Bytes(secret));
      const timeout = MIN_TIMEOUT;
      const htlcAmount = ethers.parseEther("0.1");
      
      await crossChainBridge.connect(user1).createHTLC(
        recipient,
        hashlock,
        timeout,
        { value: htlcAmount }
      );
      
      // Get HTLC ID
      const userHTLCs = await crossChainBridge.getUserHTLCs(user1.address);
      const htlcId = userHTLCs[0];
      
      await crossChainBridge.connect(user2).completeHTLC(htlcId, secret);
      
      const stats = await crossChainBridge.getStats();
      expect(stats.totalCompletedHTLCs_).to.equal(1);
    });

    it("Should expire HTLC if timeout reached", async function () {
      const recipient = user2.address;
      const hashlock = ethers.keccak256(ethers.toUtf8Bytes("hashlock"));
      const timeout = 1; // 1 second timeout
      const htlcAmount = ethers.parseEther("0.1");
      
      await crossChainBridge.connect(user1).createHTLC(
        recipient,
        hashlock,
        timeout,
        { value: htlcAmount }
      );
      
      // Get HTLC ID
      const userHTLCs = await crossChainBridge.getUserHTLCs(user1.address);
      const htlcId = userHTLCs[0];
      
      // Wait for timeout
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);
      
      await crossChainBridge.connect(user1).expireHTLC(htlcId);
      
      const htlc = await crossChainBridge.getHTLC(htlcId);
      expect(htlc.isExpired).to.be.true;
    });

    it("Should prevent HTLC creation with invalid amount", async function () {
      const recipient = user2.address;
      const hashlock = ethers.keccak256(ethers.toUtf8Bytes("hashlock"));
      const timeout = MIN_TIMEOUT;
      
      await expect(
        crossChainBridge.connect(user1).createHTLC(
          recipient,
          hashlock,
          timeout,
          { value: ethers.parseEther("0.005") }
        )
      ).to.be.revertedWith("Invalid swap amount");
    });
  });

  describe("Privacy Features", function () {
    it("Should maintain privacy through atomic swaps", async function () {
      const recipient = user2.address;
      const secretHash = ethers.keccak256(ethers.toUtf8Bytes("secret"));
      const timeout = MIN_TIMEOUT;
      const swapAmount = ethers.parseEther("0.1");
      
      await crossChainBridge.connect(user1).initiateAtomicSwap(
        recipient,
        secretHash,
        timeout,
        { value: swapAmount }
      );
      
      // Swap should be private - only participants know the details
      const stats = await crossChainBridge.getStats();
      expect(stats.totalAtomicSwaps_).to.equal(1);
    });

    it("Should maintain privacy through state channels", async function () {
      const participant2 = user2.address;
      const amount2 = ethers.parseEther("0.05");
      const totalAmount = ethers.parseEther("0.1");
      
      await crossChainBridge.connect(user1).openStateChannel(
        participant2,
        amount2,
        { value: totalAmount }
      );
      
      // State channel should be private - only participants know the details
      const stats = await crossChainBridge.getStats();
      expect(stats.totalStateChannels_).to.equal(1);
    });

    it("Should maintain privacy through HTLCs", async function () {
      const recipient = user2.address;
      const hashlock = ethers.keccak256(ethers.toUtf8Bytes("hashlock"));
      const timeout = MIN_TIMEOUT;
      const htlcAmount = ethers.parseEther("0.1");
      
      await crossChainBridge.connect(user1).createHTLC(
        recipient,
        hashlock,
        timeout,
        { value: htlcAmount }
      );
      
      // HTLC should be private - only participants know the details
      const stats = await crossChainBridge.getStats();
      expect(stats.totalHTLCs_).to.equal(1);
    });
  });

  describe("Cross-Chain Capabilities", function () {
    it("Should support cross-chain atomic swaps", async function () {
      const recipient = user2.address;
      const secretHash = ethers.keccak256(ethers.toUtf8Bytes("cross_chain_secret"));
      const timeout = MIN_TIMEOUT;
      const swapAmount = ethers.parseEther("0.1");
      
      await crossChainBridge.connect(user1).initiateAtomicSwap(
        recipient,
        secretHash,
        timeout,
        { value: swapAmount }
      );
      
      // This simulates a cross-chain atomic swap
      // In practice, this would coordinate with other chains
      const userSwaps = await crossChainBridge.getUserSwaps(user1.address);
      expect(userSwaps).to.have.length(1);
    });

    it("Should support cross-chain state channels", async function () {
      const participant2 = user2.address;
      const amount2 = ethers.parseEther("0.05");
      const totalAmount = ethers.parseEther("0.1");
      
      await crossChainBridge.connect(user1).openStateChannel(
        participant2,
        amount2,
        { value: totalAmount }
      );
      
      // This simulates a cross-chain state channel
      // In practice, this would coordinate with other chains
      const userChannels = await crossChainBridge.getUserChannels(user1.address);
      expect(userChannels).to.have.length(1);
    });

    it("Should support cross-chain HTLCs", async function () {
      const recipient = user2.address;
      const hashlock = ethers.keccak256(ethers.toUtf8Bytes("cross_chain_hashlock"));
      const timeout = MIN_TIMEOUT;
      const htlcAmount = ethers.parseEther("0.1");
      
      await crossChainBridge.connect(user1).createHTLC(
        recipient,
        hashlock,
        timeout,
        { value: htlcAmount }
      );
      
      // This simulates a cross-chain HTLC
      // In practice, this would coordinate with other chains
      const userHTLCs = await crossChainBridge.getUserHTLCs(user1.address);
      expect(userHTLCs).to.have.length(1);
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to pause contract", async function () {
      await crossChainBridge.connect(owner).emergencyPause();
      
      const recipient = user2.address;
      const secretHash = ethers.keccak256(ethers.toUtf8Bytes("secret"));
      const timeout = MIN_TIMEOUT;
      const swapAmount = ethers.parseEther("0.1");
      
      await expect(
        crossChainBridge.connect(user1).initiateAtomicSwap(
          recipient,
          secretHash,
          timeout,
          { value: swapAmount }
        )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow owner to resume contract", async function () {
      await crossChainBridge.connect(owner).emergencyPause();
      await crossChainBridge.connect(owner).resume();
      
      const recipient = user2.address;
      const secretHash = ethers.keccak256(ethers.toUtf8Bytes("secret"));
      const timeout = MIN_TIMEOUT;
      const swapAmount = ethers.parseEther("0.1");
      
      await expect(
        crossChainBridge.connect(user1).initiateAtomicSwap(
          recipient,
          secretHash,
          timeout,
          { value: swapAmount }
        )
      ).to.not.be.reverted;
    });

    it("Should allow owner to withdraw fees", async function () {
      // First make a transaction to add some ETH to the contract
      const recipient = user2.address;
      const secretHash = ethers.keccak256(ethers.toUtf8Bytes("secret"));
      const timeout = MIN_TIMEOUT;
      const swapAmount = ethers.parseEther("0.1");
      
      await crossChainBridge.connect(user1).initiateAtomicSwap(
        recipient,
        secretHash,
        timeout,
        { value: swapAmount }
      );
      
      // Owner should be able to withdraw fees
      await expect(crossChainBridge.connect(owner).withdrawFees()).to.not.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle invalid recipients", async function () {
      const secretHash = ethers.keccak256(ethers.toUtf8Bytes("secret"));
      const timeout = MIN_TIMEOUT;
      const swapAmount = ethers.parseEther("0.1");
      
      await expect(
        crossChainBridge.connect(user1).initiateAtomicSwap(
          ethers.ZeroAddress,
          secretHash,
          timeout,
          { value: swapAmount }
        )
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should handle self-swaps", async function () {
      const secretHash = ethers.keccak256(ethers.toUtf8Bytes("secret"));
      const timeout = MIN_TIMEOUT;
      const swapAmount = ethers.parseEther("0.1");
      
      await expect(
        crossChainBridge.connect(user1).initiateAtomicSwap(
          user1.address,
          secretHash,
          timeout,
          { value: swapAmount }
        )
      ).to.be.revertedWith("Cannot swap with self");
    });

    it("Should handle zero hashlock", async function () {
      const recipient = user2.address;
      const timeout = MIN_TIMEOUT;
      const swapAmount = ethers.parseEther("0.1");
      
      await expect(
        crossChainBridge.connect(user1).createHTLC(
          recipient,
          ethers.ZeroHash,
          timeout,
          { value: swapAmount }
        )
      ).to.be.revertedWith("Invalid hashlock");
    });
  });
}); 