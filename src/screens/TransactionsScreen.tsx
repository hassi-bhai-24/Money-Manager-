import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { deleteTransaction } from '../db/database';
import { useData } from '../store/DataContext';
import { theme } from '../theme';
import { formatRs, monthKeyOf } from '../utils/money';
import { Chip, EmptyState, PrimaryButton } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';

export default function TransactionsScreen() {
  const { data, refresh } = useData();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  const categoryName = useMemo(
    () => new Map(data.categories.map((c) => [c.id, `${c.icon} ${c.name}`])),
    [data.categories],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter !== null && tx.category_id !== categoryFilter) return false;
      if (q === '') return true;
      const haystack = `${tx.note} ${categoryName.get(tx.category_id) ?? ''} ${tx.date} ${tx.amount_cents}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [data.transactions, query, categoryFilter, typeFilter, categoryName]);

  const grouped = useMemo(() => {
    const months = new Map<string, typeof filtered>();
    for (const tx of filtered) {
      const key = monthKeyOf(tx.date);
      const list = months.get(key) ?? [];
      list.push(tx);
      months.set(key, list);
    }
    return [...months.entries()];
  }, [filtered]);

  function confirmDelete(id: number) {
    Alert.alert('Delete transaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTransaction(id);
          refresh();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search note, category, or date"
          placeholderTextColor={theme.colors.muted}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label="All types" selected={typeFilter === 'all'} onPress={() => setTypeFilter('all')} />
          <Chip label="Income" selected={typeFilter === 'income'} onPress={() => setTypeFilter('income')} />
          <Chip label="Expenses" selected={typeFilter === 'expense'} onPress={() => setTypeFilter('expense')} />
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label="All categories" selected={categoryFilter === null} onPress={() => setCategoryFilter(null)} />
          {data.categories.map((c) => (
            <Chip
              key={c.id}
              label={`${c.icon} ${c.name}`}
              selected={categoryFilter === c.id}
              onPress={() => setCategoryFilter(categoryFilter === c.id ? null : c.id)}
            />
          ))}
        </ScrollView>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No transactions match"
            body="Add your first income or expense with the button below. It is saved to the on-device database straight away."
          />
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={([key]) => key}
          contentContainerStyle={styles.list}
          renderItem={({ item: [month, items] }) => (
            <View>
              <Text style={styles.monthHeading}>{month}</Text>
              {items.map((tx) => (
                <Pressable
                  key={tx.id}
                  style={styles.row}
                  onPress={() =>
                    navigation.navigate('TransactionForm', { transactionId: tx.id })
                  }
                  onLongPress={() => confirmDelete(tx.id)}
                >
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle}>
                      {categoryName.get(tx.category_id) ?? 'Category'}
                    </Text>
                    <Text style={styles.rowSub}>
                      {tx.date}
                      {tx.note ? ` · ${tx.note}` : ''}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.amount,
                      tx.type === 'income' ? styles.income : styles.expense,
                    ]}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatRs(tx.amount_cents)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        />
      )}

      <View style={styles.footer}>
        <PrimaryButton
          label="Add transaction"
          onPress={() => navigation.navigate('TransactionForm')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  filters: { padding: theme.spacing.lg, paddingBottom: 0 },
  search: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: theme.fontSize.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyWrap: { flex: 1, padding: theme.spacing.lg },
  list: { padding: theme.spacing.lg, paddingTop: theme.spacing.sm },
  monthHeading: {
    fontSize: theme.fontSize.small,
    fontWeight: '700',
    color: theme.colors.muted,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  rowMain: { flex: 1 },
  rowTitle: { fontSize: theme.fontSize.body, fontWeight: '600', color: theme.colors.text },
  rowSub: { fontSize: theme.fontSize.small, color: theme.colors.muted },
  amount: { fontSize: theme.fontSize.body, fontWeight: '700' },
  income: { color: theme.colors.income },
  expense: { color: theme.colors.expense },
  footer: { padding: theme.spacing.lg, paddingTop: 0 },
});
