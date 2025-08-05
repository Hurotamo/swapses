import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, Text, Button, Chip } from 'react-native-paper';
import { WalletInfo } from '../services/WalletService';
import { copyToClipboard } from '../utils/clipboard';
import { openExplorer } from '../utils/explorer';

interface WalletCardProps {
  wallet: WalletInfo;
  balance: string;
  type: 'parent' | 'child';
  index?: number;
  onPress?: () => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  wallet,
  balance,
  type,
  index,
  onPress,
}) => {
  const handleCopyAddress = async () => {
    try {
      const success = await copyToClipboard(wallet.address);
      if (success) {
        // You could show a toast notification here
        console.log('Address copied to clipboard');
      }
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  const handleViewExplorer = async () => {
    try {
      await openExplorer(wallet.address);
    } catch (error) {
      console.error('Failed to open explorer:', error);
    }
  };

  const getWalletTitle = () => {
    if (type === 'parent') return 'Parent Wallet';
    return `Child Wallet ${index}`;
  };

  const getWalletIcon = () => {
    return type === 'parent' ? '🔑' : '👶';
  };

  return (
    <Card 
      style={[styles.card, type === 'parent' ? styles.parentCard : styles.childCard]}
      onPress={onPress}
    >
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Title style={styles.title}>{getWalletTitle()}</Title>
            <Chip 
              mode="outlined" 
              compact 
              style={styles.typeChip}
            >
              {getWalletIcon()} {type}
            </Chip>
          </View>
        </View>
        
        <Text style={styles.address} numberOfLines={1} ellipsizeMode="middle">
          {wallet.address}
        </Text>
        
        <Text style={styles.balance}>
          Balance: {parseFloat(balance).toFixed(6)} ETH
        </Text>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={handleCopyAddress}
            style={styles.button}
            icon="content-copy"
            compact
          >
            Copy
          </Button>
          
          <Button
            mode="outlined"
            onPress={handleViewExplorer}
            style={styles.button}
            icon="open-in-new"
            compact
          >
            Explorer
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  parentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  childCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  typeChip: {
    marginTop: 4,
    alignSelf: 'flex-start',
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
}); 