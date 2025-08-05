import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Text, Button, Searchbar, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WalletService, WalletInfo } from '../src/services/WalletService';
import { WalletCard } from '../src/components/WalletCard';
import { useWallets } from '../src/hooks/useWallets';

interface WalletListItem {
  index: number;
  type: 'parent' | 'child';
  wallet: WalletInfo;
  balance: string;
}

export default function WalletListScreen() {
  const { wallets, isLoading, error, refreshWallets } = useWallets();
  const [filteredWallets, setFilteredWallets] = useState<WalletListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    filterWallets();
  }, [searchQuery, wallets]);

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
    <WalletCard
      wallet={item.wallet}
      balance={item.balance}
      type={item.type}
      index={item.index}
    />
  );

  if (isLoading && wallets.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading wallets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={refreshWallets}>
            Retry
          </Button>
        </View>
      </SafeAreaView>
    );
  }

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
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refreshWallets} />
          }
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 16,
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
}); 