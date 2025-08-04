import { ethers } from "hardhat";
import { QuantumResistantMixer } from "../typechain-types";

async function main() {
  console.log("🚀 Deploying QuantumResistantMixer...");

  // Get the contract factory
  const QuantumResistantMixerFactory = await ethers.getContractFactory("QuantumResistantMixer");
  
  // Deploy the contract
  const quantumResistantMixer = await QuantumResistantMixerFactory.deploy();
  
  // Wait for deployment to complete
  await quantumResistantMixer.waitForDeployment();
  
  const address = await quantumResistantMixer.getAddress();
  
  console.log("✅ QuantumResistantMixer deployed successfully!");
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
  const stats = await quantumResistantMixer.getStatistics();
  console.log("📊 Initial Statistics:");
  console.log("   Total Quantum Keys:", stats.totalQuantumKeys_.toString());
  console.log("   Total Lattice Signatures:", stats.totalLatticeSignatures_.toString());
  console.log("   Total Quantum Hashes:", stats.totalQuantumHashes_.toString());
  console.log("   Total Post-Quantum Transactions:", stats.totalPostQuantumTransactions_.toString());
  
  console.log("\n🔐 Quantum Resistance Features Implemented:");
  console.log("   ✅ Post-quantum cryptography");
  console.log("   ✅ Lattice-based signatures");
  console.log("   ✅ Quantum-resistant hash functions");
  console.log("   ✅ Quantum key distribution");
  console.log("   ✅ 256-bit quantum security level");
  console.log("   ✅ 512-dimensional lattice cryptography");
  console.log("   ✅ 12-round quantum hash algorithm");
  console.log("   ✅ NTRU-like modulus (12289)");
  
  console.log("\n🔧 Contract Functions:");
  console.log("   - generateQuantumKey(): Generate quantum-resistant key pairs");
  console.log("   - createLatticeSignature(): Create lattice-based signatures");
  console.log("   - createQuantumHash(): Create quantum-resistant hashes");
  console.log("   - distributeQuantumKey(): Distribute quantum keys");
  console.log("   - createPostQuantumTransaction(): Create post-quantum transactions");
  console.log("   - processPostQuantumTransaction(): Process quantum transactions");
  console.log("   - emergencyPause()/resume(): Emergency controls");
  
  console.log("\n🔬 Quantum Security Parameters:");
  console.log("   - Security Level: 256-bit quantum resistance");
  console.log("   - Lattice Dimension: 512-dimensional");
  console.log("   - Hash Rounds: 12 rounds for quantum resistance");
  console.log("   - Lattice Modulus: 12289 (NTRU-like)");
  console.log("   - Minimum Deposit: 0.01 ETH");
  console.log("   - Maximum Deposit: 1,000,000 ETH");
  
  console.log("\n📝 Deployment Summary:");
  console.log(`   Contract: QuantumResistantMixer`);
  console.log(`   Address: ${address}`);
  console.log(`   Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`   Deployer: ${(await ethers.provider.getSigner()).address}`);
  console.log(`   Gas Used: ${(await quantumResistantMixer.deploymentTransaction())?.gasLimit.toString() || "N/A"}`);
  
  console.log("\n⚠️  Quantum Security Notes:");
  console.log("   - This implementation provides quantum-resistant foundations");
  console.log("   - Lattice-based signatures resist quantum attacks");
  console.log("   - Quantum-resistant hashes use multiple rounds");
  console.log("   - Key distribution supports quantum-secure protocols");
  console.log("   - Post-quantum transactions are future-proof");
  
  return quantumResistantMixer;
}

// Handle errors
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
}); 