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
  endMonth?: string; // YYYY-MM for fixed end (opcional)
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
  endMonth?: string; // YYYY-MM (opcional para encerramento de despesa fixa)
  installmentsCount?: number; // e.g. 36
  periodicMonths?: number[]; // e.g. [3, 6, 9, 12] for quarterly
  singleMonth?: string; // YYYY-MM
  notes?: string;
  needsReview?: boolean; // Tag ⚠️ Verificar
  paidMonths?: Record<string, boolean>; // key: 'YYYY-MM', value: true if paid
  linkedSubItemId?: string; // ID do subitem de previsão vinculado
}

export interface BudgetSubItem {
  id: string;
  name: string;
  amount: number;
  startMonth?: string; // YYYY-MM
  endMonth?: string; // YYYY-MM
}

export interface VariableBudgetCategory {
  id: string;
  name: string;
  targetAmount: number; // Teto orçado mensal (ou soma dos subitens)
  color?: string;
  icon?: string;
  subItems?: BudgetSubItem[];
}

export interface VariableExpenseLog {
  id: string;
  categoryId: string;
  month: string; // YYYY-MM
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  linkedSubItemId?: string; // ID do subitem de previsão vinculado
  linkedExpenseId?: string; // ID da conta/despesa de previsão vinculada (de data.expenses)
  isUnplanned?: boolean; // Se true, marcado como despesa sem previsão
}

export interface BankAccountConfig {
  id: string;
  name: string;
  agency?: string;
  accountNumber?: string;
  overdraftLimit: number; // Limite de cheque especial contratado (R$)
  overdraftRateMonthly: number; // Taxa de juros cheque especial (% a.m. - ex: 8.0)
  overdraftFreeDays: number; // Dias sem juros concedidos pelo banco (ex: 10 dias no Santander)
  color?: string;
}

export type InvoicePaymentStatus = 'unpaid' | 'paid_on_time' | 'paid_late' | 'partial_late';

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  scope: 'PF' | 'PJ';
  color: string;
  dueDay: number;
  closingDay: number;
  limit?: number; // Limite total do cartão (R$)
  rotativoRateMonthly?: number; // Taxa do rotativo (% a.m. - ex: 14.5)
  parcelamentoRateMonthly?: number; // Taxa do parcelamento da fatura (% a.m. - ex: 4.2)
  manualProjectedTrend?: number; // Valor de projeção mensal manual do cartão (ex: R$ 2000)
  realInvoiceTotalByMonth?: Record<string, number>; // key: YYYY-MM -> real bank total
  invoicePaymentDateByMonth?: Record<string, string>; // key: YYYY-MM -> YYYY-MM-DD data de vencimento/pagamento
  invoicePaymentStatusByMonth?: Record<string, InvoicePaymentStatus>; // key: YYYY-MM -> status do pagamento
  invoicePaidAmountByMonth?: Record<string, number>;
  invoicePaymentMonthByMonth?: Record<string, string>; // key: YYYY-MM -> valor pago (se parcial)
  lastConsolidatedAt?: Record<string, string>; // key: YYYY-MM -> ISO timestamp de consolidação da fatura
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
  transactionDate?: string; // Data exata da compra no cartão (ex: 2026-01-15)
  linkedSubItemId?: string; // ID do subitem de previsão vinculado
  linkedExpenseId?: string; // ID da conta/despesa de previsão vinculada
  isUnplanned?: boolean; // Se true, marcado como despesa sem previsão
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

export interface ScheduledBillReminder {
  id: string;
  expenseId: string;
  expenseTitle: string;
  amount: number;
  scheduledDate: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  status: 'scheduled' | 'paid';
  createdAt: string;
}

export interface PushedDebtBill {
  id: string;
  expenseId: string;
  expenseTitle: string;
  amount: number;
  month: string; // YYYY-MM original
  targetMonth: string; // YYYY-MM target postponement month
  pushedAt: string;
  reason?: string;
  status: 'pushed' | 'paid';
  type?: 'expense' | 'card' | 'subitem';
  cardId?: string;
  interestRate?: number;
  interestType?: 'daily' | 'monthly';
}

export interface BankStatementUploadRecord {
  id: string;
  bankName: string;
  fileName: string;
  initialBalance: number;
  finalBalance: number;
  credits: number;
  debits: number;
  interestPaid: number;
  iofPaid: number;
  uploadedAt: string;
}

export interface MonthlyClosingRecord {
  month: string; // YYYY-MM
  closedAt?: string; // ISO
  isClosed?: boolean; // Se true, o mês está bloqueado contra edições e exclusões
  closingRealBalance: number; // Saldo real na conta corrente ao final do mês
  projectedBalance: number; // Saldo projetado calculado pelo sistema
  adjustmentDifference: number; // real - projetado
  isOverdraft: boolean; // se closingRealBalance < 0
  bankAccountId?: string; // Conta bancária selecionada
  bankAccountName?: string; // Nome da conta bancária
  negativeSinceDate?: string; // YYYY-MM-DD (se saldo < 0)
  scheduledReminders: ScheduledBillReminder[];
  pushedDebts: PushedDebtBill[];
  notes?: string;
  reopenedReason?: string;
  reopenedAt?: string;
  reopenHistory?: { reason: string; timestamp: string }[];
  bankStatementsUploaded?: BankStatementUploadRecord[];
  manualInterest?: number;
  manualIof?: number;
}


export interface AppSettings {
  startMonth: string; // '2025-12'
  initialBalance: number; // e.g. 0 or previous
  vigenteMonth?: string; // YYYY-MM do Mês Vigente
  firebaseConfigJson?: string;
  lastBackupDate?: string;
  lastVisitTimestamp?: string;
  lastSyncedFirebaseAt?: string;
  lastExpenseLogged?: {
    description: string;
    amount: number;
    timestamp: string;
  };
  checklistState?: Record<string, boolean>;
  allowedEmails?: string[];
}

export interface AppData {
  settings: AppSettings;
  incomes: Income[];
  expenses: Expense[];
  budgetEnvelopes: VariableBudgetCategory[];
  variableExpenseLogs: VariableExpenseLog[];
  creditCards: CreditCard[];
  cardTransactions: CardTransaction[];
  bankAccounts?: BankAccountConfig[];
  monthlyClosings?: Record<string, MonthlyClosingRecord>;
  savedSubItemDebts?: Record<string, boolean>;
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
  isAlreadyImported?: boolean;
}

