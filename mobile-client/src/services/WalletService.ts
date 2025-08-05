import { ethers } from 'ethers';

export interface WalletInfo {
  address: string;
  privateKey: string;
  publicKey: string;
}

export interface SplitResult {
  parentWallet: WalletInfo;
  childWallets: WalletInfo[];
}

export class WalletService {
  private static provider: ethers.JsonRpcProvider;

  static initialize(providerUrl: string = 'https://sepolia.base.org') {
    this.provider = new ethers.JsonRpcProvider(providerUrl);
  }

  static async generateMnemonic(): Promise<string> {
    // Generate a random mnemonic using ethers
    const wallet = ethers.Wallet.createRandom();
    return wallet.mnemonic?.phrase || '';
  }

  static validateMnemonic(mnemonic: string): boolean {
    try {
      ethers.Wallet.fromPhrase(mnemonic);
      return true;
    } catch {
      return false;
    }
  }

  static deriveParentWallet(mnemonic: string): WalletInfo {
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
    };
  }

  static deriveChildWallets(mnemonic: string, count: number = 100): WalletInfo[] {
    const wallets: WalletInfo[] = [];
    const masterWallet = ethers.Wallet.fromPhrase(mnemonic);

    for (let i = 0; i < count; i++) {
      // Derive child wallet using HD path: m/44'/60'/0'/0/{i}
      const childWallet = masterWallet.deriveChild(i);
      
      wallets.push({
        address: childWallet.address,
        privateKey: childWallet.privateKey,
        publicKey: childWallet.publicKey,
      });
    }

    return wallets;
  }

  static createSplitOperation(mnemonic: string): SplitResult {
    const parentWallet = this.deriveParentWallet(mnemonic);
    const childWallets = this.deriveChildWallets(mnemonic, 100);

    return {
      parentWallet,
      childWallets,
    };
  }

  static async getWalletBalance(address: string): Promise<string> {
    if (!this.provider) {
      this.initialize();
    }

    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      return '0';
    }
  }

  static async estimateGasPrice(): Promise<string> {
    if (!this.provider) {
      this.initialize();
    }

    try {
      const gasPrice = await this.provider.getFeeData();
      return gasPrice.gasPrice ? ethers.formatUnits(gasPrice.gasPrice, 'gwei') : '0';
    } catch (error) {
      console.error('Failed to estimate gas price:', error);
      return '0';
    }
  }
} 