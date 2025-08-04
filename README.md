# 🔧 DWSS - Deterministic Wallet Splitter System

A secure, deterministic ETH wallet splitting system that allows users to split their parent wallet into 100 deterministic child wallets using Rust cryptography and React Native.

## 🌐 System Overview

```mermaid
graph TD
    A[User Generates Seed Phrase] --> B[Derive 1 Parent Wallet Address]
    B --> C[User Funds Parent Wallet with ETH]
    C --> D[User Initiates "Split" via Client App]
    D --> E[Generate 100 Deterministic Child Wallet Addresses]
    E --> F[Client Constructs TX: Split ETH Equally Across 100 Child Wallets]
    F --> G{Sign TX with Parent Wallet?}
    G -->|Yes| H[Send Transaction to Base/Lisk Blockchain]
    G -->|No| I[Abort - Signature Required]
    H --> J{Transaction Mined?}
    J -->|Yes| K[User Controls 101 Wallets (1 Parent + 100 Children)]
    J -->|No| L[Retry or Abort]
    L -->|Retry| H
    L -->|Abort| I
```

## 🛠 Tech Stack

| Layer           | Technology             | Purpose                              |
| --------------- | ---------------------- | ------------------------------------ |
| Cryptography    | Rust                   | HD Wallet derivation, BIP39/44 logic |
| Frontend        | React Native (Expo Go) | Cross-platform UI                    |
| Smart Contract  | Solidity               | ETH Splitting & Validation           |
| Blockchain      | Base Sepolia, Lisk     | Deployment Networks                  |
| Mobile Runtime  | iOS / Android          | Distribution targets                 |
| Wallet Handling | Ethers.js (React)      | Wallet interaction on client side    |

## 📁 Project Structure

```
dwss-project/
├── contracts/                       # Solidity Contracts
│   ├── contracts/WalletSplitter.sol
│   ├── scripts/deploy.ts
│   └── hardhat.config.ts
├── rust-core/                       # Rust crypto logic compiled to WASM
│   ├── src/
│   │   ├── lib.rs                   # Entrypoint
│   │   ├── bip39.rs
│   │   ├── hd_wallet.rs
│   │   └── utils.rs
│   └── Cargo.toml
├── mobile-client/                  # React Native App (Expo)
│   ├── App.tsx
│   ├── app/
│   │   ├── index.tsx               # Home screen
│   │   ├── split-wallet.tsx        # Split operation screen
│   │   └── wallet-list.tsx         # Wallet list screen
│   ├── src/
│   │   ├── services/
│   │   │   ├── WalletService.ts
│   │   │   └── TransactionService.ts
│   │   └── utils/
│   └── app.json
├── scripts/                        # Deployment & Automation
├── .env
├── README.md
└── package.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Rust 1.70+
- Expo CLI
- Hardhat

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dwss-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd contracts && npm install
   cd ../mobile-client && npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build Rust core**
   ```bash
   cd rust-core
   wasm-pack build --target web
   ```

### Development

1. **Start the mobile app**
   ```bash
   cd mobile-client
   npm start
   ```

2. **Deploy smart contracts**
   ```bash
   cd contracts
   npm run deploy:base    # Deploy to Base Sepolia
   npm run deploy:lisk    # Deploy to Lisk Sepolia
   ```

3. **Test the system**
   ```bash
   npm test
   ```

## 🔐 Core Features

### 1. **Rust WASM Module (`rust-core`)**
- Generate mnemonic (BIP39)
- Derive HD Wallets (BIP32/BIP44)
- Create 100 deterministic child wallets
- Export functions to React Native via WASM

### 2. **React Native (Expo Go) UI**
- Input seed phrase → display parent address
- Trigger split logic → fetch derived children
- Send signed transaction to smart contract
- Show progress (transaction pending/mined)
- Use Phantom/Metamask via deep link or WalletConnect

### 3. **Smart Contract (Solidity)**
- Accept batch ETH deposit
- Map parent wallet to child set
- Prevent double-split
- Emit event on success

## ✅ Smart Contract Logic

```solidity
function splitEther(address[] memory children) public payable {
    require(children.length == 100, "Must be 100 child addresses");
    uint256 splitAmount = msg.value / 100;
    for (uint i = 0; i < children.length; i++) {
        payable(children[i]).transfer(splitAmount);
    }
    emit SplitSuccess(msg.sender, children);
}
```

## 📦 Libraries & Tooling

- **Rust Crypto:** `bip39`, `hdwallet`, `rand`, `sha2`, `wasm-bindgen`
- **Solidity:** >=0.8.0 (SafeMath not needed)
- **React Native:** `ethers.js`, `react-native-mmkv`, `expo-random`, `expo-router`
- **Testing:** `hardhat`, `jest`, `react-native-testing-library`

## 🔧 Configuration

### Environment Variables (.env)

```env
# Blockchain Networks
BASE_SEPOLIA_URL=https://sepolia.base.org
LISK_SEPOLIA_URL=https://rpc.sepolia-api.lisk.com

# Deployment
PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key

# Contract Addresses (after deployment)
WALLET_SPLITTER_BASE=0x...
WALLET_SPLITTER_LISK=0x...
```

## 🧪 Testing

```bash
# Test smart contracts
cd contracts && npm test

# Test mobile app
cd mobile-client && npm test

# Test Rust core
cd rust-core && cargo test
```

## 🚀 Deployment

### Smart Contracts

1. **Base Sepolia**
   ```bash
   cd contracts
   npm run deploy:base
   ```

2. **Lisk Sepolia**
   ```bash
   cd contracts
   npm run deploy:lisk
   ```

### Mobile App

1. **Build for production**
   ```bash
   cd mobile-client
   eas build --platform all
   ```

2. **Publish to stores**
   ```bash
   eas submit --platform all
   ```

## 🔒 Security Considerations

- **Seed Phrase Security:** Never store seed phrases in plain text
- **Private Key Handling:** Use secure storage (expo-secure-store)
- **Transaction Validation:** Verify all transaction parameters
- **Gas Estimation:** Always estimate gas before transactions
- **Error Handling:** Comprehensive error handling for all operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the test files for examples

---

**Built with ❤️ by the DWSS Team** 