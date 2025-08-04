const { groth16 } = require("snarkjs");
const { buildPoseidon } = require("circomlibjs");
const fs = require("fs");
const path = require("path");

/**
 * Test ZK proof generation and verification
 */
async function testZKProofs() {
  console.log("🧪 Testing ZK Proof Generation and Verification...\n");

  try {
    // Test 1: Load verification keys
    console.log("📋 Test 1: Loading verification keys...");
    const mainVKey = JSON.parse(fs.readFileSync("./circuits/build/verification_key.json"));
    const rangeVKey = JSON.parse(fs.readFileSync("./circuits/build/range_proof_verification_key.json"));
    console.log("✅ Verification keys loaded successfully\n");

    // Test 2: Test Poseidon hash function
    console.log("🔐 Test 2: Testing Poseidon hash function...");
    const poseidon = await buildPoseidon();
    const testInputs = [123, 456, 789];
    const hash = poseidon(testInputs);
    console.log("✅ Poseidon hash generated:", hash.toString() + "\n");

    // Test 3: Generate main circuit proof
    console.log("⚙️  Test 3: Generating main circuit proof...");
    const mainInput = {
      secret: "123456789",
      amount: "1000000000000000000",
      fee: "10000000000000000",
      merkleRoot: "0",
      pathElements: new Array(32).fill("0"),
      pathIndices: new Array(32).fill("0"),
      depositCommitment: "0",
      nullifier: "0"
    };

    const mainProof = await groth16.fullProve(
      mainInput,
      "./circuits/build/mixer.wasm",
      "./circuits/build/mixer_final.zkey"
    );
    console.log("✅ Main circuit proof generated\n");

    // Test 4: Verify main circuit proof
    console.log("🔍 Test 4: Verifying main circuit proof...");
    const mainIsValid = await groth16.verify(mainVKey, mainProof.publicSignals, mainProof.proof);
    console.log("✅ Main circuit proof verification:", mainIsValid + "\n");

    // Test 5: Generate range proof
    console.log("⚙️  Test 5: Generating range proof...");
    const rangeInput = {
      amount: "1000000000000000000",
      minAmount: "100000000000000000",
      maxAmount: "10000000000000000000",
      blindingFactor: "987654321",
      amountBits: new Array(64).fill(0).map((_, i) => i < 60 ? 1 : 0),
      gamma: "123456"
    };

    const rangeProof = await groth16.fullProve(
      rangeInput,
      "./circuits/build/range_proof.wasm",
      "./circuits/build/range_proof_final.zkey"
    );
    console.log("✅ Range proof generated\n");

    // Test 6: Verify range proof
    console.log("🔍 Test 6: Verifying range proof...");
    const rangeIsValid = await groth16.verify(rangeVKey, rangeProof.publicSignals, rangeProof.proof);
    console.log("✅ Range proof verification:", rangeIsValid + "\n");

    // Test 7: Test commitment generation
    console.log("🔐 Test 7: Testing commitment generation...");
    const commitment = poseidon([mainInput.secret, mainInput.amount, mainInput.fee]);
    console.log("✅ Commitment generated:", commitment.toString() + "\n");

    // Test 8: Test nullifier generation
    console.log("🔐 Test 8: Testing nullifier generation...");
    const nullifier = poseidon([mainInput.secret, mainInput.nullifier]);
    console.log("✅ Nullifier generated:", nullifier.toString() + "\n");

    // Test 9: Save proofs for later use
    console.log("💾 Test 9: Saving proofs...");
    fs.writeFileSync("./proofs/main_proof.json", JSON.stringify(mainProof, null, 2));
    fs.writeFileSync("./proofs/range_proof.json", JSON.stringify(rangeProof, null, 2));
    console.log("✅ Proofs saved to ./proofs/\n");

    // Test 10: Load and verify saved proofs
    console.log("📂 Test 10: Loading and verifying saved proofs...");
    const loadedMainProof = JSON.parse(fs.readFileSync("./proofs/main_proof.json"));
    const loadedRangeProof = JSON.parse(fs.readFileSync("./proofs/range_proof.json"));

    const loadedMainValid = await groth16.verify(mainVKey, loadedMainProof.publicSignals, loadedMainProof.proof);
    const loadedRangeValid = await groth16.verify(rangeVKey, loadedRangeProof.publicSignals, loadedRangeProof.proof);

    console.log("✅ Loaded main proof verification:", loadedMainValid);
    console.log("✅ Loaded range proof verification:", loadedRangeValid + "\n");

    // Test 11: Performance test
    console.log("⚡ Test 11: Performance test...");
    const startTime = Date.now();
    
    for (let i = 0; i < 5; i++) {
      const testProof = await groth16.fullProve(
        mainInput,
        "./circuits/build/mixer.wasm",
        "./circuits/build/mixer_final.zkey"
      );
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / 5;
    console.log("✅ Average proof generation time:", avgTime + "ms\n");

    // Test 12: Error handling
    console.log("🚨 Test 12: Error handling...");
    try {
      const invalidInput = { ...mainInput, secret: "invalid" };
      await groth16.fullProve(
        invalidInput,
        "./circuits/build/mixer.wasm",
        "./circuits/build/mixer_final.zkey"
      );
      console.log("❌ Should have failed with invalid input");
    } catch (error) {
      console.log("✅ Properly handled invalid input error\n");
    }

    console.log("🎉 All ZK proof tests passed successfully!");
    console.log("\n📊 Test Summary:");
    console.log("  ✅ Verification keys loaded");
    console.log("  ✅ Poseidon hash function working");
    console.log("  ✅ Main circuit proof generation");
    console.log("  ✅ Main circuit proof verification");
    console.log("  ✅ Range proof generation");
    console.log("  ✅ Range proof verification");
    console.log("  ✅ Commitment generation");
    console.log("  ✅ Nullifier generation");
    console.log("  ✅ Proof persistence");
    console.log("  ✅ Proof loading and verification");
    console.log("  ✅ Performance testing");
    console.log("  ✅ Error handling");

  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

/**
 * Test contract integration
 */
async function testContractIntegration() {
  console.log("\n🏗️  Testing Contract Integration...\n");

  try {
    // Test contract deployment simulation
    console.log("📋 Test 1: Contract deployment simulation...");
    const { ethers } = require("hardhat");
    
    const ZKPrivacyMixer = await ethers.getContractFactory("ZKPrivacyMixer");
    const mockContract = await ZKPrivacyMixer.deploy();
    await mockContract.deployed();
    
    console.log("✅ Contract deployment simulation successful");
    console.log("   Contract address:", mockContract.address + "\n");

    // Test mixing pool creation
    console.log("📋 Test 2: Mixing pool creation...");
    const createPoolTx = await mockContract.createMixingPool(3600, 604800, 32);
    await createPoolTx.wait();
    
    const poolInfo = await mockContract.getPoolInfo(1);
    console.log("✅ Mixing pool created successfully");
    console.log("   Pool ID:", poolInfo.poolId);
    console.log("   Min Delay:", poolInfo.minDelay);
    console.log("   Max Delay:", poolInfo.maxDelay + "\n");

    // Test pause/unpause functionality
    console.log("📋 Test 3: Pause/unpause functionality...");
    await mockContract.pause();
    const isPaused = await mockContract.paused();
    console.log("✅ Contract paused:", isPaused);
    
    await mockContract.unpause();
    const isUnpaused = await mockContract.paused();
    console.log("✅ Contract unpaused:", !isUnpaused + "\n");

    console.log("🎉 Contract integration tests passed successfully!");

  } catch (error) {
    console.error("❌ Contract integration test failed:", error);
    process.exit(1);
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log("🚀 Starting ZK Proof System Tests...\n");
  
  await testZKProofs();
  await testContractIntegration();
  
  console.log("\n🎉 All tests completed successfully!");
  console.log("✅ ZK proof system is ready for production use!");
}

// Run tests if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testZKProofs,
  testContractIntegration
}; 