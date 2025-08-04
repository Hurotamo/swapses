import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Card, Title, Paragraph, Text, Button, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WalletService, WalletInfo } from '../src/services/WalletService';

interface WalletListItem {
  index: number;
  type: 'parent' | 'child';
  wallet: WalletInfo;
  balance: string;
}

export default function WalletListScreen() {
  const [wallets, setWallets] = useState<WalletListItem[]>([]);
  const [filteredWallets, setFilteredWallets] = useState<WalletListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadWallets();
  }, []);

  useEffect(() => {
    filterWallets();
  }, [searchQuery, wallets]);

  const loadWallets = async () => {
    try {
      setIsLoading(true);
      
      // For demo purposes, generate a sample split operation
      // In real app, this would come from stored state or navigation params
      const sampleMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const splitResult = WalletService.createSplitOperation(sampleMnemonic);
      
      const walletList: WalletListItem[] = [];

      // Add parent wallet
      const parentBalance = await WalletService.getWalletBalance(splitResult.parentWallet.address);
      walletList.push({
        index: 0,
        type: 'parent',
        wallet: splitResult.parentWallet,
        balance: parentBalance,
      });

      // Add child wallets
      for (let i = 0; i < splitResult.childWallets.length; i++) {
        const childWallet = splitResult.childWallets[i];
        const childBalance = await WalletService.getWalletBalance(childWallet.address);
        
        walletList.push({
          index: i + 1,
          type: 'child',
          wallet: childWallet,
          balance: childBalance,
        });
      }

      setWallets(walletList);
    } catch (error) {
      Alert.alert('Error', 'Failed to load wallets');
    } finally {
      setIsLoading(false);
    }
  };

  const filterWallets = () => {
    if (!searchQuery.trim()) {
      setFilteredWallets(wallets);
      return;
    }

    const filtered = wallets.filter(wallet => 
      wallet.wallet.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wallet.index.toString().includes(searchQuery)
    );
    setFilteredWallets(filtered);
  };

  const renderWalletItem = ({ item }: { item: WalletListItem }) => (
    <Card style={[styles.card, item.type === 'parent' ? styles.parentCard : styles.childCard]}>
      <Card.Content>
        <View style={styles.walletHeader}>
          <Title style={styles.walletTitle}>
            {item.type === 'parent' ? 'Parent Wallet' : `Child Wallet ${item.index}`}
          </Title>
          <Text style={styles.walletType}>
            {item.type === 'parent' ? '🔑' : '👶'}
          </Text>
        </View>
        
        <Text style={styles.address}>{item.wallet.address}</Text>
        <Text style={styles.balance}>Balance: {item.balance} ETH</Text>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => copyToClipboard(item.wallet.address)}
            style={styles.button}
            icon="content-copy"
          >
            Copy Address
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => viewOnExplorer(item.wallet.address)}
            style={styles.button}
            icon="open-in-new"
          >
            View on Explorer
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const copyToClipboard = (address: string) => {
    // In a real app, you would use expo-clipboard
    Alert.alert('Copied', 'Address copied to clipboard');
  };

  const viewOnExplorer = (address: string) => {
    // In a real app, you would open the explorer URL
    Alert.alert('Explorer', `Would open explorer for ${address}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Searchbar
          placeholder="Search wallets..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            Total Wallets: {wallets.length} ({wallets.filter(w => w.type === 'parent').length} parent, {wallets.filter(w => w.type === 'child').length} children)
          </Text>
        </View>

        <FlatList
          data={filteredWallets}
          renderItem={renderWalletItem}
          keyExtractor={(item) => `${item.type}-${item.index}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
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
  searchbar: {
    marginBottom: 16,
  },
  statsContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  statsText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 16,
  },
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
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  walletType: {
    fontSize: 20,
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