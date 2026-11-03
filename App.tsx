import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DataProvider } from './src/store/DataContext';
import { hasPin } from './src/security/pin';
import { theme } from './src/theme';
import DashboardScreen from './src/screens/DashboardScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import BudgetsScreen from './src/screens/BudgetsScreen';
import GoalsScreen from './src/screens/GoalsScreen';
import DebtsScreen from './src/screens/DebtsScreen';
import CoachScreen from './src/screens/CoachScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TransactionFormScreen from './src/screens/TransactionFormScreen';
import {
  BudgetFormScreen,
  DebtFormScreen,
  GoalFormScreen,
} from './src/screens/FormsScreens';
import PinLockScreen from './src/screens/PinLockScreen';
import type { MainTabParamList, RootStackParamList } from './src/navigation/types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.accent },
        headerTintColor: theme.colors.text,
        tabBarActiveTintColor: theme.colors.primary,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Budgets" component={BudgetsScreen} />
      <Tab.Screen name="Goals" component={GoalsScreen} />
      <Tab.Screen name="Debts" component={DebtsScreen} />
      <Tab.Screen name="Coach" component={CoachScreen} options={{ title: 'Coach' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [pinState, setPinState] = useState<'checking' | 'locked' | 'open'>('checking');

  useEffect(() => {
    hasPin()
      .then((set) => setPinState(set ? 'locked' : 'open'))
      .catch(() => setPinState('open'));
  }, []);

  if (pinState === 'checking') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (pinState === 'locked') {
    return <PinLockScreen onUnlocked={() => setPinState('open')} />;
  }

  return (
    <DataProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.accent },
            headerTintColor: theme.colors.text,
          }}
        >
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="TransactionForm"
            component={TransactionFormScreen}
            options={{ title: 'Transaction' }}
          />
          <Stack.Screen name="BudgetForm" component={BudgetFormScreen} options={{ title: 'Budget' }} />
          <Stack.Screen name="GoalForm" component={GoalFormScreen} options={{ title: 'Goal' }} />
          <Stack.Screen name="DebtForm" component={DebtFormScreen} options={{ title: 'Debt' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </DataProvider>
  );
}
