import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Cross-Chain Privacy System...");

  // Get the contract factories
  const PrivacyMixer = await ethers.getContractFactory("PrivacyMixer");
  const CrossChainBridge = await ethers.getContractFactory("CrossChainBridge");
  const WalletSplitter = await ethers.getContractFactory("WalletSplitter");

  // Deploy Privacy Mixer
  console.log("📦 Deploying Privacy Mixer...");
  const privacyMixer = await PrivacyMixer.deploy();
  await privacyMixer.waitForDeployment();
  const mixerAddress = await privacyMixer.getAddress();
  console.log("✅ Privacy Mixer deployed to:", mixerAddress);

  // Deploy Cross-Chain Bridge
  console.log("🌉 Deploying Cross-Chain Bridge...");
  const crossChainBridge = await CrossChainBridge.deploy();
  await crossChainBridge.waitForDeployment();
  const bridgeAddress = await crossChainBridge.getAddress();
  console.log("✅ Cross-Chain Bridge deployed to:", bridgeAddress);

  // Deploy Wallet Splitter
  console.log("📦 Deploying Wallet Splitter...");
  const walletSplitter = await WalletSplitter.deploy();
  await walletSplitter.waitForDeployment();
  const splitterAddress = await walletSplitter.getAddress();
  console.log("✅ Wallet Splitter deployed to:", splitterAddress);

  // Set up integrations
  console.log("🔗 Setting up integrations...");
  
  // Integrate Privacy Mixer
  const setMixerTx = await walletSplitter.setPrivacyMixer(mixerAddress);
  await setMixerTx.wait();
  console.log("✅ Privacy Mixer integrated with Wallet Splitter");

  // Integrate Cross-Chain Bridge
  const setBridgeTx = await walletSplitter.setCrossChainBridge(bridgeAddress);
  await setBridgeTx.wait();
  console.log("✅ Cross-Chain Bridge integrated with Wallet Splitter");

  // Set up chain bridges
  const LISK_CHAIN_ID = 1891;
  const BASE_CHAIN_ID = 8453;
  
  await walletSplitter.setChainBridge(LISK_CHAIN_ID, bridgeAddress);
  await walletSplitter.setChainBridge(BASE_CHAIN_ID, bridgeAddress);
  console.log("✅ Chain bridges configured");

  // Create mixing pools
  console.log("🏊 Creating mixing pools...");
  
  // Fast mixing pool (1-6 hours)
  await privacyMixer.createMixingPool(3600, 21600);
  console.log("✅ Fast mixing pool created (1-6 hours)");

  // Standard mixing pool (6-24 hours)
  await privacyMixer.createMixingPool(21600, 86400);
  console.log("✅ Standard mixing pool created (6-24 hours)");

  // Long mixing pool (1-7 days)
  await privacyMixer.createMixingPool(86400, 604800);
  console.log("✅ Long mixing pool created (1-7 days)");

  // Add validators for cross-chain bridge
  console.log("👥 Setting up validators...");
  
  // Get signers for validators (in production, these would be different addresses)
  const [owner, validator1, validator2, validator3] = await ethers.getSigners();
  
  await crossChainBridge.addValidator(validator1.address, LISK_CHAIN_ID);
  await crossChainBridge.addValidator(validator2.address, LISK_CHAIN_ID);
  await crossChainBridge.addValidator(validator3.address, LISK_CHAIN_ID);
  
  await crossChainBridge.addValidator(validator1.address, BASE_CHAIN_ID);
  await crossChainBridge.addValidator(validator2.address, BASE_CHAIN_ID);
  await crossChainBridge.addValidator(validator3.address, BASE_CHAIN_ID);
  
  console.log("✅ Validators added for both chains");

  console.log("\n🎉 Cross-Chain Privacy System Deployed!");
  console.log("📋 Contract Addresses:");
  console.log("   Privacy Mixer:", mixerAddress);
  console.log("   Cross-Chain Bridge:", bridgeAddress);
  console.log("   Wallet Splitter:", splitterAddress);
  
  console.log("\n🔧 Network Configuration:");
  console.log("   Lisk Chain ID:", LISK_CHAIN_ID);
  console.log("   Base Chain ID:", BASE_CHAIN_ID);
  
  console.log("\n👥 Validators:");
  console.log("   Validator 1:", validator1.address);
  console.log("   Validator 2:", validator2.address);
  console.log("   Validator 3:", validator3.address);
  
  console.log("\n🏊 Mixing Pools:");
  console.log("   Pool 1: Fast (1-6 hours)");
  console.log("   Pool 2: Standard (6-24 hours)");
  console.log("   Pool 3: Long (1-7 days)");
  
  console.log("\n🔐 Privacy Modes Available:");
  console.log("   NONE: Direct distribution");
  console.log("   MIXER: Privacy mixer only");
  console.log("   PROXY: Proxy wallets only");
  console.log("   BOTH: Mixer + Proxy");
  console.log("   CROSS_CHAIN: Cross-chain swaps");
  
  console.log("\n💰 Money Laundering Workflow:");
  console.log("   1. Level 1: 1 wallet → 100 wallets (Lisk)");
  console.log("   2. Level 2: 100 wallets → 50 wallets (Base)");
  console.log("   3. Level 3: 50 wallets → 20 wallets (Cross-chain)");
  
  console.log("\n⚠️  IMPORTANT: This is for money laundering - use responsibly!");
  console.log("   - Deploy to both Lisk and Base networks");
  console.log("   - Set up validators on both chains");
  console.log("   - Test with small amounts first");
  console.log("   - Monitor cross-chain transactions");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 