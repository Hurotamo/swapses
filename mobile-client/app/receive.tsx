import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Button, Card, Title, Paragraph, Text, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { SecurityService } from '../src/services/SecurityService';
import { WalletService } from '../src/services/WalletService';
import { copyToClipboard } from '../src/utils/clipboard';
import { openExplorer } from '../src/utils/explorer';

export default function ReceiveScreen() {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setIsLoading(true);
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
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAddress = async () => {
    const success = await copyToClipboard(walletAddress);
    if (success) {
      Alert.alert('Success', 'Address copied to clipboard');
    } else {
      Alert.alert('Error', 'Failed to copy address');
    }
  };

  const handleViewExplorer = async () => {
    await openExplorer(walletAddress);
  };

  const generateQRData = () => {
    return `ethereum:${walletAddress}`;
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

  if (!walletAddress) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>No wallet found. Please create or import a wallet first.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Receive ETH</Title>
            <Paragraph>Share your wallet address to receive ETH</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Wallet Address</Title>
            <View style={styles.addressContainer}>
              <Text style={styles.addressText} numberOfLines={2} ellipsizeMode="middle">
                {walletAddress}
              </Text>
            </View>
            
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={handleCopyAddress}
                style={styles.button}
                icon="content-copy"
              >
                Copy Address
              </Button>
              
              <Button
                mode="outlined"
                onPress={handleViewExplorer}
                style={styles.button}
                icon="open-in-new"
              >
                View on Explorer
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>QR Code</Title>
            <Paragraph>Scan this QR code to get the wallet address</Paragraph>
            
            <View style={styles.qrContainer}>
              <QRCode
                value={generateQRData()}
                size={200}
                color="black"
                backgroundColor="white"
              />
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Wallet Balance</Title>
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceAmount}>
                {parseFloat(walletBalance).toFixed(6)} ETH
              </Text>
              <Chip mode="outlined" style={styles.balanceChip}>
                Available
              </Chip>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Network Information</Title>
            <View style={styles.networkInfo}>
              <View style={styles.networkRow}>
                <Text>Network:</Text>
                <Text style={styles.networkValue}>Base Sepolia</Text>
              </View>
              <View style={styles.networkRow}>
                <Text>Chain ID:</Text>
                <Text style={styles.networkValue}>84532</Text>
              </View>
              <View style={styles.networkRow}>
                <Text>Currency:</Text>
                <Text style={styles.networkValue}>ETH</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  addressContainer: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  addressText: {
    fontFamily: 'monospace',
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  balanceChip: {
    backgroundColor: '#e3f2fd',
  },
  networkInfo: {
    marginTop: 8,
  },
  networkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  networkValue: {
    fontWeight: 'bold',
  },
}); 