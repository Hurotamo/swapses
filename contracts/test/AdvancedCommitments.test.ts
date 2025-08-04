import { expect } from "chai";
import { ethers } from "hardhat";
import { AdvancedCommitments } from "../typechain-types";

describe("AdvancedCommitments", function () {
  let advancedCommitments: AdvancedCommitments;
  let owner: any;
  let user1: any;
  let user2: any;
  let user3: any;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    const AdvancedCommitments = await ethers.getContractFactory("AdvancedCommitments");
    advancedCommitments = await AdvancedCommitments.deploy();
    await advancedCommitments.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await advancedCommitments.totalCommitments()).to.equal(0);
      expect(await advancedCommitments.totalSignatures()).to.equal(0);
      expect(await advancedCommitments.totalRingSignatures()).to.equal(0);
      expect(await advancedCommitments.totalBulletproofs()).to.equal(0);
      expect(await advancedCommitments.owner()).to.equal(owner.address);
    });

    it("Should have correct curve parameters", async function () {
      expect(await advancedCommitments.PRIME_Q()).to.equal(
        "21888242871839275222246405745257275088696311157297823662689037894645226208583"
      );
      expect(await advancedCommitments.PRIME_R()).to.equal(
        "21888242871839275222246405745257275088548364400416034343698204186575808495617"
      );
    });
  });

  describe("Pedersen Commitments", function () {
    it("Should create Pedersen commitment successfully", async function () {
      const amount = ethers.parseEther("1.0");
      const blindingFactor = ethers.parseUnits("123456789", 0);
      
      const tx = await advancedCommitments.createPedersenCommitment(amount, blindingFactor);
      const receipt = await tx.wait();
      
      expect(receipt.status).to.equal(1);
      expect(await advancedCommitments.totalCommitments()).to.equal(1);
    });

    it("Should reject zero amount", async function () {
      const amount = 0;
      const blindingFactor = ethers.parseUnits("123456789", 0);
      
      await expect(
        advancedCommitments.createPedersenCommitment(amount, blindingFactor)
      ).to.be.revertedWith("Amount must be positive");
    });

    it("Should reject invalid blinding factor", async function () {
      const amount = ethers.parseEther("1.0");
      const blindingFactor = ethers.parseUnits("21888242871839275222246405745257275088548364400416034343698204186575808495618", 0); // PRIME_R + 1
      
      await expect(
        advancedCommitments.createPedersenCommitment(amount, blindingFactor)
      ).to.be.revertedWith("Invalid blinding factor");
    });

    it("Should reveal Pedersen commitment correctly", async function () {
      const amount = ethers.parseEther("1.0");
      const blindingFactor = ethers.parseUnits("123456789", 0);
      
      const tx = await advancedCommitments.createPedersenCommitment(amount, blindingFactor);
      const receipt = await tx.wait();
      
      // Get the commitment from the event
      const event = receipt.events?.find(e => e.event === "PedersenCommitmentCreated");
      const commitment = event?.args?.commitment;
      
      const result = await advancedCommitments.revealPedersenCommitment(commitment);
      
      expect(result[0]).to.equal(amount);
      expect(result[1]).to.equal(blindingFactor);
    });

    it("Should reject revealing non-existent commitment", async function () {
      const fakeCommitment = ethers.randomBytes(32);
      
      await expect(
        advancedCommitments.revealPedersenCommitment(fakeCommitment)
      ).to.be.revertedWith("Commitment not found");
    });
  });

  describe("Schnorr Signatures", function () {
    it("Should verify valid Schnorr signature", async function () {
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("test message"));
      const signature = [
        ethers.parseUnits("123456789", 0),
        ethers.parseUnits("987654321", 0)
      ];
      const publicKey = ethers.parseUnits("555555555", 0);
      
      const tx = await advancedCommitments.verifySchnorrSignature(messageHash, signature, publicKey);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
      expect(await advancedCommitments.totalSignatures()).to.equal(1);
    });

    it("Should reject invalid signature components", async function () {
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("test message"));
      const invalidSignature = [
        ethers.parseUnits("21888242871839275222246405745257275088548364400416034343698204186575808495618", 0), // PRIME_R + 1
        ethers.parseUnits("987654321", 0)
      ];
      const publicKey = ethers.parseUnits("555555555", 0);
      
      await expect(
        advancedCommitments.verifySchnorrSignature(messageHash, invalidSignature, publicKey)
      ).to.be.revertedWith("Invalid signature s");
    });

    it("Should reject invalid public key", async function () {
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("test message"));
      const signature = [
        ethers.parseUnits("123456789", 0),
        ethers.parseUnits("987654321", 0)
      ];
      const invalidPublicKey = ethers.parseUnits("21888242871839275222246405745257275088696311157297823662689037894645226208584", 0); // PRIME_Q + 1
      
      await expect(
        advancedCommitments.verifySchnorrSignature(messageHash, signature, invalidPublicKey)
      ).to.be.revertedWith("Invalid public key");
    });

    it("Should track verified signatures", async function () {
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("test message"));
      const signature = [
        ethers.parseUnits("123456789", 0),
        ethers.parseUnits("987654321", 0)
      ];
      const publicKey = ethers.parseUnits("555555555", 0);
      
      await advancedCommitments.verifySchnorrSignature(messageHash, signature, publicKey);
      
      expect(await advancedCommitments.isSchnorrSignatureVerified(messageHash)).to.be.true;
    });
  });

  describe("Ring Signatures", function () {
    it("Should verify valid ring signature", async function () {
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("ring test message"));
      const ringMembers = [user1.address, user2.address, user3.address];
      const signatures = [
        [ethers.parseUnits("111111111", 0), ethers.parseUnits("222222222", 0)],
        [ethers.parseUnits("333333333", 0), ethers.parseUnits("444444444", 0)],
        [ethers.parseUnits("555555555", 0), ethers.parseUnits("666666666", 0)]
      ];
      const realSignerIndex = 1;
      
      const tx = await advancedCommitments.verifyRingSignature(
        messageHash,
        signatures,
        ringMembers,
        realSignerIndex
      );
      
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
      expect(await advancedCommitments.totalRingSignatures()).to.equal(1);
    });

    it("Should reject ring with insufficient members", async function () {
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("ring test message"));
      const ringMembers = [user1.address]; // Only 1 member
      const signatures = [
        [ethers.parseUnits("111111111", 0), ethers.parseUnits("222222222", 0)]
      ];
      const realSignerIndex = 0;
      
      await expect(
        advancedCommitments.verifyRingSignature(messageHash, signatures, ringMembers, realSignerIndex)
      ).to.be.revertedWith("Ring must have at least 2 members");
    });

    it("Should reject invalid signer index", async function () {
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("ring test message"));
      const ringMembers = [user1.address, user2.address];
      const signatures = [
        [ethers.parseUnits("111111111", 0), ethers.parseUnits("222222222", 0)],
        [ethers.parseUnits("333333333", 0), ethers.parseUnits("444444444", 0)]
      ];
      const invalidSignerIndex = 5; // Out of bounds
      
      await expect(
        advancedCommitments.verifyRingSignature(messageHash, signatures, ringMembers, invalidSignerIndex)
      ).to.be.revertedWith("Invalid signer index");
    });

    it("Should reject signature count mismatch", async function () {
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("ring test message"));
      const ringMembers = [user1.address, user2.address];
      const signatures = [
        [ethers.parseUnits("111111111", 0), ethers.parseUnits("222222222", 0)]
        // Missing second signature
      ];
      const realSignerIndex = 0;
      
      await expect(
        advancedCommitments.verifyRingSignature(messageHash, signatures, ringMembers, realSignerIndex)
      ).to.be.revertedWith("Signature count mismatch");
    });

    it("Should track verified ring signatures", async function () {
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("ring test message"));
      const ringMembers = [user1.address, user2.address];
      const signatures = [
        [ethers.parseUnits("111111111", 0), ethers.parseUnits("222222222", 0)],
        [ethers.parseUnits("333333333", 0), ethers.parseUnits("444444444", 0)]
      ];
      const realSignerIndex = 0;
      
      await advancedCommitments.verifyRingSignature(messageHash, signatures, ringMembers, realSignerIndex);
      
      expect(await advancedCommitments.isRingSignatureVerified(messageHash)).to.be.true;
    });
  });

  describe("Bulletproofs", function () {
    it("Should verify valid bulletproof", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("test commitment"));
      const minAmount = ethers.parseEther("0.1");
      const maxAmount = ethers.parseEther("10.0");
      const proof = [
        ethers.parseUnits("111111111", 0),
        ethers.parseUnits("222222222", 0),
        ethers.parseUnits("333333333", 0),
        ethers.parseUnits("444444444", 0),
        ethers.parseUnits("555555555", 0),
        ethers.parseUnits("666666666", 0),
        ethers.parseUnits("777777777", 0),
        ethers.parseUnits("888888888", 0)
      ];
      
      const tx = await advancedCommitments.verifyBulletproof(commitment, minAmount, maxAmount, proof);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
      expect(await advancedCommitments.totalBulletproofs()).to.equal(1);
    });

    it("Should reject invalid amount range", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("test commitment 2"));
      const minAmount = ethers.parseEther("10.0");
      const maxAmount = ethers.parseEther("0.1"); // min > max
      const proof = [
        ethers.parseUnits("111111111", 0),
        ethers.parseUnits("222222222", 0),
        ethers.parseUnits("333333333", 0),
        ethers.parseUnits("444444444", 0),
        ethers.parseUnits("555555555", 0),
        ethers.parseUnits("666666666", 0),
        ethers.parseUnits("777777777", 0),
        ethers.parseUnits("888888888", 0)
      ];
      
      await expect(
        advancedCommitments.verifyBulletproof(commitment, minAmount, maxAmount, proof)
      ).to.be.revertedWith("Invalid amount range");
    });

    it("Should reject insufficient proof length", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("test commitment 3"));
      const minAmount = ethers.parseEther("0.1");
      const maxAmount = ethers.parseEther("10.0");
      const insufficientProof = [
        ethers.parseUnits("111111111", 0),
        ethers.parseUnits("222222222", 0),
        ethers.parseUnits("333333333", 0),
        ethers.parseUnits("444444444", 0),
        ethers.parseUnits("555555555", 0),
        ethers.parseUnits("666666666", 0),
        ethers.parseUnits("777777777", 0)
        // Missing 8th component
      ];
      
      await expect(
        advancedCommitments.verifyBulletproof(commitment, minAmount, maxAmount, insufficientProof)
      ).to.be.revertedWith("Invalid proof length");
    });

    it("Should track verified bulletproofs", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("test commitment 4"));
      const minAmount = ethers.parseEther("0.1");
      const maxAmount = ethers.parseEther("10.0");
      const proof = [
        ethers.parseUnits("111111111", 0),
        ethers.parseUnits("222222222", 0),
        ethers.parseUnits("333333333", 0),
        ethers.parseUnits("444444444", 0),
        ethers.parseUnits("555555555", 0),
        ethers.parseUnits("666666666", 0),
        ethers.parseUnits("777777777", 0),
        ethers.parseUnits("888888888", 0)
      ];
      
      await advancedCommitments.verifyBulletproof(commitment, minAmount, maxAmount, proof);
      
      expect(await advancedCommitments.isBulletproofVerified(commitment)).to.be.true;
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to pause", async function () {
      await advancedCommitments.pause();
      expect(await advancedCommitments.paused()).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      await advancedCommitments.pause();
      await advancedCommitments.unpause();
      expect(await advancedCommitments.paused()).to.be.false;
    });

    it("Should reject non-owner pause", async function () {
      await expect(
        advancedCommitments.connect(user1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should reject non-owner unpause", async function () {
      await advancedCommitments.pause();
      await expect(
        advancedCommitments.connect(user1).unpause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Gas Optimization", function () {
    it("Should create multiple commitments efficiently", async function () {
      const commitments = [];
      
      for (let i = 0; i < 5; i++) {
        const amount = ethers.parseEther((i + 1).toString());
        const blindingFactor = ethers.parseUnits((i * 1000000).toString(), 0);
        
        const tx = await advancedCommitments.createPedersenCommitment(amount, blindingFactor);
        const receipt = await tx.wait();
        
        commitments.push(receipt);
      }
      
      expect(await advancedCommitments.totalCommitments()).to.equal(5);
    });

    it("Should verify multiple signatures efficiently", async function () {
      const signatures = [];
      
      for (let i = 0; i < 3; i++) {
        const messageHash = ethers.keccak256(ethers.toUtf8Bytes(`message ${i}`));
        const signature = [
          ethers.parseUnits((1000000 + i).toString(), 0),
          ethers.parseUnits((2000000 + i).toString(), 0)
        ];
        const publicKey = ethers.parseUnits((3000000 + i).toString(), 0);
        
        const result = await advancedCommitments.verifySchnorrSignature(messageHash, signature, publicKey);
        expect(result).to.be.true;
      }
      
      expect(await advancedCommitments.totalSignatures()).to.equal(3);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle maximum values correctly", async function () {
      const maxAmount = ethers.MaxUint256;
      const maxBlindingFactor = ethers.parseUnits("21888242871839275222246405745257275088548364400416034343698204186575808495616", 0); // PRIME_R - 1
      
      const tx = await advancedCommitments.createPedersenCommitment(maxAmount, maxBlindingFactor);
      const receipt = await tx.wait();
      
      expect(receipt.status).to.equal(1);
    });

    it("Should handle zero blinding factor", async function () {
      const amount = ethers.parseEther("1.0");
      const zeroBlindingFactor = ethers.parseUnits("0", 0);
      
      const tx = await advancedCommitments.createPedersenCommitment(amount, zeroBlindingFactor);
      const receipt = await tx.wait();
      
      expect(receipt.status).to.equal(1);
    });

    it("Should handle large ring signatures", async function () {
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("large ring test"));
      const ringMembers = [user1.address, user2.address, user3.address, owner.address];
      const signatures = [
        [ethers.parseUnits("111111111", 0), ethers.parseUnits("222222222", 0)],
        [ethers.parseUnits("333333333", 0), ethers.parseUnits("444444444", 0)],
        [ethers.parseUnits("555555555", 0), ethers.parseUnits("666666666", 0)],
        [ethers.parseUnits("777777777", 0), ethers.parseUnits("888888888", 0)]
      ];
      const realSignerIndex = 2;
      
      const result = await advancedCommitments.verifyRingSignature(
        messageHash,
        signatures,
        ringMembers,
        realSignerIndex
      );
      
      expect(result).to.be.true;
    });
  });
}); 