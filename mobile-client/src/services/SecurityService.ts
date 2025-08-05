import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export interface SecurityConfig {
  biometricsEnabled: boolean;
  pinEnabled: boolean;
  autoLockTimeout: number; // in minutes
}

export class SecurityService {
  private static readonly WALLET_KEY = 'wallet_private_key';
  private static readonly SEED_PHRASE_KEY = 'wallet_seed_phrase';
  private static readonly SECURITY_CONFIG_KEY = 'security_config';
  private static readonly PIN_KEY = 'wallet_pin_hash';

  static async isBiometricsAvailable(): Promise<boolean> {
    try {
      const result = await SecureStore.isAvailableAsync();
      return result;
    } catch {
      return false;
    }
  }

  static async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const result = await SecureStore.authenticateAsync(
        'Authenticate to access your wallet',
        {
          fallbackLabel: 'Use PIN',
          cancelLabel: 'Cancel',
        }
      );
      
      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      return result.success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  static async storeWalletData(privateKey: string, seedPhrase: string): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(this.WALLET_KEY, privateKey);
      await SecureStore.setItemAsync(this.SEED_PHRASE_KEY, seedPhrase);
      return true;
    } catch (error) {
      console.error('Failed to store wallet data:', error);
      return false;
    }
  }

  static async getWalletData(): Promise<{ privateKey: string; seedPhrase: string } | null> {
    try {
      const privateKey = await SecureStore.getItemAsync(this.WALLET_KEY);
      const seedPhrase = await SecureStore.getItemAsync(this.SEED_PHRASE_KEY);
      
      if (!privateKey || !seedPhrase) {
        return null;
      }
      
      return { privateKey, seedPhrase };
    } catch (error) {
      console.error('Failed to retrieve wallet data:', error);
      return null;
    }
  }

  static async clearWalletData(): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(this.WALLET_KEY);
      await SecureStore.deleteItemAsync(this.SEED_PHRASE_KEY);
      await SecureStore.deleteItemAsync(this.PIN_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear wallet data:', error);
      return false;
    }
  }

  static async setSecurityConfig(config: SecurityConfig): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(this.SECURITY_CONFIG_KEY, JSON.stringify(config));
      return true;
    } catch (error) {
      console.error('Failed to set security config:', error);
      return false;
    }
  }

  static async getSecurityConfig(): Promise<SecurityConfig> {
    try {
      const config = await SecureStore.getItemAsync(this.SECURITY_CONFIG_KEY);
      if (config) {
        return JSON.parse(config);
      }
    } catch (error) {
      console.error('Failed to get security config:', error);
    }
    
    // Default config
    return {
      biometricsEnabled: false,
      pinEnabled: false,
      autoLockTimeout: 5, // 5 minutes
    };
  }

  static async setPin(pin: string): Promise<boolean> {
    try {
      const pinHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        pin
      );
      await SecureStore.setItemAsync(this.PIN_KEY, pinHash);
      return true;
    } catch (error) {
      console.error('Failed to set PIN:', error);
      return false;
    }
  }

  static async verifyPin(pin: string): Promise<boolean> {
    try {
      const storedPinHash = await SecureStore.getItemAsync(this.PIN_KEY);
      if (!storedPinHash) return false;
      
      const inputPinHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        pin
      );
      
      return storedPinHash === inputPinHash;
    } catch (error) {
      console.error('Failed to verify PIN:', error);
      return false;
    }
  }

  static async generateSecureRandomBytes(length: number): Promise<Uint8Array> {
    return await Crypto.getRandomBytesAsync(length);
  }

  static async hashData(data: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
  }

  static async isWalletLocked(): Promise<boolean> {
    try {
      const config = await this.getSecurityConfig();
      const walletData = await this.getWalletData();
      
      if (!walletData) return true;
      
      if (config.biometricsEnabled) {
        return !(await this.authenticateWithBiometrics());
      }
      
      if (config.pinEnabled) {
        // For PIN-based authentication, we'd need to implement a PIN input UI
        // For now, return false (not locked)
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check wallet lock status:', error);
      return true;
    }
  }

  static async lockWallet(): Promise<boolean> {
    try {
      // Clear sensitive data from memory
      await SecureStore.deleteItemAsync(this.WALLET_KEY);
      await SecureStore.deleteItemAsync(this.SEED_PHRASE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to lock wallet:', error);
      return false;
    }
  }
} 