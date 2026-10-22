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
  VariableBudgetCategory,
  MonthlyClosingRecord,
  ScheduledBillReminder,
  PushedDebtBill,
  ExpenseFrequency,
  BankAccountConfig,
  BankStatementUploadRecord,
  InvoicePaymentStatus,
} from '../types/finance';
import {
  loadAppData,
  saveAppData,
  saveAppDataToFirebase,
  saveFirebaseConfig,
} from '../services/dataService';
import { INITIAL_SEED_DATA } from '../data/seedData';
import { calculateForecast, getMonthDiff, getMonthLabel } from '../utils/calculations';
import { convertCsvItemToTransaction } from '../utils/csvParser';

interface FinanceContextType {
  data: AppData;
  loading: boolean;
  isUsingFirebase: boolean;
  hasUnsavedChanges: boolean;
  isSavingToFirebase: boolean;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  vigenteMonth: string;
  setVigenteMonth: (m: string) => void;
  scopeFilter: ScopeType;
  setScopeFilter: (s: ScopeType) => void;
  activeTab: 'dashboard' | 'matrix' | 'monthly' | 'cards' | 'variables' | 'raiox' | 'closing' | 'simulation' | 'settings' | 'config';
  setActiveTab: (tab: 'dashboard' | 'matrix' | 'monthly' | 'cards' | 'variables' | 'raiox' | 'closing' | 'simulation' | 'settings' | 'config') => void;
  summaries: MonthSummary[];
  currentMonthSummary: MonthSummary | undefined;
  
  // Sync & Cloud Actions
  saveToFirebase: (dataOverride?: AppData) => Promise<{ success: boolean; error?: string }>;
  discardUnsavedChanges: () => Promise<void>;

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
  bulkUpdateCardTransactions: (txIds: Set<string> | string[], updates: Partial<CardTransaction>) => void;
  deleteCardTransaction: (id: string) => void;
  bulkDeleteCardTransactions: (txIds: Set<string> | string[]) => void;
  toggleCardTransactionReview: (id: string) => void;
  setCardRealInvoice: (
    cardId: string,
    month: string,
    realTotal: number | undefined,
    paymentDate?: string,
    paymentStatus?: InvoicePaymentStatus,
    paidAmount?: number,
    paymentMonth?: string
  ) => void;
  updateCreditCardTrend: (cardId: string, manualProjectedTrend: number | undefined) => void;

  addVariableExpenseLog: (log: Omit<VariableExpenseLog, 'id'>) => void;
  updateVariableExpenseLog: (log: VariableExpenseLog) => void;
  deleteVariableExpenseLog: (id: string) => void;
  createBudgetCategory: (category: Omit<VariableBudgetCategory, 'id'>) => string;
  updateBudgetEnvelopeTarget: (envelopeId: string, newTarget: number) => void;
  updateBudgetEnvelope: (envelopeId: string, name: string, targetAmount: number) => void;
  deleteBudgetEnvelope: (envelopeId: string) => void;
  addBudgetSubItem: (categoryId: string, name: string, amount: number) => void;
  updateBudgetSubItem: (categoryId: string, subItemId: string, name: string, amount: number) => void;
  deleteBudgetSubItem: (categoryId: string, subItemId: string) => void;
  markSubItemAsSaved: (subItemId: string, month: string) => void;

  addOrIncrementExpense: (params: {
    title: string;
    amount: number;
    category: string;
    scope: 'PF' | 'PJ';
    month: string;
    frequency: ExpenseFrequency;
    installmentsCount?: number;
    notes?: string;
    targetEnvelopeAmount?: number;
  }) => void;

  // Monthly Closing Actions & Month Locking
  isMonthClosed: (month: string) => boolean;
  closeMonth: (month: string) => void;
  reopenMonth: (month: string, reason?: string) => void;
  saveMonthlyClosing: (record: MonthlyClosingRecord, andSetVigente?: boolean) => void;
  saveBankStatementResult: (
    month: string,
    statement: BankStatementUploadRecord,
    applyBalanceToClosing: boolean
  ) => void;
  scheduleBillPayment: (
    expenseId: string,
    expenseTitle: string,
    amount: number,
    month: string,
    scheduledDate: string
  ) => void;
  pushBillDebt: (
    expenseId: string,
    expenseTitle: string,
    amount: number,
    month: string,
    targetMonth: string,
    type?: 'expense' | 'card' | 'subitem',
    cardId?: string,
    reason?: string
  ) => void;
  resolveScheduledReminder: (month: string, reminderId: string) => void;
  resolvePushedDebt: (month: string, pushedDebtId: string) => void;

  // Banks & Cards Management
  addBankAccount: (bank: Omit<BankAccountConfig, 'id'>) => void;
  updateBankAccount: (bank: BankAccountConfig) => void;
  deleteBankAccount: (id: string) => void;

  addCreditCard: (card: Omit<CreditCard, 'id'>) => void;
  updateCreditCard: (card: CreditCard) => void;
  deleteCreditCard: (id: string) => void;

  importCsvTransactions: (
    cardId: string,
    invoiceMonth: string,
    items: CsvParsedItem[],
    updateRealInvoice: boolean,
    paymentDate?: string
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSavingToFirebase, setIsSavingToFirebase] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('2025-12');
  const [scopeFilter, setScopeFilter] = useState<ScopeType>('ALL');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matrix' | 'monthly' | 'cards' | 'variables' | 'raiox' | 'closing' | 'simulation' | 'settings' | 'config'>('dashboard');

// Sanitizes envelopes and logs to heal phantom ID categories and prevent duplicates
function sanitizeAppData(loaded: AppData): AppData {
  if (!loaded) return loaded;
  const envelopes = [...(loaded.budgetEnvelopes || [])];
  const legitEnvelopes = envelopes.filter((e) => !e.name.startsWith('env-'));
  
  const idRemap: Record<string, string> = {};
  envelopes.forEach((e) => {
    if (e.name.startsWith('env-')) {
      const match = legitEnvelopes.find((legit) => legit.id === e.name || legit.id === e.id);
      if (match) {
        idRemap[e.id] = match.id;
        idRemap[e.name] = match.id;
      }
    }
  });

  const cleanedEnvelopes = envelopes.reduce((acc: VariableBudgetCategory[], env) => {
    if (env.name.startsWith('env-')) {
      const match = legitEnvelopes.find((l) => l.id === env.name || l.id === env.id);
      if (match) {
        return acc;
      } else {
        acc.push({ ...env, name: 'Despesas Gerais' });
      }
    } else {
      const dup = acc.find((x) => x.name.trim().toLowerCase() === env.name.trim().toLowerCase());
      if (!dup) {
        acc.push(env);
      } else {
        idRemap[env.id] = dup.id;
      }
    }
    return acc;
  }, []);

  const cleanedLogs = (loaded.variableExpenseLogs || []).map((log) => {
    let catId = log.categoryId;
    if (idRemap[catId]) {
      catId = idRemap[catId];
    }
    const matchByName = cleanedEnvelopes.find(
      (e) => e.name.trim().toLowerCase() === catId?.trim().toLowerCase()
    );
    if (matchByName) {
      catId = matchByName.id;
    }
    return { ...log, categoryId: catId };
  });

  return {
    ...loaded,
    budgetEnvelopes: cleanedEnvelopes,
    variableExpenseLogs: cleanedLogs,
  };
}

  // Load initial data
  useEffect(() => {
    let isMounted = true;
    loadAppData().then(({ data: loadedData, isUsingFirebase: remote }) => {
      if (isMounted) {
        const sanitized = sanitizeAppData(loadedData);
        setData(sanitized);
        setIsUsingFirebase(remote);
        setSelectedMonth(sanitized.settings.startMonth || '2025-12');
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Save changes locally in browser cache and mark unsaved state
  const persistLocally = useCallback(
    (updater: AppData | ((prev: AppData) => AppData)) => {
      setData((prev) => {
        const rawNext = typeof updater === 'function' ? updater(prev) : updater;
        const nextData = sanitizeAppData(rawNext);
        saveAppData(nextData);
        return nextData;
      });
      setHasUnsavedChanges(true);
    },
    []
  );

  // Sync to Firebase on demand
  const saveToFirebase = useCallback(
    async (dataOverride?: AppData): Promise<{ success: boolean; error?: string }> => {
      setIsSavingToFirebase(true);
      const toSave = dataOverride || data;
      const result = await saveAppDataToFirebase(toSave);
      setIsSavingToFirebase(false);
      if (result.success) {
        setHasUnsavedChanges(false);
      }
      return result;
    },
    [data]
  );

  // Discard local changes and reload from remote
  const discardUnsavedChanges = useCallback(async () => {
    setLoading(true);
    const result = await loadAppData();
    setData(result.data);
    setIsUsingFirebase(result.isUsingFirebase);
    setHasUnsavedChanges(false);
    setLoading(false);
  }, []);

  const vigenteMonth = data.settings.vigenteMonth || data.settings.startMonth || '2026-01';

  const setVigenteMonth = useCallback(
    (m: string) => {
      setData((prevData) => {
        const updatedData: AppData = {
          ...prevData,
          settings: {
            ...prevData.settings,
            vigenteMonth: m,
          },
        };
        saveAppData(updatedData);
        return updatedData;
      });
      setHasUnsavedChanges(true);
    },
    []
  );

  // Calculate rolling forecast
  const summaries = useMemo(() => {
    return calculateForecast(data, scopeFilter, 13);
  }, [data, scopeFilter]);

  const currentMonthSummary = useMemo(() => {
    return summaries.find((s) => s.month === selectedMonth) || summaries[0];
  }, [summaries, selectedMonth]);

  // Month locking check
  const isMonthClosed = useCallback(
    (month: string) => {
      const currentVigente = data.settings.vigenteMonth || data.settings.startMonth || '2026-10';
      // 1. O Mês Vigente NUNCA fica travado para edições!
      if (month === currentVigente) {
        return false;
      }

      // 2. Se o mês foi explicitamente reaberto pelo usuário
      const closing = data.monthlyClosings?.[month];
      if (closing && closing.isClosed === false && closing.reopenedAt) {
        return false;
      }

      // 3. Se tiver marcação explícita de fechado no histórico
      if (closing?.isClosed) {
        return true;
      }

      // 4. Meses anteriores ao Mês Vigente ficam travados por padrão
      if (getMonthDiff(month, currentVigente) > 0) {
        return true;
      }

      // 5. Meses futuros permanecem abertos para planejamento e projeção
      return false;
    },
    [data.monthlyClosings, data.settings.vigenteMonth, data.settings.startMonth]
  );

  // Income actions
  const addIncome = useCallback(
    (income: Omit<Income, 'id'>) => {
      const newIncome: Income = {
        ...income,
        id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      persistLocally({ ...data, incomes: [...data.incomes, newIncome] });
    },
    [data, persistLocally]
  );

  const updateIncome = useCallback(
    (income: Income) => {
      persistLocally({
        ...data,
        incomes: data.incomes.map((inc) => (inc.id === income.id ? income : inc)),
      });
    },
    [data, persistLocally]
  );

  const deleteIncome = useCallback(
    (id: string) => {
      persistLocally({
        ...data,
        incomes: data.incomes.filter((inc) => inc.id !== id),
      });
    },
    [data, persistLocally]
  );

  // Expense actions
  const addExpense = useCallback(
    (expense: Omit<Expense, 'id'>) => {
      const newExp: Expense = {
        ...expense,
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      persistLocally({
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
    [data, persistLocally]
  );

  const updateExpense = useCallback(
    (expense: Expense) => {
      persistLocally({
        ...data,
        expenses: data.expenses.map((exp) => (exp.id === expense.id ? expense : exp)),
      });
    },
    [data, persistLocally]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      const exp = data.expenses.find((e) => e.id === id);
      if (exp) {
        // Prevent deleting if it was paid in a closed month
        const linkedToClosed = Object.keys(data.monthlyClosings || {}).some(
          (m) => data.monthlyClosings?.[m]?.isClosed && exp.paidMonths?.[m]
        );
        if (linkedToClosed) {
          console.warn('Esta despesa possui histórico em mês já fechado e não pode ser excluída.');
          return;
        }
      }
      persistLocally({
        ...data,
        expenses: data.expenses.filter((exp) => exp.id !== id),
      });
    },
    [data, persistLocally]
  );

  const toggleExpensePaid = useCallback(
    (expenseId: string, month: string) => {
      if (isMonthClosed(month)) {
        console.warn(`Mês ${month} está fechado. Operação bloqueada.`);
        return;
      }
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
      persistLocally({ ...data, expenses: updated });
    },
    [data, isMonthClosed, persistLocally]
  );

  const toggleExpenseReview = useCallback(
    (expenseId: string) => {
      const updated = data.expenses.map((exp) => {
        if (exp.id === expenseId) {
          return { ...exp, needsReview: !exp.needsReview };
        }
        return exp;
      });
      persistLocally({ ...data, expenses: updated });
    },
    [data, persistLocally]
  );

  // Card Transaction actions
  const addCardTransaction = useCallback(
    (tx: Omit<CardTransaction, 'id'>) => {
      const monthToCheck = tx.startMonth;
      if (monthToCheck && isMonthClosed(monthToCheck)) {
        console.warn(`Mês ${monthToCheck} está fechado. Operação bloqueada.`);
        return;
      }
      const newTx: CardTransaction = {
        ...tx,
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      persistLocally({ ...data, cardTransactions: [...data.cardTransactions, newTx] });
    },
    [data, isMonthClosed, persistLocally]
  );

  const updateCardTransaction = useCallback(
    (tx: CardTransaction) => {
      const monthToCheck = tx.startMonth;
      if (monthToCheck && isMonthClosed(monthToCheck)) {
        console.warn(`Mês ${monthToCheck} está fechado. Operação bloqueada.`);
        return;
      }
      persistLocally({
        ...data,
        cardTransactions: data.cardTransactions.map((t) => (t.id === tx.id ? tx : t)),
      });
    },
    [data, isMonthClosed, persistLocally]
  );

  const bulkUpdateCardTransactions = useCallback(
    (txIds: Set<string> | string[], updates: Partial<CardTransaction>) => {
      const idSet = new Set(txIds);
      const updated = data.cardTransactions.map((t) => {
        if (idSet.has(t.id)) {
          return { ...t, ...updates };
        }
        return t;
      });
      persistLocally({ ...data, cardTransactions: updated });
    },
    [data, persistLocally]
  );

  const deleteCardTransaction = useCallback(
    (id: string) => {
      const tx = data.cardTransactions.find((t) => t.id === id);
      const monthToCheck = tx?.startMonth;
      if (monthToCheck && isMonthClosed(monthToCheck)) {
        console.warn(`Mês ${monthToCheck} está fechado. Operação bloqueada.`);
        return;
      }
      persistLocally({
        ...data,
        cardTransactions: data.cardTransactions.filter((t) => t.id !== id),
      });
    },
    [data, isMonthClosed, persistLocally]
  );

  const bulkDeleteCardTransactions = useCallback(
    (txIds: Set<string> | string[]) => {
      const idSet = new Set(txIds);
      const updated = data.cardTransactions.filter((t) => !idSet.has(t.id));
      persistLocally({ ...data, cardTransactions: updated });
    },
    [data, persistLocally]
  );

  const toggleCardTransactionReview = useCallback(
    (id: string) => {
      persistLocally({
        ...data,
        cardTransactions: data.cardTransactions.map((t) =>
          t.id === id ? { ...t, needsReview: !t.needsReview } : t
        ),
      });
    },
    [data, persistLocally]
  );

  const setCardRealInvoice = useCallback(
    (
      cardId: string,
      month: string,
      realTotal: number | undefined,
      paymentDate?: string,
      paymentStatus?: InvoicePaymentStatus,
      paidAmount?: number,
      paymentMonth?: string
    ) => {
      if (isMonthClosed(month)) {
        console.warn(`Mês ${month} está fechado. Operação bloqueada.`);
        return;
      }
      const updatedCards = data.creditCards.map((card) => {
        if (card.id === cardId) {
          const currentMap = { ...(card.realInvoiceTotalByMonth || {}) };
          const dateMap = { ...(card.invoicePaymentDateByMonth || {}) };
          const statusMap = { ...(card.invoicePaymentStatusByMonth || {}) };
          const paidMap = { ...(card.invoicePaidAmountByMonth || {}) };
          const payMonthMap = { ...(card.invoicePaymentMonthByMonth || {}) };

          if (realTotal === undefined || isNaN(realTotal) || realTotal <= 0) {
            delete currentMap[month];
          } else {
            currentMap[month] = realTotal;
          }

          if (paymentDate) {
            dateMap[month] = paymentDate;
          } else {
            delete dateMap[month];
          }

          if (paymentStatus) {
            statusMap[month] = paymentStatus;
          } else {
            delete statusMap[month];
          }

          if (paidAmount !== undefined && !isNaN(paidAmount) && paidAmount > 0) {
            paidMap[month] = paidAmount;
          } else {
            delete paidMap[month];
          }

          if (paymentMonth && paymentMonth !== month) {
            payMonthMap[month] = paymentMonth;
          } else {
            delete payMonthMap[month];
          }

          return {
            ...card,
            realInvoiceTotalByMonth: currentMap,
            invoicePaymentDateByMonth: dateMap,
            invoicePaymentStatusByMonth: statusMap,
            invoicePaidAmountByMonth: paidMap,
            invoicePaymentMonthByMonth: payMonthMap,
          };
        }
        return card;
      });
      persistLocally({ ...data, creditCards: updatedCards });
    },
    [data, isMonthClosed, persistLocally]
  );

  const updateCreditCardTrend = useCallback(
    (cardId: string, manualProjectedTrend: number | undefined) => {
      const updatedCards = data.creditCards.map((card) => {
        if (card.id === cardId) {
          return {
            ...card,
            manualProjectedTrend:
              manualProjectedTrend !== undefined && !isNaN(manualProjectedTrend)
                ? Math.max(0, manualProjectedTrend)
                : undefined,
          };
        }
        return card;
      });
      persistLocally({ ...data, creditCards: updatedCards });
    },
    [data, persistLocally]
  );

  // Variable Expense Logs & Categories
  const addVariableExpenseLog = useCallback(
    (log: Omit<VariableExpenseLog, 'id'>) => {
      if (isMonthClosed(log.month)) {
        console.warn(`Mês ${log.month} está fechado. Operação bloqueada.`);
        return;
      }
      // Ensure categoryId maps to legitimate envelope ID
      let targetCategoryId = log.categoryId;
      const matched = data.budgetEnvelopes.find(
        (e) => e.id === log.categoryId || e.name.trim().toLowerCase() === log.categoryId?.trim().toLowerCase()
      );
      if (matched) {
        targetCategoryId = matched.id;
      }

      const newLog: VariableExpenseLog = {
        ...log,
        categoryId: targetCategoryId,
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      persistLocally({
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
    [data, isMonthClosed, persistLocally]
  );

  const deleteVariableExpenseLog = useCallback(
    (id: string) => {
      const log = data.variableExpenseLogs.find((l) => l.id === id);
      if (log && isMonthClosed(log.month)) {
        console.warn(`Mês ${log.month} está fechado. Operação bloqueada.`);
        return;
      }
      persistLocally({
        ...data,
        variableExpenseLogs: data.variableExpenseLogs.filter((l) => l.id !== id),
      });
    },
    [data, isMonthClosed, persistLocally]
  );

  const createBudgetCategory = useCallback(
    (category: Omit<VariableBudgetCategory, 'id'>): string => {
      const newId = `env-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      const newCategory: VariableBudgetCategory = {
        ...category,
        id: newId,
      };
      persistLocally({
        ...data,
        budgetEnvelopes: [...data.budgetEnvelopes, newCategory],
      });
      return newId;
    },
    [data, persistLocally]
  );

  const updateVariableExpenseLog = useCallback(
    (log: VariableExpenseLog) => {
      if (isMonthClosed(log.month)) {
        console.warn(`Mês ${log.month} está fechado. Operação bloqueada.`);
        return;
      }
      persistLocally({
        ...data,
        variableExpenseLogs: data.variableExpenseLogs.map((l) => (l.id === log.id ? log : l)),
      });
    },
    [data, isMonthClosed, persistLocally]
  );

  const deleteBudgetEnvelope = useCallback(
    (envelopeId: string) => {
      persistLocally({
        ...data,
        budgetEnvelopes: data.budgetEnvelopes.filter((e) => e.id !== envelopeId),
        variableExpenseLogs: data.variableExpenseLogs.filter((l) => l.categoryId !== envelopeId),
      });
    },
    [data, persistLocally]
  );

  const updateBudgetEnvelopeTarget = useCallback(
    (envelopeId: string, newTarget: number) => {
      const updated = data.budgetEnvelopes.map((env) =>
        env.id === envelopeId ? { ...env, targetAmount: newTarget } : env
      );
      persistLocally({ ...data, budgetEnvelopes: updated });
    },
    [data, persistLocally]
  );

  const addBudgetSubItem = useCallback(
    (categoryId: string, name: string, amount: number) => {
      const updatedEnvelopes = data.budgetEnvelopes.map((env) => {
        if (env.id === categoryId) {
          const subItems = env.subItems || [];
          const newItem = { id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, name, amount };
          const newSubItems = [...subItems, newItem];
          const totalTarget = newSubItems.reduce((acc, curr) => acc + curr.amount, 0);
          return {
            ...env,
            subItems: newSubItems,
            targetAmount: totalTarget,
          };
        }
        return env;
      });
      persistLocally({ ...data, budgetEnvelopes: updatedEnvelopes });
    },
    [data, persistLocally]
  );

  const updateBudgetSubItem = useCallback(
    (categoryId: string, subItemId: string, name: string, amount: number) => {
      const updatedEnvelopes = data.budgetEnvelopes.map((env) => {
        if (env.id === categoryId) {
          const subItems = env.subItems || [];
          const newSubItems = subItems.map((s) => s.id === subItemId ? { ...s, name, amount } : s);
          const totalTarget = newSubItems.reduce((acc, curr) => acc + curr.amount, 0);
          return {
            ...env,
            subItems: newSubItems,
            targetAmount: totalTarget,
          };
        }
        return env;
      });
      persistLocally({ ...data, budgetEnvelopes: updatedEnvelopes });
    },
    [data, persistLocally]
  );

  const deleteBudgetSubItem = useCallback(
    (categoryId: string, subItemId: string) => {
      const updatedEnvelopes = data.budgetEnvelopes.map((env) => {
        if (env.id === categoryId) {
          const subItems = env.subItems || [];
          const newSubItems = subItems.filter((s) => s.id !== subItemId);
          const totalTarget = newSubItems.length > 0 ? newSubItems.reduce((acc, curr) => acc + curr.amount, 0) : env.targetAmount;
          return {
            ...env,
            subItems: newSubItems,
            targetAmount: totalTarget,
          };
        }
        return env;
      });
      persistLocally({ ...data, budgetEnvelopes: updatedEnvelopes });
    },
    [data, persistLocally]
  );

  const markSubItemAsSaved = useCallback(
    (subItemId: string, month: string) => {
      const key = `${subItemId}-${month}`;
      const updatedSaved = { ...(data.savedSubItemDebts || {}), [key]: true };
      persistLocally({
        ...data,
        savedSubItemDebts: updatedSaved,
      });
    },
    [data, persistLocally]
  );

  const updateBudgetEnvelope = useCallback(
    (envelopeId: string, name: string, targetAmount: number) => {
      const updated = data.budgetEnvelopes.map((env) =>
        env.id === envelopeId
          ? { ...env, name: name.trim() || env.name, targetAmount: Math.max(0, targetAmount) }
          : env
      );
      persistLocally({ ...data, budgetEnvelopes: updated });
    },
    [data, persistLocally]
  );

  // Add or increment expense (allowing existing categories to accumulate and creating new category lines)
  const addOrIncrementExpense = useCallback(
    (params: {
      title: string;
      amount: number;
      category: string;
      scope: 'PF' | 'PJ';
      month: string;
      frequency: ExpenseFrequency;
      installmentsCount?: number;
      notes?: string;
      targetEnvelopeAmount?: number;
    }) => {
      if (isMonthClosed(params.month)) {
        console.warn(`Mês ${params.month} está fechado. Operação bloqueada.`);
        return;
      }
      const {
        title,
        amount,
        category,
        scope,
        month,
        frequency,
        installmentsCount,
        notes,
        targetEnvelopeAmount,
      } = params;

      // If frequency is single/variable, log it as a detailed variable expense entry in budgetEnvelopes
      if (frequency === 'single') {
        let updatedEnvelopes = [...data.budgetEnvelopes];
        let existingEnv = updatedEnvelopes.find(
          (e) =>
            e.id === category ||
            e.name.trim().toLowerCase() === category.trim().toLowerCase()
        );

        let categoryId = existingEnv?.id;
        if (!existingEnv) {
          categoryId = `env-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
          const cleanName = category.startsWith('env-') ? 'Despesas Gerais' : category;
          const newEnv: VariableBudgetCategory = {
            id: categoryId,
            name: cleanName,
            targetAmount: targetEnvelopeAmount || amount,
          };
          updatedEnvelopes.push(newEnv);
        }

        const newLog: VariableExpenseLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          categoryId: categoryId!,
          month,
          amount,
          description: title,
          date: new Date().toISOString().slice(0, 10),
        };

        persistLocally({
          ...data,
          budgetEnvelopes: updatedEnvelopes,
          variableExpenseLogs: [...data.variableExpenseLogs, newLog],
          settings: {
            ...data.settings,
            lastExpenseLogged: {
              description: title,
              amount,
              timestamp: new Date().toISOString(),
            },
          },
        });
      } else {
        // Fixed, installment or periodic expense: add strictly as a distinct Expense object
        // Do NOT touch budgetEnvelopes to prevent double-counting or polluting variable envelopes
        const newExp: Expense = {
          id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title,
          amount,
          scope,
          category,
          frequency,
          startMonth: month,
          installmentsCount: frequency === 'installment' ? installmentsCount || 12 : undefined,
          notes,
        };

        persistLocally({
          ...data,
          expenses: [...data.expenses, newExp],
          settings: {
            ...data.settings,
            lastExpenseLogged: {
              description: title,
              amount,
              timestamp: new Date().toISOString(),
            },
          },
        });
      }
    },
    [data, persistLocally]
  );

  // Month locking & Closing
  const closeMonth = useCallback(
    (month: string) => {
      const currentClosings = { ...(data.monthlyClosings || {}) };
      const existing = currentClosings[month];
      currentClosings[month] = {
        month,
        closingRealBalance: existing?.closingRealBalance || 0,
        projectedBalance: existing?.projectedBalance || 0,
        adjustmentDifference: existing?.adjustmentDifference || 0,
        isOverdraft: !!existing?.isOverdraft,
        scheduledReminders: existing?.scheduledReminders || [],
        pushedDebts: existing?.pushedDebts || [],
        notes: existing?.notes || '',
        isClosed: true,
        closedAt: existing?.closedAt || new Date().toISOString(),
      };
      persistLocally({ ...data, monthlyClosings: currentClosings });

    },
    [data, persistLocally]
  );

  const reopenMonth = useCallback(
    (month: string, reason?: string) => {
      const currentClosings = { ...(data.monthlyClosings || {}) };
      const existing = currentClosings[month];
      if (existing) {
        const reopenText = reason?.trim() || 'Ajustes solicitados pelo usuário';
        const historyEntry = {
          reason: reopenText,
          timestamp: new Date().toISOString(),
        };
        currentClosings[month] = {
          ...existing,
          isClosed: false,
          reopenedReason: reopenText,
          reopenedAt: new Date().toISOString(),
          reopenHistory: [...(existing.reopenHistory || []), historyEntry],
        };
        persistLocally({ ...data, monthlyClosings: currentClosings });
      }
    },
    [data, persistLocally]
  );

  const saveBankStatementResult = useCallback(
    (month: string, statement: BankStatementUploadRecord, applyBalanceToClosing: boolean) => {
      const currentClosings = { ...(data.monthlyClosings || {}) };
      const closing = currentClosings[month] || {
        month,
        closingRealBalance: statement.finalBalance,
        projectedBalance: 0,
        adjustmentDifference: 0,
        isOverdraft: statement.finalBalance < 0,
        scheduledReminders: [],
        pushedDebts: [],
      };

      const existingUploads = closing.bankStatementsUploaded || [];
      const updatedUploads = [...existingUploads, statement];

      currentClosings[month] = {
        ...closing,
        closingRealBalance: applyBalanceToClosing ? statement.finalBalance : closing.closingRealBalance,
        isOverdraft: applyBalanceToClosing ? statement.finalBalance < 0 : closing.isOverdraft,
        bankStatementsUploaded: updatedUploads,
      };

      persistLocally({ ...data, monthlyClosings: currentClosings });
    },
    [data, persistLocally]
  );

  // Monthly Closing Actions
  const saveMonthlyClosing = useCallback(
    (record: MonthlyClosingRecord, andSetVigente: boolean = true) => {
      setData((prevData) => {
        const currentClosings = { ...(prevData.monthlyClosings || {}) };
        const targetMonth = record.month;

        // O mês que está sendo aberto NUNCA fica travado (permanece 100% editável)
        currentClosings[targetMonth] = {
          ...record,
          isClosed: false,
          closedAt: new Date().toISOString(),
        };

        // Trava os meses anteriores ao mês aberto
        if (andSetVigente) {
          Object.keys(currentClosings).forEach((m) => {
            if (getMonthDiff(m, targetMonth) > 0) {
              currentClosings[m] = {
                ...currentClosings[m],
                isClosed: true,
              };
            }
          });
        }

        const updatedData: AppData = {
          ...prevData,
          monthlyClosings: currentClosings,
          settings: andSetVigente
            ? {
                ...prevData.settings,
                vigenteMonth: targetMonth,
              }
            : prevData.settings,
        };
        saveAppData(updatedData);
        return updatedData;
      });
      setHasUnsavedChanges(true);
    },
    []
  );


  const scheduleBillPayment = useCallback(
    (
      expenseId: string,
      expenseTitle: string,
      amount: number,
      month: string,
      scheduledDate: string
    ) => {
      const currentClosings = { ...(data.monthlyClosings || {}) };
      const closing = currentClosings[month] || {
        month,
        closingRealBalance: 0,
        projectedBalance: 0,
        adjustmentDifference: 0,
        isOverdraft: false,
        scheduledReminders: [],
        pushedDebts: [],
      };

      const newReminder: ScheduledBillReminder = {
        id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        expenseId,
        expenseTitle,
        amount,
        scheduledDate,
        month,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      };

      currentClosings[month] = {
        ...closing,
        scheduledReminders: [...closing.scheduledReminders.filter((r) => r.expenseId !== expenseId), newReminder],
      };

      persistLocally({
        ...data,
        monthlyClosings: currentClosings,
      });
    },
    [data, persistLocally]
  );

  const pushBillDebt = useCallback(
    (
      expenseId: string,
      expenseTitle: string,
      amount: number,
      month: string,
      targetMonth: string,
      type: 'expense' | 'card' | 'subitem' = 'expense',
      cardId?: string,
      reason?: string
    ) => {
      const currentClosings = { ...(data.monthlyClosings || {}) };
      const closing = currentClosings[month] || {
        month,
        closingRealBalance: 0,
        projectedBalance: 0,
        adjustmentDifference: 0,
        isOverdraft: false,
        scheduledReminders: [],
        pushedDebts: [],
      };

      const newPushed: PushedDebtBill = {
        id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        expenseId,
        expenseTitle,
        amount,
        month,
        targetMonth,
        pushedAt: new Date().toISOString(),
        reason: reason || `Adiado para ${getMonthLabel(targetMonth)}`,
        status: 'pushed',
        type,
        cardId,
      };

      currentClosings[month] = {
        ...closing,
        pushedDebts: [...(closing.pushedDebts || []).filter((p) => p.expenseId !== expenseId), newPushed],
      };

      persistLocally({
        ...data,
        monthlyClosings: currentClosings,
      });
    },
    [data, persistLocally]
  );

  const resolvePushedDebt = useCallback(
    (month: string, debtId: string) => {
      const currentClosings = { ...(data.monthlyClosings || {}) };
      const closing = currentClosings[month];
      if (!closing || !closing.pushedDebts) return;

      currentClosings[month] = {
        ...closing,
        pushedDebts: closing.pushedDebts.map((p) =>
          p.id === debtId ? { ...p, status: 'paid' } : p
        ),
      };

      persistLocally({
        ...data,
        monthlyClosings: currentClosings,
      });
    },
    [data, persistLocally]
  );

  const resolveScheduledReminder = useCallback(
    (month: string, reminderId: string) => {
      const currentClosings = { ...(data.monthlyClosings || {}) };
      const closing = currentClosings[month];
      if (!closing) return;

      currentClosings[month] = {
        ...closing,
        scheduledReminders: closing.scheduledReminders.map((r) =>
          r.id === reminderId ? { ...r, status: 'paid' } : r
        ),
      };
      persistLocally({ ...data, monthlyClosings: currentClosings });
    },
    [data, persistLocally]
  );

  const toggleChecklistStep = useCallback(
    (stepId: string) => {
      const current = !!data.settings.checklistState?.[stepId];
      persistLocally({
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
    [data, persistLocally]
  );

  // CSV Import approval
  const importCsvTransactions = useCallback(
    (
      cardId: string,
      invoiceMonth: string,
      items: CsvParsedItem[],
      updateRealInvoice: boolean,
      paymentDate?: string
    ) => {
      const approvedItems = items.filter((item) => item.selected);
      const newTransactions = approvedItems.map((item) =>
        convertCsvItemToTransaction(item, cardId, invoiceMonth)
      );

      let updatedCards = [...data.creditCards];
      const nowIso = new Date().toISOString();
      const totalApproved = approvedItems.reduce((acc, curr) => acc + curr.amount, 0);

      updatedCards = updatedCards.map((c) => {
        if (c.id === cardId) {
          const realMap = { ...(c.realInvoiceTotalByMonth || {}) };
          const dateMap = { ...(c.invoicePaymentDateByMonth || {}) };
          const consolidatedMap = { ...(c.lastConsolidatedAt || {}) };

          consolidatedMap[invoiceMonth] = nowIso;

          if (updateRealInvoice && totalApproved > 0) {
            realMap[invoiceMonth] = totalApproved;
          }
          if (paymentDate) {
            dateMap[invoiceMonth] = paymentDate;
          }

          return {
            ...c,
            realInvoiceTotalByMonth: realMap,
            invoicePaymentDateByMonth: dateMap,
            lastConsolidatedAt: consolidatedMap,
          };
        }
        return c;
      });

      persistLocally({
        ...data,
        creditCards: updatedCards,
        cardTransactions: [...data.cardTransactions, ...newTransactions],
      });
    },
    [data, persistLocally]
  );

  // Settings & Backups
  const updateSettings = useCallback(
    (settings: Partial<AppSettings>) => {
      persistLocally({
        ...data,
        settings: {
          ...data.settings,
          ...settings,
        },
      });
    },
    [data, persistLocally]
  );

  const restoreSeedData = useCallback(() => {
    persistLocally(INITIAL_SEED_DATA);
    setSelectedMonth('2025-12');
  }, [persistLocally]);

  const importBackupData = useCallback(
    (newData: AppData) => {
      persistLocally(newData);
      if (newData.settings.startMonth) {
        setSelectedMonth(newData.settings.startMonth);
      }
    },
    [persistLocally]
  );

  const saveFirebaseSettings = useCallback(
    async (configJson: string | null) => {
      saveFirebaseConfig(configJson);
      setLoading(true);
      const result = await loadAppData();
      setData(result.data);
      setIsUsingFirebase(result.isUsingFirebase);
      setHasUnsavedChanges(false);
      setLoading(false);
    },
    []
  );

  // Banks & Cards Management
  const addBankAccount = useCallback(
    (bank: Omit<BankAccountConfig, 'id'>) => {
      const newBank: BankAccountConfig = {
        ...bank,
        id: `bank-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      };
      persistLocally({
        ...data,
        bankAccounts: [...(data.bankAccounts || []), newBank],
      });
    },
    [data, persistLocally]
  );

  const updateBankAccount = useCallback(
    (bank: BankAccountConfig) => {
      persistLocally({
        ...data,
        bankAccounts: (data.bankAccounts || []).map((b) => (b.id === bank.id ? bank : b)),
      });
    },
    [data, persistLocally]
  );

  const deleteBankAccount = useCallback(
    (id: string) => {
      persistLocally({
        ...data,
        bankAccounts: (data.bankAccounts || []).filter((b) => b.id !== id),
      });
    },
    [data, persistLocally]
  );

  const addCreditCard = useCallback(
    (card: Omit<CreditCard, 'id'>) => {
      const newCard: CreditCard = {
        ...card,
        id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      };
      persistLocally({
        ...data,
        creditCards: [...data.creditCards, newCard],
      });
    },
    [data, persistLocally]
  );

  const updateCreditCard = useCallback(
    (card: CreditCard) => {
      persistLocally({
        ...data,
        creditCards: data.creditCards.map((c) => (c.id === card.id ? card : c)),
      });
    },
    [data, persistLocally]
  );

  const deleteCreditCard = useCallback(
    (id: string) => {
      persistLocally({
        ...data,
        creditCards: data.creditCards.filter((c) => c.id !== id),
        cardTransactions: data.cardTransactions.filter((tx) => tx.cardId !== id),
      });
    },
    [data, persistLocally]
  );

  return (
    <FinanceContext.Provider
      value={{
        data,
        loading,
        isUsingFirebase,
        hasUnsavedChanges,
        isSavingToFirebase,
        selectedMonth,
        setSelectedMonth,
        vigenteMonth,
        setVigenteMonth,
        scopeFilter,
        setScopeFilter,
        activeTab,
        setActiveTab,
        summaries,
        currentMonthSummary,
        saveToFirebase,
        discardUnsavedChanges,
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
        bulkUpdateCardTransactions,
        deleteCardTransaction,
        bulkDeleteCardTransactions,
        toggleCardTransactionReview,
        setCardRealInvoice,
        updateCreditCardTrend,
        addVariableExpenseLog,
        updateVariableExpenseLog,
        deleteVariableExpenseLog,
        createBudgetCategory,
        updateBudgetEnvelopeTarget,
        updateBudgetEnvelope,
        deleteBudgetEnvelope,
        addBudgetSubItem,
        updateBudgetSubItem,
        deleteBudgetSubItem,
        markSubItemAsSaved,
        addOrIncrementExpense,
        isMonthClosed,
        closeMonth,
        reopenMonth,
        saveMonthlyClosing,
        saveBankStatementResult,
        scheduleBillPayment,
        pushBillDebt,
        resolveScheduledReminder,
        resolvePushedDebt,

        addBankAccount,
        updateBankAccount,
        deleteBankAccount,
        addCreditCard,
        updateCreditCard,
        deleteCreditCard,

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
