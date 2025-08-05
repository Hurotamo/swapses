import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
        },
        headerTintColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'DWSS Wallet',
        }}
      />
      <Stack.Screen
        name="seed-input"
        options={{
          title: 'Enter Seed Phrase',
        }}
      />
      <Stack.Screen
        name="split-wallet"
        options={{
          title: 'Split Wallet',
        }}
      />
      <Stack.Screen
        name="wallet-list"
        options={{
          title: 'Wallet List',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="qr-scanner"
        options={{
          title: 'Scan QR Code',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="create-pin"
        options={{
          title: 'Create PIN',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="verify-pin"
        options={{
          title: 'Enter PIN',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="send"
        options={{
          title: 'Send',
        }}
      />
      <Stack.Screen
        name="receive"
        options={{
          title: 'Receive',
        }}
      />
      <Stack.Screen
        name="transaction-details"
        options={{
          title: 'Transaction Details',
        }}
      />
    </Stack>
  );
} 