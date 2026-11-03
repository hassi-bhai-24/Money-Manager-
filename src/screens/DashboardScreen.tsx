import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useData } from '../store/DataContext';
import { theme } from '../theme';
import {
  budgetStatuses,
  expenseByCategory,
  summarizeMonth,
  totalBalance,
} from '../utils/calculations';
import { formatRs, monthLabel } from '../utils/money';
import { Card, EmptyState, PrimaryButton, SectionTitle } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';

export default function DashboardScreen() {
  const { data } = useData();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const summary = useMemo(
    () => summarizeMonth(data.transactions),
    [data.transactions],
  );
  const balance = useMemo(() => totalBalance(data.transactions), [data.transactions]);
  const topCategories = useMemo(
    () => expenseByCategory(data.transactions).slice(0, 3),
    [data.transactions],
  );
  const warnings = useMemo(
    () =>
      budgetStatuses(data.budgets, data.transactions).filter(
        (s) => s.overBudget || s.nearLimit,
      ),
    [data.budgets, data.transactions],
  );
  const categoryName = useMemo(
    () => new Map(data.categories.map((c) => [c.id, `${c.icon} ${c.name}`])),
    [data.categories],
  );
  const recent = useMemo(() => data.transactions.slice(0, 5), [data.transactions]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Liquid Ledger Balance</Text>
      <Text style={[styles.balance, balance < 0 && styles.negative]}>
        {formatRs(balance)}
      </Text>
      <Text style={styles.subtle}>
        All-time balance from every record saved on this device.
      </Text>

      <Card>
        <Text style={styles.cardTitle}>{monthLabel(summary.monthKey)}</Text>
        <View style={styles.row}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Income</Text>
            <Text style={[styles.statValue, styles.income]}>{formatRs(summary.incomeCents)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Spent</Text>
            <Text style={[styles.statValue, styles.expense]}>{formatRs(summary.expenseCents)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Surplus</Text>
            <Text style={styles.statValue}>{formatRs(summary.surplusCents)}</Text>
          </View>
        </View>
      </Card>

      {warnings.length > 0 && (
        <Card style={styles.warningCard}>
          <Text style={styles.cardTitle}>Budget warnings</Text>
          {warnings.map((w) => (
            <Text key={w.categoryId} style={styles.line}>
              {categoryName.get(w.categoryId) ?? 'Category'}: spent{' '}
              {formatRs(w.spentCents)} of {formatRs(w.limitCents)}
              {w.overBudget ? ' — over budget' : ' — nearly at the limit'}.
            </Text>
          ))}
        </Card>
      )}

      <SectionTitle>Largest spending this month</SectionTitle>
      {topCategories.length === 0 ? (
        <EmptyState
          title="No spending recorded this month yet"
          body="Add your first expense and it will show up here."
        />
      ) : (
        topCategories.map((item) => (
          <Card key={item.categoryId}>
            <Text style={styles.line}>
              {categoryName.get(item.categoryId) ?? 'Category'} —{' '}
              {formatRs(item.totalCents)} ({Math.round(item.share * 100)}%)
            </Text>
          </Card>
        ))
      )}

      <SectionTitle>Recent transactions</SectionTitle>
      {recent.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          body="Your recent income and expenses will appear here once you add them. Everything is saved on this device."
        />
      ) : (
        recent.map((tx) => (
          <Card key={tx.id}>
            <Text style={styles.line}>
              {tx.type === 'income' ? '＋' : '－'} {formatRs(tx.amount_cents)} ·{' '}
              {categoryName.get(tx.category_id) ?? 'Category'}
            </Text>
            <Text style={styles.subtle}>
              {tx.date}
              {tx.note ? ` · ${tx.note}` : ''}
            </Text>
          </Card>
        ))
      )}

      <PrimaryButton
        label="Add income or expense"
        onPress={() => navigation.navigate('TransactionForm')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingBottom: 32 },
  greeting: {
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.colors.muted,
  },
  balance: {
    fontSize: theme.fontSize.hero,
    fontWeight: '800',
    color: theme.colors.text,
    marginVertical: theme.spacing.xs,
  },
  negative: { color: theme.colors.expense },
  subtle: { fontSize: theme.fontSize.small, color: theme.colors.muted },
  cardTitle: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  row: { flexDirection: 'row', gap: theme.spacing.md },
  stat: { flex: 1 },
  statLabel: { fontSize: theme.fontSize.small, color: theme.colors.muted },
  statValue: { fontSize: theme.fontSize.body, fontWeight: '700', color: theme.colors.text },
  income: { color: theme.colors.income },
  expense: { color: theme.colors.expense },
  warningCard: { backgroundColor: theme.colors.warningBg },
  line: { fontSize: theme.fontSize.body, color: theme.colors.text, marginBottom: 4 },
});
