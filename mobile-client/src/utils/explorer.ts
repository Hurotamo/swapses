import * as Linking from 'expo-linking';

const EXPLORER_URLS = {
  'base-sepolia': 'https://sepolia.basescan.org',
  'base-mainnet': 'https://basescan.org',
  'ethereum': 'https://etherscan.io',
  'sepolia': 'https://sepolia.etherscan.io',
};

export const openExplorer = async (address: string, network: string = 'base-sepolia'): Promise<boolean> => {
  try {
    const baseUrl = EXPLORER_URLS[network as keyof typeof EXPLORER_URLS] || EXPLORER_URLS['base-sepolia'];
    const url = `${baseUrl}/address/${address}`;
    
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return true;
    } else {
      console.error('Cannot open URL:', url);
      return false;
    }
  } catch (error) {
    console.error('Failed to open explorer:', error);
    return false;
  }
};

export const openTransactionExplorer = async (txHash: string, network: string = 'base-sepolia'): Promise<boolean> => {
  try {
    const baseUrl = EXPLORER_URLS[network as keyof typeof EXPLORER_URLS] || EXPLORER_URLS['base-sepolia'];
    const url = `${baseUrl}/tx/${txHash}`;
    
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return true;
    } else {
      console.error('Cannot open URL:', url);
      return false;
    }
  } catch (error) {
    console.error('Failed to open transaction explorer:', error);
    return false;
  }
}; 