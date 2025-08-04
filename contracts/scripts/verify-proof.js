const { groth16 } = require("snarkjs");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Verify ZK proof off-chain
 */
async function verifyProofOffChain(proof, publicSignals, verificationKeyPath) {
  try {
    console.log("Verifying proof off-chain...");
    
    const vKey = JSON.parse(fs.readFileSync(verificationKeyPath));
    const isValid = await groth16.verify(vKey, publicSignals, proof);
    
    console.log("Off-chain verification result:", isValid);
    return isValid;
  } catch (error) {
    console.error("Error verifying proof off-chain:", error);
    throw error;
  }
}

/**
 * Verify ZK proof on-chain
 */
async function verifyProofOnChain(contractAddress, proof, publicSignals) {
  try {
    console.log("Verifying proof on-chain...");
    
    const ZKPrivacyMixer = await ethers.getContractFactory("ZKPrivacyMixer");
    const contract = ZKPrivacyMixer.attach(contractAddress);
    
    // Convert proof to contract format
    const zkProof = {
      a: [proof.pi_a[0], proof.pi_a[1]],
      b: [[proof.pi_b[0][0], proof.pi_b[0][1]], [proof.pi_b[1][0], proof.pi_b[1][1]]],
      c: [proof.pi_c[0], proof.pi_c[1]],
      publicInputs: publicSignals
    };
    
    // Verify on-chain (this would call the actual verification function)
    const isValid = await contract.verifyGroth16Proof(zkProof);
    
    console.log("On-chain verification result:", isValid);
    return isValid;
  } catch (error) {
    console.error("Error verifying proof on-chain:", error);
    throw error;
  }
}

/**
 * Verify deposit proof
 */
async function verifyDepositProof(contractAddress, commitment, amount, proof, publicSignals) {
  try {
    console.log("Verifying deposit proof...");
    
    const ZKPrivacyMixer = await ethers.getContractFactory("ZKPrivacyMixer");
    const contract = ZKPrivacyMixer.attach(contractAddress);
    
    const zkProof = {
      a: [proof.pi_a[0], proof.pi_a[1]],
      b: [[proof.pi_b[0][0], proof.pi_b[0][1]], [proof.pi_b[1][0], proof.pi_b[1][1]]],
      c: [proof.pi_c[0], proof.pi_c[1]],
      publicInputs: publicSignals
    };
    
    const isValid = await contract.verifyZKProof(commitment, amount, zkProof);
    
    console.log("Deposit proof verification result:", isValid);
    return isValid;
  } catch (error) {
    console.error("Error verifying deposit proof:", error);
    throw error;
  }
}

/**
 * Verify withdrawal proof
 */
async function verifyWithdrawalProof(contractAddress, nullifier, recipient, amount, proof, publicSignals) {
  try {
    console.log("Verifying withdrawal proof...");
    
    const ZKPrivacyMixer = await ethers.getContractFactory("ZKPrivacyMixer");
    const contract = ZKPrivacyMixer.attach(contractAddress);
    
    const zkProof = {
      a: [proof.pi_a[0], proof.pi_a[1]],
      b: [[proof.pi_b[0][0], proof.pi_b[0][1]], [proof.pi_b[1][0], proof.pi_b[1][1]]],
      c: [proof.pi_c[0], proof.pi_c[1]],
      publicInputs: publicSignals
    };
    
    const isValid = await contract.verifyWithdrawalProof(nullifier, recipient, amount, zkProof);
    
    console.log("Withdrawal proof verification result:", isValid);
    return isValid;
  } catch (error) {
    console.error("Error verifying withdrawal proof:", error);
    throw error;
  }
}

/**
 * Batch verify multiple proofs
 */
async function batchVerifyProofs(contractAddress, proofs, publicSignalsArray) {
  try {
    console.log("Batch verifying proofs...");
    
    const results = [];
    
    for (let i = 0; i < proofs.length; i++) {
      console.log(`Verifying proof ${i + 1}/${proofs.length}...`);
      
      const isValid = await verifyProofOffChain(
        proofs[i],
        publicSignalsArray[i],
        "./verification_key.json"
      );
      
      results.push({
        proofIndex: i,
        isValid: isValid
      });
    }
    
    console.log("Batch verification results:", results);
    return results;
  } catch (error) {
    console.error("Error in batch verification:", error);
    throw error;
  }
}

/**
 * Verify range proof
 */
async function verifyRangeProof(proof, publicSignals, verificationKeyPath = "./verification_key.json") {
  try {
    console.log("Verifying range proof...");
    
    const vKey = JSON.parse(fs.readFileSync(verificationKeyPath));
    const isValid = await groth16.verify(vKey, publicSignals, proof);
    
    console.log("Range proof verification result:", isValid);
    return isValid;
  } catch (error) {
    console.error("Error verifying range proof:", error);
    throw error;
  }
}

/**
 * Load proof from file
 */
function loadProofFromFile(proofPath) {
  try {
    const proofData = JSON.parse(fs.readFileSync(proofPath));
    return proofData;
  } catch (error) {
    console.error("Error loading proof from file:", error);
    throw error;
  }
}

/**
 * Save proof to file
 */
function saveProofToFile(proof, publicSignals, outputPath) {
  try {
    const proofData = {
      proof: proof,
      publicSignals: publicSignals,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(proofData, null, 2));
    console.log(`Proof saved to ${outputPath}`);
  } catch (error) {
    console.error("Error saving proof to file:", error);
    throw error;
  }
}

/**
 * Main function for CLI usage
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case "offchain":
      const proofPath = args[1];
      const publicSignalsPath = args[2];
      const vKeyPath = args[3] || "./verification_key.json";
      
      const proof = JSON.parse(fs.readFileSync(proofPath));
      const publicSignals = JSON.parse(fs.readFileSync(publicSignalsPath));
      
      await verifyProofOffChain(proof, publicSignals, vKeyPath);
      break;
      
    case "onchain":
      const contractAddress = args[1];
      const onchainProofPath = args[2];
      const onchainPublicSignalsPath = args[3];
      
      const onchainProof = JSON.parse(fs.readFileSync(onchainProofPath));
      const onchainPublicSignals = JSON.parse(fs.readFileSync(onchainPublicSignalsPath));
      
      await verifyProofOnChain(contractAddress, onchainProof, onchainPublicSignals);
      break;
      
    case "deposit":
      const depositContractAddress = args[1];
      const commitment = args[2];
      const amount = args[3];
      const depositProofPath = args[4];
      const depositPublicSignalsPath = args[5];
      
      const depositProof = JSON.parse(fs.readFileSync(depositProofPath));
      const depositPublicSignals = JSON.parse(fs.readFileSync(depositPublicSignalsPath));
      
      await verifyDepositProof(depositContractAddress, commitment, amount, depositProof, depositPublicSignals);
      break;
      
    case "withdraw":
      const withdrawContractAddress = args[1];
      const nullifier = args[2];
      const recipient = args[3];
      const withdrawAmount = args[4];
      const withdrawProofPath = args[5];
      const withdrawPublicSignalsPath = args[6];
      
      const withdrawProof = JSON.parse(fs.readFileSync(withdrawProofPath));
      const withdrawPublicSignals = JSON.parse(fs.readFileSync(withdrawPublicSignalsPath));
      
      await verifyWithdrawalProof(withdrawContractAddress, nullifier, recipient, withdrawAmount, withdrawProof, withdrawPublicSignals);
      break;
      
    case "batch":
      const batchContractAddress = args[1];
      const proofsDir = args[2];
      
      const proofFiles = fs.readdirSync(proofsDir).filter(file => file.endsWith('.json'));
      const proofs = [];
      const publicSignalsArray = [];
      
      for (const file of proofFiles) {
        const proofData = JSON.parse(fs.readFileSync(path.join(proofsDir, file)));
        proofs.push(proofData.proof);
        publicSignalsArray.push(proofData.publicSignals);
      }
      
      await batchVerifyProofs(batchContractAddress, proofs, publicSignalsArray);
      break;
      
    case "range":
      const rangeProofPath = args[1];
      const rangePublicSignalsPath = args[2];
      const rangeVKeyPath = args[3] || "./verification_key.json";
      
      const rangeProof = JSON.parse(fs.readFileSync(rangeProofPath));
      const rangePublicSignals = JSON.parse(fs.readFileSync(rangePublicSignalsPath));
      
      await verifyRangeProof(rangeProof, rangePublicSignals, rangeVKeyPath);
      break;
      
    default:
      console.log("Usage:");
      console.log("  node verify-proof.js offchain <proofPath> <publicSignalsPath> [verificationKeyPath]");
      console.log("  node verify-proof.js onchain <contractAddress> <proofPath> <publicSignalsPath>");
      console.log("  node verify-proof.js deposit <contractAddress> <commitment> <amount> <proofPath> <publicSignalsPath>");
      console.log("  node verify-proof.js withdraw <contractAddress> <nullifier> <recipient> <amount> <proofPath> <publicSignalsPath>");
      console.log("  node verify-proof.js batch <contractAddress> <proofsDirectory>");
      console.log("  node verify-proof.js range <proofPath> <publicSignalsPath> [verificationKeyPath]");
      break;
  }
}

// Export functions for use in other modules
module.exports = {
  verifyProofOffChain,
  verifyProofOnChain,
  verifyDepositProof,
  verifyWithdrawalProof,
  batchVerifyProofs,
  verifyRangeProof,
  loadProofFromFile,
  saveProofToFile
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
} 