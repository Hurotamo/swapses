import { ethers } from "hardhat";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

async function main() {
  console.log("🚀 Deploying Advanced Commitments Contract...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying from account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());
  
  // Deploy AdvancedCommitments contract
  const AdvancedCommitments = await ethers.getContractFactory("AdvancedCommitments");
  const advancedCommitments = await AdvancedCommitments.deploy();
  
  await advancedCommitments.deployed();
  
  console.log("✅ AdvancedCommitments deployed to:", advancedCommitments.address);
  
  // Verify deployment
  const totalCommitments = await advancedCommitments.totalCommitments();
  const totalSignatures = await advancedCommitments.totalSignatures();
  const totalRingSignatures = await advancedCommitments.totalRingSignatures();
  const totalBulletproofs = await advancedCommitments.totalBulletproofs();
  
  console.log("📊 Initial state:");
  console.log("   - Total commitments:", totalCommitments.toString());
  console.log("   - Total signatures:", totalSignatures.toString());
  console.log("   - Total ring signatures:", totalRingSignatures.toString());
  console.log("   - Total bulletproofs:", totalBulletproofs.toString());
  
  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  
  // Test Pedersen commitment creation
  const testAmount = ethers.utils.parseEther("1.0");
  const testBlindingFactor = ethers.utils.randomBytes(32);
  const blindingFactorValue = ethers.BigNumber.from(testBlindingFactor);
  
  console.log("   - Creating test Pedersen commitment...");
  const tx = await advancedCommitments.createPedersenCommitment(
    testAmount,
    blindingFactorValue
  );
  
  const receipt = await tx.wait();
  console.log("   - Transaction hash:", receipt.transactionHash);
  
  // Get updated stats
  const newTotalCommitments = await advancedCommitments.totalCommitments();
  console.log("   - Updated total commitments:", newTotalCommitments.toString());
  
  console.log("\n🎉 Advanced Commitments deployment completed successfully!");
  console.log("📋 Contract Address:", advancedCommitments.address);
  console.log("🌐 Network:", (await ethers.provider.getNetwork()).name);
  
  return {
    contract: advancedCommitments,
    address: advancedCommitments.address,
    deployer: deployer.address
  };
}

// Deploy to specific networks
async function deployToNetwork(networkName: string) {
  console.log(`\n🌐 Deploying to ${networkName}...`);
  
  try {
    const result = await main();
    console.log(`✅ Successfully deployed to ${networkName}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to deploy to ${networkName}:`, error);
    throw error;
  }
}

// Main deployment function
async function deployAll() {
  console.log("🚀 Starting Advanced Commitments deployment...\n");
  
  const networks = [
    "localhost",
    "hardhat",
    "base-sepolia",
    "base-mainnet",
    "lisk-sepolia",
    "lisk-mainnet"
  ];
  
  const results: any[] = [];
  
  for (const network of networks) {
    try {
      const result = await deployToNetwork(network);
      results.push({
        network,
        ...result
      });
    } catch (error) {
      console.error(`❌ Failed to deploy to ${network}`);
    }
  }
  
  console.log("\n📊 Deployment Summary:");
  console.log("========================");
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.network}:`);
    console.log(`   Contract: ${result.address}`);
    console.log(`   Deployer: ${result.deployer}`);
    console.log("");
  });
  
  console.log("🎉 Advanced Commitments deployment completed!");
}

// Handle errors
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});

// Export for use in other scripts
export { main, deployToNetwork, deployAll }; 