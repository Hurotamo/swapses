import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Card, Title, Paragraph, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WalletService } from '../src/services/WalletService';

export default function HomeScreen() {
  const [seedPhrase, setSeedPhrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateNewSeed = async () => {
    try {
      setIsLoading(true);
      const newSeed = await WalletService.generateMnemonic();
      setSeedPhrase(newSeed);
      Alert.alert('Success', 'New seed phrase generated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to generate seed phrase');
    } finally {
      setIsLoading(false);
    }
  };

  const validateAndProceed = () => {
    if (!seedPhrase.trim()) {
      Alert.alert('Error', 'Please enter or generate a seed phrase');
      return;
    }

    if (!WalletService.validateMnemonic(seedPhrase)) {
      Alert.alert('Error', 'Invalid seed phrase format');
      return;
    }

    // Navigate to split wallet screen
    router.push({
      pathname: '/split-wallet',
      params: { seedPhrase }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>DWSS Wallet Splitter</Title>
            <Paragraph style={styles.subtitle}>
              Split your ETH wallet into 100 deterministic child wallets
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Seed Phrase</Title>
            <Paragraph>
              Enter your 24-word seed phrase or generate a new one
            </Paragraph>
            
            <TextInput
              mode="outlined"
              label="Seed Phrase (24 words)"
              value={seedPhrase}
              onChangeText={setSeedPhrase}
              multiline
              numberOfLines={3}
              style={styles.input}
              placeholder="Enter your 24-word seed phrase..."
            />

            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={generateNewSeed}
                loading={isLoading}
                style={styles.button}
                icon="refresh"
              >
                Generate New Seed
              </Button>
            </View>

            <Button
              mode="contained"
              onPress={validateAndProceed}
              style={styles.primaryButton}
              icon="arrow-right"
              disabled={!seedPhrase.trim()}
            >
              Continue to Split
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>How it works</Title>
            <Paragraph>
              1. Generate or enter your seed phrase{'\n'}
              2. Fund your parent wallet with ETH{'\n'}
              3. Split into 100 child wallets{'\n'}
              4. Each child receives equal ETH amount
            </Paragraph>
          </Card.Content>
        </Card>
      </View>
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
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  input: {
    marginVertical: 16,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 8,
  },
  primaryButton: {
    marginTop: 8,
  },
}); 