# DWSS Mobile Wallet

A self-custodial mobile wallet application built with Expo and React Native, featuring secure ETH transactions, biometric authentication, and multi-network support.

## Features

### 🔐 Security
- **Self-Custodial**: You control your private keys
- **Biometric Authentication**: Fingerprint and Face ID support
- **PIN Protection**: 6-digit PIN for additional security
- **Secure Storage**: Encrypted storage using Expo SecureStore
- **Auto-Lock**: Configurable timeout for automatic wallet locking

### 💰 Wallet Management
- **Create/Import Wallets**: Generate new wallets or import existing ones
- **Multi-Wallet Support**: Manage multiple wallets in one app
- **Balance Tracking**: Real-time ETH balance monitoring
- **Transaction History**: View and track all transactions

### 🌐 Network Support
- **Base Sepolia**: Testnet support for Base network
- **Extensible**: Easy to add more networks
- **Network Switching**: Configure different networks

### 📱 User Experience
- **QR Code Scanning**: Scan addresses and transaction data
- **QR Code Generation**: Share your wallet address via QR
- **Modern UI**: Clean, intuitive interface with Material Design
- **Dark/Light Mode**: Automatic theme switching

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mobile-client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Expo CLI globally**
   ```bash
   npm install -g @expo/cli
   ```

4. **Set up EAS CLI**
   ```bash
   npm install -g @eas/cli
   eas login
   ```

## Development

### Start Development Server
```bash
npm start
```

### Run on iOS Simulator
```bash
npm run ios
```

### Run on Android Emulator
```bash
npm run android
```

### Run on Physical Device
1. Install Expo Go from App Store/Google Play
2. Scan the QR code from the development server
3. The app will load on your device

## Building for Production

### Configure EAS
1. Update `eas.json` with your project settings
2. Update `app.json` with your app identifiers

### Build for Android
```bash
npm run build:android
```

### Build for iOS
```bash
npm run build:ios
```

### Submit to App Stores
```bash
# Android
npm run submit:android

# iOS
npm run submit:ios
```

## Project Structure

```
mobile-client/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout configuration
│   ├── index.tsx          # Main dashboard
│   ├── send.tsx           # Send transaction screen
│   ├── receive.tsx        # Receive screen
│   ├── settings.tsx       # Settings screen
│   └── ...                # Other screens
├── src/
│   ├── components/        # Reusable components
│   │   ├── WalletCard.tsx
│   │   ├── QRScanner.tsx
│   │   └── PINInput.tsx
│   ├── services/          # Business logic
│   │   ├── WalletService.ts
│   │   ├── SecurityService.ts
│   │   └── TransactionService.ts
│   ├── hooks/             # Custom React hooks
│   │   └── useWallets.ts
│   └── utils/             # Utility functions
│       ├── clipboard.ts
│       └── explorer.ts
├── assets/                # Images and static assets
├── app.json              # Expo configuration
├── eas.json              # EAS build configuration
└── package.json          # Dependencies
```

## Key Components

### SecurityService
Handles all security-related functionality:
- Biometric authentication
- PIN management
- Secure storage
- Wallet locking/unlocking

### WalletService
Manages wallet operations:
- Wallet creation and import
- Balance checking
- Address derivation
- Network interactions

### TransactionService
Handles blockchain transactions:
- Sending ETH
- Gas estimation
- Transaction status tracking
- Contract interactions

## Security Features

### Biometric Authentication
- Uses device biometrics (fingerprint/Face ID)
- Fallback to PIN if biometrics fail
- Configurable in settings

### PIN Protection
- 6-digit numeric PIN
- Secure hashing using SHA-256
- Configurable timeout

### Secure Storage
- Uses Expo SecureStore for encrypted storage
- Private keys never stored in plain text
- Automatic data clearing on app uninstall

## Network Configuration

The app is configured for Base Sepolia testnet by default. To change networks:

1. Update `WalletService.ts` provider URL
2. Update `TransactionService.ts` provider URL
3. Update network information in UI components

## Testing

### Run Tests
```bash
npm test
```

### Test on Device
1. Build development client
2. Install on device
3. Test all features thoroughly

## Troubleshooting

### Common Issues

**Metro bundler issues**
```bash
npx expo start --clear
```

**iOS build issues**
```bash
cd ios && pod install && cd ..
```

**Android build issues**
```bash
npx expo run:android --clear
```

**Permission issues**
- Ensure camera permissions are granted
- Check biometric permissions in device settings

### Debug Mode
Enable debug mode in settings to see detailed logs and error messages.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting section

## Roadmap

- [ ] Multi-currency support
- [ ] DeFi integration
- [ ] NFT support
- [ ] Cross-chain bridges
- [ ] Advanced security features
- [ ] Offline mode
- [ ] Backup/restore functionality 