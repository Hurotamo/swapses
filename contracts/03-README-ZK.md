# Zero-Knowledge Privacy Mixer Implementation

## Overview

This implementation provides a production-ready zero-knowledge privacy mixer using zk-SNARKs (specifically Groth16) for maximum privacy and untraceability. The system replaces basic Merkle proofs with advanced cryptographic proofs that provide mathematical guarantees of privacy.

## 🏗️ Architecture

### Core Components

1. **ZKPrivacyMixer.sol** - Main smart contract with zk-SNARK integration
2. **Circom Circuits** - Zero-knowledge circuit definitions
3. **Proof Generation Scripts** - Automated proof creation
4. **Verification Scripts** - On-chain and off-chain proof verification
5. **Deployment Scripts** - Multi-network deployment automation

### Privacy Features

- **Zero-Knowledge Proofs**: Mathematical guarantees of privacy
- **Merkle Tree Integration**: Efficient privacy-preserving data structures
- **Nullifier System**: Prevents double-spending attacks
- **Range Proofs**: Validates amounts without revealing them
- **Batch Processing**: Efficient multiple transaction handling

## 🚀 Quick Start

### Prerequisites

```bash
npm install
npm install -g circom snarkjs
```

### Compile Circuits

```bash
# Compile main mixing circuit
circom circuits/mixer.circom --r1cs --wasm --sym --c

# Compile range proof circuit
circom circuits/range_proof.circom --r1cs --wasm --sym --c
```

### Setup Trusted Setup

```bash
# Download trusted setup parameters
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_16.ptau

# Setup Groth16
snarkjs groth16 setup mixer.r1cs ptau/powersOfTau28_hez_final_16.ptau mixer_0000.zkey

# Contribute to ceremony
snarkjs zkey contribute mixer_0000.zkey mixer_final.zkey

# Export verification key
snarkjs zkey export verificationkey mixer_final.zkey verification_key.json
```

### Deploy Contract

```bash
# Deploy to testnet
npm run deploy:base-sepolia

# Deploy to mainnet
npm run deploy:base-mainnet
```

## 📋 Usage

### 1. Creating a Deposit

```javascript
const { generateDepositProof } = require('./scripts/generate-proof.js');

// Generate deposit proof
const proof = await generateDepositProof(
  secret,           // Private secret
  amount,           // Deposit amount
  fee,              // Transaction fee
  merkleRoot,       // Current merkle root
  pathElements,     // Merkle path elements
  pathIndices       // Merkle path indices
);

// Call contract
await zkMixer.deposit(
  commitment,
  poolId,
  mixingDelay,
  proof,
  { value: amount }
);
```

### 2. Withdrawing Funds

```javascript
const { generateWithdrawalProof } = require('./scripts/generate-proof.js');

// Generate withdrawal proof
const proof = await generateWithdrawalProof(
  secret,           // Private secret
  nullifier,        // Unique nullifier
  recipient,        // Recipient address
  amount,           // Withdrawal amount
  merkleRoot,       // Current merkle root
  pathElements,     // Merkle path elements
  pathIndices       // Merkle path indices
);

// Call contract
await zkMixer.withdraw(
  nullifier,
  recipient,
  amount,
  proof
);
```

### 3. Batch Withdrawals

```javascript
const nullifiers = [nullifier1, nullifier2];
const recipients = [recipient1, recipient2];
const amounts = [amount1, amount2];
const proofs = [proof1, proof2];

await zkMixer.batchWithdraw(
  nullifiers,
  recipients,
  amounts,
  proofs
);
```

## 🔧 Circuit Details

### Main Mixing Circuit (`mixer.circom`)

The main circuit implements:

- **Commitment Generation**: Creates privacy-preserving commitments
- **Nullifier Generation**: Prevents double-spending
- **Merkle Verification**: Validates membership without revealing position
- **Amount Constraints**: Ensures amounts are within valid ranges
- **Fee Validation**: Validates transaction fees

### Range Proof Circuit (`range_proof.circom`)

The range proof circuit implements:

- **Bulletproofs**: Efficient range proofs
- **Amount Validation**: Proves amount is within range without revealing it
- **Pedersen Commitments**: Privacy-preserving commitments
- **Binary Decomposition**: Efficient bit-wise validation

## 🛡️ Security Features

### Privacy Guarantees

1. **Zero-Knowledge**: No information about inputs is revealed
2. **Unlinkability**: Deposits and withdrawals cannot be linked
3. **Anonymity**: Sender and recipient addresses are hidden
4. **Amount Privacy**: Transaction amounts are confidential

### Security Measures

1. **Nullifier System**: Prevents double-spending
2. **Merkle Trees**: Efficient privacy-preserving data structures
3. **Range Proofs**: Validates amounts without revealing them
4. **Batch Processing**: Reduces gas costs and improves privacy

## 🧪 Testing

### Run Tests

```bash
npm test
```

### Test Coverage

The test suite covers:

- Contract deployment and initialization
- Deposit functionality with ZK proofs
- Withdrawal functionality with ZK proofs
- Batch operations
- Error handling and edge cases
- Emergency functions
- Access control

## 📊 Performance

### Gas Optimization

- **Efficient Circuits**: Optimized for minimal constraint count
- **Batch Processing**: Reduces gas costs for multiple operations
- **Smart Contract Optimization**: Minimal on-chain computation

### Scalability

- **Merkle Tree Depth**: Configurable for different privacy levels
- **Pool Management**: Multiple mixing pools for better privacy
- **Batch Operations**: Efficient handling of multiple transactions

## 🔍 Verification

### Off-Chain Verification

```bash
node scripts/verify-proof.js offchain proof.json publicSignals.json
```

### On-Chain Verification

```bash
node scripts/verify-proof.js onchain <contract-address> proof.json publicSignals.json
```

### Batch Verification

```bash
node scripts/verify-proof.js batch <contract-address> ./proofs/
```

## 🌐 Multi-Network Deployment

### Supported Networks

- **Base Sepolia**: Testnet deployment
- **Base Mainnet**: Production deployment
- **Lisk Sepolia**: Testnet deployment
- **Lisk Mainnet**: Production deployment

### Deployment Commands

```bash
# Testnet deployments
npm run deploy:base-sepolia
npm run deploy:lisk-sepolia

# Mainnet deployments
npm run deploy:base-mainnet
npm run deploy:lisk-mainnet
```

## 📈 Monitoring

### Privacy Metrics

- **Anonymity Set Size**: Number of participants in mixing pool
- **Transaction Volume**: Total amount being mixed
- **Proof Verification Rate**: Success rate of ZK proofs
- **Gas Usage**: Average gas costs for operations

### Security Monitoring

- **Nullifier Usage**: Track used nullifiers
- **Proof Verification**: Monitor proof validation
- **Contract Events**: Track all privacy mixer events
- **Error Rates**: Monitor failed operations

## 🔧 Configuration

### Network-Specific Settings

```javascript
const networkConfig = {
  "base-sepolia": {
    minDelay: 3600,      // 1 hour
    maxDelay: 604800,    // 7 days
    merkleDepth: 32
  },
  "base-mainnet": {
    minDelay: 7200,      // 2 hours (more conservative)
    maxDelay: 1209600,   // 14 days
    merkleDepth: 32
  }
};
```

### Privacy Levels

- **Low**: 1-2 hour mixing delays
- **Medium**: 1-3 day mixing delays
- **High**: 1-7 day mixing delays
- **Maximum**: 1-14 day mixing delays

## 🚨 Emergency Procedures

### Pause Contract

```javascript
await zkMixer.pause();
```

### Emergency Withdrawal

```javascript
await zkMixer.emergencyWithdraw();
```

### Unpause Contract

```javascript
await zkMixer.unpause();
```

## 📚 API Reference

### Contract Functions

#### Deposit
```solidity
function deposit(
    bytes32 commitment,
    uint256 poolId,
    uint256 mixingDelay,
    ZKProof memory zkProof
) external payable
```

#### Withdraw
```solidity
function withdraw(
    bytes32 nullifier,
    address recipient,
    uint256 amount,
    ZKProof memory zkProof
) external
```

#### Batch Withdraw
```solidity
function batchWithdraw(
    bytes32[] memory nullifiers,
    address[] memory recipients,
    uint256[] memory amounts,
    ZKProof[] memory zkProofs
) external
```

### Events

- `DepositCreated`: Emitted when deposit is created
- `WithdrawalExecuted`: Emitted when withdrawal is executed
- `ZKProofVerified`: Emitted when ZK proof is verified
- `MixingPoolUpdated`: Emitted when mixing pool is updated

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create feature branch
3. Implement changes
4. Add tests
5. Submit pull request

### Code Standards

- Follow Solidity style guide
- Add comprehensive tests
- Document all functions
- Use meaningful variable names
- Implement proper error handling

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

This software is provided "as is" without warranty. Users are responsible for understanding and complying with local regulations. The developers are not liable for any misuse of this software.

## 🔗 Links

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)
- [Privacy Mixer Research](https://en.wikipedia.org/wiki/Cryptocurrency_tumbler) 