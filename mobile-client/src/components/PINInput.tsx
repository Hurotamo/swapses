import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Card, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface PINInputProps {
  onSuccess: (pin: string) => void;
  onCancel: () => void;
  mode: 'create' | 'verify';
  title?: string;
  description?: string;
}

export const PINInput: React.FC<PINInputProps> = ({
  onSuccess,
  onCancel,
  mode,
  title = mode === 'create' ? 'Create PIN' : 'Enter PIN',
  description = mode === 'create' 
    ? 'Create a 6-digit PIN to secure your wallet' 
    : 'Enter your 6-digit PIN to access your wallet'
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  useEffect(() => {
    if (pin.length === 6) {
      if (mode === 'create') {
        setIsConfirming(true);
        setPin('');
      } else {
        handleVerify();
      }
    }
  }, [pin]);

  const handleNumberPress = (number: string) => {
    if (pin.length < 6) {
      const newPin = pin + number;
      setPin(newPin);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleVerify = () => {
    if (mode === 'verify') {
      onSuccess(pin);
    }
  };

  const handleConfirm = () => {
    if (pin === confirmPin) {
      onSuccess(confirmPin);
    } else {
      Alert.alert('PIN Mismatch', 'The PINs do not match. Please try again.');
      setPin('');
      setConfirmPin('');
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    if (isConfirming) {
      setIsConfirming(false);
      setPin('');
      setConfirmPin('');
    } else {
      onCancel();
    }
  };

  const renderPINDisplay = () => {
    const currentPin = isConfirming ? confirmPin : pin;
    const displayText = isConfirming ? 'Confirm PIN' : 'Enter PIN';
    
    return (
      <View style={styles.pinDisplay}>
        <Text style={styles.pinLabel}>{displayText}</Text>
        <View style={styles.pinDots}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.pinDot,
                index < currentPin.length && styles.pinDotFilled
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  const renderNumberPad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'delete']
    ];

    return (
      <View style={styles.numberPad}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numberRow}>
            {row.map((number, colIndex) => (
              <Button
                key={colIndex}
                mode="outlined"
                onPress={() => {
                  if (number === 'delete') {
                    handleDelete();
                  } else if (number !== '') {
                    handleNumberPress(number);
                  }
                }}
                style={styles.numberButton}
                disabled={number === ''}
              >
                {number === 'delete' ? '⌫' : number}
              </Button>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>{title}</Title>
            <Text style={styles.description}>{description}</Text>
            
            {renderPINDisplay()}
            
            {renderNumberPad()}
            
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={handleCancel}
                style={styles.button}
              >
                Cancel
              </Button>
              
              {isConfirming && (
                <Button
                  mode="contained"
                  onPress={handleConfirm}
                  style={styles.button}
                  disabled={pin.length !== 6}
                >
                  Confirm
                </Button>
              )}
            </View>
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  pinDisplay: {
    alignItems: 'center',
    marginBottom: 32,
  },
  pinLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    marginHorizontal: 8,
  },
  pinDotFilled: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  numberPad: {
    marginBottom: 32,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  numberButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
}); 