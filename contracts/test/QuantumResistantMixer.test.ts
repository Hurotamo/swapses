import { expect } from "chai";
import { ethers } from "hardhat";
import { QuantumResistantMixer } from "../typechain-types";
import { SignerWithAddress } from "@ethersproject/contracts";

describe("QuantumResistantMixer", function () {
  let quantumResistantMixer: QuantumResistantMixer;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    const QuantumResistantMixerFactory = await ethers.getContractFactory("QuantumResistantMixer");
    quantumResistantMixer = await QuantumResistantMixerFactory.deploy();
    await quantumResistantMixer.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await quantumResistantMixer.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set correct owner", async function () {
      expect(await quantumResistantMixer.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero statistics", async function () {
      const stats = await quantumResistantMixer.getStatistics();
      expect(stats.totalQuantumKeys_).to.equal(0);
      expect(stats.totalLatticeSignatures_).to.equal(0);
      expect(stats.totalQuantumHashes_).to.equal(0);
      expect(stats.totalPostQuantumTransactions_).to.equal(0);
    });

    it("Should have correct quantum security parameters", async function () {
      expect(await quantumResistantMixer.QUANTUM_SECURITY_LEVEL()).to.equal(256);
      expect(await quantumResistantMixer.LATTICE_DIMENSION()).to.equal(512);
      expect(await quantumResistantMixer.QUANTUM_HASH_ROUNDS()).to.equal(12);
      expect(await quantumResistantMixer.LATTICE_MODULUS()).to.equal(12289);
    });
  });

  describe("Quantum Key Generation", function () {
    it("Should generate quantum key successfully", async function () {
      await expect(quantumResistantMixer.generateQuantumKey())
        .to.emit(quantumResistantMixer, "QuantumKeyGenerated");

      const stats = await quantumResistantMixer.getStatistics();
      expect(stats.totalQuantumKeys_).to.equal(1);
    });

    it("Should generate unique key IDs", async function () {
      const keyId1 = await quantumResistantMixer.generateQuantumKey();
      const keyId2 = await quantumResistantMixer.generateQuantumKey();

      expect(keyId1).to.not.equal(keyId2);
    });

    it("Should store quantum key information correctly", async function () {
      const keyId = await quantumResistantMixer.generateQuantumKey();
      const keyInfo = await quantumResistantMixer.getQuantumKey(keyId);

      expect(keyInfo.keyId_).to.equal(keyId);
      expect(keyInfo.isActive).to.be.true;
      expect(keyInfo.usageCount).to.equal(0);
      expect(keyInfo.timestamp).to.be.gt(0);
    });
  });

  describe("Lattice Signature Creation", function () {
    let keyId: string;
    let messageHash: string;

    beforeEach(async function () {
      keyId = await quantumResistantMixer.generateQuantumKey();
      messageHash = ethers.keccak256(ethers.toUtf8Bytes("Test message"));
    });

    it("Should create lattice signature successfully", async function () {
      await expect(quantumResistantMixer.createLatticeSignature(messageHash, keyId))
        .to.emit(quantumResistantMixer, "LatticeSignatureCreated");

      const stats = await quantumResistantMixer.getStatistics();
      expect(stats.totalLatticeSignatures_).to.equal(1);
    });

    it("Should reject signature with invalid quantum key", async function () {
      const invalidKeyId = ethers.keccak256(ethers.toUtf8Bytes("invalid"));

      await expect(
        quantumResistantMixer.createLatticeSignature(messageHash, invalidKeyId)
      ).to.be.revertedWith("Invalid quantum key");
    });

    it("Should store lattice signature information correctly", async function () {
      const signatureId = await quantumResistantMixer.createLatticeSignature(messageHash, keyId);
      const sigInfo = await quantumResistantMixer.getLatticeSignature(signatureId);

      expect(sigInfo.signatureId_).to.equal(signatureId);
      expect(sigInfo.messageHash).to.equal(messageHash);
      expect(sigInfo.isValid).to.be.true;
      expect(sigInfo.timestamp).to.be.gt(0);
    });

    it("Should increment key usage count", async function () {
      await quantumResistantMixer.createLatticeSignature(messageHash, keyId);
      await quantumResistantMixer.createLatticeSignature(messageHash, keyId);

      const keyInfo = await quantumResistantMixer.getQuantumKey(keyId);
      expect(keyInfo.usageCount).to.equal(2);
    });
  });

  describe("Quantum Hash Creation", function () {
    it("Should create quantum hash successfully", async function () {
      const input = ethers.keccak256(ethers.toUtf8Bytes("Test input"));

      await expect(quantumResistantMixer.createQuantumHash(input))
        .to.emit(quantumResistantMixer, "QuantumResistantHashCreated");

      const stats = await quantumResistantMixer.getStatistics();
      expect(stats.totalQuantumHashes_).to.equal(1);
    });

    it("Should create unique hash IDs", async function () {
      const input1 = ethers.keccak256(ethers.toUtf8Bytes("Input 1"));
      const input2 = ethers.keccak256(ethers.toUtf8Bytes("Input 2"));

      const hashId1 = await quantumResistantMixer.createQuantumHash(input1);
      const hashId2 = await quantumResistantMixer.createQuantumHash(input2);

      expect(hashId1).to.not.equal(hashId2);
    });

    it("Should store quantum hash information correctly", async function () {
      const input = ethers.keccak256(ethers.toUtf8Bytes("Test input"));
      const hashId = await quantumResistantMixer.createQuantumHash(input);
      const hashInfo = await quantumResistantMixer.getQuantumHash(hashId);

      expect(hashInfo.hashId_).to.equal(hashId);
      expect(hashInfo.input).to.equal(input);
      expect(hashInfo.securityLevel).to.equal(256);
      expect(hashInfo.timestamp).to.be.gt(0);
    });

    it("Should generate different hashes for different inputs", async function () {
      const input1 = ethers.keccak256(ethers.toUtf8Bytes("Input 1"));
      const input2 = ethers.keccak256(ethers.toUtf8Bytes("Input 2"));

      const hashId1 = await quantumResistantMixer.createQuantumHash(input1);
      const hashId2 = await quantumResistantMixer.createQuantumHash(input2);

      const hashInfo1 = await quantumResistantMixer.getQuantumHash(hashId1);
      const hashInfo2 = await quantumResistantMixer.getQuantumHash(hashId2);

      expect(hashInfo1.quantumHash).to.not.equal(hashInfo2.quantumHash);
    });
  });

  describe("Quantum Key Distribution", function () {
    let keyId: string;

    beforeEach(async function () {
      keyId = await quantumResistantMixer.generateQuantumKey();
    });

    it("Should distribute quantum key successfully", async function () {
      const recipient = user1.address;
      const encryptedKey = ethers.keccak256(ethers.toUtf8Bytes("encrypted_key"));

      await expect(quantumResistantMixer.distributeQuantumKey(keyId, recipient, encryptedKey))
        .to.emit(quantumResistantMixer, "QuantumKeyDistributed")
        .withArgs(keyId, recipient, encryptedKey, await time());
    });

    it("Should reject distribution with invalid quantum key", async function () {
      const invalidKeyId = ethers.keccak256(ethers.toUtf8Bytes("invalid"));
      const recipient = user1.address;
      const encryptedKey = ethers.keccak256(ethers.toUtf8Bytes("encrypted_key"));

      await expect(
        quantumResistantMixer.distributeQuantumKey(invalidKeyId, recipient, encryptedKey)
      ).to.be.revertedWith("Invalid quantum key");
    });

    it("Should reject distribution to zero address", async function () {
      const recipient = ethers.ZeroAddress;
      const encryptedKey = ethers.keccak256(ethers.toUtf8Bytes("encrypted_key"));

      await expect(
        quantumResistantMixer.distributeQuantumKey(keyId, recipient, encryptedKey)
      ).to.be.revertedWith("Invalid recipient");
    });
  });

  describe("Post-Quantum Transactions", function () {
    let keyId: string;
    let signatureId: string;
    let hashId: string;
    let messageHash: string;

    beforeEach(async function () {
      keyId = await quantumResistantMixer.generateQuantumKey();
      messageHash = ethers.keccak256(ethers.toUtf8Bytes("Test message"));
      signatureId = await quantumResistantMixer.createLatticeSignature(messageHash, keyId);
      const input = ethers.keccak256(ethers.toUtf8Bytes("Test input"));
      hashId = await quantumResistantMixer.createQuantumHash(input);
    });

    it("Should create post-quantum transaction successfully", async function () {
      const amount = ethers.parseEther("0.1");
      const recipient = user1.address;

      await expect(quantumResistantMixer.createPostQuantumTransaction(signatureId, hashId, amount, recipient))
        .to.emit(quantumResistantMixer, "PostQuantumTransaction");

      const stats = await quantumResistantMixer.getStatistics();
      expect(stats.totalPostQuantumTransactions_).to.equal(1);
    });

    it("Should reject transaction with invalid amount", async function () {
      const tooSmallAmount = ethers.parseEther("0.005"); // Less than MIN_DEPOSIT
      const tooLargeAmount = ethers.parseEther("2000000"); // More than MAX_DEPOSIT
      const recipient = user1.address;

      await expect(
        quantumResistantMixer.createPostQuantumTransaction(signatureId, hashId, tooSmallAmount, recipient)
      ).to.be.revertedWith("Invalid amount");

      await expect(
        quantumResistantMixer.createPostQuantumTransaction(signatureId, hashId, tooLargeAmount, recipient)
      ).to.be.revertedWith("Invalid amount");
    });

    it("Should reject transaction with invalid recipient", async function () {
      const amount = ethers.parseEther("0.1");
      const invalidRecipient = ethers.ZeroAddress;

      await expect(
        quantumResistantMixer.createPostQuantumTransaction(signatureId, hashId, amount, invalidRecipient)
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should reject transaction with invalid lattice signature", async function () {
      const amount = ethers.parseEther("0.1");
      const recipient = user1.address;
      const invalidSignatureId = ethers.keccak256(ethers.toUtf8Bytes("invalid"));

      await expect(
        quantumResistantMixer.createPostQuantumTransaction(invalidSignatureId, hashId, amount, recipient)
      ).to.be.revertedWith("Invalid lattice signature");
    });

    it("Should reject transaction with invalid quantum hash", async function () {
      const amount = ethers.parseEther("0.1");
      const recipient = user1.address;
      const invalidHashId = ethers.keccak256(ethers.toUtf8Bytes("invalid"));

      await expect(
        quantumResistantMixer.createPostQuantumTransaction(signatureId, invalidHashId, amount, recipient)
      ).to.be.revertedWith("Invalid quantum hash");
    });

    it("Should store post-quantum transaction information correctly", async function () {
      const amount = ethers.parseEther("0.1");
      const recipient = user1.address;

      const txId = await quantumResistantMixer.createPostQuantumTransaction(signatureId, hashId, amount, recipient);
      const txInfo = await quantumResistantMixer.getPostQuantumTransaction(txId);

      expect(txInfo.txId_).to.equal(txId);
      expect(txInfo.amount).to.equal(amount);
      expect(txInfo.recipient).to.equal(recipient);
      expect(txInfo.isProcessed).to.be.false;
      expect(txInfo.timestamp).to.be.gt(0);
    });
  });

  describe("Transaction Processing", function () {
    let keyId: string;
    let signatureId: string;
    let hashId: string;
    let txId: string;

    beforeEach(async function () {
      keyId = await quantumResistantMixer.generateQuantumKey();
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("Test message"));
      signatureId = await quantumResistantMixer.createLatticeSignature(messageHash, keyId);
      const input = ethers.keccak256(ethers.toUtf8Bytes("Test input"));
      hashId = await quantumResistantMixer.createQuantumHash(input);
      const amount = ethers.parseEther("0.1");
      const recipient = user1.address;
      txId = await quantumResistantMixer.createPostQuantumTransaction(signatureId, hashId, amount, recipient);
    });

    it("Should process post-quantum transaction successfully", async function () {
      await expect(quantumResistantMixer.processPostQuantumTransaction(txId)).to.not.be.reverted;

      const txInfo = await quantumResistantMixer.getPostQuantumTransaction(txId);
      expect(txInfo.isProcessed).to.be.true;
    });

    it("Should reject processing non-existent transaction", async function () {
      const nonExistentTxId = ethers.keccak256(ethers.toUtf8Bytes("non_existent"));

      await expect(
        quantumResistantMixer.processPostQuantumTransaction(nonExistentTxId)
      ).to.be.revertedWith("Transaction not found");
    });

    it("Should reject processing already processed transaction", async function () {
      await quantumResistantMixer.processPostQuantumTransaction(txId);

      await expect(
        quantumResistantMixer.processPostQuantumTransaction(txId)
      ).to.be.revertedWith("Transaction already processed");
    });

    it("Should only allow owner to process transactions", async function () {
      await expect(
        quantumResistantMixer.connect(user1).processPostQuantumTransaction(txId)
      ).to.be.revertedWithCustomError(quantumResistantMixer, "OwnableUnauthorizedAccount");
    });
  });

  describe("Emergency Controls", function () {
    it("Should pause and resume contract", async function () {
      // Pause
      await expect(quantumResistantMixer.emergencyPause()).to.not.be.reverted;
      expect(await quantumResistantMixer.paused()).to.be.true;

      // Resume
      await expect(quantumResistantMixer.resume()).to.not.be.reverted;
      expect(await quantumResistantMixer.paused()).to.be.false;
    });

    it("Should reject operations when paused", async function () {
      await quantumResistantMixer.emergencyPause();

      await expect(
        quantumResistantMixer.generateQuantumKey()
      ).to.be.revertedWith("Pausable: paused");

      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("Test message"));
      const keyId = await quantumResistantMixer.generateQuantumKey();
      await quantumResistantMixer.resume();

      await expect(
        quantumResistantMixer.createLatticeSignature(messageHash, keyId)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should only allow owner to pause/resume", async function () {
      await expect(
        quantumResistantMixer.connect(user1).emergencyPause()
      ).to.be.revertedWithCustomError(quantumResistantMixer, "OwnableUnauthorizedAccount");

      await expect(
        quantumResistantMixer.connect(user1).resume()
      ).to.be.revertedWithCustomError(quantumResistantMixer, "OwnableUnauthorizedAccount");
    });
  });

  describe("Statistics", function () {
    it("Should track all statistics correctly", async function () {
      // Generate quantum key
      await quantumResistantMixer.generateQuantumKey();

      // Create lattice signature
      const keyId = await quantumResistantMixer.generateQuantumKey();
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("Test message"));
      await quantumResistantMixer.createLatticeSignature(messageHash, keyId);

      // Create quantum hash
      const input = ethers.keccak256(ethers.toUtf8Bytes("Test input"));
      await quantumResistantMixer.createQuantumHash(input);

      // Create post-quantum transaction
      const signatureId = await quantumResistantMixer.createLatticeSignature(messageHash, keyId);
      const hashId = await quantumResistantMixer.createQuantumHash(input);
      const amount = ethers.parseEther("0.1");
      const recipient = user1.address;
      await quantumResistantMixer.createPostQuantumTransaction(signatureId, hashId, amount, recipient);

      const stats = await quantumResistantMixer.getStatistics();
      expect(stats.totalQuantumKeys_).to.equal(2);
      expect(stats.totalLatticeSignatures_).to.equal(2);
      expect(stats.totalQuantumHashes_).to.equal(2);
      expect(stats.totalPostQuantumTransactions_).to.equal(1);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple quantum key generations", async function () {
      for (let i = 0; i < 10; i++) {
        await quantumResistantMixer.generateQuantumKey();
      }

      const stats = await quantumResistantMixer.getStatistics();
      expect(stats.totalQuantumKeys_).to.equal(10);
    });

    it("Should handle multiple lattice signatures", async function () {
      const keyId = await quantumResistantMixer.generateQuantumKey();
      
      for (let i = 0; i < 5; i++) {
        const messageHash = ethers.keccak256(ethers.toUtf8Bytes(`Message ${i}`));
        await quantumResistantMixer.createLatticeSignature(messageHash, keyId);
      }

      const stats = await quantumResistantMixer.getStatistics();
      expect(stats.totalLatticeSignatures_).to.equal(5);
    });

    it("Should handle multiple quantum hashes", async function () {
      for (let i = 0; i < 8; i++) {
        const input = ethers.keccak256(ethers.toUtf8Bytes(`Input ${i}`));
        await quantumResistantMixer.createQuantumHash(input);
      }

      const stats = await quantumResistantMixer.getStatistics();
      expect(stats.totalQuantumHashes_).to.equal(8);
    });

    it("Should handle multiple post-quantum transactions", async function () {
      const keyId = await quantumResistantMixer.generateQuantumKey();
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("Test message"));
      const signatureId = await quantumResistantMixer.createLatticeSignature(messageHash, keyId);
      const input = ethers.keccak256(ethers.toUtf8Bytes("Test input"));
      const hashId = await quantumResistantMixer.createQuantumHash(input);

      for (let i = 0; i < 3; i++) {
        const amount = ethers.parseEther("0.1");
        const recipient = user1.address;
        await quantumResistantMixer.createPostQuantumTransaction(signatureId, hashId, amount, recipient);
      }

      const stats = await quantumResistantMixer.getStatistics();
      expect(stats.totalPostQuantumTransactions_).to.equal(3);
    });
  });

  // Helper function to get current timestamp
  async function time(): Promise<number> {
    return (await ethers.provider.getBlock("latest"))!.timestamp;
  }
}); 