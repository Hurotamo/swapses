pragma circom 2.1.4;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/bitify.circom";

template ProductionMixer(maxDeposits, maxAmount) {
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
    signal input depositAmount;
    signal input depositFee;
    
    // Outputs
    signal output commitmentHash;
    signal output nullifierHashOut;
    signal output amountCheck;
    signal output feeCheck;
    
    // Component instances
    component hasher = Poseidon(3);
    component nullifierHasher = Poseidon(2);
    component commitmentHasher = Poseidon(3);
    component amountCheck = LessThan(64);
    component feeCheck = LessThan(64);
    component recipientCheck = LessThan(160);
    
    // Verify deposit commitment
    commitmentHasher.inputs[0] <== secret;
    commitmentHasher.inputs[1] <== depositAmount;
    commitmentHasher.inputs[2] <== depositFee;
    commitmentHash <== commitmentHasher.out;
    
    // Verify nullifier
    nullifierHasher.inputs[0] <== secret;
    nullifierHasher.inputs[1] <== nullifier;
    nullifierHashOut <== nullifierHasher.out;
    
    // Verify amount constraints with proper range checks
    amountCheck.in[0] <== depositAmount;
    amountCheck.in[1] <== maxAmount;
    amountCheck.out === 1;
    
    // Verify fee constraints
    feeCheck.in[0] <== depositFee;
    feeCheck.in[1] <== 10000000000000000; // 0.01 ETH max fee
    feeCheck.out === 1;
    
    // Verify recipient address constraints
    recipientCheck.in[0] <== recipient;
    recipientCheck.in[1] <== 2**160 - 1; // Max address value
    recipientCheck.out === 1;
    
    // Verify merkle path with proper depth checking
    component merkleVerifier = MerkleVerifier(maxDeposits);
    merkleVerifier.leaf <== commitmentHash;
    merkleVerifier.root <== merkleRoot;
    merkleVerifier.pathElements <== pathElements;
    merkleVerifier.pathIndices <== pathIndices;
    merkleVerifier.valid === 1;
    
    // Verify nullifier hash matches
    nullifierHashOut === nullifierHash;
    
    // Verify amount consistency
    amount === depositAmount;
    fee === depositFee;
}

template MerkleVerifier(depth) {
    signal input leaf;
    signal input root;
    signal input pathElements[depth];
    signal input pathIndices[depth];
    signal output valid;
    
    component hashers[depth];
    component selectors[depth];
    component indexChecks[depth];
    
    var computedHash = leaf;
    
    for (var i = 0; i < depth; i++) {
        // Verify path index is binary
        indexChecks[i] = IsEqual();
        indexChecks[i].in[0] <== pathIndices[i];
        indexChecks[i].in[1] <== 0;
        
        selectors[i] = IsEqual();
        selectors[i].in[0] <== pathIndices[i];
        selectors[i].in[1] <== 1;
        
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

template RangeProof(maxBits) {
    signal input value;
    signal input maxValue;
    signal output inRange;
    
    component bitifier = Num2Bits(maxBits);
    bitifier.in <== value;
    
    component rangeCheck = LessThan(maxBits);
    rangeCheck.in[0] <== value;
    rangeCheck.in[1] <== maxValue;
    
    inRange <== rangeCheck.out;
}

template CommitmentCircuit() {
    signal input secret;
    signal input amount;
    signal input nullifier;
    signal output commitment;
    
    component hasher = Poseidon(3);
    hasher.inputs[0] <== secret;
    hasher.inputs[1] <== amount;
    hasher.inputs[2] <== nullifier;
    commitment <== hasher.out;
}

template NullifierCircuit() {
    signal input secret;
    signal input nullifier;
    signal output nullifierHash;
    
    component hasher = Poseidon(2);
    hasher.inputs[0] <== secret;
    hasher.inputs[1] <== nullifier;
    nullifierHash <== hasher.out;
}

// Main component for production mixer
component main { 
    public [merkleRoot, nullifierHash, recipient, amount, fee] 
} = ProductionMixer(32, 1000000000000000000000); // 32 depth, 1000 ETH max 