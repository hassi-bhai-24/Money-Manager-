import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  initDatabase,
  listBudgets,
  listCategories,
  listDebts,
  listGoals,
  listTransactions,
  type Budget,
  type Category,
  type Debt,
  type Goal,
  type Transaction,
} from '../db/database';

export interface AppData {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  goals: Goal[];
  debts: Debt[];
  loaded: boolean;
}

interface DataContextValue {
  data: AppData;
  /** Re-read everything from SQLite. Call after any mutation. */
  refresh: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

const EMPTY: AppData = {
  transactions: [],
  categories: [],
  budgets: [],
  goals: [],
  debts: [],
  loaded: false,
};

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);

  const load = useCallback(() => {
    initDatabase();
    setData({
      transactions: listTransactions(),
      categories: listCategories(),
      budgets: listBudgets(),
      goals: listGoals(),
      debts: listDebts(),
      loaded: true,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo<DataContextValue>(
    () => ({ data, refresh: load }),
    [data, load],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used inside DataProvider');
  return context;
}
