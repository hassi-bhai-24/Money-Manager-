import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Main: undefined;
  TransactionForm: { transactionId?: number } | undefined;
  BudgetForm: { budgetId?: number } | undefined;
  GoalForm: { goalId?: number } | undefined;
  DebtForm: { debtId?: number } | undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Budgets: undefined;
  Goals: undefined;
  Debts: undefined;
  Coach: undefined;
  Settings: undefined;
};

export type TransactionFormProps = NativeStackScreenProps<
  RootStackParamList,
  'TransactionForm'
>;
export type BudgetFormProps = NativeStackScreenProps<RootStackParamList, 'BudgetForm'>;
export type GoalFormProps = NativeStackScreenProps<RootStackParamList, 'GoalForm'>;
export type DebtFormProps = NativeStackScreenProps<RootStackParamList, 'DebtForm'>;
