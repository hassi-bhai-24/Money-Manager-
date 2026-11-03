import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { addToGoal } from '../db/database';
import { useData } from '../store/DataContext';
import { theme } from '../theme';
import { goalPace } from '../utils/calculations';
import { formatRs, parseAmountToCents } from '../utils/money';
import { Card, EmptyState, PrimaryButton, ProgressBar } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';

export default function GoalsScreen() {
  const { data, refresh } = useData();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [addingFor, setAddingFor] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  function saveAddition(goalId: number) {
    const cents = parseAmountToCents(amount);
    if (cents === null) {
      setError('Enter an amount greater than zero.');
      return;
    }
    addToGoal(goalId, cents);
    setAmount('');
    setAddingFor(null);
    setError('');
    refresh();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Savings goals</Text>
      <Text style={styles.subtle}>
        Money added to a goal is tracked here. It is not moved out of your balance
        automatically — it is a savings target to watch.
      </Text>

      {data.goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          body="Create a goal with a target amount and an optional date. The coach will tell you how much to save each month to reach it on time."
        />
      ) : (
        data.goals.map((goal) => {
          const pace = goalPace(goal);
          return (
            <Card key={goal.id}>
              <Text style={styles.line}>{goal.name}</Text>
              <Text style={styles.subtle}>
                {formatRs(goal.saved_cents)} of {formatRs(goal.target_cents)}
                {goal.target_date ? ` · target ${goal.target_date}` : ''}
              </Text>
              <ProgressBar ratio={pace.progressRatio} />
              <Text style={styles.subtle}>
                {pace.reached
                  ? 'Goal reached.'
                  : pace.overdue
                    ? `${formatRs(pace.remainingCents)} still needed — target date passed.`
                    : pace.requiredMonthlyCents !== null
                      ? `${formatRs(pace.remainingCents)} to go · save ${formatRs(pace.requiredMonthlyCents)} per month to finish on time.`
                      : `${formatRs(pace.remainingCents)} to go.`}
              </Text>
              {goal.note !== '' && <Text style={styles.subtle}>{goal.note}</Text>}
              {addingFor === goal.id ? (
                <View>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="Amount to add (Rs)"
                    keyboardType="decimal-pad"
                    placeholderTextColor={theme.colors.muted}
                  />
                  {error !== '' && <Text style={styles.error}>{error}</Text>}
                  <PrimaryButton label="Add savings" onPress={() => saveAddition(goal.id)} />
                  <PrimaryButton
                    label="Cancel"
                    onPress={() => {
                      setAddingFor(null);
                      setAmount('');
                      setError('');
                    }}
                  />
                </View>
              ) : (
                <PrimaryButton
                  label="Add savings"
                  onPress={() => {
                    setAddingFor(goal.id);
                    setAmount('');
                    setError('');
                  }}
                />
              )}
              <PrimaryButton
                label="Edit goal"
                onPress={() => navigation.navigate('GoalForm', { goalId: goal.id })}
              />
            </Card>
          );
        })
      )}

      <PrimaryButton label="New goal" onPress={() => navigation.navigate('GoalForm')} />
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
