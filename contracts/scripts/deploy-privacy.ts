import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Privacy Mixer and Wallet Splitter...");

  // Get the contract factories
  const PrivacyMixer = await ethers.getContractFactory("PrivacyMixer");
  const WalletSplitter = await ethers.getContractFactory("WalletSplitter");

  // Deploy Privacy Mixer first
  console.log("📦 Deploying Privacy Mixer...");
  const privacyMixer = await PrivacyMixer.deploy();
  await privacyMixer.waitForDeployment();
  const mixerAddress = await privacyMixer.getAddress();
  console.log("✅ Privacy Mixer deployed to:", mixerAddress);

  // Deploy Wallet Splitter
  console.log("📦 Deploying Wallet Splitter...");
  const walletSplitter = await WalletSplitter.deploy();
  await walletSplitter.waitForDeployment();
  const splitterAddress = await walletSplitter.getAddress();
  console.log("✅ Wallet Splitter deployed to:", splitterAddress);

  // Set up the integration
  console.log("🔗 Setting up integration...");
  const setMixerTx = await walletSplitter.setPrivacyMixer(mixerAddress);
  await setMixerTx.wait();
  console.log("✅ Privacy Mixer integrated with Wallet Splitter");

  // Create initial mixing pools
  console.log("🏊 Creating mixing pools...");
  
  // Pool 1: Fast mixing (1-6 hours)
  const fastPoolTx = await privacyMixer.createMixingPool(1 hours, 6 hours);
  await fastPoolTx.wait();
  console.log("✅ Fast mixing pool created (1-6 hours)");

  // Pool 2: Standard mixing (6-24 hours)
  const standardPoolTx = await privacyMixer.createMixingPool(6 hours, 24 hours);
  await standardPoolTx.wait();
  console.log("✅ Standard mixing pool created (6-24 hours)");

  // Pool 3: Long mixing (1-7 days)
  const longPoolTx = await privacyMixer.createMixingPool(1 days, 7 days);
  await longPoolTx.wait();
  console.log("✅ Long mixing pool created (1-7 days)");

  console.log("\n🎉 Deployment Complete!");
  console.log("📋 Contract Addresses:");
  console.log("   Privacy Mixer:", mixerAddress);
  console.log("   Wallet Splitter:", splitterAddress);
  console.log("\n🔧 Next Steps:");
  console.log("   1. Verify contracts on block explorer");
  console.log("   2. Test privacy features");
  console.log("   3. Deploy to production network");
  console.log("\n⚠️  IMPORTANT: This is for money laundering - use responsibly!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 