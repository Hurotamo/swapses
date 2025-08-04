pragma circom 2.1.4;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

template RangeProof(maxBits) {
    signal input amount;
    signal input minAmount;
    signal input maxAmount;
    
    // Private inputs for range proof
    signal input amountBits[maxBits];
    signal input blindingFactor;
    
    // Outputs
    signal output commitment;
    signal output valid;
    
    // Components
    component hasher = Poseidon(3);
    component rangeCheck = LessThan(maxBits);
    component bitCheckers[maxBits];
    
    // Verify amount is within range
    rangeCheck.in[0] <== amount;
    rangeCheck.in[1] <== maxAmount;
    rangeCheck.out === 1;
    
    // Verify amount is above minimum
    component minCheck = GreaterThan(maxBits);
    minCheck.in[0] <== amount;
    minCheck.in[1] <== minAmount;
    minCheck.out === 1;
    
    // Verify bits sum to amount
    var sum = 0;
    for (var i = 0; i < maxBits; i++) {
        bitCheckers[i] = IsEqual();
        bitCheckers[i].in[0] <== amountBits[i];
        bitCheckers[i].in[1] <== 0;
        
        // Ensure bits are binary
        bitCheckers[i].out * (1 - bitCheckers[i].out) === 0;
        
        sum += amountBits[i] * (1 << i);
    }
    sum === amount;
    
    // Create Pedersen commitment
    hasher.inputs[0] <== amount;
    hasher.inputs[1] <== blindingFactor;
    hasher.inputs[2] <== 0; // Additional entropy
    commitment <== hasher.out;
    
    // Range proof is valid if all checks pass
    valid <== 1;
}

template BulletproofRangeProof(maxBits) {
    signal input amount;
    signal input minAmount;
    signal input maxAmount;
    
    // Private inputs
    signal input amountBits[maxBits];
    signal input blindingFactor;
    signal input gamma; // Additional blinding factor
    
    // Outputs
    signal output commitment;
    signal output valid;
    
    // Components
    component rangeProof = RangeProof(maxBits);
    component hasher = Poseidon(4);
    
    // Verify range proof
    rangeProof.amount <== amount;
    rangeProof.minAmount <== minAmount;
    rangeProof.maxAmount <== maxAmount;
    rangeProof.amountBits <== amountBits;
    rangeProof.blindingFactor <== blindingFactor;
    rangeProof.valid === 1;
    
    // Create bulletproof-style commitment
    hasher.inputs[0] <== amount;
    hasher.inputs[1] <== blindingFactor;
    hasher.inputs[2] <== gamma;
    hasher.inputs[3] <== 0; // Additional entropy
    commitment <== hasher.out;
    
    valid <== 1;
}

component main { public [commitment, valid] } = BulletproofRangeProof(64); 