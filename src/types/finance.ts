export type ScopeType = 'PF' | 'PJ' | 'ALL';

export type ExpenseFrequency = 'fixed' | 'installment' | 'periodic' | 'single';

export interface Income {
  id: string;
  title: string;
  type: 'fixed' | 'variable';
  amount: number;
  category: string;
  scope: 'PF' | 'PJ';
  month?: string; // YYYY-MM for variable
  startMonth?: string; // YYYY-MM for fixed start
  source?: string; // 'Carol' | 'Filipe' | string
  notes?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  scope: 'PF' | 'PJ';
  category: string; // 'Impostos/DAS' | 'Contador' | 'Financiamento/Dívidas' | 'Moradia/Contas' | 'Educação' | 'Família/Pets' | 'Manutenção' | 'Outros'
  frequency: ExpenseFrequency;
  startMonth: string; // YYYY-MM
  installmentsCount?: number; // e.g. 36
  periodicMonths?: number[]; // e.g. [3, 6, 9, 12] for quarterly
  singleMonth?: string; // YYYY-MM
  notes?: string;
  needsReview?: boolean; // Tag ⚠️ Verificar
  paidMonths?: Record<string, boolean>; // key: 'YYYY-MM', value: true if paid
}

export interface VariableBudgetCategory {
  id: string;
  name: string;
  targetAmount: number; // Teto orçado mensal
  color?: string;
  icon?: string;
}

export interface VariableExpenseLog {
  id: string;
  categoryId: string;
  month: string; // YYYY-MM
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
}

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  scope: 'PF' | 'PJ';
  color: string;
  dueDay: number;
  closingDay: number;
  realInvoiceTotalByMonth?: Record<string, number>; // key: YYYY-MM -> real bank total
}

export interface CardTransaction {
  id: string;
  cardId: string;
  description: string;
  type: 'recurring' | 'installment' | 'single';
  installmentAmount: number; // valor mensal da parcela ou assinatura
  totalAmount?: number;
  totalInstallments: number; // 1 for recurring, or N for installments
  startMonth: string; // YYYY-MM da 1ª parcela
  category: string;
  needsReview: boolean; // Flag ⚠️ Verificar
  notes?: string;
  isPaused?: boolean;
  importedFromCsv?: boolean;
}

export interface MonthSummary {
  month: string; // YYYY-MM
  label: string; // e.g. 'Dez/25', 'Jan/26'
  previousBalance: number;
  overdraftCover: number; // deduction if previousBalance < 0
  fixedIncome: number;
  variableIncome: number;
  totalIncome: number; // fixed + variable + max(0, previousBalance)
  pjExpenses: number;
  pfFixedExpenses: number;
  variableEnvelopes: number; // sum of max(orçado, realizado)
  cardTotal: number;
  cardTotalsByCard: Record<string, number>;
  cardUnmappedDiffByCard: Record<string, number>;
  cardItemsCountByCard: Record<string, number>;
  totalExpenses: number; // pj + pf + envelopes + cardTotal + overdraftCover
  finalBalance: number; // totalIncome - totalExpenses
  accumulatedBalance: number; // progressive net worth
  isPositive: boolean;
}

export interface AppSettings {
  startMonth: string; // '2025-12'
  initialBalance: number; // e.g. 0 or previous
  firebaseConfigJson?: string;
  lastBackupDate?: string;
  lastVisitTimestamp?: string;
  lastExpenseLogged?: {
    description: string;
    amount: number;
    timestamp: string;
  };
  checklistState?: Record<string, boolean>;
}

export interface AppData {
  settings: AppSettings;
  incomes: Income[];
  expenses: Expense[];
  budgetEnvelopes: VariableBudgetCategory[];
  variableExpenseLogs: VariableExpenseLog[];
  creditCards: CreditCard[];
  cardTransactions: CardTransaction[];
}

export interface CsvParsedItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  installmentsCurrent?: number;
  installmentsTotal?: number;
  category?: string;
  selected: boolean;
  needsReview: boolean;
}
