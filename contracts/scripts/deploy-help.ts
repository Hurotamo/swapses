import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Swapses Deployment Scripts");
  console.log("==============================\n");

  console.log("📋 Available Networks:");
  console.log("   • Lisk Mainnet (Chain ID: 1891)");
  console.log("   • Base Mainnet (Chain ID: 8453)");
  console.log("   • Lisk Sepolia Testnet (Chain ID: 4202)");
  console.log("   • Base Sepolia Testnet (Chain ID: 84532)\n");

  console.log("🔧 Deployment Commands:");
  console.log("\n   Universal Script (Recommended):");
  console.log("   npx hardhat run scripts/deploy-all-networks.ts --network <network-name>");
  console.log("   npm run deploy:all -- --network <network-name>\n");

  console.log("   Network-Specific Scripts:");
  console.log("   npm run deploy:lisk-mainnet");
  console.log("   npm run deploy:base-mainnet");
  console.log("   npm run deploy:lisk-sepolia");
  console.log("   npm run deploy:base-sepolia\n");

  console.log("   Direct Script Execution:");
  console.log("   npx hardhat run scripts/deploy-lisk-mainnet.ts --network lisk-mainnet");
  console.log("   npx hardhat run scripts/deploy-base-mainnet.ts --network base-mainnet");
  console.log("   npx hardhat run scripts/deploy-lisk-sepolia.ts --network lisk-sepolia");
  console.log("   npx hardhat run scripts/deploy-base-sepolia.ts --network base-sepolia\n");

  console.log("   Original Cross-Chain Script:");
  console.log("   npm run deploy:cross-chain -- --network <network-name>\n");

  console.log("🔍 Verification Commands:");
  console.log("   npm run verify:lisk-mainnet <contract-address>");
  console.log("   npm run verify:base-mainnet <contract-address>");
  console.log("   npm run verify:lisk-sepolia <contract-address>");
  console.log("   npm run verify:base-sepolia <contract-address>\n");

  console.log("⚠️  Important Notes:");
  console.log("   • Set up your .env file with PRIVATE_KEY before deploying");
  console.log("   • Mainnet deployments use real tokens - test on testnets first!");
  console.log("   • Ensure you have sufficient tokens for gas fees");
  console.log("   • Monitor cross-chain transactions after deployment\n");

  console.log("📖 For detailed instructions, see DEPLOYMENT.md");
  console.log("🔗 Environment setup: cp env.example .env");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 