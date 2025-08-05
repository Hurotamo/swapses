import { useState, useEffect, useCallback } from 'react';
import { WalletService, WalletInfo, SplitResult } from '../services/WalletService';

interface WalletListItem {
  index: number;
  type: 'parent' | 'child';
  wallet: WalletInfo;
  balance: string;
}

interface UseWalletsReturn {
  wallets: WalletListItem[];
  isLoading: boolean;
  error: string | null;
  refreshWallets: () => Promise<void>;
  createSplitOperation: (mnemonic: string) => Promise<SplitResult>;
  getWalletBalance: (address: string) => Promise<string>;
}

export const useWallets = (): UseWalletsReturn => {
  const [wallets, setWallets] = useState<WalletListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getWalletBalance = useCallback(async (address: string): Promise<string> => {
    try {
      return await WalletService.getWalletBalance(address);
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      return '0';
    }
  }, []);

  const createSplitOperation = useCallback(async (mnemonic: string): Promise<SplitResult> => {
    try {
      return WalletService.createSplitOperation(mnemonic);
    } catch (error) {
      throw new Error('Failed to create split operation');
    }
  }, []);

  const loadWallets = useCallback(async (splitResult?: SplitResult) => {
    try {
      setIsLoading(true);
      setError(null);

      // If no split result provided, create a demo one
      const result = splitResult || WalletService.createSplitOperation(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
      );

      const walletList: WalletListItem[] = [];

      // Add parent wallet
      const parentBalance = await getWalletBalance(result.parentWallet.address);
      walletList.push({
        index: 0,
        type: 'parent',
        wallet: result.parentWallet,
        balance: parentBalance,
      });

      // Add child wallets (limit to first 20 for performance)
      const childWallets = result.childWallets.slice(0, 20);
      for (let i = 0; i < childWallets.length; i++) {
        const childWallet = childWallets[i];
        const childBalance = await getWalletBalance(childWallet.address);
        
        walletList.push({
          index: i + 1,
          type: 'child',
          wallet: childWallet,
          balance: childBalance,
        });
      }

      setWallets(walletList);
    } catch (error) {
      setError('Failed to load wallets');
      console.error('Error loading wallets:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getWalletBalance]);

  const refreshWallets = useCallback(async () => {
    await loadWallets();
  }, [loadWallets]);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  return {
    wallets,
    isLoading,
    error,
    refreshWallets,
    createSplitOperation,
    getWalletBalance,
  };
}; 