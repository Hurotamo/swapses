import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying PracticalOnionRouter...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Deploy PracticalOnionRouter
  const PracticalOnionRouter = await ethers.getContractFactory("PracticalOnionRouter");
  const onionRouter = await PracticalOnionRouter.deploy();
  await onionRouter.deployed();

  console.log("✅ PracticalOnionRouter deployed to:", onionRouter.address);
  
  // Get initial statistics
  const stats = await onionRouter.getStatistics();
  console.log("\n📊 Initial Statistics:");
  console.log("   Total Packets:", stats.totalPackets_.toString());
  console.log("   Total Nodes:", stats.totalNodes_.toString());
  console.log("   Total Processed Layers:", stats.totalProcessedLayers_.toString());
  console.log("   Total Fees Collected:", ethers.utils.formatEther(stats.totalFeesCollected_), "ETH");
  
  console.log("\n🔧 Contract Functions:");
  console.log("   - registerNode(fee): Register as onion routing node");
  console.log("   - unregisterNode(): Unregister as node");
  console.log("   - createOnionPacket(route, encryptedLayers, recipient): Create onion packet");
  console.log("   - processOnionLayer(packetId, layerIndex, decryptedData): Process layer");
  console.log("   - withdrawNodeFees(): Withdraw earned fees");
  console.log("   - getOnionPacket(packetId): Get packet information");
  console.log("   - getNodeInfo(nodeAddress): Get node information");
  console.log("   - getStatistics(): Get contract statistics");
  
  console.log("\n🔒 Security Features:");
  console.log("   - ReentrancyGuard: Prevents reentrancy attacks");
  console.log("   - Pausable: Emergency pause functionality");
  console.log("   - Ownable: Access control for admin functions");
  console.log("   - Input validation: All parameters validated");
  console.log("   - Fee management: Automatic fee collection and distribution");
  
  console.log("\n🌐 Onion Routing Features:");
  console.log("   - Multi-hop transaction routing");
  console.log("   - Encrypted layer peeling");
  console.log("   - Real intermediate node functionality");
  console.log("   - Automatic fee distribution");
  console.log("   - Packet delivery tracking");
  console.log("   - Node registration and management");
  
  console.log("\n📋 Configuration:");
  console.log("   - Min Packet Amount: 0.001 ETH");
  console.log("   - Max Packet Amount: 1000 ETH");
  console.log("   - Min Route Length: 2 nodes");
  console.log("   - Max Route Length: 10 nodes");
  console.log("   - Min Node Fee: 0.0001 ETH");
  console.log("   - Max Node Fee: 0.1 ETH");
  
  console.log("\n✅ PracticalOnionRouter deployment completed successfully!");
  console.log("🌐 Contract Address:", onionRouter.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 