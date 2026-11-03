import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { logDebtPayment } from '../db/database';
import { useData } from '../store/DataContext';
import { theme } from '../theme';
import {
  avalancheOrder,
  snowballOrder,
  totalDebt,
  totalMinPayments,
} from '../utils/calculations';
import { formatRs, parseAmountToCents, todayKey } from '../utils/money';
import { Card, EmptyState, PrimaryButton, SectionTitle } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';

export default function DebtsScreen() {
  const { data, refresh } = useData();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [payingFor, setPayingFor] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const active = useMemo(() => data.debts.filter((d) => d.balance_cents > 0), [data.debts]);
  const paidOff = useMemo(() => data.debts.filter((d) => d.balance_cents === 0), [data.debts]);

  function savePayment(debtId: number) {
    const cents = parseAmountToCents(amount);
    if (cents === null) {
      setError('Enter a payment amount greater than zero.');
      return;
    }
    logDebtPayment(debtId, cents, todayKey(), '');
    setAmount('');
    setPayingFor(null);
    setError('');
    refresh();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Debts & loans</Text>
      <Card>
        <Text style={styles.line}>Total owed: {formatRs(totalDebt(data.debts))}</Text>
        <Text style={styles.subtle}>
          Minimum payments: {formatRs(totalMinPayments(data.debts))} per month.
        </Text>
      </Card>

      {data.debts.length === 0 ? (
        <EmptyState
          title="No debts recorded"
          body="Add a loan or debt with its balance, APR, and minimum payment. The coach will build a payoff order from your real numbers."
        />
      ) : (
        <>
          <SectionTitle>Payoff order — avalanche (highest APR first)</SectionTitle>
          {avalancheOrder(active).map((d, i) => (
            <Text key={d.id} style={styles.orderLine}>
              {i + 1}. {d.name} — {formatRs(d.balance_cents)} at {d.apr}% APR
            </Text>
          ))}
          <SectionTitle>Payoff order — snowball (smallest balance first)</SectionTitle>
          {snowballOrder(active).map((d, i) => (
            <Text key={d.id} style={styles.orderLine}>
              {i + 1}. {d.name} — {formatRs(d.balance_cents)}
            </Text>
          ))}
          {active.length === 0 && (
            <Text style={styles.subtle}>All debts are paid off. 🎉</Text>
          )}

          {data.debts.map((debt) => (
            <Card key={debt.id}>
              <Text style={styles.line}>{debt.name}</Text>
              <Text style={styles.subtle}>
                Owed {formatRs(debt.balance_cents)} · {debt.apr}% APR · min{' '}
                {formatRs(debt.min_payment_cents)}/month
              </Text>
              {payingFor === debt.id ? (
                <View>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="Payment amount (Rs)"
                    keyboardType="decimal-pad"
                    placeholderTextColor={theme.colors.muted}
                  />
                  {error !== '' && <Text style={styles.error}>{error}</Text>}
                  <PrimaryButton label="Log payment" onPress={() => savePayment(debt.id)} />
                  <PrimaryButton
                    label="Cancel"
                    onPress={() => {
                      setPayingFor(null);
                      setAmount('');
                      setError('');
                    }}
                  />
                </View>
              ) : (
                debt.balance_cents > 0 && (
                  <PrimaryButton
                    label="Log a payment"
                    onPress={() => {
                      setPayingFor(debt.id);
                      setAmount('');
                      setError('');
                    }}
                  />
                )
              )}
              <PrimaryButton
                label="Edit debt"
                onPress={() => navigation.navigate('DebtForm', { debtId: debt.id })}
              />
            </Card>
          ))}

          {paidOff.length > 0 && (
            <Text style={styles.subtle}>
              Paid off: {paidOff.map((d) => d.name).join(', ')}
            </Text>
          )}
        </>
      )}

      <PrimaryButton label="Add debt" onPress={() => navigation.navigate('DebtForm')} />
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
  subtle: { fontSize: theme.fontSize.small, color: theme.colors.muted, marginBottom: theme.spacing.sm },
  line: { fontSize: theme.fontSize.body, fontWeight: '600', color: theme.colors.text },
  orderLine: { fontSize: theme.fontSize.body, color: theme.colors.text, marginBottom: 4 },
  input: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: theme.fontSize.body,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  error: { color: theme.colors.danger, fontSize: theme.fontSize.body, marginTop: theme.spacing.sm },
});
