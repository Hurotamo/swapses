import { ethers } from "hardhat";
import { ZKPrivacyMixer } from "../typechain-types";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying ZK Privacy Mixer with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy ZK Privacy Mixer
  const ZKPrivacyMixerFactory = await ethers.getContractFactory("ZKPrivacyMixer");
  const zkMixer = await ZKPrivacyMixerFactory.deploy();
  
  await zkMixer.deployed();
  
  console.log("ZK Privacy Mixer deployed to:", zkMixer.address);
  
  // Create initial mixing pool
  const minDelay = 3600; // 1 hour
  const maxDelay = 604800; // 7 days
  const merkleDepth = 32;
  
  const createPoolTx = await zkMixer.createMixingPool(minDelay, maxDelay, merkleDepth);
  await createPoolTx.wait();
  
  console.log("Initial mixing pool created with ID: 1");
  console.log("Pool configuration:");
  console.log("- Min delay:", minDelay, "seconds");
  console.log("- Max delay:", maxDelay, "seconds");
  console.log("- Merkle depth:", merkleDepth);
  
  // Verify contract on Etherscan (if not on local network)
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 31337) { // Not local network
    console.log("Waiting for block confirmations...");
    await zkMixer.deployTransaction.wait(6);
    
    try {
      await hre.run("verify:verify", {
        address: zkMixer.address,
        constructorArguments: [],
      });
      console.log("Contract verified on Etherscan");
    } catch (error) {
      console.log("Verification failed:", error);
    }
  }
  
  console.log("Deployment completed successfully!");
  console.log("Contract address:", zkMixer.address);
  
  return zkMixer;
}

// Deploy to specific network
async function deployToNetwork(networkName: string) {
  console.log(`\n=== Deploying to ${networkName} ===`);
  
  // Set network-specific parameters
  const networkConfig = {
    "base-sepolia": {
      minDelay: 3600, // 1 hour
      maxDelay: 604800, // 7 days
      merkleDepth: 32
    },
    "base-mainnet": {
      minDelay: 7200, // 2 hours (more conservative for mainnet)
      maxDelay: 1209600, // 14 days
      merkleDepth: 32
    },
    "lisk-sepolia": {
      minDelay: 3600,
      maxDelay: 604800,
      merkleDepth: 32
    },
    "lisk-mainnet": {
      minDelay: 7200,
      maxDelay: 1209600,
      merkleDepth: 32
    }
  };
  
  const config = networkConfig[networkName as keyof typeof networkConfig] || {
    minDelay: 3600,
    maxDelay: 604800,
    merkleDepth: 32
  };
  
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying ZK Privacy Mixer with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Deploy ZK Privacy Mixer
  const ZKPrivacyMixerFactory = await ethers.getContractFactory("ZKPrivacyMixer");
  const zkMixer = await ZKPrivacyMixerFactory.deploy();
  
  await zkMixer.deployed();
  
  console.log("ZK Privacy Mixer deployed to:", zkMixer.address);
  
  // Create initial mixing pool with network-specific config
  const createPoolTx = await zkMixer.createMixingPool(
    config.minDelay, 
    config.maxDelay, 
    config.merkleDepth
  );
  await createPoolTx.wait();
  
  console.log("Initial mixing pool created with ID: 1");
  console.log("Pool configuration:");
  console.log("- Min delay:", config.minDelay, "seconds");
  console.log("- Max delay:", config.maxDelay, "seconds");
  console.log("- Merkle depth:", config.merkleDepth);
  
  // Verify contract
  console.log("Waiting for block confirmations...");
  await zkMixer.deployTransaction.wait(6);
  
  try {
    await hre.run("verify:verify", {
      address: zkMixer.address,
      constructorArguments: [],
    });
    console.log("Contract verified on Etherscan");
  } catch (error) {
    console.log("Verification failed:", error);
  }
  
  console.log(`Deployment to ${networkName} completed successfully!`);
  console.log("Contract address:", zkMixer.address);
  
  return zkMixer;
}

// Main execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { main, deployToNetwork }; 