import { ethers } from "hardhat";
import { AntiTracingMixer } from "../typechain-types";

async function main() {
  console.log("🚀 Deploying AntiTracingMixer...");

  // Get the contract factory
  const AntiTracingMixerFactory = await ethers.getContractFactory("AntiTracingMixer");
  
  // Deploy the contract
  const antiTracingMixer = await AntiTracingMixerFactory.deploy();
  
  // Wait for deployment to complete
  await antiTracingMixer.waitForDeployment();
  
  const address = await antiTracingMixer.getAddress();
  
  console.log("✅ AntiTracingMixer deployed successfully!");
  console.log("📍 Contract address:", address);
  console.log("🔗 Network:", (await ethers.provider.getNetwork()).name);
  
  // Verify deployment
  const code = await ethers.provider.getCode(address);
  if (code === "0x") {
    console.log("❌ Contract deployment failed - no code at address");
    return;
  }
  
  console.log("✅ Contract verification successful");
  
  // Get initial statistics
  const stats = await antiTracingMixer.getStatistics();
  console.log("📊 Initial Statistics:");
  console.log("   Total Batches:", stats.totalBatches_.toString());
  console.log("   Total Fake Transactions:", stats.totalFakeTransactions_.toString());
  console.log("   Total Transactions:", stats.totalTransactions_.toString());
  console.log("   Total Address Rotations:", stats.totalAddressRotations_.toString());
  
  console.log("\n🎯 Anti-Tracing Features Implemented:");
  console.log("   ✅ Random transaction ordering");
  console.log("   ✅ Fake transactions to confuse tracking");
  console.log("   ✅ Multiple intermediate addresses");
  console.log("   ✅ Transaction batching with random delays");
  console.log("   ✅ Address rotation mechanisms");
  console.log("   ✅ Address clustering prevention");
  
  console.log("\n🔧 Contract Functions:");
  console.log("   - createTransactionBatch(): Create batches with random ordering");
  console.log("   - addFakeTransaction(): Add fake transactions");
  console.log("   - rotateAddress(): Rotate addresses to break clustering");
  console.log("   - addIntermediateAddresses(): Add intermediate addresses");
  console.log("   - processBatch(): Process batches with delays");
  console.log("   - emergencyPause()/resume(): Emergency controls");
  
  console.log("\n📝 Deployment Summary:");
  console.log(`   Contract: AntiTracingMixer`);
  console.log(`   Address: ${address}`);
  console.log(`   Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`   Deployer: ${(await ethers.provider.getSigner()).address}`);
  console.log(`   Gas Used: ${(await antiTracingMixer.deploymentTransaction())?.gasLimit.toString() || "N/A"}`);
  
  return antiTracingMixer;
}

// Handle errors
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
}); 