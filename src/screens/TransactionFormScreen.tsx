import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  addTransaction,
  deleteTransaction,
  updateTransaction,
  type Category,
} from '../db/database';
import { useData } from '../store/DataContext';
import { theme } from '../theme';
import { isValidDateKey, parseAmountToCents, todayKey } from '../utils/money';
import { Chip, FieldLabel, PrimaryButton } from '../components/ui';
import type { TransactionFormProps } from '../navigation/types';

export default function TransactionFormScreen({ route, navigation }: TransactionFormProps) {
  const { data, refresh } = useData();
  const editing = data.transactions.find((t) => t.id === route.params?.transactionId);

  const [type, setType] = useState<'income' | 'expense'>(editing?.type ?? 'expense');
  const [amount, setAmount] = useState(
    editing ? (editing.amount_cents / 100).toFixed(2) : '',
  );
  const [categoryId, setCategoryId] = useState<number | null>(editing?.category_id ?? null);
  const [date, setDate] = useState(editing?.date ?? todayKey());
  const [note, setNote] = useState(editing?.note ?? '');
  const [error, setError] = useState('');

  const visibleCategories: Category[] = useMemo(() => {
    return data.categories.filter((c) => c.kind === type || c.kind === 'both');
  }, [data.categories, type]);

  const selectedCategory = useMemo(
    () => data.categories.find((c) => c.id === categoryId) ?? null,
    [data.categories, categoryId],
  );

  function save() {
    const cents = parseAmountToCents(amount);
    if (cents === null) {
      setError('Enter an amount greater than zero, for example 250 or 250.50.');
      return;
    }
    if (!selectedCategory) {
      setError('Pick a category first.');
      return;
    }
    if (!isValidDateKey(date)) {
      setError('Date must look like YYYY-MM-DD, for example 2026-11-03.');
      return;
    }
    if (editing) {
      updateTransaction(editing.id, {
        amount_cents: cents,
        type,
        category_id: selectedCategory.id,
        date,
        note: note.trim(),
      });
    } else {
      addTransaction({
        amount_cents: cents,
        type,
        category_id: selectedCategory.id,
        date,
        note: note.trim(),
      });
    }
    // The write above is synchronous against SQLite; refresh re-reads the
    // database so the list can never show data that was not saved.
    refresh();
    navigation.goBack();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{editing ? 'Edit transaction' : 'New transaction'}</Text>

      <View style={styles.typeRow}>
        <Chip label="Expense" selected={type === 'expense'} onPress={() => { setType('expense'); setCategoryId(null); }} />
        <Chip label="Income" selected={type === 'income'} onPress={() => { setType('income'); setCategoryId(null); }} />
      </View>

      <FieldLabel>Amount (Rs)</FieldLabel>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
        placeholderTextColor={theme.colors.muted}
      />

      <FieldLabel>Category</FieldLabel>
      <View style={styles.chipWrap}>
        {visibleCategories.map((c) => (
          <Chip
            key={c.id}
            label={`${c.icon} ${c.name}`}
            selected={categoryId === c.id}
            onPress={() => setCategoryId(c.id)}
          />
        ))}
      </View>
      {visibleCategories.length === 0 && (
        <Text style={styles.hint}>No categories for this type yet. Add one in Settings.</Text>
      )}

      <FieldLabel>Date (YYYY-MM-DD)</FieldLabel>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        placeholder="2026-11-03"
        placeholderTextColor={theme.colors.muted}
      />

      <FieldLabel>Note (optional)</FieldLabel>
      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        placeholder="What was this for?"
        placeholderTextColor={theme.colors.muted}
      />

      {error !== '' && <Text style={styles.error}>{error}</Text>}

      <PrimaryButton label={editing ? 'Save changes' : 'Save transaction'} onPress={save} />

      {editing && (
        <PrimaryButton
          label="Delete transaction"
          danger
          onPress={() => {
            Alert.alert('Delete this transaction?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  deleteTransaction(editing.id);
                  refresh();
                  navigation.goBack();
                },
              },
            ]);
          }}
        />
      )}
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
    marginBottom: theme.spacing.sm,
  },
  typeRow: { flexDirection: 'row', marginBottom: theme.spacing.sm },
  input: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: theme.fontSize.body,
    color: theme.colors.text,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  hint: { fontSize: theme.fontSize.small, color: theme.colors.muted },
  error: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.body,
    marginTop: theme.spacing.md,
  },
  deleteHint: {
    textAlign: 'center',
    color: theme.colors.muted,
    fontSize: theme.fontSize.small,
    marginTop: theme.spacing.lg,
  },
});
