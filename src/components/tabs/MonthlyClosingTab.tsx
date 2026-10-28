import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  DollarSign,
  ShieldAlert,
  Calendar,
  Sparkles,
  ChevronRight,
  Info,
  Check,
  AlertCircle,
  Plus,
  Lock,
  Unlock,
  Building2,
  History,
  ShieldCheck,
  Calculator,
  RotateCcw,
  X,
  Trash2,
  CheckSquare,
  Edit2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { MonthlyClosingRecord, AppData } from '../../types/finance';
import {
  formatBRL,
  getMonthDiff,
  getInstallmentInfo,
  addMonths,
  getMonthLabel,
} from '../../utils/calculations';
import { calculateOverdraftProjections } from '../../utils/bankStatementParser';
import { Expense } from '../../types/finance';

export const MonthlyClosingTab: React.FC = () => {
  const {
    data,
    selectedMonth,
    setSelectedMonth,
    vigenteMonth,
    setVigenteMonth,
    summaries,
    currentMonthSummary,
    toggleExpensePaid,
    saveMonthlyClosing,
    isMonthClosed,
    closeMonth,
    reopenMonth,
    saveToFirebase,
    isUsingFirebase,
    pushBillDebt,
    resolvePushedDebt,
    setCardRealInvoice,
    addVariableExpenseLog,
    markSubItemAsSaved,
  } = useFinance();

  const isClosed = isMonthClosed(selectedMonth);
  const isVigente = vigenteMonth === selectedMonth;
  const selectedMonthLabel = getMonthLabel(selectedMonth);

  const current = currentMonthSummary || summaries[0];
  const nextMonth = addMonths(selectedMonth, 1);
  const nextMonthLabel = getMonthLabel(nextMonth);
  const monthIdx = parseInt(selectedMonth.split('-')[1], 10);

  // Helper function to parse formatted numbers (accepting commas, dots, BR format)
  const parseFormattedNumber = (val: string | number): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    let str = val.toString().trim();
    if (str.includes(',') && str.includes('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
      str = str.replace(',', '.');
    }
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Existing closing record for this month
  const existingClosing = data.monthlyClosings?.[selectedMonth];

  // Local state for bank balance & bank account
  const [realBankBalance, setRealBankBalance] = useState<string>(
    existingClosing !== undefined
      ? String(existingClosing.closingRealBalance)
      : String(current.previousBalance.toFixed(2))
  );

  const [selectedBankId, setSelectedBankId] = useState<string>(
    existingClosing?.bankAccountId || data.bankAccounts?.[0]?.id || 'custom'
  );
  const [customBankName, setCustomBankName] = useState<string>(
    existingClosing?.bankAccountName || ''
  );
  const [negativeSinceDate, setNegativeSinceDate] = useState<string>(
    existingClosing?.negativeSinceDate || `${selectedMonth}-01`
  );
  const [closingNotes, setClosingNotes] = useState<string>(
    existingClosing?.notes || ''
  );
  const [manualInterestInput, setManualInterestInput] = useState<string>(
    existingClosing?.manualInterest !== undefined ? String(existingClosing.manualInterest) : ''
  );
  const [manualIofInput, setManualIofInput] = useState<string>(
    existingClosing?.manualIof !== undefined ? String(existingClosing.manualIof) : ''
  );
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reopen Modal State
  const [isReopenModalOpen, setIsReopenModalOpen] = useState<boolean>(false);
  const [reopenReasonInput, setReopenReasonInput] = useState<string>('');
  const [pastBillCategoryFilter, setPastBillCategoryFilter] = useState<string>('ALL');

  // Postpone Modal State
  const [postponeModalItem, setPostponeModalItem] = useState<{
    id: string;
    expenseId: string;
    title: string;
    amount: number;
    month: string;
    type: 'expense' | 'card' | 'subitem' | 'direct_debt';
    cardId?: string;
  } | null>(null);
  const [postponeInterestRate, setPostponeInterestRate] = useState<string>('');
  const [postponeInterestType, setPostponeInterestType] = useState<'daily' | 'monthly'>('monthly');
  const [targetPostponeMonth, setTargetPostponeMonth] = useState<string>(addMonths(selectedMonth, 1));

  const handleConfirmPostpone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postponeModalItem) return;
    pushBillDebt(
      postponeModalItem.expenseId,
      postponeModalItem.title,
      postponeModalItem.amount,
      postponeModalItem.month,
      targetPostponeMonth,
      postponeModalItem.type,
      postponeModalItem.cardId,
      undefined,
      parseFormattedNumber(postponeInterestRate) || undefined,
      postponeInterestType
    );
    setPostponeModalItem(null);
    setPostponeInterestRate('');
    setSavedSuccessMsg(`Despesa adiada com sucesso para ${getMonthLabel(targetPostponeMonth)}!`);
    setTimeout(() => setSavedSuccessMsg(null), 4000);
  };

  // Lista de meses selecionáveis incluindo histórico recente e projeções
  const selectableMonths = React.useMemo(() => {
    const map = new Map<string, string>();
    for (let i = -6; i < 0; i++) {
      const m = addMonths(vigenteMonth, i);
      map.set(m, getMonthLabel(m));
    }
    Object.keys(data.monthlyClosings || {}).forEach((m) => {
      map.set(m, getMonthLabel(m));
    });
    summaries.forEach((s) => {
      map.set(s.month, s.label);
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [vigenteMonth, data.monthlyClosings, summaries]);

  // Sync inputs when selectedMonth or existingClosing changes
  useEffect(() => {
    setValidationError(null);
    if (existingClosing !== undefined) {
      setRealBankBalance(String(existingClosing.closingRealBalance));
      setSelectedBankId(existingClosing.bankAccountId || data.bankAccounts?.[0]?.id || '');
      setCustomBankName(existingClosing.bankAccountName || '');
      setNegativeSinceDate(existingClosing.negativeSinceDate || `${selectedMonth}-01`);
      setClosingNotes(existingClosing.notes || '');
      setManualInterestInput(existingClosing.manualInterest !== undefined ? String(existingClosing.manualInterest) : '');
      setManualIofInput(existingClosing.manualIof !== undefined ? String(existingClosing.manualIof) : '');
    } else {
      setRealBankBalance(String(current.previousBalance.toFixed(2)));
      setSelectedBankId(data.bankAccounts?.[0]?.id || '');
      setCustomBankName('');
      setNegativeSinceDate(`${selectedMonth}-01`);
      setClosingNotes('');
      setManualInterestInput('');
      setManualIofInput('');
    }
  }, [selectedMonth, existingClosing, current.previousBalance, data.bankAccounts]);

  // Collect all unpaid expenses, card invoices and pushed debts from past months
  interface PastUnpaidBill {
    id: string;
    expenseId: string;
    title: string;
    amount: number;
    category: string;
    scope: 'PF' | 'PJ';
    month: string;
    monthLabel: string;
    installmentText?: string;
    type: 'expense' | 'card' | 'subitem' | 'direct_debt';
    cardId?: string;
    isPushed?: boolean;
    targetMonth?: string;
    envelopeId?: string;
    subItemId?: string;
  }

  const pastUnpaidBills: PastUnpaidBill[] = [];

  // Filter summaries for past months
  const pastMonths = summaries
    .map((s) => s.month)
    .filter((m) => m < selectedMonth);

  // 1. Gather pushed debts targeting selectedMonth
  Object.entries(data.monthlyClosings || {}).forEach(([mClosing, closing]) => {
    (closing.pushedDebts || []).forEach((pd) => {
      if (pd.status === 'pushed' && pd.targetMonth === selectedMonth) {
        pastUnpaidBills.push({
          id: pd.id,
          expenseId: pd.expenseId,
          title: pd.expenseTitle,
          amount: pd.amount,
          category: pd.type === 'card' ? 'Fatura de Cartão' : 'Despesa Adiada',
          scope: 'PJ',
          month: pd.month,
          monthLabel: `${getMonthLabel(pd.month)} (Adiado)`,
          type: pd.type || 'expense',
          cardId: pd.cardId,
          isPushed: true,
          targetMonth: pd.targetMonth,
        });
      }
    });
  });

  // 2. Unpaid expenses from past months
  data.expenses.forEach((exp) => {
    pastMonths.forEach((pastM) => {
      const pastMIdx = parseInt(pastM.split('-')[1], 10);
      let isActive = false;
      let instText = '';

      if (exp.frequency === 'fixed') {
        if (getMonthDiff(exp.startMonth, pastM) >= 0) isActive = true;
      } else if (exp.frequency === 'installment' && exp.installmentsCount) {
        const inst = getInstallmentInfo(exp.startMonth, exp.installmentsCount, pastM);
        if (inst.isActive) {
          isActive = true;
          instText = `Parcela ${inst.current}/${inst.total}`;
        }
      } else if (exp.frequency === 'periodic' && exp.periodicMonths) {
        if (
          getMonthDiff(exp.startMonth, pastM) >= 0 &&
          exp.periodicMonths.includes(pastMIdx)
        ) {
          isActive = true;
        }
      } else if (exp.frequency === 'single') {
        if (exp.singleMonth === pastM || exp.startMonth === pastM) {
          isActive = true;
        }
      }

      if (isActive && !exp.paidMonths?.[pastM]) {
        const alreadyAdded = pastUnpaidBills.some((b) => b.expenseId === exp.id && b.month === pastM);
        if (!alreadyAdded) {
          pastUnpaidBills.push({
            id: `${exp.id}-${pastM}`,
            expenseId: exp.id,
            title: exp.title,
            amount: exp.amount,
            category: exp.category,
            scope: exp.scope,
            month: pastM,
            monthLabel: getMonthLabel(pastM),
            installmentText: instText,
            type: 'expense',
          });
        }
      }
    });
  });

  // 3. Unpaid credit card invoices from past months
  data.creditCards.forEach((card) => {
    pastMonths.forEach((pastM) => {
      const realInv = card.realInvoiceTotalByMonth?.[pastM];
      let cardDetailedSum = 0;
      data.cardTransactions.forEach((tx) => {
        if (tx.cardId !== card.id || tx.isPaused) return;
        if (tx.type === 'recurring' && getMonthDiff(tx.startMonth, pastM) >= 0) cardDetailedSum += tx.installmentAmount;
        else if (tx.type === 'installment' && getInstallmentInfo(tx.startMonth, tx.totalInstallments, pastM).isActive) cardDetailedSum += tx.installmentAmount;
        else if (tx.type === 'single' && tx.startMonth === pastM) cardDetailedSum += tx.installmentAmount;
      });
      const invoiceAmt = realInv !== undefined ? Math.max(realInv, cardDetailedSum) : cardDetailedSum;

      const status = card.invoicePaymentStatusByMonth?.[pastM];
      const isPaid = status === 'paid_on_time' || status === 'paid_late';

      if (invoiceAmt > 0 && !isPaid) {
        const alreadyAdded = pastUnpaidBills.some((b) => b.expenseId === card.id && b.month === pastM);
        if (!alreadyAdded) {
          pastUnpaidBills.push({
            id: `card-inv-${card.id}-${pastM}`,
            expenseId: card.id,
            title: `Fatura ${card.name}`,
            amount: invoiceAmt,
            category: 'Cartão de Crédito',
            scope: card.scope,
            month: pastM,
            monthLabel: getMonthLabel(pastM),
            installmentText: `Banco: ${card.bank}`,
            type: 'card',
            cardId: card.id,
          });
        }
      }
    });
  });

  // 4. Unpaid or partial budget envelope subitems from past months
  data.budgetEnvelopes.forEach((env) => {
    (env.subItems || []).forEach((sub) => {
      pastMonths.forEach((pastM) => {
        const lowerName = env.name.trim().toLowerCase();
        const linkedLogs = data.variableExpenseLogs.filter(
          (l) =>
            l.month === pastM &&
            (l.categoryId === env.id || l.categoryId.trim().toLowerCase() === lowerName) &&
            l.linkedSubItemId === sub.id
        );
        const linkedCardTxs = data.cardTransactions.filter((tx) => {
          if (tx.isPaused) return false;
          const matchesCategory =
            tx.category.trim().toLowerCase() === lowerName || tx.category === env.id;
          if (!matchesCategory || tx.linkedSubItemId !== sub.id) return false;

          if (tx.type === 'recurring') {
            return getMonthDiff(tx.startMonth, pastM) >= 0;
          } else if (tx.type === 'installment') {
            return getInstallmentInfo(tx.startMonth, tx.totalInstallments, pastM).isActive;
          } else if (tx.type === 'single') {
            return tx.startMonth === pastM;
          }
          return false;
        });

        const spentOnSub =
          linkedLogs.reduce((acc, l) => acc + l.amount, 0) +
          linkedCardTxs.reduce((acc, t) => acc + t.installmentAmount, 0);

        const diff = sub.amount - spentOnSub;
        if (sub.amount > 0 && spentOnSub < sub.amount) {
          const openAmount = sub.amount - spentOnSub;
          const alreadyAdded = pastUnpaidBills.some(
            (b) => b.subItemId === sub.id && b.month === pastM
          );
          const isAlreadyPushed = Object.values(data.monthlyClosings || {}).some((closing) =>
            (closing.pushedDebts || []).some(
              (pd) => pd.expenseId === sub.id && pd.month === pastM && pd.status === 'pushed'
            )
          );

          if (!alreadyAdded && !isAlreadyPushed) {
            pastUnpaidBills.push({
              id: `subitem-${sub.id}-${pastM}`,
              expenseId: sub.id,
              title: `${env.name} — ${sub.name}`,
              amount: openAmount,
              category: `Envelope: ${env.name}`,
              scope: 'PJ',
              month: pastM,
              monthLabel: `${getMonthLabel(pastM)} (${spentOnSub === 0 ? 'Pendente' : 'Parcial'})`,
              installmentText: spentOnSub > 0 ? `Pago: ${formatBRL(spentOnSub)} / Prev: ${formatBRL(sub.amount)}` : `Previsto: ${formatBRL(sub.amount)}`,
              type: 'subitem',
              envelopeId: env.id,
              subItemId: sub.id,
            });
          }
        }
      });
    });
  });

  const pastBillCategories = Array.from(new Set(pastUnpaidBills.map((b) => b.category)));
  const filteredPastUnpaidBills = pastUnpaidBills.filter((item) => {
    if (pastBillCategoryFilter !== 'ALL' && item.category !== pastBillCategoryFilter) {
      return false;
    }
    return true;
  });
  const totalPastUnpaidAmount = filteredPastUnpaidBills.reduce((acc, curr) => acc + curr.amount, 0);

  const parsedBankBalance = parseFormattedNumber(realBankBalance);
  const isOverdraft = parsedBankBalance < 0;
  const projectedBalance = current.finalBalance;
  const difference = parsedBankBalance - projectedBalance;

  // Selected Bank Details
  const selectedBankConfig = (data.bankAccounts || []).find((b) => b.id === selectedBankId);
  const bankDisplayName =
    selectedBankConfig?.name || customBankName.trim() || 'Conta Principal';
  const overdraftRate = selectedBankConfig?.overdraftRateMonthly || 8.0;
  const overdraftFreeDays = selectedBankConfig?.overdraftFreeDays || 0;

  // Projeções do Cheque Especial se for negativo
  const projection = calculateOverdraftProjections(
    parsedBankBalance,
    overdraftRate,
    overdraftFreeDays,
    30
  );

  // Save Abertura do Mês & Define Mês Vigente
  const handleSaveAberturaMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const numericVal = parseFormattedNumber(realBankBalance);

    // Validação 1: Saldo inicial definido e não vazio
    if (
      realBankBalance.trim() === '' ||
      realBankBalance === null ||
      realBankBalance === undefined ||
      isNaN(numericVal)
    ) {
      setValidationError(
        'Abertura Bloqueada: Por favor, defina um valor para o saldo inicial do mês.'
      );
      return;
    }

    // Validação 2: Conta bancária selecionada
    if (!selectedBankId || selectedBankId.trim() === '') {
      setValidationError(
        'Abertura Bloqueada: Por favor, selecione qual é a conta bancária de origem/destino.'
      );
      return;
    }

    // Validação 3: Se selecionou 'custom', exigir o nome da conta
    if (selectedBankId === 'custom' && !customBankName.trim()) {
      setValidationError(
        'Abertura Bloqueada: Por favor, digite o nome da conta bancária customizada.'
      );
      return;
    }

    // Validação 4: Se o saldo for negativo, exigir a data
    if (isOverdraft && !negativeSinceDate) {
      setValidationError(
        'Abertura Bloqueada: Selecione desde qual dia o saldo está negativo.'
      );
      return;
    }

    const numericManualInterest = manualInterestInput.trim() !== '' ? parseFormattedNumber(manualInterestInput) : undefined;
    const numericManualIof = manualIofInput.trim() !== '' ? parseFormattedNumber(manualIofInput) : undefined;

    const closingRecord: MonthlyClosingRecord = {
      month: selectedMonth,
      closingRealBalance: numericVal,
      projectedBalance,
      adjustmentDifference: difference,
      isOverdraft: numericVal < 0,
      bankAccountId: selectedBankId,
      bankAccountName: bankDisplayName,
      negativeSinceDate: numericVal < 0 ? negativeSinceDate : undefined,
      scheduledReminders: existingClosing?.scheduledReminders || [],
      pushedDebts: existingClosing?.pushedDebts || [],
      notes: closingNotes.trim() || undefined,
      reopenHistory: existingClosing?.reopenHistory || [],
      manualInterest: numericManualInterest !== undefined && !isNaN(numericManualInterest) ? numericManualInterest : undefined,
      manualIof: numericManualIof !== undefined && !isNaN(numericManualIof) ? numericManualIof : undefined,
      isClosed: false, // A abertura do mês NUNCA trava as edições dele!
    };

    saveMonthlyClosing(closingRecord, true);

    if (isUsingFirebase) {
      const currentClosings = { ...(data.monthlyClosings || {}) };
      currentClosings[selectedMonth] = {
        ...closingRecord,
        isClosed: false,
        closedAt: new Date().toISOString(),
      };
      // Trava automaticamente os meses anteriores ao mês aberto
      Object.keys(currentClosings).forEach((m) => {
        if (getMonthDiff(m, selectedMonth) > 0) {
          currentClosings[m] = {
            ...currentClosings[m],
            isClosed: true,
          };
        }
      });
      const dataToSync: AppData = {
        ...data,
        monthlyClosings: currentClosings,
        settings: {
          ...data.settings,
          vigenteMonth: selectedMonth,
        },
      };
      await saveToFirebase(dataToSync);
    }

    setSavedSuccessMsg(
      `O mês de ${selectedMonthLabel} foi aberto com sucesso, liberado para edições e definido como MÊS VIGENTE!`
    );
    setTimeout(() => setSavedSuccessMsg(null), 5000);
  };

  // Reopen Confirmation
  const handleConfirmReopen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReasonInput.trim()) return;

    reopenMonth(selectedMonth, reopenReasonInput.trim());
    setIsReopenModalOpen(false);
    setReopenReasonInput('');
    setSavedSuccessMsg(`Mês de ${selectedMonthLabel} reaberto com sucesso para edições!`);
    setTimeout(() => setSavedSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <CalendarCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Abertura de Mês</span>
              {isVigente && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                  ⭐ Mês Vigente
                </span>
              )}
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Configure o saldo de abertura do mês, defina a conta bancária e mapeie as pendências em aberto dos meses anteriores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400 font-medium">Mês em Abertura:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-bold text-white outline-none focus:border-emerald-500 transition"
          >
            {selectableMonths.map((m) => {
              const isPast = getMonthDiff(m.value, vigenteMonth) > 0;
              const isClosedOpt = isMonthClosed(m.value);
              return (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.value}) {m.value === vigenteMonth ? '⭐ Vigente' : ''} {isClosedOpt ? '🔒 Fechado' : '✅ Aberto'}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Month Closed Banner */}
      {isClosed ? (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-white text-sm block">Histórico Passado: Mês Fechado 🔒 ({selectedMonthLabel})</strong>
              <p className="text-amber-300/90 mt-0.5">
                Este mês é anterior ao Mês Vigente e está travado para proteger o histórico financeiro contra edições acidentais.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setReopenReasonInput('');
              setIsReopenModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-amber-300 border border-amber-500/40 font-bold transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-md"
          >
            <Unlock className="w-4 h-4" />
            <span>Reabrir Mês para Ajustes</span>
          </button>
        </div>
      ) : isVigente ? (
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-white text-sm flex items-center gap-2">
                <span>Mês Vigente Ativo ({selectedMonthLabel})</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30">
                  ABERTO E TOTALMENTE EDITÁVEL
                </span>
              </strong>
              <p className="text-emerald-300/80 mt-0.5">
                Este é o mês corrente. Todos os lançamentos, despesas e envelopes em Previsão e Controle estão 100% liberados para edições e novos lançamentos normais.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 shrink-0">
            ✅ Edições Liberadas
          </span>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-white text-sm block">Abertura de Mês ({selectedMonthLabel})</strong>
              <p className="text-zinc-400 mt-0.5">
                Preencha o saldo inicial da conta bancária e confirme a abertura para definir este mês como o <strong>Mês Vigente</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {validationError && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/60 text-rose-200 text-xs flex items-start gap-2.5 shadow-md animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <strong className="font-bold text-rose-300 block">Validação Pendente</strong>
            <span>{validationError}</span>
          </div>
        </div>
      )}

      {savedSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {/* MAIN 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COLUNA ESQUERDA: FORMULARIO DE ABERTURA DO MÊS (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Formulário de Abertura do Mês ({selectedMonthLabel})
                </h3>
              </div>
              {isVigente && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  Mês Vigente Ativo
                </span>
              )}
            </div>

            <form onSubmit={handleSaveAberturaMonth} className="space-y-4 text-xs">
              
              {/* 1. SALDO INICIAL */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-200 block">
                  Saldo com que {selectedMonthLabel} Inicia (R$):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    disabled={isClosed}
                    value={realBankBalance}
                    onChange={(e) => {
                      setRealBankBalance(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="Ex: -2000.00 ou 450.00"
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-mono-numbers text-sm font-bold outline-none focus:border-emerald-500 disabled:opacity-60"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-zinc-400 font-semibold">
                    {isOverdraft ? '⚠️ Negativo' : '✅ Positivo'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  💡 Este valor define o saldo inicial de <strong>{selectedMonthLabel}</strong>. Se for negativo (ex: -2000,00), ele entrará na linha de <strong>Cobertura Cheque Especial / Saldo Negativo Anterior</strong> do mês.
                </p>
              </div>

              {/* 2. CONTA BANCÁRIA */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-200 block">
                  Conta Bancária de Origem / Destino:
                </label>
                <select
                  value={selectedBankId}
                  onChange={(e) => {
                    setSelectedBankId(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  disabled={isClosed}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white outline-none focus:border-emerald-500 disabled:opacity-60 font-medium"
                >
                  <option value="">-- Selecione a Conta Bancária --</option>
                  {(data.bankAccounts || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.agency ? `Ag. ${b.agency}` : ''} - Cheque Esp: {formatBRL(b.overdraftLimit)})
                    </option>
                  ))}
                  <option value="custom">+ Digitar Nome de Outra Conta...</option>
                </select>

                {selectedBankId === 'custom' && (
                  <input
                    type="text"
                    required
                    disabled={isClosed}
                    placeholder="Digite o nome da conta (ex: Itaú Empresa, Bradesco PF...)"
                    value={customBankName}
                    onChange={(e) => setCustomBankName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white outline-none focus:border-emerald-500 text-xs mt-1"
                  />
                )}
              </div>

              {/* 3. DESDE QUAL DIA ESTÁ NEGATIVO (condicional) */}
              {isOverdraft && (
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-2 animate-in fade-in">
                  <label className="font-bold text-rose-300 flex items-center gap-1.5 text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Saldo Negativo Detectado: Desde qual dia está negativo?</span>
                  </label>
                  <input
                    type="date"
                    required
                    disabled={isClosed}
                    value={negativeSinceDate}
                    onChange={(e) => setNegativeSinceDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-rose-500/50 text-white outline-none focus:border-rose-400 font-mono-numbers text-xs"
                  />
                  <p className="text-[10px] text-rose-300/80 leading-relaxed">
                    Esta data é usada para calcular os dias corridos de cheque especial e projetar o custo exato de juros e IOF cobrados pelo banco.
                  </p>
                </div>
              )}

              {/* 4. ANOTAÇÕES */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400 block">
                  Anotações da Abertura (opcional):
                </label>
                <input
                  type="text"
                  disabled={isClosed}
                  placeholder="Ex: Mês iniciado com saldo conferido no app Itaú"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 outline-none disabled:opacity-60"
                />
              </div>

              {/* BOTÃO DE CONFIRMAÇÃO */}
              {!isClosed && (
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 stroke-[2.5]" />
                    <span>Definir {selectedMonthLabel} como Mês Vigente & Salvar Abertura</span>
                  </button>
                </div>
              )}

            </form>
          </div>

          {/* PROJEÇÃO DE JUROS E IOF */}
          <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
              <Calculator className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Projeção de Dívida, Juros e IOF para o Mês ({selectedMonthLabel})
              </h3>
            </div>

            {isOverdraft ? (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      Dívida Prevista no Cheque Especial:
                    </span>
                    <strong className="text-rose-400 font-mono-numbers text-base">
                      {formatBRL(projection.debtAmount)}
                    </strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-rose-500/20 text-[11px]">
                    <div>
                      <span className="text-zinc-400 block">Juros Projetados ({overdraftRate}% a.m.):</span>
                      <strong className="text-rose-400 font-mono-numbers">
                        +{formatBRL(projection.projectedInterest)}
                      </strong>
                    </div>

                    <div>
                      <span className="text-zinc-400 block">IOF Projetado (Fixo + Diário):</span>
                      <strong className="text-rose-400 font-mono-numbers">
                        +{formatBRL(projection.totalProjectedIof)}
                      </strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-semibold">Custo Financeiro Total da Dívida:</span>
                    <strong className="text-rose-400 font-mono-numbers text-sm">
                      +{formatBRL(projection.totalProjectedCost)}
                    </strong>
                  </div>
                </div>

                {overdraftFreeDays > 0 ? (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1 text-emerald-300 text-xs">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Benefício Detectado: {overdraftFreeDays} Dias Grátis ({bankDisplayName})</span>
                    </div>
                    <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                      Se você cobrir esta conta em até <strong>{overdraftFreeDays} dias</strong> com as receitas de {selectedMonthLabel}, você economizará {formatBRL(projection.projectedInterest)} em juros!
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Atenção: Banco sem Dias Grátis</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      Esta conta não possui isenção de dias grátis. Cada dia no negativo gera juros e IOF proporcionais.
                    </p>
                  </div>
                )}

                {/* Ajuste Manual de Juros e IOF Reais Pagos */}
                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200 text-xs flex items-center gap-1.5">
                      <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                      Ajustar Juros & IOF Pagos (Valor Real):
                    </span>
                    <span className="text-[10px] text-zinc-400">Opcional</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-300 font-medium block mb-1">Juros Reais Pagos (R$)</label>
                      <input
                        type="text"
                        placeholder={`Proj: ${projection.projectedInterest.toFixed(2)}`}
                        value={manualInterestInput}
                        onChange={(e) => setManualInterestInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-300 font-medium block mb-1">IOF Real Pago (R$)</label>
                      <input
                        type="text"
                        placeholder={`Proj: ${projection.totalProjectedIof.toFixed(2)}`}
                        value={manualIofInput}
                        onChange={(e) => setManualIofInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    Ao informar os valores efetivamente cobrados pelo banco, o sistema usará estes números na despesa real do mês.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 space-y-1 text-xs">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Conta Iniciando no Azul!</span>
                </div>
                <p className="text-xs text-emerald-300/80">
                  O mês de {selectedMonthLabel} inicia com saldo positivo de <strong>{formatBRL(parsedBankBalance)}</strong>. Não há cobrança de juros de cheque especial.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: JANELA DE CONTAS EM ABERTO DE MESES ANTERIORES (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Contas em Aberto de Meses Anteriores ({pastUnpaidBills.length})
                </h3>
              </div>
              <span className="text-xs font-mono-numbers text-zinc-400">
                Total Acumulado:{' '}
                <strong className="text-amber-400 font-bold">
                  {formatBRL(totalPastUnpaidAmount)}
                </strong>
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Abaixo estão listadas todas as despesas e obrigações de <strong>meses passados</strong> que ainda não foram marcadas como pagas. Mapeie e liquide estas contas para manter seu fluxo de caixa saneado.
            </p>

            {pastUnpaidBills.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-zinc-400 font-medium shrink-0">Filtrar Categoria:</span>
                <select
                  value={pastBillCategoryFilter}
                  onChange={(e) => setPastBillCategoryFilter(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white outline-none focus:border-amber-500 font-medium"
                >
                  <option value="ALL">Todas as Categorias ({pastUnpaidBills.length})</option>
                  {pastBillCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {filteredPastUnpaidBills.length === 0 ? (
              <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h4 className="text-sm font-bold text-white">Nenhuma Pendência Encontrada</h4>
                <p className="text-xs text-zinc-400">
                  Nenhuma conta pendente para os filtros selecionados.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredPastUnpaidBills.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5 text-xs hover:border-zinc-700 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {item.monthLabel}
                          </span>
                          <strong className="text-white text-xs">{item.title}</strong>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-400">
                            {item.scope}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400 font-mono-numbers block mt-1">
                          {item.category} {item.installmentText ? `• ${item.installmentText}` : ''}
                        </span>
                      </div>

                      <strong className="text-rose-400 font-mono-numbers text-sm shrink-0">
                        {formatBRL(item.amount)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-850 text-[11px] gap-2 flex-wrap">
                      <span className="text-zinc-500">Pendente de liquidação</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.type === 'subitem' && item.subItemId && (
                          <button
                            onClick={() => {
                              markSubItemAsSaved(item.subItemId!, item.month);
                            }}
                            className="py-1.5 px-2.5 rounded-lg font-bold bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 transition flex items-center gap-1"
                            title="Indica que economizou: remove das pendências deste mês sem alterar as previsões futuras"
                          >
                            <span>💡 Economizei</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setPostponeModalItem({
                              id: item.id,
                              expenseId: item.expenseId,
                              title: item.title,
                              amount: item.amount,
                              month: item.month,
                              type: item.type,
                              cardId: item.cardId,
                            });
                            setTargetPostponeMonth(addMonths(selectedMonth, 1));
                          }}
                          className="py-1.5 px-2.5 rounded-lg font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition flex items-center gap-1"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Postegar</span>
                        </button>
                        <button
                          onClick={() => {
                            if (item.type === 'card' && item.cardId) {
                              setCardRealInvoice(item.cardId, item.month, item.amount, undefined, 'paid_on_time');
                            } else if (item.isPushed) {
                              resolvePushedDebt(item.month, item.id);
                            } else if (item.type === 'subitem' && item.envelopeId && item.subItemId) {
                              addVariableExpenseLog({
                                categoryId: item.envelopeId,
                                month: item.month,
                                amount: item.amount,
                                description: `${item.title} (Quitado Retroativamente)`,
                                date: `${item.month}-15`,
                                linkedSubItemId: item.subItemId,
                              });
                            } else {
                              toggleExpensePaid(item.expenseId, item.month);
                            }
                          }}
                          className="py-1.5 px-3 rounded-lg font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirmar Pagamento</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HISTÓRICO DE AUDITORIA */}
          {(existingClosing?.reopenHistory?.length || 0) > 0 && (
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3 text-xs">
              <h4 className="font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                Histórico de Reaberturas
              </h4>
              <div className="space-y-2">
                {existingClosing?.reopenHistory?.map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-850 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="font-semibold text-amber-400">Reabertura #{idx + 1}</span>
                      <span className="font-mono-numbers">
                        {new Date(entry.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200 font-medium">{entry.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* MODAL: REABRIR MÊS */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Unlock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Reabrir Abertura de {selectedMonthLabel}
                  </h3>
                  <span className="text-[11px] text-zinc-400">Auditoria & Ajustes</span>
                </div>
              </div>
              <button
                onClick={() => setIsReopenModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReopen} className="space-y-4 text-xs">
              <p className="text-zinc-300 leading-relaxed">
                Ao reabrir a abertura deste mês, as travas serão liberadas para você alterar o saldo inicial ou a conta bancária.
              </p>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-200 block">
                  Motivo da Reabertura (Obrigatório):
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReasonInput}
                  onChange={(e) => setReopenReasonInput(e.target.value)}
                  placeholder="Ex: Ajustar o saldo inicial da conta corrente referente ao mês anterior."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-amber-500 text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsReopenModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Confirmar Reabertura</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: POSTEGAR / REAGENDAR DESPESA OU FATURA */}
      {postponeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Postegar / Reagendar Despesa</h3>
                  <span className="text-[11px] text-zinc-400">{postponeModalItem.title}</span>
                </div>
              </div>
              <button
                onClick={() => setPostponeModalItem(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPostpone} className="space-y-4">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 block">Valor da Conta / Fatura:</span>
                <strong className="text-white text-sm font-mono-numbers">{formatBRL(postponeModalItem.amount)}</strong>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-200 block">
                  Selecione o Mês Futuro para Desembolso:
                </label>
                <select
                  value={targetPostponeMonth}
                  onChange={(e) => setTargetPostponeMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-bold outline-none focus:border-amber-500"
                >
                  {selectableMonths
                    .filter((m) => m.value >= selectedMonth)
                    .map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label} ({m.value}) {m.value === selectedMonth ? '📍 Mês Atual' : ''}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Ao postegar, esta obrigação será movida para o mês selecionado, alterando suas previsões de caixa naquele mês. Quando o mês planejado chegar, ela reaparecerá para confirmação ou novo reagendamento.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-200 block text-[11px]">
                    Taxa de Juros de Atraso (Opcional):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 1.5"
                    value={postponeInterestRate}
                    onChange={(e) => setPostponeInterestRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono-numbers text-xs outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-200 block text-[11px]">
                    Incidência dos Juros:
                  </label>
                  <select
                    value={postponeInterestType}
                    onChange={(e) => setPostponeInterestType(e.target.value as 'daily' | 'monthly')}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="monthly">Ao Mês (% a.m.)</option>
                    <option value="daily">Ao Dia (% a.d.)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPostponeModalItem(null)}
                  className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Confirmar Postegação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
