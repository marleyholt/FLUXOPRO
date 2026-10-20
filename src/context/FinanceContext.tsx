import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  AppData,
  CreditCard,
  Expense,
  Income,
  MonthSummary,
  ScopeType,
  VariableExpenseLog,
  CardTransaction,
  AppSettings,
  CsvParsedItem,
} from '../types/finance';
import {
  loadAppData,
  saveAppData,
  saveFirebaseConfig,
} from '../services/dataService';
import { INITIAL_SEED_DATA } from '../data/seedData';
import { calculateForecast } from '../utils/calculations';
import { convertCsvItemToTransaction } from '../utils/csvParser';

interface FinanceContextType {
  data: AppData;
  loading: boolean;
  isUsingFirebase: boolean;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  scopeFilter: ScopeType;
  setScopeFilter: (s: ScopeType) => void;
  activeTab: 'dashboard' | 'matrix' | 'monthly' | 'cards' | 'variables' | 'raiox';
  setActiveTab: (tab: 'dashboard' | 'matrix' | 'monthly' | 'cards' | 'variables' | 'raiox') => void;
  summaries: MonthSummary[];
  currentMonthSummary: MonthSummary | undefined;
  
  // Actions
  addIncome: (income: Omit<Income, 'id'>) => void;
  updateIncome: (income: Income) => void;
  deleteIncome: (id: string) => void;
  
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  toggleExpensePaid: (expenseId: string, month: string) => void;
  toggleExpenseReview: (expenseId: string) => void;

  addCardTransaction: (tx: Omit<CardTransaction, 'id'>) => void;
  updateCardTransaction: (tx: CardTransaction) => void;
  deleteCardTransaction: (id: string) => void;
  toggleCardTransactionReview: (id: string) => void;
  setCardRealInvoice: (cardId: string, month: string, realTotal: number | undefined) => void;

  addVariableExpenseLog: (log: Omit<VariableExpenseLog, 'id'>) => void;
  deleteVariableExpenseLog: (id: string) => void;
  updateBudgetEnvelopeTarget: (envelopeId: string, newTarget: number) => void;

  importCsvTransactions: (
    cardId: string,
    invoiceMonth: string,
    items: CsvParsedItem[],
    updateRealInvoice: boolean
  ) => void;

  toggleChecklistStep: (stepId: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  restoreSeedData: () => void;
  importBackupData: (newData: AppData) => void;
  saveFirebaseSettings: (configJson: string | null) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(INITIAL_SEED_DATA);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUsingFirebase, setIsUsingFirebase] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('2025-12');
  const [scopeFilter, setScopeFilter] = useState<ScopeType>('ALL');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matrix' | 'monthly' | 'cards' | 'variables' | 'raiox'>('dashboard');

  // Load initial data
  useEffect(() => {
    let isMounted = true;
    loadAppData().then(({ data: loadedData, isUsingFirebase: remote }) => {
      if (isMounted) {
        setData(loadedData);
        setIsUsingFirebase(remote);
        setSelectedMonth(loadedData.settings.startMonth || '2025-12');
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Save changes
  const persist = useCallback((newData: AppData) => {
    setData(newData);
    saveAppData(newData);
  }, []);

  // Calculate rolling forecast
  const summaries = useMemo(() => {
    return calculateForecast(data, scopeFilter, 13);
  }, [data, scopeFilter]);

  const currentMonthSummary = useMemo(() => {
    return summaries.find((s) => s.month === selectedMonth) || summaries[0];
  }, [summaries, selectedMonth]);

  // Income actions
  const addIncome = useCallback(
    (income: Omit<Income, 'id'>) => {
      const newIncome: Income = {
        ...income,
        id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      persist({ ...data, incomes: [...data.incomes, newIncome] });
    },
    [data, persist]
  );

  const updateIncome = useCallback(
    (income: Income) => {
      persist({
        ...data,
        incomes: data.incomes.map((inc) => (inc.id === income.id ? income : inc)),
      });
    },
    [data, persist]
  );

  const deleteIncome = useCallback(
    (id: string) => {
      persist({
        ...data,
        incomes: data.incomes.filter((inc) => inc.id !== id),
      });
    },
    [data, persist]
  );

  // Expense actions
  const addExpense = useCallback(
    (expense: Omit<Expense, 'id'>) => {
      const newExp: Expense = {
        ...expense,
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      persist({
        ...data,
        expenses: [...data.expenses, newExp],
        settings: {
          ...data.settings,
          lastExpenseLogged: {
            description: newExp.title,
            amount: newExp.amount,
            timestamp: new Date().toISOString(),
          },
        },
      });
    },
    [data, persist]
  );

  const updateExpense = useCallback(
    (expense: Expense) => {
      persist({
        ...data,
        expenses: data.expenses.map((exp) => (exp.id === expense.id ? expense : exp)),
      });
    },
    [data, persist]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      persist({
        ...data,
        expenses: data.expenses.filter((exp) => exp.id !== id),
      });
    },
    [data, persist]
  );

  const toggleExpensePaid = useCallback(
    (expenseId: string, month: string) => {
      const updated = data.expenses.map((exp) => {
        if (exp.id === expenseId) {
          const current = !!exp.paidMonths?.[month];
          return {
            ...exp,
            paidMonths: {
              ...(exp.paidMonths || {}),
              [month]: !current,
            },
          };
        }
        return exp;
      });
      persist({ ...data, expenses: updated });
    },
    [data, persist]
  );

  const toggleExpenseReview = useCallback(
    (expenseId: string) => {
      const updated = data.expenses.map((exp) => {
        if (exp.id === expenseId) {
          return { ...exp, needsReview: !exp.needsReview };
        }
        return exp;
      });
      persist({ ...data, expenses: updated });
    },
    [data, persist]
  );

  // Card Transaction actions
  const addCardTransaction = useCallback(
    (tx: Omit<CardTransaction, 'id'>) => {
      const newTx: CardTransaction = {
        ...tx,
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      persist({ ...data, cardTransactions: [...data.cardTransactions, newTx] });
    },
    [data, persist]
  );

  const updateCardTransaction = useCallback(
    (tx: CardTransaction) => {
      persist({
        ...data,
        cardTransactions: data.cardTransactions.map((t) => (t.id === tx.id ? tx : t)),
      });
    },
    [data, persist]
  );

  const deleteCardTransaction = useCallback(
    (id: string) => {
      persist({
        ...data,
        cardTransactions: data.cardTransactions.filter((t) => t.id !== id),
      });
    },
    [data, persist]
  );

  const toggleCardTransactionReview = useCallback(
    (id: string) => {
      persist({
        ...data,
        cardTransactions: data.cardTransactions.map((t) =>
          t.id === id ? { ...t, needsReview: !t.needsReview } : t
        ),
      });
    },
    [data, persist]
  );

  const setCardRealInvoice = useCallback(
    (cardId: string, month: string, realTotal: number | undefined) => {
      const updatedCards = data.creditCards.map((card) => {
        if (card.id === cardId) {
          const currentMap = { ...(card.realInvoiceTotalByMonth || {}) };
          if (realTotal === undefined || isNaN(realTotal) || realTotal <= 0) {
            delete currentMap[month];
          } else {
            currentMap[month] = realTotal;
          }
          return { ...card, realInvoiceTotalByMonth: currentMap };
        }
        return card;
      });
      persist({ ...data, creditCards: updatedCards });
    },
    [data, persist]
  );

  // Variable Expense Logs
  const addVariableExpenseLog = useCallback(
    (log: Omit<VariableExpenseLog, 'id'>) => {
      const newLog: VariableExpenseLog = {
        ...log,
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      persist({
        ...data,
        variableExpenseLogs: [...data.variableExpenseLogs, newLog],
        settings: {
          ...data.settings,
          lastExpenseLogged: {
            description: newLog.description,
            amount: newLog.amount,
            timestamp: new Date().toISOString(),
          },
        },
      });
    },
    [data, persist]
  );

  const deleteVariableExpenseLog = useCallback(
    (id: string) => {
      persist({
        ...data,
        variableExpenseLogs: data.variableExpenseLogs.filter((l) => l.id !== id),
      });
    },
    [data, persist]
  );

  const updateBudgetEnvelopeTarget = useCallback(
    (envelopeId: string, newTarget: number) => {
      const updated = data.budgetEnvelopes.map((env) =>
        env.id === envelopeId ? { ...env, targetAmount: newTarget } : env
      );
      persist({ ...data, budgetEnvelopes: updated });
    },
    [data, persist]
  );

  const toggleChecklistStep = useCallback(
    (stepId: string) => {
      const current = !!data.settings.checklistState?.[stepId];
      persist({
        ...data,
        settings: {
          ...data.settings,
          checklistState: {
            ...(data.settings.checklistState || {}),
            [stepId]: !current,
          },
        },
      });
    },
    [data, persist]
  );

  // CSV Import approval
  const importCsvTransactions = useCallback(
    (
      cardId: string,
      invoiceMonth: string,
      items: CsvParsedItem[],
      updateRealInvoice: boolean
    ) => {
      const approvedItems = items.filter((item) => item.selected);
      const newTransactions = approvedItems.map((item) =>
        convertCsvItemToTransaction(item, cardId, invoiceMonth)
      );

      let updatedCards = [...data.creditCards];
      if (updateRealInvoice) {
        const totalApproved = approvedItems.reduce((acc, curr) => acc + curr.amount, 0);
        updatedCards = updatedCards.map((c) => {
          if (c.id === cardId) {
            return {
              ...c,
              realInvoiceTotalByMonth: {
                ...(c.realInvoiceTotalByMonth || {}),
                [invoiceMonth]: totalApproved,
              },
            };
          }
          return c;
        });
      }

      persist({
        ...data,
        creditCards: updatedCards,
        cardTransactions: [...data.cardTransactions, ...newTransactions],
      });
    },
    [data, persist]
  );

  // Settings & Backups
  const updateSettings = useCallback(
    (settings: Partial<AppSettings>) => {
      persist({
        ...data,
        settings: {
          ...data.settings,
          ...settings,
        },
      });
    },
    [data, persist]
  );

  const restoreSeedData = useCallback(() => {
    persist(INITIAL_SEED_DATA);
    setSelectedMonth('2025-12');
  }, [persist]);

  const importBackupData = useCallback(
    (newData: AppData) => {
      persist(newData);
      if (newData.settings.startMonth) {
        setSelectedMonth(newData.settings.startMonth);
      }
    },
    [persist]
  );

  const saveFirebaseSettings = useCallback(
    async (configJson: string | null) => {
      saveFirebaseConfig(configJson);
      setLoading(true);
      const result = await loadAppData();
      setData(result.data);
      setIsUsingFirebase(result.isUsingFirebase);
      setLoading(false);
    },
    []
  );

  return (
    <FinanceContext.Provider
      value={{
        data,
        loading,
        isUsingFirebase,
        selectedMonth,
        setSelectedMonth,
        scopeFilter,
        setScopeFilter,
        activeTab,
        setActiveTab,
        summaries,
        currentMonthSummary,
        addIncome,
        updateIncome,
        deleteIncome,
        addExpense,
        updateExpense,
        deleteExpense,
        toggleExpensePaid,
        toggleExpenseReview,
        addCardTransaction,
        updateCardTransaction,
        deleteCardTransaction,
        toggleCardTransactionReview,
        setCardRealInvoice,
        addVariableExpenseLog,
        deleteVariableExpenseLog,
        updateBudgetEnvelopeTarget,
        importCsvTransactions,
        toggleChecklistStep,
        updateSettings,
        restoreSeedData,
        importBackupData,
        saveFirebaseSettings,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
