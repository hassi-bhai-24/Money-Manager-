import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { verifyPin } from '../security/pin';
import { theme } from '../theme';
import { PrimaryButton } from '../components/ui';

export default function PinLockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  async function unlock() {
    const ok = await verifyPin(pin);
    if (ok) {
      onUnlocked();
      return;
    }
    setAttempts((n) => n + 1);
    setPin('');
    setError('Wrong PIN. Try again.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MoneyManager</Text>
      <Text style={styles.subtle}>Enter your PIN to open your records.</Text>
      <TextInput
        style={styles.input}
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        autoFocus
        placeholder="••••"
        placeholderTextColor={theme.colors.muted}
        onSubmitEditing={unlock}
      />
      {error !== '' && <Text style={styles.error}>{error}</Text>}
      {attempts >= 3 && (
        <Text style={styles.subtle}>
          Forgot your PIN? It cannot be recovered. The only way back in is to
          delete the app&apos;s data (for example by reinstalling the app),
          which deletes all records. This is by design: the PIN protects
          records stored only on this device.
        </Text>
      )}
      <PrimaryButton label="Unlock" onPress={unlock} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.hero,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 21,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  error: {
    color: theme.colors.danger,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    fontSize: theme.fontSize.body,
  },
});
