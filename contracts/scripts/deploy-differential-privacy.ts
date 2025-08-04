import { ethers } from "hardhat";

async function main() {
  console.log("🔒 Deploying PracticalDifferentialPrivacy...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Deploy PracticalDifferentialPrivacy
  const PracticalDifferentialPrivacy = await ethers.getContractFactory("PracticalDifferentialPrivacy");
  const differentialPrivacy = await PracticalDifferentialPrivacy.deploy();
  await differentialPrivacy.deployed();

  console.log("✅ PracticalDifferentialPrivacy deployed to:", differentialPrivacy.address);
  
  // Get initial statistics
  const stats = await differentialPrivacy.getStatistics();
  console.log("\n📊 Initial Statistics:");
  console.log("   Total Queries:", stats.totalQueries_.toString());
  console.log("   Total Privacy Budgets:", stats.totalPrivacyBudgets_.toString());
  console.log("   Total Laplace Noise:", stats.totalLaplaceNoise_.toString());
  
  console.log("\n🔧 Contract Functions:");
  console.log("   - initializePrivacyBudget(user): Initialize privacy budget for user");
  console.log("   - createDifferentialPrivacyQuery(originalValue, epsilon, delta): Create differential privacy query");
  console.log("   - getDifferentialQuery(queryId): Get query information");
  console.log("   - getPrivacyBudget(user): Get privacy budget information");
  console.log("   - resetPrivacyBudget(user): Reset privacy budget (owner only)");
  console.log("   - updatePrivacyBudget(user, newBudget): Update privacy budget (owner only)");
  console.log("   - getStatistics(): Get contract statistics");
  
  console.log("\n🔒 Security Features:");
  console.log("   - ReentrancyGuard: Prevents reentrancy attacks");
  console.log("   - Pausable: Emergency pause functionality");
  console.log("   - Ownable: Access control for admin functions");
  console.log("   - Input validation: All parameters validated");
  console.log("   - Privacy budget management: Automatic budget tracking");
  
  console.log("\n📊 Differential Privacy Features:");
  console.log("   - Laplace mechanism for noise generation");
  console.log("   - Epsilon-delta privacy guarantees");
  console.log("   - Privacy budget management system");
  console.log("   - Automatic budget reset periods");
  console.log("   - Proper noise calculation algorithms");
  console.log("   - Privacy guarantee verification");
  
  console.log("\n📋 Configuration:");
  console.log("   - Min Epsilon: 1 (more private)");
  console.log("   - Max Epsilon: 1000 (less private)");
  console.log("   - Min Delta: 1 (more private)");
  console.log("   - Max Delta: 1000 (less private)");
  console.log("   - Default Privacy Budget: 1000 units");
  console.log("   - Budget Reset Period: 30 days");
  console.log("   - Laplace Scale Factor: 1000");
  console.log("   - Sensitivity Factor: 100");
  
  console.log("\n🔬 Algorithm Details:");
  console.log("   - Laplace Distribution: Proper mathematical implementation");
  console.log("   - Box-Muller Transform: For uniform to Laplace conversion");
  console.log("   - Safe Logarithm: Approximated for gas efficiency");
  console.log("   - Epsilon-Delta Verification: Automatic privacy guarantee checks");
  console.log("   - Budget Calculation: Based on epsilon and delta parameters");
  
  console.log("\n✅ PracticalDifferentialPrivacy deployment completed successfully!");
  console.log("🔒 Contract Address:", differentialPrivacy.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 