import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying WalletSplitter contract...");

  // Get the contract factory
  const WalletSplitter = await ethers.getContractFactory("WalletSplitter");
  
  // Deploy the contract
  const walletSplitter = await WalletSplitter.deploy();
  
  // Wait for deployment
  await walletSplitter.waitForDeployment();
  
  const address = await walletSplitter.getAddress();
  
  console.log("✅ WalletSplitter deployed to:", address);
  console.log("📋 Contract Address:", address);
  
  // Verify the deployment
  console.log("🔍 Verifying contract...");
  
  try {
    await walletSplitter.deploymentTransaction()?.wait(5);
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [],
    });
    console.log("✅ Contract verified on Etherscan");
  } catch (error) {
    console.log("⚠️  Contract verification failed:", error);
  }
  
  // Log network information
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network Chain ID:", network.chainId);
  
  // Log contract functions
  console.log("\n📝 Available Contract Functions:");
  console.log("- splitEther(address[] children) - Split ETH to 100 child wallets");
  console.log("- getSplitInfo(address parent) - Get split information");
  console.log("- pause() - Pause contract (owner only)");
  console.log("- unpause() - Unpause contract (owner only)");
  console.log("- emergencyWithdraw() - Emergency withdraw (owner only)");
  
  console.log("\n🎉 Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 