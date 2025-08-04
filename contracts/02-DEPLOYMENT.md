# Deployment Guide

This guide explains how to deploy the Swapses privacy system to all supported networks.

## Supported Networks

### Mainnet Networks
- **Lisk Mainnet** (Chain ID: 1891)
- **Base Mainnet** (Chain ID: 8453)

### Testnet Networks  
- **Lisk Sepolia** (Chain ID: 4202)
- **Base Sepolia** (Chain ID: 84532)

## Prerequisites

1. **Environment Setup**
   ```bash
   # Copy environment template
   cp env.example .env
   
   # Edit .env file with your configuration
   nano .env
   ```

2. **Required Environment Variables**
   ```env
   # Private key for deployment (without 0x prefix)
   PRIVATE_KEY=your_private_key_here
   
   # Network RPC URLs (optional - defaults will be used)
   LISK_MAINNET_URL=https://rpc.api.lisk.com
   BASE_MAINNET_URL=https://mainnet.base.org
   LISK_SEPOLIA_URL=https://rpc.sepolia-api.lisk.com
   BASE_SEPOLIA_URL=https://sepolia.base.org
   
   # BaseScan API key for contract verification (optional)
   BASESCAN_API_KEY=your_basescan_api_key
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

## Deployment Scripts

### Option 1: Universal Deployment Script (Recommended)

Use the universal deployment script that works for all networks:

```bash
# Deploy to Lisk Mainnet
npx hardhat run scripts/deploy-all-networks.ts --network lisk-mainnet

# Deploy to Base Mainnet  
npx hardhat run scripts/deploy-all-networks.ts --network base-mainnet

# Deploy to Lisk Sepolia Testnet
npx hardhat run scripts/deploy-all-networks.ts --network lisk-sepolia

# Deploy to Base Sepolia Testnet
npx hardhat run scripts/deploy-all-networks.ts --network base-sepolia
```

### Option 2: Network-Specific Scripts

Use individual scripts for each network:

```bash
# Mainnet deployments
npx hardhat run scripts/deploy-lisk-mainnet.ts --network lisk-mainnet
npx hardhat run scripts/deploy-base-mainnet.ts --network base-mainnet

# Testnet deployments
npx hardhat run scripts/deploy-lisk-sepolia.ts --network lisk-sepolia
npx hardhat run scripts/deploy-base-sepolia.ts --network base-sepolia
```

### Option 3: Original Cross-Chain Script

Use the original deployment script (deploys to current network):

```bash
npx hardhat run scripts/deploy-cross-chain.ts --network <network-name>
```

## Deployment Process

Each deployment script will:

1. **Deploy Core Contracts**
   - PrivacyMixer
   - CrossChainBridge  
   - WalletSplitter

2. **Configure Integrations**
   - Link PrivacyMixer to WalletSplitter
   - Link CrossChainBridge to WalletSplitter
   - Set up chain bridges for cross-chain functionality

3. **Create Mixing Pools**
   - Fast pool (1-6 hours)
   - Standard pool (6-24 hours)
   - Long pool (1-7 days)

4. **Set Up Validators**
   - Add 3 validators for current network
   - Add 3 validators for cross-chain network

## Network-Specific Considerations

### Mainnet Deployments

⚠️ **IMPORTANT**: Mainnet deployments use real tokens and real value!

- **Lisk Mainnet**: Ensure you have sufficient LSK for gas fees
- **Base Mainnet**: Ensure you have sufficient ETH for gas fees
- Test with small amounts first
- Monitor cross-chain transactions carefully
- Set up proper validator infrastructure

### Testnet Deployments

- **Lisk Sepolia**: Get test LSK from Lisk Sepolia faucet
- **Base Sepolia**: Get test ETH from Base Sepolia faucet
- Use test tokens only
- Perfect for testing functionality before mainnet

## Post-Deployment Steps

1. **Verify Contracts** (Optional)
   ```bash
   npx hardhat verify --network <network-name> <contract-address>
   ```

2. **Test Functionality**
   - Test privacy mixer with small amounts
   - Test cross-chain bridge functionality
   - Test wallet splitting features

3. **Monitor Validators**
   - Ensure validators are online and responsive
   - Monitor cross-chain transaction processing

4. **Set Up Monitoring**
   - Monitor contract events
   - Track cross-chain swap status
   - Monitor validator performance

## Contract Addresses

After deployment, you'll receive addresses for:
- **Privacy Mixer**: Handles privacy mixing functionality
- **Cross-Chain Bridge**: Manages cross-chain swaps
- **Wallet Splitter**: Main contract for wallet splitting and privacy modes

## Troubleshooting

### Common Issues

1. **Insufficient Gas**
   - Ensure you have enough tokens for gas fees
   - For testnets, get tokens from faucets

2. **Network Connection Issues**
   - Check RPC URL configuration
   - Verify network connectivity

3. **Validator Setup Issues**
   - Ensure validators have sufficient tokens
   - Check validator addresses are correct

4. **Cross-Chain Bridge Issues**
   - Verify both networks are properly configured
   - Check validator consensus

### Getting Help

- Check the deployment logs for specific error messages
- Verify your environment configuration
- Ensure you're using the correct network name
- Test with smaller amounts first

## Security Considerations

- Keep your private key secure
- Use hardware wallets for mainnet deployments
- Test thoroughly on testnets before mainnet
- Monitor contract activity regularly
- Set up proper validator infrastructure
- Consider multi-signature setups for mainnet

## Money Laundering Workflow

The system supports a 3-level money laundering workflow:

1. **Level 1**: 1 wallet → 100 wallets (Lisk)
2. **Level 2**: 100 wallets → 50 wallets (Base)  
3. **Level 3**: 50 wallets → 20 wallets (Cross-chain)

⚠️ **Use responsibly and in compliance with local regulations!** 

# ZK Privacy Mixer Deployment Guide

## Overview

This guide covers the deployment of the Zero-Knowledge Privacy Mixer across multiple networks with full ZK proof integration.

## Prerequisites

### Required Software
- Node.js (v16 or higher)
- npm or yarn
- Git

### Required Accounts
- Private key for deployment
- API keys for contract verification (optional but recommended)

## Setup Instructions

### 1. Environment Configuration

```bash
# Copy environment template
cp env.example .env

# Edit .env with your values
nano .env
```

Required environment variables:
```bash
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_URL=https://sepolia.base.org
BASE_MAINNET_URL=https://mainnet.base.org
LISK_SEPOLIA_URL=https://rpc.sepolia-api.lisk.com
LISK_MAINNET_URL=https://rpc.api.lisk.com
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup ZK Circuits

```bash
# Setup circuits and trusted setup
npm run setup:circuits
```

This will:
- Download trusted setup parameters
- Compile Circom circuits
- Generate Groth16 keys
- Create verification keys

### 4. Test ZK Proof System

```bash
# Test ZK proof generation and verification
npm run test:zk
```

## Deployment Commands

### Testnet Deployments

```bash
# Deploy to Base Sepolia
npm run deploy:base-sepolia

# Deploy to Lisk Sepolia
npm run deploy:lisk-sepolia
```

### Mainnet Deployments

```bash
# Deploy to Base Mainnet
npm run deploy:base-mainnet

# Deploy to Lisk Mainnet
npm run deploy:lisk-mainnet
```

### Local Development

```bash
# Start local hardhat node
npx hardhat node

# Deploy to local network
npm run deploy:local
```

## Contract Verification

### Automatic Verification

The deployment scripts include automatic verification on supported networks:

```bash
# Verify on Base Sepolia
npm run verify:base-sepolia

# Verify on Base Mainnet
npm run verify:base-mainnet
```

### Manual Verification

If automatic verification fails, you can verify manually:

```bash
npx hardhat verify --network base-sepolia <contract-address>
```

## Network-Specific Configuration

### Base Network

- **Sepolia Testnet**: Chain ID 84532
- **Mainnet**: Chain ID 8453
- **Block Explorer**: https://basescan.org

### Lisk Network

- **Sepolia Testnet**: Chain ID 4202
- **Mainnet**: Chain ID 1891
- **Block Explorer**: https://liskscan.com

## ZK Proof Workflow

### 1. Circuit Setup

```bash
# Compile circuits
npm run circuit:compile

# Setup trusted setup
npm run circuit:setup

# Contribute to ceremony
npm run circuit:contribute

# Export verification key
npm run circuit:export
```

### 2. Proof Generation

```bash
# Generate deposit proof
node scripts/generate-proof.js deposit <secret> <amount> <fee> <merkleRoot>

# Generate withdrawal proof
node scripts/generate-proof.js withdraw <secret> <nullifier> <recipient> <amount> <merkleRoot>

# Generate range proof
node scripts/generate-proof.js range <amount> <minAmount> <maxAmount> <blindingFactor>
```

### 3. Proof Verification

```bash
# Verify proof off-chain
node scripts/verify-proof.js offchain <proofPath> <publicSignalsPath>

# Verify proof on-chain
node scripts/verify-proof.js onchain <contractAddress> <proofPath> <publicSignalsPath>
```

## Security Considerations

### Trusted Setup

The ZK circuits require a trusted setup ceremony. For production:

1. **Multi-party ceremony**: Involve multiple trusted parties
2. **Secure environment**: Use air-gapped computers
3. **Verification**: Verify all contributions
4. **Documentation**: Document the entire process

### Key Management

1. **Private keys**: Store securely, never commit to git
2. **Multi-sig**: Use multi-signature wallets for mainnet
3. **Backup**: Secure backup of all keys
4. **Rotation**: Regular key rotation

### Emergency Procedures

```bash
# Pause contract (owner only)
await zkMixer.pause();

# Emergency withdrawal (owner only)
await zkMixer.emergencyWithdraw();

# Unpause contract (owner only)
await zkMixer.unpause();
```

## Monitoring

### Contract Events

Monitor these events for operational insights:

- `DepositCreated`: New deposits
- `WithdrawalExecuted`: Successful withdrawals
- `ZKProofVerified`: Proof verifications
- `MixingPoolUpdated`: Pool changes

### Metrics to Track

- **Anonymity set size**: Number of participants
- **Transaction volume**: Total mixed amount
- **Proof verification rate**: Success/failure ratio
- **Gas usage**: Average transaction costs

## Troubleshooting

### Common Issues

1. **Circuit compilation fails**
   - Check Circom version compatibility
   - Verify circuit syntax
   - Ensure all dependencies installed

2. **Proof generation timeout**
   - Increase timeout settings
   - Check system resources
   - Verify input validity

3. **Deployment fails**
   - Check network connectivity
   - Verify private key format
   - Ensure sufficient gas balance

4. **Verification fails**
   - Check API key validity
   - Verify contract address
   - Wait for block confirmation

### Debug Commands

```bash
# Check circuit compilation
circom circuits/mixer.circom --r1cs --wasm --sym --c

# Test proof generation
node scripts/test-proofs.js

# Verify contract compilation
npx hardhat compile

# Run tests
npm test
```

## Production Checklist

Before mainnet deployment:

- [ ] Complete security audit
- [ ] Test on testnet thoroughly
- [ ] Verify all ZK proofs work correctly
- [ ] Set up monitoring and alerting
- [ ] Prepare emergency procedures
- [ ] Document deployment process
- [ ] Train operations team
- [ ] Set up multi-sig governance

## Support

For technical support:

1. Check the documentation in `README-ZK.md`
2. Review test files for usage examples
3. Check GitHub issues for known problems
4. Contact the development team

## License

This deployment guide is part of the ZK Privacy Mixer project and is licensed under MIT. 