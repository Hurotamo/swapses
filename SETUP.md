# 🚀 DWSS Setup Guide

This guide will walk you through setting up and running the **Deterministic Wallet Splitter System (DWSS)**.

## 📋 Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** 18+ (`node --version`)
- **Rust** 1.70+ (`rustc --version`)
- **Expo CLI** (`npm install -g @expo/cli`)
- **Git** (`git --version`)

## 🛠 Installation Steps

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install contract dependencies
cd contracts && npm install

# Install mobile client dependencies
cd ../mobile-client && npm install

# Return to root
cd ..
```

### 2. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Edit .env with your configuration
# Add your private key and API keys
```

### 3. Build Rust Core

```bash
# Install wasm-pack if not already installed
cargo install wasm-pack

# Build the Rust core
cd rust-core
wasm-pack build --target web
cd ..
```

## 🧪 Testing the System

### 1. Test Wallet Operations

```bash
# Run the wallet splitter test
npx ts-node scripts/split-wallet.test.ts
```

This will test:
- ✅ Mnemonic generation
- ✅ Parent wallet derivation
- ✅ Child wallet derivation (100 wallets)
- ✅ Deterministic behavior
- ✅ Balance checking
- ✅ Gas estimation

### 2. Test Smart Contracts

```bash
# Compile contracts
cd contracts
npx hardhat compile

# Run contract tests
npx hardhat test
```

### 3. Test Mobile App

```bash
# Start the mobile app
cd mobile-client
npm start
```

Then scan the QR code with Expo Go app on your phone.

## 🚀 Deployment

### 1. Deploy Smart Contracts

```bash
# Deploy to Base Sepolia
cd contracts
npm run deploy:base

# Deploy to Lisk Sepolia
npm run deploy:lisk
```

### 2. Update Contract Addresses

After deployment, update the contract addresses in your `.env` file:

```env
WALLET_SPLITTER_BASE=0x... # Address from Base deployment
WALLET_SPLITTER_LISK=0x...  # Address from Lisk deployment
```

### 3. Update Mobile App

Update the contract addresses in `mobile-client/src/services/TransactionService.ts`:

```typescript
private static contractAddress = '0x...'; // Your deployed contract address
```

## 📱 Using the Mobile App

### 1. Generate or Enter Seed Phrase

- Open the app
- Generate a new seed phrase or enter an existing one
- Validate the seed phrase format

### 2. View Parent Wallet

- The app will derive the parent wallet address
- Display the parent wallet information
- Show current balance (if connected to network)

### 3. Initiate Split Operation

- Navigate to the split screen
- Review the split configuration
- Confirm the transaction details
- Execute the split transaction

### 4. View Results

- Check transaction status
- View all 101 wallets (1 parent + 100 children)
- Verify balances on each wallet

## 🔧 Development Workflow

### 1. Smart Contract Development

```bash
cd contracts
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.ts --network base-sepolia
```

### 2. Mobile App Development

```bash
cd mobile-client
npm start
# Make changes to React Native code
# Hot reload will update the app
```

### 3. Rust Core Development

```bash
cd rust-core
cargo test
wasm-pack build --target web
```

## 🐛 Troubleshooting

### Common Issues

1. **Rust Build Errors**
   ```bash
   # Update Rust
   rustup update
   
   # Clean and rebuild
   cd rust-core
   cargo clean
   wasm-pack build --target web
   ```

2. **Contract Deployment Failures**
   ```bash
   # Check network configuration
   npx hardhat console --network base-sepolia
   
   # Verify private key in .env
   # Ensure sufficient ETH for deployment
   ```

3. **Mobile App Issues**
   ```bash
   # Clear Expo cache
   npx expo start --clear
   
   # Reset Metro bundler
   npx expo start --reset-cache
   ```

4. **TypeScript Errors**
   ```bash
   # Install missing types
   npm install --save-dev @types/react @types/react-native
   
   # Check tsconfig.json configuration
   ```

### Network Issues

- **Base Sepolia**: Ensure you have testnet ETH
- **Lisk Sepolia**: Verify network configuration
- **RPC Endpoints**: Check if endpoints are accessible

## 📊 Monitoring

### 1. Transaction Monitoring

- Use Base Sepolia explorer: https://sepolia.basescan.org/
- Use Lisk explorer: https://explorer.sepolia-api.lisk.com/
- Monitor transaction status in the mobile app

### 2. Contract Monitoring

- Verify contract deployment
- Check contract events
- Monitor gas usage

### 3. Wallet Monitoring

- Track parent wallet balance
- Monitor child wallet distributions
- Verify deterministic behavior

## 🔒 Security Checklist

- [ ] Private keys stored securely
- [ ] Seed phrases never logged
- [ ] Contract addresses verified
- [ ] Transaction parameters validated
- [ ] Gas limits appropriate
- [ ] Error handling comprehensive
- [ ] Input validation implemented

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the test files for examples
3. Check the README.md for detailed documentation
4. Create an issue with detailed error information

## 🎯 Next Steps

After successful setup:

1. **Test with small amounts** on testnet
2. **Verify all 100 child wallets** receive funds
3. **Test deterministic behavior** with same seed
4. **Deploy to mainnet** when ready
5. **Add additional features** as needed

---

**Happy splitting! 🎉** 