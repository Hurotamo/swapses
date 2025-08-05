import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Button, Card, Title, Paragraph, TextInput, Text, Chip } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WalletService } from '../src/services/WalletService';
import { SecurityService } from '../src/services/SecurityService';
import { TransactionService } from '../src/services/TransactionService';

export default function SendScreen() {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [gasPrice, setGasPrice] = useState('');
  const [gasLimit, setGasLimit] = useState('21000');
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState('0');
  const [estimatedFee, setEstimatedFee] = useState('0');

  useEffect(() => {
    loadWalletData();
  }, []);

  useEffect(() => {
    calculateFee();
  }, [amount, gasPrice, gasLimit]);

  const loadWalletData = async () => {
    try {
      const walletData = await SecurityService.getWalletData();
      if (walletData) {
        const wallet = WalletService.deriveParentWallet(walletData.seedPhrase);
        const balance = await WalletService.getWalletBalance(wallet.address);
        setWalletBalance(balance);
      }
      
      const gas = await WalletService.estimateGasPrice();
      setGasPrice(gas);
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    }
  };

  const calculateFee = () => {
    try {
      const amountValue = parseFloat(amount) || 0;
      const gasPriceValue = parseFloat(gasPrice) || 0;
      const gasLimitValue = parseInt(gasLimit) || 21000;
      
      const fee = (gasPriceValue * gasLimitValue) / 1e9; // Convert to ETH
      setEstimatedFee(fee.toFixed(6));
    } catch (error) {
      setEstimatedFee('0');
    }
  };

  const handleScanQR = () => {
    router.push('/qr-scanner');
  };

  const validateAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const validateAmount = (amount: string): boolean => {
    const amountValue = parseFloat(amount);
    const balanceValue = parseFloat(walletBalance);
    const feeValue = parseFloat(estimatedFee);
    
    return amountValue > 0 && (amountValue + feeValue) <= balanceValue;
  };

  const handleSend = async () => {
    if (!validateAddress(recipientAddress)) {
      Alert.alert('Error', 'Please enter a valid recipient address');
      return;
    }

    if (!validateAmount(amount)) {
      Alert.alert('Error', 'Invalid amount or insufficient balance');
      return;
    }

    try {
      setIsLoading(true);
      
      const walletData = await SecurityService.getWalletData();
      if (!walletData) {
        Alert.alert('Error', 'No wallet data found');
        return;
      }

      // Create transaction
      const txHash = await TransactionService.sendTransaction(
        walletData.privateKey,
        recipientAddress,
        amount,
        gasPrice,
        gasLimit
      );

      Alert.alert(
        'Transaction Sent',
        `Transaction submitted successfully!\nHash: ${txHash}`,
        [
          {
            text: 'View Details',
            onPress: () => router.push(`/transaction-details?hash=${txHash}`)
          },
          { text: 'OK' }
        ]
      );

      // Clear form
      setRecipientAddress('');
      setAmount('');

    } catch (error) {
      Alert.alert('Error', 'Failed to send transaction');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Send ETH</Title>
            <Paragraph>Transfer ETH to another wallet address</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Recipient Address</Title>
            <TextInput
              mode="outlined"
              label="0x..."
              value={recipientAddress}
              onChangeText={setRecipientAddress}
              style={styles.input}
              placeholder="Enter recipient address"
            />
            <Button
              mode="outlined"
              onPress={handleScanQR}
              style={styles.scanButton}
              icon="qrcode-scan"
            >
              Scan QR Code
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Amount</Title>
            <TextInput
              mode="outlined"
              label="Amount (ETH)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              style={styles.input}
              placeholder="0.0"
            />
            <Text style={styles.balanceText}>
              Available: {parseFloat(walletBalance).toFixed(6)} ETH
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Transaction Fee</Title>
            <View style={styles.feeContainer}>
              <View style={styles.feeRow}>
                <Text>Gas Price:</Text>
                <TextInput
                  mode="outlined"
                  value={gasPrice}
                  onChangeText={setGasPrice}
                  keyboardType="numeric"
                  style={styles.feeInput}
                  placeholder="Gwei"
                />
              </View>
              
              <View style={styles.feeRow}>
                <Text>Gas Limit:</Text>
                <TextInput
                  mode="outlined"
                  value={gasLimit}
                  onChangeText={setGasLimit}
                  keyboardType="numeric"
                  style={styles.feeInput}
                  placeholder="21000"
                />
              </View>
              
              <View style={styles.feeRow}>
                <Text>Estimated Fee:</Text>
                <Text style={styles.feeAmount}>{estimatedFee} ETH</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Transaction Summary</Title>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text>Amount:</Text>
                <Text style={styles.summaryValue}>{amount || '0'} ETH</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text>Fee:</Text>
                <Text style={styles.summaryValue}>{estimatedFee} ETH</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text>Total:</Text>
                <Text style={styles.summaryValue}>
                  {(parseFloat(amount) + parseFloat(estimatedFee)).toFixed(6)} ETH
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSend}
            loading={isLoading}
            style={styles.sendButton}
            icon="send"
            disabled={!validateAddress(recipientAddress) || !validateAmount(amount)}
          >
            Send Transaction
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
  input: {
    marginBottom: 12,
  },
  scanButton: {
    marginTop: 8,
  },
  balanceText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  feeContainer: {
    marginTop: 8,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feeInput: {
    width: 120,
  },
  feeAmount: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  summaryContainer: {
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryValue: {
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginBottom: 32,
  },
  sendButton: {
    marginBottom: 8,
  },
}); 