import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Button, Card, Title, Paragraph, Text, ProgressBar } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WalletService, SplitResult } from '../src/services/WalletService';
import { TransactionService } from '../src/services/TransactionService';

export default function SplitWalletScreen() {
  const { seedPhrase } = useLocalSearchParams<{ seedPhrase: string }>();
  const [splitResult, setSplitResult] = useState<SplitResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parentBalance, setParentBalance] = useState('0');
  const [gasPrice, setGasPrice] = useState('0');
  const [splitAmount, setSplitAmount] = useState('0.5'); // Default 0.5 ETH

  useEffect(() => {
    if (seedPhrase) {
      initializeSplit();
    }
  }, [seedPhrase]);

  const initializeSplit = async () => {
    try {
      setIsLoading(true);
      
      // Create split operation
      const result = WalletService.createSplitOperation(seedPhrase);
      setSplitResult(result);

      // Get parent wallet balance
      const balance = await WalletService.getWalletBalance(result.parentWallet.address);
      setParentBalance(balance);

      // Get gas price
      const gas = await WalletService.estimateGasPrice();
      setGasPrice(gas);

    } catch (error) {
      Alert.alert('Error', 'Failed to initialize split operation');
    } finally {
      setIsLoading(false);
    }
  };

  const executeSplit = async () => {
    if (!splitResult) return;

    try {
      setIsLoading(true);

      // Validate balance
      const balance = parseFloat(parentBalance);
      const amount = parseFloat(splitAmount);
      
      if (balance < amount) {
        Alert.alert('Error', 'Insufficient balance in parent wallet');
        return;
      }

      // Execute split transaction
      const txHash = await TransactionService.executeSplit(
        splitResult.parentWallet,
        splitResult.childWallets,
        splitAmount
      );

      Alert.alert(
        'Success', 
        `Split transaction submitted!\nHash: ${txHash}`,
        [
          {
            text: 'View Wallets',
            onPress: () => router.push('/wallet-list')
          },
          { text: 'OK' }
        ]
      );

    } catch (error) {
      Alert.alert('Error', 'Failed to execute split transaction');
    } finally {
      setIsLoading(false);
    }
  };

  if (!splitResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              <Title>Initializing...</Title>
              <ProgressBar indeterminate style={styles.progress} />
            </Card.Content>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Parent Wallet</Title>
            <Text style={styles.address}>{splitResult.parentWallet.address}</Text>
            <Text style={styles.balance}>Balance: {parentBalance} ETH</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Split Configuration</Title>
            <Paragraph>
              Amount to split: {splitAmount} ETH{'\n'}
              Number of child wallets: 100{'\n'}
              Amount per child: {(parseFloat(splitAmount) / 100).toFixed(6)} ETH{'\n'}
              Gas price: {gasPrice} Gwei
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Child Wallets Preview</Title>
            <Paragraph>
              First 5 child wallets:
            </Paragraph>
            {splitResult.childWallets.slice(0, 5).map((wallet, index) => (
              <Text key={index} style={styles.childAddress}>
                {index + 1}. {wallet.address}
              </Text>
            ))}
            <Text style={styles.moreText}>... and 95 more</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Transaction Details</Title>
            <Paragraph>
              • Total amount: {splitAmount} ETH{'\n'}
              • Gas estimate: ~500,000{'\n'}
              • Network: Base Sepolia{'\n'}
              • Contract: WalletSplitter
            </Paragraph>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={executeSplit}
            loading={isLoading}
            style={styles.splitButton}
            icon="split"
            disabled={parseFloat(parentBalance) < parseFloat(splitAmount)}
          >
            Execute Split
          </Button>

          <Button
            mode="outlined"
            onPress={() => router.push('/wallet-list')}
            style={styles.viewButton}
            icon="list"
          >
            View All Wallets
          </Button>
        </View>
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
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  address: {
    fontFamily: 'monospace',
    fontSize: 12,
    marginVertical: 8,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
  },
  balance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  childAddress: {
    fontFamily: 'monospace',
    fontSize: 10,
    marginVertical: 2,
    backgroundColor: '#f0f0f0',
    padding: 4,
    borderRadius: 2,
  },
  moreText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  progress: {
    marginTop: 16,
  },
  buttonContainer: {
    marginBottom: 32,
  },
  splitButton: {
    marginBottom: 12,
  },
  viewButton: {
    marginBottom: 8,
  },
}); 