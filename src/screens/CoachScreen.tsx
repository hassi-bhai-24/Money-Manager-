import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useData } from '../store/DataContext';
import { theme } from '../theme';
import { buildCoachInsights, buildNextActions } from '../utils/coach';
import { currentMonthKey } from '../utils/money';
import { Card, EmptyState, SectionTitle } from '../components/ui';

export default function CoachScreen() {
  const { data } = useData();

  const categoryNames = useMemo(
    () => new Map(data.categories.map((c) => [c.id, `${c.icon} ${c.name}`])),
    [data.categories],
  );

  const insights = useMemo(
    () =>
      buildCoachInsights({
        transactions: data.transactions,
        budgets: data.budgets,
        goals: data.goals,
        debts: data.debts,
        categoryNames,
        monthKey: currentMonthKey(),
      }),
    [data, categoryNames],
  );

  const actions = useMemo(
    () =>
      buildNextActions({
        transactions: data.transactions,
        budgets: data.budgets,
        goals: data.goals,
        debts: data.debts,
        categoryNames,
        monthKey: currentMonthKey(),
      }),
    [data, categoryNames],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Money coach</Text>
      <Text style={styles.disclaimer}>
        On-device coach — guidance from your own records, not financial advice.
        Nothing leaves this phone. No account, no server, no AI service.
      </Text>

      <SectionTitle>What your records say</SectionTitle>
      {insights.map((insight, i) => (
        <Card
          key={i}
          style={
            insight.kind === 'warning'
              ? styles.warningCard
              : insight.kind === 'good'
                ? styles.goodCard
                : undefined
          }
        >
          <Text style={styles.title}>{insight.title}</Text>
          <Text style={styles.body}>{insight.body}</Text>
        </Card>
      ))}

      <SectionTitle>Next actions</SectionTitle>
      {actions.length === 0 ? (
        <EmptyState
          title="Nothing to suggest yet"
          body="Add transactions, budgets, goals, or debts and the coach will suggest concrete next steps."
        />
      ) : (
        actions.map((action, i) => (
          <View key={i} style={styles.actionRow}>
            <Text style={styles.actionNumber}>{i + 1}.</Text>
            <Text style={styles.actionText}>{action}</Text>
          </View>
        ))
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
    marginBottom: theme.spacing.xs,
  },
  disclaimer: {
    fontSize: theme.fontSize.small,
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
    lineHeight: 19,
  },
  title: {
    fontSize: theme.fontSize.body,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  body: { fontSize: theme.fontSize.body, color: theme.colors.text, lineHeight: 21 },
  warningCard: { backgroundColor: theme.colors.warningBg },
  goodCard: { backgroundColor: theme.colors.goodBg },
  actionRow: { flexDirection: 'row', marginBottom: theme.spacing.sm },
  actionNumber: {
    fontSize: theme.fontSize.body,
    fontWeight: '700',
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  actionText: { flex: 1, fontSize: theme.fontSize.body, color: theme.colors.text, lineHeight: 21 },
});
