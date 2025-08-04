const { buildPoseidon } = require("circomlibjs");
const { groth16 } = require("snarkjs");
const fs = require("fs");
const path = require("path");

/**
 * Generate ZK proof for privacy mixer operations
 */
async function generateProof(inputs, circuitPath = "./circuits/mixer.circom") {
  try {
    console.log("Generating ZK proof...");
    
    // Generate the proof using snarkjs
    const { proof, publicSignals } = await groth16.fullProve(
      inputs,
      circuitPath,
      "./mixer_final.zkey"
    );
    
    console.log("Proof generated successfully!");
    console.log("Public signals:", publicSignals);
    
    return { proof, publicSignals };
  } catch (error) {
    console.error("Error generating proof:", error);
    throw error;
  }
}

/**
 * Generate commitment hash for deposit
 */
async function generateCommitment(secret, amount, fee) {
  const poseidon = await buildPoseidon();
  
  const inputs = [
    secret,
    amount,
    fee
  ];
  
  const commitment = poseidon(inputs);
  return commitment;
}

/**
 * Generate nullifier hash for withdrawal
 */
async function generateNullifier(secret, nullifier) {
  const poseidon = await buildPoseidon();
  
  const inputs = [
    secret,
    nullifier
  ];
  
  const nullifierHash = poseidon(inputs);
  return nullifierHash;
}

/**
 * Generate deposit proof
 */
async function generateDepositProof(secret, amount, fee, merkleRoot, pathElements, pathIndices) {
  const inputs = {
    secret: secret,
    amount: amount,
    fee: fee,
    merkleRoot: merkleRoot,
    pathElements: pathElements,
    pathIndices: pathIndices,
    depositCommitment: await generateCommitment(secret, amount, fee),
    nullifier: 0 // Not used for deposits
  };
  
  return await generateProof(inputs);
}

/**
 * Generate withdrawal proof
 */
async function generateWithdrawalProof(secret, nullifier, recipient, amount, merkleRoot, pathElements, pathIndices) {
  const inputs = {
    secret: secret,
    nullifier: nullifier,
    recipient: recipient,
    amount: amount,
    merkleRoot: merkleRoot,
    pathElements: pathElements,
    pathIndices: pathIndices,
    depositCommitment: await generateCommitment(secret, amount, 0),
    nullifierHash: await generateNullifier(secret, nullifier)
  };
  
  return await generateProof(inputs);
}

/**
 * Verify proof on-chain
 */
async function verifyProof(proof, publicSignals, verificationKeyPath = "./verification_key.json") {
  try {
    const vKey = JSON.parse(fs.readFileSync(verificationKeyPath));
    const isValid = await groth16.verify(vKey, publicSignals, proof);
    
    console.log("Proof verification result:", isValid);
    return isValid;
  } catch (error) {
    console.error("Error verifying proof:", error);
    throw error;
  }
}

/**
 * Generate range proof for amount validation
 */
async function generateRangeProof(amount, minAmount, maxAmount, blindingFactor) {
  const inputs = {
    amount: amount,
    minAmount: minAmount,
    maxAmount: maxAmount,
    blindingFactor: blindingFactor,
    amountBits: amount.toString(2).padStart(64, '0').split('').map(Number),
    gamma: Math.floor(Math.random() * 1000000)
  };
  
  return await generateProof(inputs, "./circuits/range_proof.circom");
}

/**
 * Main function for CLI usage
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case "deposit":
      const secret = args[1];
      const amount = args[2];
      const fee = args[3];
      const merkleRoot = args[4];
      
      console.log("Generating deposit proof...");
      const depositProof = await generateDepositProof(
        secret,
        amount,
        fee,
        merkleRoot,
        [], // pathElements
        []  // pathIndices
      );
      
      console.log("Deposit proof:", JSON.stringify(depositProof, null, 2));
      break;
      
    case "withdraw":
      const wSecret = args[1];
      const wNullifier = args[2];
      const wRecipient = args[3];
      const wAmount = args[4];
      const wMerkleRoot = args[5];
      
      console.log("Generating withdrawal proof...");
      const withdrawalProof = await generateWithdrawalProof(
        wSecret,
        wNullifier,
        wRecipient,
        wAmount,
        wMerkleRoot,
        [], // pathElements
        []  // pathIndices
      );
      
      console.log("Withdrawal proof:", JSON.stringify(withdrawalProof, null, 2));
      break;
      
    case "range":
      const rAmount = args[1];
      const rMinAmount = args[2];
      const rMaxAmount = args[3];
      const rBlindingFactor = args[4];
      
      console.log("Generating range proof...");
      const rangeProof = await generateRangeProof(
        rAmount,
        rMinAmount,
        rMaxAmount,
        rBlindingFactor
      );
      
      console.log("Range proof:", JSON.stringify(rangeProof, null, 2));
      break;
      
    case "verify":
      const proofPath = args[1];
      const publicSignalsPath = args[2];
      const vKeyPath = args[3];
      
      const proof = JSON.parse(fs.readFileSync(proofPath));
      const publicSignals = JSON.parse(fs.readFileSync(publicSignalsPath));
      
      await verifyProof(proof, publicSignals, vKeyPath);
      break;
      
    default:
      console.log("Usage:");
      console.log("  node generate-proof.js deposit <secret> <amount> <fee> <merkleRoot>");
      console.log("  node generate-proof.js withdraw <secret> <nullifier> <recipient> <amount> <merkleRoot>");
      console.log("  node generate-proof.js range <amount> <minAmount> <maxAmount> <blindingFactor>");
      console.log("  node generate-proof.js verify <proofPath> <publicSignalsPath> <verificationKeyPath>");
      break;
  }
}

// Export functions for use in other modules
module.exports = {
  generateProof,
  generateCommitment,
  generateNullifier,
  generateDepositProof,
  generateWithdrawalProof,
  generateRangeProof,
  verifyProof
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
} 