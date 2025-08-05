import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Button, Card, Title, Paragraph, Text, FAB, Chip, List } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WalletService } from '../src/services/WalletService';
import { SecurityService } from '../src/services/SecurityService';

export default function WalletDashboard() {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [isWalletLocked, setIsWalletLocked] = useState(false);

  useEffect(() => {
    checkWalletStatus();
  }, []);

  const checkWalletStatus = async () => {
    try {
      setIsLoading(true);
      
      // Check if wallet is locked
      const locked = await SecurityService.isWalletLocked();
      setIsWalletLocked(locked);
      
      if (!locked) {
        await loadWalletData();
      }
    } catch (error) {
      console.error('Failed to check wallet status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWalletData = async () => {
    try {
      const walletData = await SecurityService.getWalletData();
      
      if (walletData) {
        // Get wallet address from seed phrase
        const wallet = WalletService.deriveParentWallet(walletData.seedPhrase);
        setWalletAddress(wallet.address);
        
        // Get balance
        const balance = await WalletService.getWalletBalance(wallet.address);
        setWalletBalance(balance);
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    }
  };

  const handleUnlockWallet = async () => {
    try {
      const config = await SecurityService.getSecurityConfig();
      
      if (config.biometricsEnabled) {
        const authenticated = await SecurityService.authenticateWithBiometrics();
        if (authenticated) {
          setIsWalletLocked(false);
          await loadWalletData();
        }
      } else if (config.pinEnabled) {
        router.push('/verify-pin');
      } else {
        // No security enabled, just unlock
        setIsWalletLocked(false);
        await loadWalletData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to unlock wallet');
    }
  };

  const handleCreateWallet = () => {
    router.push('/seed-input');
  };

  const handleImportWallet = () => {
    router.push('/seed-input');
  };

  const handleSend = () => {
    if (isWalletLocked) {
      Alert.alert('Wallet Locked', 'Please unlock your wallet first');
      return;
    }
    router.push('/send');
  };

  const handleReceive = () => {
    if (isWalletLocked) {
      Alert.alert('Wallet Locked', 'Please unlock your wallet first');
      return;
    }
    router.push('/receive');
  };

  const handleViewWallets = () => {
    router.push('/wallet-list');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isWalletLocked) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.lockedContainer}>
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.lockedTitle}>🔒 Wallet Locked</Title>
              <Paragraph style={styles.lockedText}>
                Your wallet is locked for security. Please authenticate to continue.
              </Paragraph>
              <Button
                mode="contained"
                onPress={handleUnlockWallet}
                style={styles.unlockButton}
                icon="lock-open"
              >
                Unlock Wallet
              </Button>
            </Card.Content>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (!walletAddress) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.welcomeTitle}>Welcome to DWSS Wallet</Title>
              <Paragraph style={styles.welcomeText}>
                Your self-custodial wallet for secure ETH transactions
              </Paragraph>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title>Get Started</Title>
              <Paragraph>Create a new wallet or import an existing one</Paragraph>
              
              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  onPress={handleCreateWallet}
                  style={styles.primaryButton}
                  icon="plus"
                >
                  Create New Wallet
                </Button>
                
                <Button
                  mode="outlined"
                  onPress={handleImportWallet}
                  style={styles.secondaryButton}
                  icon="import"
                >
                  Import Wallet
                </Button>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title>Features</Title>
              <List.Item
                title="Self-Custodial"
                description="You control your private keys"
                left={(props: any) => <List.Icon {...props} icon="shield" />}
              />
              <List.Item
                title="Secure"
                description="Biometric and PIN protection"
                left={(props: any) => <List.Icon {...props} icon="lock" />}
              />
              <List.Item
                title="Multi-Network"
                description="Support for Base and other networks"
                left={(props: any) => <List.Icon {...props} icon="web" />}
              />
            </Card.Content>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Wallet Balance</Title>
            <Text style={styles.balanceAmount}>
              {parseFloat(walletBalance).toFixed(6)} ETH
            </Text>
            <Chip mode="outlined" style={styles.balanceChip}>
              Available
            </Chip>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Wallet Address</Title>
            <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
              {walletAddress}
            </Text>
            <Chip mode="outlined" style={styles.networkChip}>
              Base Sepolia
            </Chip>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Quick Actions</Title>
            <View style={styles.actionContainer}>
              <Button
                mode="contained"
                onPress={handleSend}
                style={styles.actionButton}
                icon="send"
              >
                Send
              </Button>
              
              <Button
                mode="contained"
                onPress={handleReceive}
                style={styles.actionButton}
                icon="download"
              >
                Receive
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Wallet Management</Title>
            <List.Item
              title="View All Wallets"
              description="Manage your wallet collection"
              left={(props: any) => <List.Icon {...props} icon="wallet" />}
              onPress={handleViewWallets}
            />
            <List.Item
              title="Settings"
              description="Security and network settings"
              left={(props: any) => <List.Icon {...props} icon="cog" />}
              onPress={handleSettings}
            />
          </Card.Content>
        </Card>
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/seed-input')}
        label="New Wallet"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  lockedTitle: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  lockedText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  unlockButton: {
    marginTop: 8,
  },
  welcomeTitle: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    marginTop: 16,
  },
  primaryButton: {
    marginBottom: 12,
  },
  secondaryButton: {
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'center',
    marginVertical: 8,
  },
  balanceChip: {
    alignSelf: 'center',
    backgroundColor: '#e3f2fd',
  },
  addressText: {
    fontFamily: 'monospace',
    fontSize: 14,
    marginVertical: 8,
    textAlign: 'center',
  },
  networkChip: {
    alignSelf: 'center',
    marginTop: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
}); 