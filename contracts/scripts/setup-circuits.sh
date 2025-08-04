#!/bin/bash

# ZK Circuit Setup Script
# This script sets up the zero-knowledge circuits for the privacy mixer

set -e

echo "🔧 Setting up ZK Circuits for Privacy Mixer..."

# Create necessary directories
mkdir -p ptau
mkdir -p circuits/build
mkdir -p proofs

# Install dependencies if not already installed
echo "📦 Installing ZK dependencies..."
npm install circom snarkjs circomlib

# Download trusted setup parameters
echo "⬇️  Downloading trusted setup parameters..."
if [ ! -f "ptau/powersOfTau28_hez_final_16.ptau" ]; then
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_16.ptau -O ptau/powersOfTau28_hez_final_16.ptau
else
    echo "✅ Trusted setup parameters already downloaded"
fi

# Compile main mixing circuit
echo "🔨 Compiling main mixing circuit..."
circom circuits/mixer.circom --r1cs --wasm --sym --c --output circuits/build/

# Compile range proof circuit
echo "🔨 Compiling range proof circuit..."
circom circuits/range_proof.circom --r1cs --wasm --sym --c --output circuits/build/

# Setup Groth16 for main circuit
echo "⚙️  Setting up Groth16 for main circuit..."
snarkjs groth16 setup circuits/build/mixer.r1cs ptau/powersOfTau28_hez_final_16.ptau circuits/build/mixer_0000.zkey

# Contribute to ceremony (generate random contribution)
echo "🎲 Contributing to trusted setup ceremony..."
snarkjs zkey contribute circuits/build/mixer_0000.zkey circuits/build/mixer_final.zkey

# Export verification key
echo "📤 Exporting verification key..."
snarkjs zkey export verificationkey circuits/build/mixer_final.zkey circuits/build/verification_key.json

# Setup Groth16 for range proof circuit
echo "⚙️  Setting up Groth16 for range proof circuit..."
snarkjs groth16 setup circuits/build/range_proof.r1cs ptau/powersOfTau28_hez_final_16.ptau circuits/build/range_proof_0000.zkey

# Contribute to ceremony for range proof
echo "🎲 Contributing to trusted setup ceremony for range proof..."
snarkjs zkey contribute circuits/build/range_proof_0000.zkey circuits/build/range_proof_final.zkey

# Export verification key for range proof
echo "📤 Exporting verification key for range proof..."
snarkjs zkey export verificationkey circuits/build/range_proof_final.zkey circuits/build/range_proof_verification_key.json

# Generate sample proofs for testing
echo "🧪 Generating sample proofs for testing..."

# Create sample input for main circuit
cat > circuits/build/sample_input.json << EOF
{
  "secret": "123456789",
  "amount": "1000000000000000000",
  "fee": "10000000000000000",
  "merkleRoot": "0",
  "pathElements": [],
  "pathIndices": [],
  "depositCommitment": "0",
  "nullifier": "0"
}
EOF

# Create sample input for range proof circuit
cat > circuits/build/range_sample_input.json << EOF
{
  "amount": "1000000000000000000",
  "minAmount": "100000000000000000",
  "maxAmount": "10000000000000000000",
  "blindingFactor": "987654321",
  "amountBits": [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  "gamma": "123456"
}
EOF

echo "✅ ZK Circuit setup completed successfully!"
echo ""
echo "📁 Generated files:"
echo "  - circuits/build/mixer.r1cs"
echo "  - circuits/build/mixer.wasm"
echo "  - circuits/build/mixer_final.zkey"
echo "  - circuits/build/verification_key.json"
echo "  - circuits/build/range_proof.r1cs"
echo "  - circuits/build/range_proof.wasm"
echo "  - circuits/build/range_proof_final.zkey"
echo "  - circuits/build/range_proof_verification_key.json"
echo ""
echo "🧪 Sample inputs created for testing"
echo ""
echo "🚀 Ready to generate and verify proofs!" 