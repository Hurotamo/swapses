import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory, Signer, BigNumber } from "ethers";

describe("PracticalOnionRouter", function () {
  let PracticalOnionRouter: ContractFactory;
  let onionRouter: Contract;
  let owner: Signer;
  let sender: Signer;
  let recipient: Signer;
  let node1: Signer;
  let node2: Signer;
  let node3: Signer;
  let addr1: Signer;
  let addr2: Signer;

  beforeEach(async function () {
    [owner, sender, recipient, node1, node2, node3, addr1, addr2] = await ethers.getSigners();
    
    PracticalOnionRouter = await ethers.getContractFactory("PracticalOnionRouter");
    onionRouter = await PracticalOnionRouter.deploy();
    await onionRouter.deployed();
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      const stats = await onionRouter.getStatistics();
      expect(stats.totalPackets_).to.equal(0);
      expect(stats.totalNodes_).to.equal(0);
      expect(stats.totalProcessedLayers_).to.equal(0);
      expect(stats.totalFeesCollected_).to.equal(0);
    });

    it("Should have correct owner", async function () {
      expect(await onionRouter.owner()).to.equal(await owner.getAddress());
    });
  });

  describe("Node Registration", function () {
    it("Should register node successfully", async function () {
      const nodeAddress = await node1.getAddress();
      const fee = ethers.utils.parseEther("0.001");
      
      await onionRouter.connect(node1).registerNode(fee);
      
      const nodeInfo = await onionRouter.getNodeInfo(nodeAddress);
      expect(nodeInfo.nodeAddress_).to.equal(nodeAddress);
      expect(nodeInfo.fee).to.equal(fee);
      expect(nodeInfo.isActive).to.be.true;
      expect(nodeInfo.totalProcessed).to.equal(0);
      expect(nodeInfo.totalEarned).to.equal(0);
      
      const stats = await onionRouter.getStatistics();
      expect(stats.totalNodes_).to.equal(1);
    });

    it("Should fail to register with invalid fee", async function () {
      const lowFee = ethers.utils.parseEther("0.00001"); // Below minimum
      const highFee = ethers.utils.parseEther("1"); // Above maximum
      
      await expect(onionRouter.connect(node1).registerNode(lowFee))
        .to.be.revertedWith("Invalid fee");
      
      await expect(onionRouter.connect(node1).registerNode(highFee))
        .to.be.revertedWith("Invalid fee");
    });

    it("Should fail to register same node twice", async function () {
      const fee = ethers.utils.parseEther("0.001");
      
      await onionRouter.connect(node1).registerNode(fee);
      
      await expect(onionRouter.connect(node1).registerNode(fee))
        .to.be.revertedWith("Node already registered");
    });

    it("Should unregister node successfully", async function () {
      const fee = ethers.utils.parseEther("0.001");
      
      await onionRouter.connect(node1).registerNode(fee);
      await onionRouter.connect(node1).unregisterNode();
      
      const nodeInfo = await onionRouter.getNodeInfo(await node1.getAddress());
      expect(nodeInfo.isActive).to.be.false;
      
      const stats = await onionRouter.getStatistics();
      expect(stats.totalNodes_).to.equal(0);
    });
  });

  describe("Onion Packet Creation", function () {
    beforeEach(async function () {
      // Register nodes
      await onionRouter.connect(node1).registerNode(ethers.utils.parseEther("0.001"));
      await onionRouter.connect(node2).registerNode(ethers.utils.parseEther("0.002"));
      await onionRouter.connect(node3).registerNode(ethers.utils.parseEther("0.003"));
    });

    it("Should create onion packet successfully", async function () {
      const route = [
        await node1.getAddress(),
        await node2.getAddress(),
        await node3.getAddress()
      ];
      
      const encryptedLayers = [
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer1")),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer2")),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer3"))
      ];
      
      const recipient = await recipient.getAddress();
      const amount = ethers.utils.parseEther("0.1");
      
      const tx = await onionRouter.connect(sender).createOnionPacket(
        route,
        encryptedLayers,
        recipient,
        { value: amount }
      );
      
      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "OnionPacketCreated");
      
      expect(event).to.not.be.undefined;
      expect(event?.args?.sender).to.equal(await sender.getAddress());
      expect(event?.args?.recipient).to.equal(recipient);
      expect(event?.args?.amount).to.equal(amount);
      expect(event?.args?.layerCount).to.equal(3);
      
      const stats = await onionRouter.getStatistics();
      expect(stats.totalPackets_).to.equal(1);
    });

    it("Should fail with invalid route length", async function () {
      const shortRoute = [await node1.getAddress()];
      const longRoute = Array(11).fill(await node1.getAddress());
      
      const encryptedLayers = [ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer1"))];
      const recipient = await recipient.getAddress();
      const amount = ethers.utils.parseEther("0.1");
      
      await expect(onionRouter.connect(sender).createOnionPacket(
        shortRoute,
        encryptedLayers,
        recipient,
        { value: amount }
      )).to.be.revertedWith("Invalid route length");
      
      await expect(onionRouter.connect(sender).createOnionPacket(
        longRoute,
        Array(11).fill(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer"))),
        recipient,
        { value: amount }
      )).to.be.revertedWith("Invalid route length");
    });

    it("Should fail with route and layers mismatch", async function () {
      const route = [await node1.getAddress(), await node2.getAddress()];
      const encryptedLayers = [ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer1"))];
      const recipient = await recipient.getAddress();
      const amount = ethers.utils.parseEther("0.1");
      
      await expect(onionRouter.connect(sender).createOnionPacket(
        route,
        encryptedLayers,
        recipient,
        { value: amount }
      )).to.be.revertedWith("Route and layers mismatch");
    });

    it("Should fail with inactive node in route", async function () {
      const route = [
        await node1.getAddress(),
        await addr1.getAddress(), // Not registered
        await node2.getAddress()
      ];
      
      const encryptedLayers = [
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer1")),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer2")),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer3"))
      ];
      
      const recipient = await recipient.getAddress();
      const amount = ethers.utils.parseEther("0.1");
      
      await expect(onionRouter.connect(sender).createOnionPacket(
        route,
        encryptedLayers,
        recipient,
        { value: amount }
      )).to.be.revertedWith("Inactive node in route");
    });

    it("Should fail with insufficient amount for fees", async function () {
      const route = [
        await node1.getAddress(),
        await node2.getAddress(),
        await node3.getAddress()
      ];
      
      const encryptedLayers = [
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer1")),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer2")),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer3"))
      ];
      
      const recipient = await recipient.getAddress();
      const amount = ethers.utils.parseEther("0.001"); // Too low for fees
      
      await expect(onionRouter.connect(sender).createOnionPacket(
        route,
        encryptedLayers,
        recipient,
        { value: amount }
      )).to.be.revertedWith("Insufficient amount for fees");
    });
  });

  describe("Onion Layer Processing", function () {
    let packetId: string;
    let route: string[];
    let encryptedLayers: string[];
    let recipient: string;
    let amount: BigNumber;

    beforeEach(async function () {
      // Register nodes
      await onionRouter.connect(node1).registerNode(ethers.utils.parseEther("0.001"));
      await onionRouter.connect(node2).registerNode(ethers.utils.parseEther("0.002"));
      await onionRouter.connect(node3).registerNode(ethers.utils.parseEther("0.003"));
      
      route = [
        await node1.getAddress(),
        await node2.getAddress(),
        await node3.getAddress()
      ];
      
      encryptedLayers = [
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer1")),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer2")),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer3"))
      ];
      
      recipient = await recipient.getAddress();
      amount = ethers.utils.parseEther("0.1");
      
      const tx = await onionRouter.connect(sender).createOnionPacket(
        route,
        encryptedLayers,
        recipient,
        { value: amount }
      );
      
      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "OnionPacketCreated");
      packetId = event?.args?.packetId;
    });

    it("Should process onion layers successfully", async function () {
      // Process first layer
      await onionRouter.connect(node1).processOnionLayer(
        packetId,
        0,
        encryptedLayers[0]
      );
      
      let packet = await onionRouter.getOnionPacket(packetId);
      expect(packet.currentLayer).to.equal(1);
      expect(packet.isDelivered).to.be.false;
      
      // Process second layer
      await onionRouter.connect(node2).processOnionLayer(
        packetId,
        1,
        encryptedLayers[1]
      );
      
      packet = await onionRouter.getOnionPacket(packetId);
      expect(packet.currentLayer).to.equal(2);
      expect(packet.isDelivered).to.be.false;
      
      // Process final layer
      await onionRouter.connect(node3).processOnionLayer(
        packetId,
        2,
        encryptedLayers[2]
      );
      
      packet = await onionRouter.getOnionPacket(packetId);
      expect(packet.currentLayer).to.equal(3);
      expect(packet.isDelivered).to.be.true;
      
      const stats = await onionRouter.getStatistics();
      expect(stats.totalProcessedLayers_).to.equal(3);
    });

    it("Should fail with unauthorized node", async function () {
      await expect(onionRouter.connect(addr1).processOnionLayer(
        packetId,
        0,
        encryptedLayers[0]
      )).to.be.revertedWith("Unauthorized node");
    });

    it("Should fail with invalid layer order", async function () {
      await expect(onionRouter.connect(node2).processOnionLayer(
        packetId,
        1,
        encryptedLayers[1]
      )).to.be.revertedWith("Invalid layer order");
    });

    it("Should fail with invalid layer data", async function () {
      const invalidData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("invalid"));
      
      await expect(onionRouter.connect(node1).processOnionLayer(
        packetId,
        0,
        invalidData
      )).to.be.revertedWith("Invalid layer data");
    });

    it("Should fail with already delivered packet", async function () {
      // Process all layers
      await onionRouter.connect(node1).processOnionLayer(packetId, 0, encryptedLayers[0]);
      await onionRouter.connect(node2).processOnionLayer(packetId, 1, encryptedLayers[1]);
      await onionRouter.connect(node3).processOnionLayer(packetId, 2, encryptedLayers[2]);
      
      // Try to process again
      await expect(onionRouter.connect(node1).processOnionLayer(
        packetId,
        0,
        encryptedLayers[0]
      )).to.be.revertedWith("Packet already delivered");
    });
  });

  describe("Fee Management", function () {
    beforeEach(async function () {
      await onionRouter.connect(node1).registerNode(ethers.utils.parseEther("0.001"));
      await onionRouter.connect(node2).registerNode(ethers.utils.parseEther("0.002"));
    });

    it("Should collect and distribute fees correctly", async function () {
      const route = [await node1.getAddress(), await node2.getAddress()];
      const encryptedLayers = [
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer1")),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer2"))
      ];
      const recipient = await recipient.getAddress();
      const amount = ethers.utils.parseEther("0.1");
      
      await onionRouter.connect(sender).createOnionPacket(
        route,
        encryptedLayers,
        recipient,
        { value: amount }
      );
      
      const packetId = await onionRouter.getOnionPacket(await onionRouter.totalPackets());
      
      // Process layers
      await onionRouter.connect(node1).processOnionLayer(packetId.packetId_, 0, encryptedLayers[0]);
      await onionRouter.connect(node2).processOnionLayer(packetId.packetId_, 1, encryptedLayers[1]);
      
      // Check node balances
      const node1Info = await onionRouter.getNodeInfo(await node1.getAddress());
      const node2Info = await onionRouter.getNodeInfo(await node2.getAddress());
      
      expect(node1Info.balance).to.equal(ethers.utils.parseEther("0.001"));
      expect(node2Info.balance).to.equal(ethers.utils.parseEther("0.002"));
      expect(node1Info.totalProcessed).to.equal(1);
      expect(node2Info.totalProcessed).to.equal(1);
      
      const stats = await onionRouter.getStatistics();
      expect(stats.totalFeesCollected_).to.equal(ethers.utils.parseEther("0.003"));
    });

    it("Should allow nodes to withdraw fees", async function () {
      const route = [await node1.getAddress()];
      const encryptedLayers = [ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer1"))];
      const recipient = await recipient.getAddress();
      const amount = ethers.utils.parseEther("0.1");
      
      await onionRouter.connect(sender).createOnionPacket(
        route,
        encryptedLayers,
        recipient,
        { value: amount }
      );
      
      const packetId = await onionRouter.getOnionPacket(await onionRouter.totalPackets());
      await onionRouter.connect(node1).processOnionLayer(packetId.packetId_, 0, encryptedLayers[0]);
      
      const initialBalance = await node1.getBalance();
      await onionRouter.connect(node1).withdrawNodeFees();
      const finalBalance = await node1.getBalance();
      
      expect(finalBalance.gt(initialBalance)).to.be.true;
      
      const nodeInfo = await onionRouter.getNodeInfo(await node1.getAddress());
      expect(nodeInfo.balance).to.equal(0);
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to pause and unpause", async function () {
      await onionRouter.connect(owner).pause();
      expect(await onionRouter.paused()).to.be.true;
      
      await onionRouter.connect(owner).unpause();
      expect(await onionRouter.paused()).to.be.false;
    });

    it("Should allow owner to emergency withdraw", async function () {
      // Send some ETH to contract
      await sender.sendTransaction({
        to: onionRouter.address,
        value: ethers.utils.parseEther("1")
      });
      
      const initialBalance = await owner.getBalance();
      await onionRouter.connect(owner).emergencyWithdraw();
      const finalBalance = await owner.getBalance();
      
      expect(finalBalance.gt(initialBalance)).to.be.true;
    });

    it("Should fail emergency functions for non-owner", async function () {
      await expect(onionRouter.connect(sender).pause())
        .to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(onionRouter.connect(sender).unpause())
        .to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(onionRouter.connect(sender).emergencyWithdraw())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Integration Tests", function () {
    it("Should complete full onion routing cycle", async function () {
      // Register multiple nodes
      await onionRouter.connect(node1).registerNode(ethers.utils.parseEther("0.001"));
      await onionRouter.connect(node2).registerNode(ethers.utils.parseEther("0.002"));
      await onionRouter.connect(node3).registerNode(ethers.utils.parseEther("0.003"));
      
      // Create onion packet
      const route = [
        await node1.getAddress(),
        await node2.getAddress(),
        await node3.getAddress()
      ];
      
      const encryptedLayers = [
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer1")),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer2")),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("layer3"))
      ];
      
      const recipient = await recipient.getAddress();
      const amount = ethers.utils.parseEther("0.1");
      
      const tx = await onionRouter.connect(sender).createOnionPacket(
        route,
        encryptedLayers,
        recipient,
        { value: amount }
      );
      
      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "OnionPacketCreated");
      const packetId = event?.args?.packetId;
      
      // Process all layers
      await onionRouter.connect(node1).processOnionLayer(packetId, 0, encryptedLayers[0]);
      await onionRouter.connect(node2).processOnionLayer(packetId, 1, encryptedLayers[1]);
      await onionRouter.connect(node3).processOnionLayer(packetId, 2, encryptedLayers[2]);
      
      // Verify final state
      const packet = await onionRouter.getOnionPacket(packetId);
      expect(packet.isDelivered).to.be.true;
      expect(packet.currentLayer).to.equal(3);
      
      const stats = await onionRouter.getStatistics();
      expect(stats.totalPackets_).to.equal(1);
      expect(stats.totalProcessedLayers_).to.equal(3);
      expect(stats.totalFeesCollected_).to.equal(ethers.utils.parseEther("0.006"));
      
      // Verify node statistics
      const node1Info = await onionRouter.getNodeInfo(await node1.getAddress());
      const node2Info = await onionRouter.getNodeInfo(await node2.getAddress());
      const node3Info = await onionRouter.getNodeInfo(await node3.getAddress());
      
      expect(node1Info.totalProcessed).to.equal(1);
      expect(node2Info.totalProcessed).to.equal(1);
      expect(node3Info.totalProcessed).to.equal(1);
    });
  });
}); 