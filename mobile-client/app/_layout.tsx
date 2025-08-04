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
          title: 'DWSS - Wallet Splitter',
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
    </Stack>
  );
} 