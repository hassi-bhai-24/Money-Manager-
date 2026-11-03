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
  addDebt,
  addGoal,
  deleteBudget,
  deleteDebt,
  deleteGoal,
  updateDebt,
  updateGoal,
  upsertBudget,
} from '../db/database';
import { useData } from '../store/DataContext';
import { theme } from '../theme';
import { isValidDateKey, parseAmountToCents } from '../utils/money';
import { Chip, FieldLabel, PrimaryButton } from '../components/ui';
import type { BudgetFormProps, DebtFormProps, GoalFormProps } from '../navigation/types';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingBottom: 32 },
  heading: {
    fontSize: theme.fontSize.large,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
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
  error: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.body,
    marginTop: theme.spacing.md,
  },
  hint: { fontSize: theme.fontSize.small, color: theme.colors.muted },
});

function ErrorText({ message }: { message: string }) {
  if (message === '') return null;
  return <Text style={styles.error}>{message}</Text>;
}

// ---------------------------------------------------------------------------
// Budget form
// ---------------------------------------------------------------------------

export function BudgetFormScreen({ route, navigation }: BudgetFormProps) {
  const { data, refresh } = useData();
  const editing = data.budgets.find((b) => b.id === route.params?.budgetId);
  const [categoryId, setCategoryId] = useState<number | null>(editing?.category_id ?? null);
  const [limit, setLimit] = useState(
    editing ? (editing.monthly_limit_cents / 100).toFixed(2) : '',
  );
  const [error, setError] = useState('');

  const expenseCategories = useMemo(
    () => data.categories.filter((c) => c.kind === 'expense' || c.kind === 'both'),
    [data.categories],
  );
  const usedCategoryIds = useMemo(
    () =>
      new Set(
        data.budgets.filter((b) => b.id !== editing?.id).map((b) => b.category_id),
      ),
    [data.budgets, editing],
  );

  function save() {
    const cents = parseAmountToCents(limit);
    if (cents === null) {
      setError('Enter a monthly limit greater than zero, for example 15000.');
      return;
    }
    if (categoryId === null) {
      setError('Pick a category first.');
      return;
    }
    upsertBudget(categoryId, cents);
    refresh();
    navigation.goBack();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{editing ? 'Edit budget' : 'New monthly budget'}</Text>
      <FieldLabel>Category</FieldLabel>
      <View style={styles.chipWrap}>
        {expenseCategories.map((c) => {
          const taken = usedCategoryIds.has(c.id);
          return (
            <Chip
              key={c.id}
              label={`${c.icon} ${c.name}${taken ? ' (has budget)' : ''}`}
              selected={categoryId === c.id}
              onPress={() => setCategoryId(c.id)}
            />
          );
        })}
      </View>
      <FieldLabel>Monthly limit (Rs)</FieldLabel>
      <TextInput
        style={styles.input}
        value={limit}
        onChangeText={setLimit}
        placeholder="15000"
        keyboardType="decimal-pad"
        placeholderTextColor={theme.colors.muted}
      />
      <ErrorText message={error} />
      <PrimaryButton label="Save budget" onPress={save} />
      {editing && (
        <PrimaryButton
          label="Delete budget"
          danger
          onPress={() => {
            Alert.alert('Delete this budget?', 'Spending records stay. Only the limit is removed.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  deleteBudget(editing.id);
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

// ---------------------------------------------------------------------------
// Goal form
// ---------------------------------------------------------------------------

export function GoalFormScreen({ route, navigation }: GoalFormProps) {
  const { data, refresh } = useData();
  const editing = data.goals.find((g) => g.id === route.params?.goalId);
  const [name, setName] = useState(editing?.name ?? '');
  const [target, setTarget] = useState(
    editing ? (editing.target_cents / 100).toFixed(2) : '',
  );
  const [targetDate, setTargetDate] = useState(editing?.target_date ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [error, setError] = useState('');

  function save() {
    const cents = parseAmountToCents(target);
    if (name.trim() === '') {
      setError('Give the goal a name, for example "Emergency fund".');
      return;
    }
    if (cents === null) {
      setError('Enter a target amount greater than zero.');
      return;
    }
    if (targetDate !== '' && !isValidDateKey(targetDate)) {
      setError('Target date must look like YYYY-MM-DD, or leave it empty.');
      return;
    }
    if (editing) {
      updateGoal(editing.id, {
        name,
        target_cents: cents,
        target_date: targetDate === '' ? null : targetDate,
        note: note.trim(),
      });
    } else {
      addGoal({
        name,
        target_cents: cents,
        target_date: targetDate === '' ? null : targetDate,
        note: note.trim(),
      });
    }
    refresh();
    navigation.goBack();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{editing ? 'Edit goal' : 'New savings goal'}</Text>
      <FieldLabel>Goal name</FieldLabel>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Emergency fund"
        placeholderTextColor={theme.colors.muted}
      />
      <FieldLabel>Target amount (Rs)</FieldLabel>
      <TextInput
        style={styles.input}
        value={target}
        onChangeText={setTarget}
        placeholder="100000"
        keyboardType="decimal-pad"
        placeholderTextColor={theme.colors.muted}
      />
      <FieldLabel>Target date, optional (YYYY-MM-DD)</FieldLabel>
      <TextInput
        style={styles.input}
        value={targetDate}
        onChangeText={setTargetDate}
        placeholder="2026-12-31"
        placeholderTextColor={theme.colors.muted}
      />
      <FieldLabel>Note (optional)</FieldLabel>
      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        placeholder="Why this goal matters"
        placeholderTextColor={theme.colors.muted}
      />
      <ErrorText message={error} />
      <PrimaryButton label="Save goal" onPress={save} />
      {editing && (
        <PrimaryButton
          label="Delete goal"
          danger
          onPress={() => {
            Alert.alert('Delete this goal?', 'Saved progress on this goal will be lost.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  deleteGoal(editing.id);
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

// ---------------------------------------------------------------------------
// Debt form
// ---------------------------------------------------------------------------

export function DebtFormScreen({ route, navigation }: DebtFormProps) {
  const { data, refresh } = useData();
  const editing = data.debts.find((d) => d.id === route.params?.debtId);
  const [name, setName] = useState(editing?.name ?? '');
  const [balance, setBalance] = useState(
    editing ? (editing.balance_cents / 100).toFixed(2) : '',
  );
  const [apr, setApr] = useState(editing ? String(editing.apr) : '0');
  const [minPayment, setMinPayment] = useState(
    editing ? (editing.min_payment_cents / 100).toFixed(2) : '0',
  );
  const [error, setError] = useState('');

  function save() {
    const balanceCents = parseAmountToCents(balance);
    const aprValue = Number(apr);
    const minCents = minPayment.trim() === '' ? 0 : parseAmountToCents(minPayment);
    if (name.trim() === '') {
      setError('Give the debt a name, for example "Car loan".');
      return;
    }
    if (balanceCents === null) {
      setError('Enter the amount still owed, greater than zero.');
      return;
    }
    if (!Number.isFinite(aprValue) || aprValue < 0 || aprValue > 100) {
      setError('APR must be a number from 0 to 100, for example 18.5.');
      return;
    }
    if (minCents === null) {
      setError('Minimum payment must be zero or more, for example 5000.');
      return;
    }
    if (editing) {
      updateDebt(editing.id, {
        name,
        balance_cents: balanceCents,
        apr: aprValue,
        min_payment_cents: minCents,
      });
    } else {
      addDebt({
        name,
        balance_cents: balanceCents,
        apr: aprValue,
        min_payment_cents: minCents,
      });
    }
    refresh();
    navigation.goBack();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{editing ? 'Edit debt' : 'New debt'}</Text>
      <Text style={styles.hint}>
        Balances are stored on this device only. APR is used only to order the payoff plan.
      </Text>
      <FieldLabel>Debt name</FieldLabel>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Car loan"
        placeholderTextColor={theme.colors.muted}
      />
      <FieldLabel>Balance owed (Rs)</FieldLabel>
      <TextInput
        style={styles.input}
        value={balance}
        onChangeText={setBalance}
        placeholder="250000"
        keyboardType="decimal-pad"
        placeholderTextColor={theme.colors.muted}
      />
      <FieldLabel>APR % per year (0 if unknown)</FieldLabel>
      <TextInput
        style={styles.input}
        value={apr}
        onChangeText={setApr}
        placeholder="18.5"
        keyboardType="decimal-pad"
        placeholderTextColor={theme.colors.muted}
      />
      <FieldLabel>Minimum payment per month (Rs)</FieldLabel>
      <TextInput
        style={styles.input}
        value={minPayment}
        onChangeText={setMinPayment}
        placeholder="5000"
        keyboardType="decimal-pad"
        placeholderTextColor={theme.colors.muted}
      />
      <ErrorText message={error} />
      <PrimaryButton label="Save debt" onPress={save} />
      {editing && (
        <PrimaryButton
          label="Delete debt"
          danger
          onPress={() => {
            Alert.alert('Delete this debt?', 'Its payment history will also be deleted.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  deleteDebt(editing.id);
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
