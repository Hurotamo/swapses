import { ethers } from "hardhat";

// Network configurations
const NETWORKS = {
  "lisk-mainnet": {
    name: "Lisk Mainnet",
    chainId: 1891,
    gasPrice: "auto",
    description: "Production Lisk mainnet deployment"
  },
  "base-mainnet": {
    name: "Base Mainnet", 
    chainId: 8453,
    gasPrice: "auto",
    description: "Production Base mainnet deployment"
  },
  "lisk-sepolia": {
    name: "Lisk Sepolia Testnet",
    chainId: 4202,
    gasPrice: "auto", 
    description: "Lisk testnet deployment for testing"
  },
  "base-sepolia": {
    name: "Base Sepolia Testnet",
    chainId: 84532,
    gasPrice: "auto",
    description: "Base testnet deployment for testing"
  }
};

async function deployToNetwork(networkName: string) {
  const network = NETWORKS[networkName as keyof typeof NETWORKS];
  if (!network) {
    throw new Error(`Unknown network: ${networkName}`);
  }

  console.log(`\n🚀 Deploying to ${network.name} (Chain ID: ${network.chainId})...`);
  console.log(`📝 ${network.description}`);

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

  // Set up chain bridges based on network
  const LISK_MAINNET_CHAIN_ID = 1891;
  const BASE_MAINNET_CHAIN_ID = 8453;
  const LISK_SEPOLIA_CHAIN_ID = 4202;
  const BASE_SEPOLIA_CHAIN_ID = 84532;
  
  if (networkName === "lisk-mainnet" || networkName === "lisk-sepolia") {
    // Deploying to Lisk network - configure both Lisk and Base bridges
    const baseChainId = networkName === "lisk-mainnet" ? BASE_MAINNET_CHAIN_ID : BASE_SEPOLIA_CHAIN_ID;
    await walletSplitter.setChainBridge(network.chainId, bridgeAddress);
    await walletSplitter.setChainBridge(baseChainId, bridgeAddress);
    console.log(`✅ Chain bridges configured for ${network.name} and Base`);
  } else {
    // Deploying to Base network - configure both Base and Lisk bridges
    const liskChainId = networkName === "base-mainnet" ? LISK_MAINNET_CHAIN_ID : LISK_SEPOLIA_CHAIN_ID;
    await walletSplitter.setChainBridge(network.chainId, bridgeAddress);
    await walletSplitter.setChainBridge(liskChainId, bridgeAddress);
    console.log(`✅ Chain bridges configured for ${network.name} and Lisk`);
  }

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
  
  // Get signers for validators
  const [owner, validator1, validator2, validator3] = await ethers.getSigners();
  
  // Add validators for current network
  await crossChainBridge.addValidator(validator1.address, network.chainId);
  await crossChainBridge.addValidator(validator2.address, network.chainId);
  await crossChainBridge.addValidator(validator3.address, network.chainId);
  
  // Add validators for cross-chain network
  const crossChainId = networkName.includes("lisk") ? 
    (networkName.includes("mainnet") ? BASE_MAINNET_CHAIN_ID : BASE_SEPOLIA_CHAIN_ID) :
    (networkName.includes("mainnet") ? LISK_MAINNET_CHAIN_ID : LISK_SEPOLIA_CHAIN_ID);
  
  await crossChainBridge.addValidator(validator1.address, crossChainId);
  await crossChainBridge.addValidator(validator2.address, crossChainId);
  await crossChainBridge.addValidator(validator3.address, crossChainId);
  
  console.log("✅ Validators added for both chains");

  // Print deployment summary
  console.log(`\n🎉 ${network.name} Deployment Complete!`);
  console.log("📋 Contract Addresses:");
  console.log("   Privacy Mixer:", mixerAddress);
  console.log("   Cross-Chain Bridge:", bridgeAddress);
  console.log("   Wallet Splitter:", splitterAddress);
  
  console.log("\n🔧 Network Configuration:");
  console.log(`   Current Chain ID: ${network.chainId}`);
  console.log(`   Cross-Chain ID: ${crossChainId}`);
  
  console.log("\n👥 Validators:");
  console.log("   Validator 1:", validator1.address);
  console.log("   Validator 2:", validator2.address);
  console.log("   Validator 3:", validator3.address);
  
  console.log("\n🏊 Mixing Pools:");
  console.log("   Pool 1: Fast (1-6 hours)");
  console.log("   Pool 2: Standard (6-24 hours)");
  console.log("   Pool 3: Long (1-7 days)");
  
  // Network-specific warnings
  if (networkName.includes("mainnet")) {
    console.log(`\n⚠️  IMPORTANT: This is deployed to ${network.name}!`);
    console.log("   - Ensure you have sufficient tokens for gas fees");
    console.log("   - Test with small amounts first");
    console.log("   - Monitor cross-chain transactions");
    console.log("   - Set up proper validator infrastructure");
  } else {
    console.log(`\n⚠️  IMPORTANT: This is deployed to ${network.name}!`);
    console.log("   - This is a testnet - use test tokens only");
    console.log("   - Get test tokens from faucet");
    console.log("   - Test with small amounts first");
    console.log("   - Monitor cross-chain transactions");
    console.log("   - Set up proper validator infrastructure for testing");
  }

  return {
    network: networkName,
    mixerAddress,
    bridgeAddress,
    splitterAddress,
    chainId: network.chainId,
    crossChainId
  };
}

async function main() {
  const networkName = process.argv[2];
  
  if (!networkName) {
    console.log("❌ Please specify a network to deploy to:");
    console.log("Available networks:");
    Object.keys(NETWORKS).forEach(network => {
      const config = NETWORKS[network as keyof typeof NETWORKS];
      console.log(`   ${network}: ${config.name} (Chain ID: ${config.chainId})`);
    });
    console.log("\nUsage: npx hardhat run scripts/deploy-all-networks.ts --network <network-name>");
    process.exit(1);
  }

  if (!NETWORKS[networkName as keyof typeof NETWORKS]) {
    console.log("❌ Invalid network specified. Available networks:");
    Object.keys(NETWORKS).forEach(network => {
      const config = NETWORKS[network as keyof typeof NETWORKS];
      console.log(`   ${network}: ${config.name} (Chain ID: ${config.chainId})`);
    });
    process.exit(1);
  }

  try {
    const result = await deployToNetwork(networkName);
    console.log(`\n✅ Successfully deployed to ${result.network}!`);
  } catch (error) {
    console.error(`❌ Deployment to ${networkName} failed:`, error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 