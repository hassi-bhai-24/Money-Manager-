import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useData } from '../store/DataContext';
import { theme } from '../theme';
import { budgetStatuses } from '../utils/calculations';
import { formatRs, monthLabel } from '../utils/money';
import { Card, EmptyState, PrimaryButton, ProgressBar, SectionTitle } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';

export default function BudgetsScreen() {
  const { data } = useData();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const statuses = useMemo(
    () => budgetStatuses(data.budgets, data.transactions),
    [data.budgets, data.transactions],
  );
  const categoryName = useMemo(
    () => new Map(data.categories.map((c) => [c.id, `${c.icon} ${c.name}`])),
    [data.categories],
  );
  const budgetByCategory = useMemo(
    () => new Map(data.budgets.map((b) => [b.category_id, b])),
    [data.budgets],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Monthly budgets — {monthLabel(new Date().toISOString().slice(0, 7))}</Text>
      <Text style={styles.subtle}>
        Limits reset every month. Spending is counted from this month's saved transactions.
      </Text>

      {statuses.length === 0 ? (
        <EmptyState
          title="No budgets yet"
          body="Add a monthly limit for a category, for example Food & Groceries. The app warns you at 80% and when you go over."
        />
      ) : (
        statuses.map((status) => {
          const budget = budgetByCategory.get(status.categoryId);
          const color = status.overBudget
            ? theme.colors.danger
            : status.nearLimit
              ? theme.colors.warning
              : theme.colors.primary;
          return (
            <Card key={status.categoryId}>
              <Text style={styles.line}>
                {categoryName.get(status.categoryId) ?? 'Category'}
              </Text>
              <Text style={styles.subtle}>
                {formatRs(status.spentCents)} of {formatRs(status.limitCents)}
                {status.overBudget
                  ? ` — over by ${formatRs(status.spentCents - status.limitCents)}`
                  : ` — ${formatRs(status.remainingCents)} left`}
              </Text>
              <ProgressBar ratio={status.usedRatio} color={color} />
              <PrimaryButton
                label="Edit budget"
                onPress={() =>
                  budget && navigation.navigate('BudgetForm', { budgetId: budget.id })
                }
              />
            </Card>
          );
        })
      )}

      <SectionTitle>Categories without a budget</SectionTitle>
      <View style={styles.chipWrap}>
        {data.categories
          .filter(
            (c) =>
              (c.kind === 'expense' || c.kind === 'both') &&
              !budgetByCategory.has(c.id),
          )
          .map((c) => (
            <Text key={c.id} style={styles.plain}>
              {c.icon} {c.name}
            </Text>
          ))}
      </View>

      <PrimaryButton
        label="Add budget"
        onPress={() => navigation.navigate('BudgetForm')}
      />
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
  subtle: { fontSize: theme.fontSize.small, color: theme.colors.muted, marginBottom: theme.spacing.sm },
  line: { fontSize: theme.fontSize.body, fontWeight: '600', color: theme.colors.text },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  plain: { fontSize: theme.fontSize.body, color: theme.colors.text, marginRight: 12 },
});
