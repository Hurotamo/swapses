import { ethers } from 'ethers';
import { WalletInfo } from './WalletService';

// WalletSplitter contract ABI (simplified for the main function)
const WALLET_SPLITTER_ABI = [
  "function splitEther(address[] memory children) public payable",
  "function getSplitInfo(address parent) external view returns (address[] memory children, uint256 amount, bool hasSplitStatus)",
  "event SplitInitiated(address indexed parentWallet, address[] childWallets, uint256 totalAmount, uint256 timestamp)",
  "event SplitCompleted(address indexed parentWallet, uint256 splitAmount, uint256 timestamp)"
];

export class TransactionService {
  private static provider: ethers.JsonRpcProvider;
  private static contractAddress = '0x0000000000000000000000000000000000000000'; // Will be set after deployment

  static initialize(providerUrl: string = 'https://sepolia.base.org') {
    this.provider = new ethers.JsonRpcProvider(providerUrl);
  }

  static setContractAddress(address: string) {
    this.contractAddress = address;
  }

  static async sendTransaction(
    privateKey: string,
    toAddress: string,
    amount: string,
    gasPrice: string,
    gasLimit: string
  ): Promise<string> {
    if (!this.provider) {
      this.initialize();
    }

    try {
      // Create wallet instance from private key
      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      // Convert amount to wei
      const amountWei = ethers.parseEther(amount);
      
      // Convert gas price to wei
      const gasPriceWei = ethers.parseUnits(gasPrice, 'gwei');
      
      // Create transaction
      const tx = await wallet.sendTransaction({
        to: toAddress,
        value: amountWei,
        gasLimit: parseInt(gasLimit),
        gasPrice: gasPriceWei,
      });

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      return receipt.hash;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw new Error('Failed to send transaction');
    }
  }

  static async executeSplit(
    parentWallet: WalletInfo,
    childWallets: WalletInfo[],
    amount: string
  ): Promise<string> {
    if (!this.provider) {
      this.initialize();
    }

    // Create wallet instance from private key
    const wallet = new ethers.Wallet(parentWallet.privateKey, this.provider);
    
    // Create contract instance
    const contract = new ethers.Contract(
      this.contractAddress,
      WALLET_SPLITTER_ABI,
      wallet
    );

    // Prepare child addresses array
    const childAddresses = childWallets.map(w => w.address);

    // Convert amount to wei
    const amountWei = ethers.parseEther(amount);

    // Execute split transaction
    const tx = await contract.splitEther(childAddresses, {
      value: amountWei,
      gasLimit: 500000, // Estimated gas limit
    });

    // Wait for transaction to be mined
    const receipt = await tx.wait();

    return receipt.hash;
  }

  static async getSplitInfo(parentAddress: string): Promise<{
    children: string[];
    amount: string;
    hasSplit: boolean;
  }> {
    if (!this.provider) {
      this.initialize();
    }

    const contract = new ethers.Contract(
      this.contractAddress,
      WALLET_SPLITTER_ABI,
      this.provider
    );

    const [children, amount, hasSplit] = await contract.getSplitInfo(parentAddress);

    return {
      children,
      amount: ethers.formatEther(amount),
      hasSplit,
    };
  }

  static async estimateGas(
    childAddresses: string[],
    amount: string
  ): Promise<string> {
    if (!this.provider) {
      this.initialize();
    }

    const contract = new ethers.Contract(
      this.contractAddress,
      WALLET_SPLITTER_ABI,
      this.provider
    );

    const amountWei = ethers.parseEther(amount);
    const gasEstimate = await contract.splitEther.estimateGas(childAddresses, {
      value: amountWei,
    });

    return gasEstimate.toString();
  }

  static async getTransactionStatus(txHash: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed';
    blockNumber?: number;
    gasUsed?: string;
  }> {
    if (!this.provider) {
      this.initialize();
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return { status: 'pending' };
      }

      if (receipt.status === 1) {
        return {
          status: 'confirmed',
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
        };
      } else {
        return { status: 'failed' };
      }
    } catch (error) {
      return { status: 'failed' };
    }
  }
} 