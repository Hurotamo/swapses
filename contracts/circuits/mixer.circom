pragma circom 2.1.4;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

template MixerCircuit(maxDeposits) {
    // Public inputs
    signal input merkleRoot;
    signal input nullifierHash;
    signal input recipient;
    signal input amount;
    signal input fee;
    
    // Private inputs
    signal input secret;
    signal input pathElements[maxDeposits];
    signal input pathIndices[maxDeposits];
    signal input depositCommitment;
    signal input nullifier;
    
    // Outputs
    signal output commitmentHash;
    signal output nullifierHashOut;
    
    // Component instances
    component hasher = Poseidon(3);
    component nullifierHasher = Poseidon(2);
    component commitmentHasher = Poseidon(3);
    component amountCheck = LessThan(64);
    component feeCheck = LessThan(64);
    
    // Verify deposit commitment
    commitmentHasher.inputs[0] <== secret;
    commitmentHasher.inputs[1] <== amount;
    commitmentHasher.inputs[2] <== fee;
    commitmentHash <== commitmentHasher.out;
    
    // Verify nullifier
    nullifierHasher.inputs[0] <== secret;
    nullifierHasher.inputs[1] <== nullifier;
    nullifierHashOut <== nullifierHasher.out;
    
    // Verify amount constraints
    amountCheck.in[0] <== amount;
    amountCheck.in[1] <== 1000000000000000000; // 1 ETH in wei
    amountCheck.out === 1;
    
    // Verify fee constraints
    feeCheck.in[0] <== fee;
    feeCheck.in[1] <== 10000000000000000; // 0.01 ETH max fee
    feeCheck.out === 1;
    
    // Verify merkle path
    component merkleVerifier = MerkleVerifier(maxDeposits);
    merkleVerifier.leaf <== commitmentHash;
    merkleVerifier.root <== merkleRoot;
    merkleVerifier.pathElements <== pathElements;
    merkleVerifier.pathIndices <== pathIndices;
    merkleVerifier.valid === 1;
    
    // Verify nullifier hash matches
    nullifierHashOut === nullifierHash;
}

template MerkleVerifier(depth) {
    signal input leaf;
    signal input root;
    signal input pathElements[depth];
    signal input pathIndices[depth];
    signal output valid;
    
    component hashers[depth];
    component selectors[depth];
    
    var computedHash = leaf;
    
    for (var i = 0; i < depth; i++) {
        selectors[i] = IsEqual();
        selectors[i].in[0] <== pathIndices[i];
        selectors[i].in[1] <== 0;
        
        hashers[i] = Poseidon(2);
        
        // If pathIndex is 0, hash is on the left, otherwise on the right
        hashers[i].inputs[0] <== selectors[i].out * computedHash + (1 - selectors[i].out) * pathElements[i];
        hashers[i].inputs[1] <== selectors[i].out * pathElements[i] + (1 - selectors[i].out) * computedHash;
        
        computedHash <== hashers[i].out;
    }
    
    component rootCheck = IsEqual();
    rootCheck.in[0] <== computedHash;
    rootCheck.in[1] <== root;
    valid <== rootCheck.out;
}

component main { public [merkleRoot, nullifierHash, recipient, amount, fee] } = MixerCircuit(32); 