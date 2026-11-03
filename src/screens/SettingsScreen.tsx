import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
// Legacy FileSystem API (expo-file-system/legacy): the current SDK 58
// File/Directory API is stream-oriented; the legacy string helpers are
// simpler and correct for a small JSON backup file.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import {
  addCategory,
  clearAllData,
  deleteCategory,
  exportAllData,
  importBackup,
  validateBackup,
} from '../db/database';
import { useData } from '../store/DataContext';
import { clearPin, hasPin, isValidPin, setPin } from '../security/pin';
import { clearSampleData, loadSampleData } from '../data/sampleData';
import { theme } from '../theme';
import { Card, FieldLabel, PrimaryButton, SectionTitle } from '../components/ui';

export default function SettingsScreen() {
  const { data, refresh } = useData();
  const [pin, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinMessage, setPinMessage] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryKind, setCategoryKind] = useState<'income' | 'expense' | 'both'>('expense');
  const [status, setStatus] = useState('');

  async function exportBackup() {
    try {
      const payload = exportAllData();
      const fileName = `moneymanager-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const uri = `${FileSystem.documentDirectory ?? ''}${fileName}`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json' });
        setStatus(`Backup file saved as ${fileName}. Share it to keep a copy outside the app.`);
      } else {
        setStatus(`Backup saved inside the app at ${fileName}. Sharing is not available on this device.`);
      }
    } catch (error) {
      setStatus(`Export failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  async function importBackupFile() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (picked.canceled || picked.assets.length === 0) return;
      const text = await FileSystem.readAsStringAsync(picked.assets[0].uri);
      const parsed: unknown = JSON.parse(text);
      const problem = validateBackup(parsed);
      if (problem) {
        Alert.alert('Backup refused', `${problem} Your current data was not changed.`);
        return;
      }
      const counts = importBackup(parsed);
      refresh();
      setStatus(
        `Imported ${counts.transactions} transactions, ${counts.categories} categories, ${counts.budgets} budgets, ${counts.goals} goals, ${counts.debts} debts.`,
      );
    } catch (error) {
      Alert.alert(
        'Import failed',
        error instanceof Error ? error.message : 'The file could not be read.',
      );
    }
  }

  function confirmClearAll() {
    Alert.alert(
      'Delete everything?',
      'This deletes all transactions, budgets, goals, and debts on this device, and removes the PIN. This cannot be undone. Export a backup first if you want a copy.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            clearAllData();
            await clearPin();
            refresh();
            setStatus('All data deleted. Default categories were restored.');
          },
        },
      ],
    );
  }

  async function savePin() {
    if (!isValidPin(pin)) {
      setPinMessage('PIN must be 4 to 6 digits.');
      return;
    }
    if (pin !== pinConfirm) {
      setPinMessage('The two PIN entries do not match.');
      return;
    }
    await setPin(pin);
    setPin('');
    setPinConfirm('');
    setPinMessage('PIN saved. The app will ask for it every time it opens.');
  }

  async function removePin() {
    await clearPin();
    setPinMessage('PIN removed.');
  }

  function addCustomCategory() {
    const name = categoryName.trim();
    if (name === '') {
      setStatus('Type a category name first.');
      return;
    }
    if (data.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setStatus(`A category named "${name}" already exists.`);
      return;
    }
    addCategory(name, categoryKind);
    setCategoryName('');
    refresh();
    setStatus(`Category "${name}" added.`);
  }

  function removeCategory(id: number, name: string) {
    const ok = deleteCategory(id);
    if (!ok) {
      Alert.alert(
        'Cannot delete yet',
        `"${name}" is used by saved transactions. Delete or move those transactions first.`,
      );
      return;
    }
    refresh();
    setStatus(`Category "${name}" deleted.`);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Settings</Text>
      <Text style={styles.subtle}>
        Everything is stored on this device in a local SQLite database. There is
        no account and no server. Currency is Rs.
      </Text>

      <SectionTitle>Security — PIN lock</SectionTitle>
      <Card>
        <Text style={styles.body}>
          The PIN is stored only as a salted hash, never as plain digits. If you
          forget it, the only recovery is deleting all data from Settings.
        </Text>
        <FieldLabel>New PIN (4–6 digits)</FieldLabel>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPinInput}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          placeholder="••••"
          placeholderTextColor={theme.colors.muted}
        />
        <FieldLabel>Repeat PIN</FieldLabel>
        <TextInput
          style={styles.input}
          value={pinConfirm}
          onChangeText={setPinConfirm}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          placeholder="••••"
          placeholderTextColor={theme.colors.muted}
        />
        {pinMessage !== '' && <Text style={styles.message}>{pinMessage}</Text>}
        <PrimaryButton label="Save PIN" onPress={savePin} />
        <PrimaryButton
          label="Remove PIN"
          onPress={async () => {
            if (await hasPin()) await removePin();
            else setPinMessage('No PIN is set.');
          }}
        />
      </Card>

      <SectionTitle>Backup & restore</SectionTitle>
      <Card>
        <Text style={styles.body}>
          Export writes one JSON file with every record. Import checks the file
          completely first and refuses it without touching your data if anything
          is wrong.
        </Text>
        <PrimaryButton label="Export backup (JSON)" onPress={exportBackup} />
        <PrimaryButton label="Import backup (JSON)" onPress={importBackupFile} />
        {status !== '' && <Text style={styles.message}>{status}</Text>}
      </Card>

      <SectionTitle>Demo data</SectionTitle>
      <Card>
        <Text style={styles.body}>
          Sample records are clearly labelled “Sample —” so they are easy to spot
          and remove.
        </Text>
        <PrimaryButton
          label="Load sample data"
          onPress={() => {
            loadSampleData();
            refresh();
            setStatus('Sample data loaded.');
          }}
        />
        <PrimaryButton
          label="Clear sample data"
          onPress={() => {
            clearSampleData();
            refresh();
            setStatus('Sample data removed.');
          }}
        />
      </Card>

      <SectionTitle>Categories</SectionTitle>
      <Card>
        <TextInput
          style={styles.input}
          value={categoryName}
          onChangeText={setCategoryName}
          placeholder="New category name"
          placeholderTextColor={theme.colors.muted}
        />
        <View style={styles.kindRow}>
          {(['income', 'expense', 'both'] as const).map((kind) => (
            <PrimaryButton
              key={kind}
              label={kind === categoryKind ? `✓ ${kind}` : kind}
              onPress={() => setCategoryKind(kind)}
            />
          ))}
        </View>
        <PrimaryButton label="Add category" onPress={addCustomCategory} />
        {data.categories.map((c) => (
          <View key={c.id} style={styles.categoryRow}>
            <Text style={styles.body}>
              {c.icon} {c.name} ({c.kind})
              {c.is_default === 1 ? ' · built-in' : ''}
            </Text>
            <Text style={styles.deleteText} onPress={() => removeCategory(c.id, c.name)}>
              Delete
            </Text>
          </View>
        ))}
      </Card>

      <SectionTitle>Danger zone</SectionTitle>
      <Card>
        <PrimaryButton label="Delete all data" danger onPress={confirmClearAll} />
      </Card>

      <Text style={styles.subtle}>
        MoneyManager 1.0.0 · Offline only · Coach guidance is computed on this
        device from your own records and is not financial advice.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingBottom: 32 },
  heading: {
    fontSize: theme.fontSize.large,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtle: { fontSize: theme.fontSize.small, color: theme.colors.muted, marginBottom: theme.spacing.sm, lineHeight: 19 },
  body: { fontSize: theme.fontSize.body, color: theme.colors.text, lineHeight: 21 },
  input: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: theme.fontSize.body,
    color: theme.colors.text,
  },
  message: { fontSize: theme.fontSize.body, color: theme.colors.text, marginTop: theme.spacing.sm },
  kindRow: { flexDirection: 'row', gap: 8, marginTop: theme.spacing.sm },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: theme.spacing.sm,
  },
  deleteText: { color: theme.colors.danger, fontWeight: '700' },
});
