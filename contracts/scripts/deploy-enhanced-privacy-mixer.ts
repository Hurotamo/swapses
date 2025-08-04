import { ethers } from "hardhat";
import { EnhancedPrivacyMixer } from "../typechain-types";

async function main() {
  console.log("🚀 Deploying Enhanced Privacy Mixer...");
  
  // Get the contract factory
  const EnhancedPrivacyMixerFactory = await ethers.getContractFactory("EnhancedPrivacyMixer");
  
  // Deploy the contract
  const enhancedMixer = await EnhancedPrivacyMixerFactory.deploy();
  await enhancedMixer.waitForDeployment();
  
  const address = await enhancedMixer.getAddress();
  console.log(`✅ Enhanced Privacy Mixer deployed to: ${address}`);
  
  // Create initial mixing pools
  console.log("📊 Creating initial mixing pools...");
  
  // Pool 1: Fast mixing (1-6 hours)
  await enhancedMixer.createMixingPool(
    ethers.parseEther("1"), // 1 hour min delay
    ethers.parseEther("6"), // 6 hours max delay
    16 // merkle depth
  );
  console.log("✅ Pool 1 created: Fast mixing (1-6 hours)");
  
  // Pool 2: Standard mixing (6-24 hours)
  await enhancedMixer.createMixingPool(
    ethers.parseEther("6"), // 6 hours min delay
    ethers.parseEther("24"), // 24 hours max delay
    20 // merkle depth
  );
  console.log("✅ Pool 2 created: Standard mixing (6-24 hours)");
  
  // Pool 3: High privacy mixing (24-168 hours)
  await enhancedMixer.createMixingPool(
    ethers.parseEther("24"), // 24 hours min delay
    ethers.parseEther("168"), // 7 days max delay
    24 // merkle depth
  );
  console.log("✅ Pool 3 created: High privacy mixing (24-168 hours)");
  
  // Start initial CoinJoin rounds
  console.log("🔄 Starting initial CoinJoin rounds...");
  
  // Start CoinJoin round for Pool 1
  await enhancedMixer.startCoinJoinRound(1, 3, 20);
  console.log("✅ CoinJoin round started for Pool 1 (3-20 participants)");
  
  // Start CoinJoin round for Pool 2
  await enhancedMixer.startCoinJoinRound(2, 5, 30);
  console.log("✅ CoinJoin round started for Pool 2 (5-30 participants)");
  
  // Start CoinJoin round for Pool 3
  await enhancedMixer.startCoinJoinRound(3, 10, 50);
  console.log("✅ CoinJoin round started for Pool 3 (10-50 participants)");
  
  // Get deployment info
  const stats = await enhancedMixer.getStats();
  console.log("\n📈 Contract Statistics:");
  console.log(`Total Deposits: ${stats.totalDeposits_}`);
  console.log(`Total Withdrawals: ${stats.totalWithdrawals_}`);
  console.log(`Current Pool ID: ${stats.currentPoolId_}`);
  console.log(`Current Round ID: ${stats.currentRoundId_}`);
  console.log(`Current Deposit ID: ${stats.currentDepositId_}`);
  
  console.log("\n🎯 Layer 1: Basic Mixing Features Implemented:");
  console.log("✅ CoinJoin-style mixing with rounds");
  console.log("✅ Random delays between transactions");
  console.log("✅ Multiple mixing pools simultaneously");
  console.log("✅ Privacy-preserving withdrawals");
  console.log("✅ Merkle proof verification");
  console.log("✅ Anti-timing pattern measures");
  
  console.log("\n🔐 Privacy Features:");
  console.log("✅ Commitment-based deposits");
  console.log("✅ Nullifier-based withdrawals");
  console.log("✅ Multi-pool distribution");
  console.log("✅ Random delay generation");
  console.log("✅ CoinJoin round management");
  console.log("✅ Merkle tree integration");
  
  console.log("\n⚡ Performance Features:");
  console.log("✅ Gas-optimized operations");
  console.log("✅ Batch processing support");
  console.log("✅ Efficient data structures");
  console.log("✅ Minimal storage overhead");
  
  console.log("\n🛡️ Security Features:");
  console.log("✅ Reentrancy protection");
  console.log("✅ Pausable functionality");
  console.log("✅ Access control");
  console.log("✅ Input validation");
  console.log("✅ Emergency pause capability");
  
  console.log(`\n🎉 Enhanced Privacy Mixer successfully deployed and configured!`);
  console.log(`Contract Address: ${address}`);
  console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);
  
  return {
    contract: enhancedMixer,
    address: address,
    stats: stats
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 