import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Button, Card, Title, Paragraph, Switch, List, Divider, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SecurityService, SecurityConfig } from '../src/services/SecurityService';
import { WalletService } from '../src/services/WalletService';

export default function SettingsScreen() {
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>({
    biometricsEnabled: false,
    pinEnabled: false,
    autoLockTimeout: 5,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const config = await SecurityService.getSecurityConfig();
      setSecurityConfig(config);
      
      const biometrics = await SecurityService.isBiometricsAvailable();
      setBiometricsAvailable(biometrics);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleBiometricsToggle = async (enabled: boolean) => {
    try {
      setIsLoading(true);
      
      if (enabled) {
        const authenticated = await SecurityService.authenticateWithBiometrics();
        if (!authenticated) {
          Alert.alert('Authentication Failed', 'Please authenticate to enable biometrics.');
          return;
        }
      }
      
      const newConfig = { ...securityConfig, biometricsEnabled: enabled };
      await SecurityService.setSecurityConfig(newConfig);
      setSecurityConfig(newConfig);
      
      Alert.alert(
        'Success',
        enabled ? 'Biometrics enabled' : 'Biometrics disabled'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update biometrics setting');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePINToggle = async (enabled: boolean) => {
    try {
      setIsLoading(true);
      
      if (enabled) {
        // Navigate to PIN creation screen
        router.push('/create-pin');
      } else {
        const newConfig = { ...securityConfig, pinEnabled: false };
        await SecurityService.setSecurityConfig(newConfig);
        setSecurityConfig(newConfig);
        Alert.alert('Success', 'PIN disabled');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update PIN setting');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoLockChange = async (timeout: number) => {
    try {
      const newConfig = { ...securityConfig, autoLockTimeout: timeout };
      await SecurityService.setSecurityConfig(newConfig);
      setSecurityConfig(newConfig);
    } catch (error) {
      Alert.alert('Error', 'Failed to update auto-lock setting');
    }
  };

  const handleExportWallet = async () => {
    try {
      setIsLoading(true);
      const walletData = await SecurityService.getWalletData();
      
      if (!walletData) {
        Alert.alert('Error', 'No wallet data found');
        return;
      }
      
      Alert.alert(
        'Export Wallet',
        'Your wallet data will be exported. Keep it secure and never share it with anyone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Export',
            onPress: () => {
              // In a real app, you'd export to a secure file or clipboard
              console.log('Wallet data:', walletData);
              Alert.alert('Success', 'Wallet data exported (check console)');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearWallet = async () => {
    Alert.alert(
      'Clear Wallet',
      'This will permanently delete all wallet data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await SecurityService.clearWalletData();
              Alert.alert('Success', 'Wallet data cleared');
              router.replace('/');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear wallet data');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Security Settings</Title>
            <Paragraph>Configure how your wallet is secured</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <List.Item
              title="Biometric Authentication"
              description={biometricsAvailable ? "Use fingerprint or Face ID" : "Not available on this device"}
              left={(props: any) => <List.Icon {...props} icon="fingerprint" />}
              right={() => (
                <Switch
                  value={securityConfig.biometricsEnabled}
                  onValueChange={handleBiometricsToggle}
                  disabled={!biometricsAvailable || isLoading}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="PIN Protection"
              description="Use a 6-digit PIN to secure your wallet"
              left={(props: any) => <List.Icon {...props} icon="lock" />}
              right={() => (
                <Switch
                  value={securityConfig.pinEnabled}
                  onValueChange={handlePINToggle}
                  disabled={isLoading}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Auto-Lock Timeout"
              description={`${securityConfig.autoLockTimeout} minutes`}
              left={(props: any) => <List.Icon {...props} icon="timer" />}
              onPress={() => {
                Alert.alert(
                  'Auto-Lock Timeout',
                  'Select auto-lock timeout',
                  [
                    { text: '1 minute', onPress: () => handleAutoLockChange(1) },
                    { text: '5 minutes', onPress: () => handleAutoLockChange(5) },
                    { text: '15 minutes', onPress: () => handleAutoLockChange(15) },
                    { text: '30 minutes', onPress: () => handleAutoLockChange(30) },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Wallet Management</Title>
            <Paragraph>Manage your wallet data and settings</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <List.Item
              title="Export Wallet"
              description="Export your wallet data for backup"
              left={(props: any) => <List.Icon {...props} icon="export" />}
              onPress={handleExportWallet}
            />
            
            <Divider />
            
            <List.Item
              title="Network Settings"
              description="Configure blockchain network"
              left={(props: any) => <List.Icon {...props} icon="web" />}
              onPress={() => router.push('/network-settings')}
            />
            
            <Divider />
            
            <List.Item
              title="About"
              description="App version and information"
              left={(props: any) => <List.Icon {...props} icon="information" />}
              onPress={() => router.push('/about')}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.dangerTitle}>Danger Zone</Title>
            <Paragraph style={styles.dangerText}>
              These actions are irreversible
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="outlined"
              onPress={handleClearWallet}
              style={styles.dangerButton}
              icon="delete"
              loading={isLoading}
            >
              Clear Wallet Data
            </Button>
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
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  dangerTitle: {
    color: '#f44336',
  },
  dangerText: {
    color: '#666',
  },
  dangerButton: {
    borderColor: '#f44336',
    color: '#f44336',
  },
}); 