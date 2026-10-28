import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  DollarSign,
  PieChart,
  CheckSquare,
  Clock,
  Layers,
  Building2,
  User,
  Calendar,
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  ReferenceLine,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import {
  formatBRL,
  formatCompactBRL,
  calculateCardDecompression,
  findRecoveryMilestone,
  getInstallmentInfo,
  addMonths,
  getMonthLabel,
  getMonthDiff,
} from '../../utils/calculations';

interface DashboardTabProps {
  onOpenNewTransaction: () => void;
  onOpenCsvImport: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  onOpenNewTransaction,
  onOpenCsvImport,
}) => {
  const {
    data,
    selectedMonth,
    setSelectedMonth,
    scopeFilter,
    summaries,
    currentMonthSummary,
    toggleCardTransactionReview,
    setActiveTab,
    updateSettings,
  } = useFinance();

  const [chartViewMode, setChartViewMode] = useState<'composed' | 'area' | 'balance'>('composed');
  const [extraAmortizationPushed, setExtraAmortizationPushed] = useState<number>(0);
  const [extraAmortizationFuture, setExtraAmortizationFuture] = useState<number>(0);

  const [pushedSortBy, setPushedSortBy] = useState<'title-asc' | 'title-desc' | 'amount-desc' | 'amount-asc'>('amount-desc');
  const [selectedPushedIds, setSelectedPushedIds] = useState<Set<string>>(new Set());

  const [futureSortBy, setFutureSortBy] = useState<'title-asc' | 'title-desc' | 'amount-desc' | 'amount-asc'>('amount-desc');
  const [selectedFutureIds, setSelectedFutureIds] = useState<Set<string>>(new Set());

  // Generate available months for rolling forecast start month selector
  const availableMonths: { value: string; label: string }[] = [];
  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() - 12);
  for (let i = 0; i < 48; i++) {
    const y = baseDate.getFullYear();
    const m = String(baseDate.getMonth() + 1).padStart(2, '0');
    const val = `${y}-${m}`;
    availableMonths.push({ value: val, label: getMonthLabel(val) });
    baseDate.setMonth(baseDate.getMonth() + 1);
  }

  const current = currentMonthSummary || summaries[0];
  const milestone = findRecoveryMilestone(summaries);
  const decompressionSeries = calculateCardDecompression(data, scopeFilter, 12);

  // Calculate percentage of income committed to credit cards
  const cardCommitmentRate =
    current.totalIncome > 0
      ? Math.min(100, Math.round((current.cardTotal / current.totalIncome) * 100))
      : 0;

  // Find all items tagged with ⚠️ Verificar
  const pendingReviewItems = data.cardTransactions.filter((tx) => tx.needsReview);

  // Total spent solely on recurring subscriptions this month
  const totalSubscriptionsThisMonth = data.cardTransactions
    .filter((tx) => tx.type === 'recurring' && !tx.isPaused)
    .reduce((acc, curr) => acc + curr.installmentAmount, 0);

  // Status of Paid vs Pending Bills for Selected Month (Expenses + Budget Subitems Forecasts vs Linked Expenses + Credit Card Bills)
  let billsPaidCount = 0;
  let billsPaidAmount = 0;
  let billsPendingCount = 0;
  let billsPendingAmount = 0;

  data.expenses.forEach((exp) => {
    let isActive = false;
    const monthIdx = parseInt(selectedMonth.split('-')[1], 10);

    if (exp.frequency === 'fixed') {
      if (getMonthDiff(exp.startMonth, selectedMonth) >= 0) isActive = true;
    } else if (exp.frequency === 'installment' && exp.installmentsCount) {
      const inst = getInstallmentInfo(exp.startMonth, exp.installmentsCount, selectedMonth);
      if (inst.isActive) isActive = true;
    } else if (exp.frequency === 'periodic' && exp.periodicMonths) {
      if (
        getMonthDiff(exp.startMonth, selectedMonth) >= 0 &&
        exp.periodicMonths.includes(monthIdx)
      ) {
        isActive = true;
      }
    } else if (exp.frequency === 'single') {
      if (exp.singleMonth === selectedMonth || exp.startMonth === selectedMonth) {
        isActive = true;
      }
    }

    if (isActive) {
      const isPaid = !!exp.paidMonths?.[selectedMonth];
      if (isPaid) {
        billsPaidCount++;
        billsPaidAmount += exp.amount;
      } else {
        billsPendingCount++;
        billsPendingAmount += exp.amount;
      }
    }
  });

  // Budget Subitems (Previsões de despesas nas categorias) compared with linked expenses
  const monthLogs = data.variableExpenseLogs.filter((l) => l.month === selectedMonth);
  
  data.budgetEnvelopes.forEach((env) => {
    const lowerCategoryName = env.name.trim().toLowerCase();
    
    const cardTxForEnv = data.cardTransactions.filter((tx) => {
      if (tx.isPaused) return false;
      const matchesCategory = tx.category.trim().toLowerCase() === lowerCategoryName || tx.category === env.id;
      if (!matchesCategory) return false;
      if (tx.type === 'recurring') return getMonthDiff(tx.startMonth, selectedMonth) >= 0;
      if (tx.type === 'installment') return getInstallmentInfo(tx.startMonth, tx.totalInstallments, selectedMonth).isActive;
      if (tx.type === 'single') return tx.startMonth === selectedMonth;
      return false;
    });

    if (env.subItems && env.subItems.length > 0) {
      env.subItems.forEach((sub) => {
        const linkedLogs = monthLogs.filter((l) => l.linkedSubItemId === sub.id);
        const linkedCards = cardTxForEnv.filter((tx) => tx.linkedSubItemId === sub.id);
        const spentOnSub =
          linkedLogs.reduce((acc, l) => acc + l.amount, 0) +
          linkedCards.reduce((acc, t) => acc + t.installmentAmount, 0);

        if (sub.amount > 0) {
          if (spentOnSub >= sub.amount) {
            billsPaidCount++;
            billsPaidAmount += sub.amount;
          } else if (spentOnSub > 0) {
            billsPaidAmount += spentOnSub;
            billsPendingCount++;
            billsPendingAmount += (sub.amount - spentOnSub);
          } else {
            billsPendingCount++;
            billsPendingAmount += sub.amount;
          }
        }
      });
    }
  });

  // Add credit card bills as paid or pending
  data.creditCards.forEach((card) => {
    const cardBillAmount = current.cardTotalsByCard[card.id] || 0;
    if (cardBillAmount > 0) {
      const status = card.invoicePaymentStatusByMonth?.[selectedMonth];
      const isPaid = status === 'paid_on_time' || status === 'paid_late';
      if (isPaid) {
        billsPaidCount++;
        billsPaidAmount += cardBillAmount;
      } else {
        billsPendingCount++;
        billsPendingAmount += cardBillAmount;
      }
    }
  });

  // Scheduled Reminders and Pushed list
  const activeScheduledReminders = Object.values(data.monthlyClosings || {})
    .flatMap((c) => c.scheduledReminders || [])
    .filter((r) => r.status === 'scheduled');
  const activePushedDebts = Object.values(data.monthlyClosings || {})
    .flatMap((c) => c.pushedDebts || [])
    .filter((p) => p.status === 'pushed');

  // Future Debt Projection & Traceability
  interface DebtItem {
    id: string;
    title: string;
    origin: string;
    scope: 'PF' | 'PJ';
    monthlyAmount: number;
    remainingInstallments: number;
    totalRemainingDebt: number;
    endMonth: string;
  }

  const futureDebts: DebtItem[] = [];
  const trackedSubItemIds = new Set<string>();
  const trackedTitles = new Set<string>();

  // 1. Debt from expense installments (Loans, financing)
  data.expenses
    .filter((e) => e.frequency === 'installment' && e.installmentsCount)
    .forEach((exp) => {
      const inst = getInstallmentInfo(exp.startMonth, exp.installmentsCount!, selectedMonth);
      if (inst.isActive) {
        const remaining = exp.installmentsCount! - inst.current + 1;
        const endMonth = addMonths(exp.startMonth, exp.installmentsCount! - 1);
        if (exp.linkedSubItemId) trackedSubItemIds.add(exp.linkedSubItemId);
        trackedTitles.add(exp.title.trim().toLowerCase());
        futureDebts.push({
          id: exp.id,
          title: exp.title,
          origin: exp.category,
          scope: exp.scope,
          monthlyAmount: exp.amount,
          remainingInstallments: remaining,
          totalRemainingDebt: remaining * exp.amount,
          endMonth,
        });
      }
    });

  // 2. Debt from card installments
  data.cardTransactions
    .filter((tx) => tx.type === 'installment' && tx.totalInstallments > 1 && !tx.isPaused)
    .forEach((tx) => {
      const card = data.creditCards.find((c) => c.id === tx.cardId);
      const inst = getInstallmentInfo(tx.startMonth, tx.totalInstallments, selectedMonth);
      if (inst.isActive) {
        const remaining = tx.totalInstallments - inst.current + 1;
        const endMonth = addMonths(tx.startMonth, tx.totalInstallments - 1);
        if (tx.linkedSubItemId) trackedSubItemIds.add(tx.linkedSubItemId);
        trackedTitles.add(tx.description.trim().toLowerCase());
        futureDebts.push({
          id: tx.id,
          title: tx.description,
          origin: card?.name || 'Cartão',
          scope: card?.scope || 'PF',
          monthlyAmount: tx.installmentAmount,
          remainingInstallments: remaining,
          totalRemainingDebt: remaining * tx.installmentAmount,
          endMonth,
        });
      }
    });

  // 3. Debt/Obligations ONLY from category "Financiamento | Dívidas" subitems (if not already tracked by expenses or card transactions)
  data.budgetEnvelopes.forEach((env) => {
    const envNameLower = env.name.trim().toLowerCase();
    if (envNameLower.includes('financiamento') || envNameLower.includes('dívidas') || envNameLower === 'financiamento | dívidas') {
      if (env.subItems && env.subItems.length > 0) {
        env.subItems.forEach((sub) => {
          // If already tracked by an installment expense or card transaction, skip to avoid duplication!
          if (trackedSubItemIds.has(sub.id) || trackedTitles.has(sub.name.trim().toLowerCase())) {
            return;
          }

          // Se já encerrou antes do mês selecionado, não lista
          if (sub.endMonth && getMonthDiff(sub.endMonth, selectedMonth) > 0) {
            return;
          }

          let startRef = selectedMonth;
          if (sub.startMonth && getMonthDiff(selectedMonth, sub.startMonth) > 0) {
            startRef = sub.startMonth;
          }

          let remainingMonths = 12;
          let endMonth = addMonths(startRef, 11);

          if (sub.endMonth) {
            const diff = getMonthDiff(startRef, sub.endMonth) + 1;
            if (diff > 0) {
              remainingMonths = diff;
              endMonth = sub.endMonth;
            } else {
              return;
            }
          }

          const totalRemaining = sub.amount * remainingMonths;

          futureDebts.push({
            id: sub.id,
            title: sub.name,
            origin: env.name,
            scope: 'PF',
            monthlyAmount: sub.amount,
            remainingInstallments: remainingMonths,
            totalRemainingDebt: totalRemaining,
            endMonth,
          });
        });
      }
    }
  });



  const totalFutureDebt = futureDebts.reduce((acc, curr) => acc + curr.totalRemainingDebt, 0);

  // Sorted & Filtered Pushed Debts
  const sortedPushedDebts = [...activePushedDebts].sort((a, b) => {
    const rateA = a.interestRate || 0;
    const intTypeA = a.interestType || 'monthly';
    const monthsA = Math.max(1, getMonthDiff(a.month, a.targetMonth));
    const totalA = a.amount + (rateA > 0 ? (intTypeA === 'monthly' ? a.amount * (rateA/100)*monthsA : a.amount * (rateA/100)*(monthsA*30)) : 0);

    const rateB = b.interestRate || 0;
    const intTypeB = b.interestType || 'monthly';
    const monthsB = Math.max(1, getMonthDiff(b.month, b.targetMonth));
    const totalB = b.amount + (rateB > 0 ? (intTypeB === 'monthly' ? b.amount * (rateB/100)*monthsB : b.amount * (rateB/100)*(monthsB*30)) : 0);

    if (pushedSortBy === 'title-asc') return a.expenseTitle.localeCompare(b.expenseTitle);
    if (pushedSortBy === 'title-desc') return b.expenseTitle.localeCompare(a.expenseTitle);
    if (pushedSortBy === 'amount-asc') return totalA - totalB;
    return totalB - totalA;
  });

  const selectedPushedTotal = sortedPushedDebts
    .filter((p) => selectedPushedIds.has(p.id))
    .reduce((acc, p) => {
      const rate = p.interestRate || 0;
      const intType = p.interestType || 'monthly';
      const monthsDiff = Math.max(1, getMonthDiff(p.month, p.targetMonth));
      const daysDiff = monthsDiff * 30;
      const projectedInterest = rate > 0
        ? intType === 'monthly'
          ? p.amount * (rate / 100) * monthsDiff
          : p.amount * (rate / 100) * daysDiff
        : 0;
      return acc + p.amount + projectedInterest;
    }, 0);

  // Sorted & Filtered Future Debts
  const sortedFutureDebts = [...futureDebts].sort((a, b) => {
    if (futureSortBy === 'title-asc') return a.title.localeCompare(b.title);
    if (futureSortBy === 'title-desc') return b.title.localeCompare(a.title);
    if (futureSortBy === 'amount-asc') return a.totalRemainingDebt - b.totalRemainingDebt;
    return b.totalRemainingDebt - a.totalRemainingDebt;
  });

  const selectedFutureTotal = sortedFutureDebts
    .filter((item) => selectedFutureIds.has(item.id))
    .reduce((acc, item) => acc + item.totalRemainingDebt, 0);




  // Prepare data for 12M Cashflow Area & Composed Chart
  const chartData = summaries.slice(0, 12).map((s) => {
    // Entradas reais do mês (sem inflar com o saldo anterior)
    const receitasReais = s.fixedIncome + s.variableIncome;
    // Saídas consolidadas do mês (contas fixas + envelopes variáveis + cartões + juros cheque especial)
    const despesasReais = s.totalExpenses;
    const saldoLiquidoMes = receitasReais - despesasReais;
    return {
      label: s.label,
      month: s.month,
      Entradas: receitasReais,
      Saidas: despesasReais,
      SaldoLiquido: saldoLiquidoMes,
      SaldoAcumulado: s.finalBalance,
      SaldoAnterior: s.previousBalance,
    };
  });

  const totalEntradas12M = chartData.reduce((acc, curr) => acc + curr.Entradas, 0);
  const totalSaidas12M = chartData.reduce((acc, curr) => acc + curr.Saidas, 0);
  const saldoFinal12M = chartData[chartData.length - 1]?.SaldoAcumulado || 0;
  const mediaEntradas12M = chartData.length > 0 ? totalEntradas12M / chartData.length : 0;
  const mediaSaidas12M = chartData.length > 0 ? totalSaidas12M / chartData.length : 0;

  // Activity Tracker Helpers
  const formatTimeAgo = (iso?: string) => {
    if (!iso) return 'Primeiro acesso';
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 2) return 'Agora mesmo';
    if (diffMin < 60) return `${diffMin} min atrás`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${Math.floor(diffHours / 24)}d atrás`;
  };

  const lastVisitText = formatTimeAgo(data.settings.lastVisitTimestamp);
  const lastExp = data.settings.lastExpenseLogged;

  // Custom Tooltips - extrai com segurança do payload completo
  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const datum = payload[0]?.payload || {};
      const pEntradas = datum.Entradas ?? 0;
      const pSaidas = datum.Saidas ?? 0;
      const pLiquido = datum.SaldoLiquido ?? (pEntradas - pSaidas);
      const pSaldo = datum.SaldoAcumulado ?? 0;
      const pAnterior = datum.SaldoAnterior ?? 0;

      return (
        <div className="bg-zinc-950/95 border border-zinc-700/80 rounded-xl p-3.5 shadow-2xl text-xs space-y-2 min-w-[240px] backdrop-blur-md">
          <div className="font-bold text-white border-b border-zinc-800 pb-1.5 flex justify-between items-center">
            <span className="text-zinc-200">Mês: {label}</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                pLiquido >= 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {pLiquido >= 0 ? 'Superávit Mensal' : 'Déficit Mensal'}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500/50" />
                <span className="font-medium">(+) Entradas (Receitas):</span>
              </span>
              <span className="font-mono-numbers text-emerald-400 font-bold">
                +{formatBRL(pEntradas)}
              </span>
            </div>

            <div className="flex justify-between items-center text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-sm shadow-rose-500/50" />
                <span className="font-medium">(-) Saídas (Despesas):</span>
              </span>
              <span className="font-mono-numbers text-rose-400 font-bold">
                -{formatBRL(pSaidas)}
              </span>
            </div>

            <div className="flex justify-between items-center text-zinc-400 text-[11px] pt-1 border-t border-zinc-800/80">
              <span>(=) Resultado do Mês:</span>
              <span
                className={`font-mono-numbers font-bold ${
                  pLiquido >= 0 ? 'text-emerald-300' : 'text-rose-400'
                }`}
              >
                {pLiquido >= 0 ? `+${formatBRL(pLiquido)}` : formatBRL(pLiquido)}
              </span>
            </div>

            {pAnterior !== 0 && (
              <div className="flex justify-between items-center text-zinc-400 text-[11px]">
                <span>Saldo Inicial / Mês Anterior:</span>
                <span
                  className={`font-mono-numbers font-medium ${
                    pAnterior >= 0 ? 'text-zinc-300' : 'text-rose-400'
                  }`}
                >
                  {formatBRL(pAnterior)}
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-800 pt-2 flex justify-between items-center font-bold">
            <span className="text-zinc-200 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block shadow-sm shadow-sky-400/50" />
              <span>(🏦) Saldo Acumulado:</span>
            </span>
            <span
              className={`font-mono-numbers text-sm ${
                pSaldo >= 0 ? 'text-sky-300 font-extrabold' : 'text-rose-400 font-extrabold'
              }`}
            >
              {formatBRL(pSaldo)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Rolling Forecast Start Month Selector Bar */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs shadow-md">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <div>
            <span className="font-bold text-white block">Início da Projeção de 12 Meses (Rolling Forecast)</span>
            <span className="text-[11px] text-zinc-400">Define o mês de partida para observar e projetar os próximos 12 meses.</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={data.settings.startMonth || '2026-01'}
            onChange={(e) => updateSettings({ startMonth: e.target.value })}
            className="px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-emerald-500 font-bold"
          >
            {availableMonths.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label} ({m.value})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity Tracker & Motivational Banner */}
      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-zinc-200 block">
              Última Visita: <strong className="text-emerald-400">{lastVisitText}</strong>
            </span>
            <span className="text-zinc-400 text-[11px]">
              {lastExp
                ? `Última despesa lançada: "${lastExp.description}" no valor de ${formatBRL(lastExp.amount)}`
                : 'Nenhuma despesa recente lançada. Mantenha os registros em dia para máxima previsibilidade!'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('monthly')}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition font-medium"
          >
            Ver Previsão & Controle
          </button>
          <button
            onClick={onOpenNewTransaction}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition shadow-sm"
          >
            + Novo Lançamento
          </button>
        </div>
      </div>

      {/* Reminders & Pushed Debts Alert Banner */}
      {(activeScheduledReminders.length > 0 || activePushedDebts.length > 0) && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/40 via-zinc-900 to-amber-950/40 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <strong className="text-zinc-100 font-bold block">
                Alertas do Fechamento Mensal
              </strong>
              <span className="text-zinc-300">
                {activeScheduledReminders.length > 0 && (
                  <span>
                    ⏰ <strong>{activeScheduledReminders.length}</strong> conta(s) com pagamento programado ({formatBRL(activeScheduledReminders.reduce((a, b) => a + b.amount, 0))}).{' '}
                  </span>
                )}
                {activePushedDebts.length > 0 && (
                  <span className="text-amber-300">
                    ⚠️ <strong>{activePushedDebts.length}</strong> dívida(s) empurrada(s) somando <strong>{formatBRL(activePushedDebts.reduce((a, b) => a + b.amount, 0))}</strong> na projeção.
                  </span>
                )}
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('closing')}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-indigo-300 border border-indigo-500/30 font-semibold transition self-start sm:self-auto shrink-0"
          >
            Ver Fechamento Mensal →
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">

        {/* Card 1: Saldo Anterior */}
        <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Saldo Mês Anterior</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                current.previousBalance >= 0
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {current.previousBalance >= 0 ? 'Positivo' : 'Cheque Especial'}
            </span>
          </div>
          <div
            className={`text-xl font-bold font-mono-numbers ${
              current.previousBalance >= 0 ? 'text-zinc-100' : 'text-rose-400'
            }`}
          >
            {formatBRL(current.previousBalance)}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            {current.previousBalance < 0
              ? 'Abatido nas saídas do mês'
              : 'Disponibilidade adicional'}
          </p>
        </div>

        {/* Card 2: Entradas */}
        <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Entradas do Mês</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono-numbers text-emerald-400">
            {formatBRL(current.fixedIncome + current.variableIncome)}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Fixas: {formatBRL(current.fixedIncome)} | Extras: {formatBRL(current.variableIncome)}
          </p>
        </div>

        {/* Card 3: Saídas Totais */}
        <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Saídas Totais</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono-numbers text-rose-400">
            {formatBRL(current.totalExpenses)}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Contas + Cartões + Envelopes
          </p>
        </div>

        {/* Card 4: Balanço do Mês */}
        <div
          className={`p-4 rounded-xl border shadow-sm ${
            current.finalBalance >= 0
              ? 'bg-emerald-950/20 border-emerald-500/40'
              : 'bg-rose-950/20 border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-semibold text-zinc-300">Balanço Projetado</span>
            <span
              className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                current.finalBalance >= 0
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {current.finalBalance >= 0 ? 'Superávit' : 'Déficit'}
            </span>
          </div>
          <div
            className={`text-xl font-extrabold font-mono-numbers ${
              current.finalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatBRL(current.finalBalance)}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            {current.label} • {current.finalBalance >= 0 ? 'Caixa acumulando' : 'Atenção ao teto'}
          </p>
        </div>

        {/* Card 5: Dívida Futura Total */}
        <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Dívida Total a Vencer</span>
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono-numbers text-white">
            {formatBRL(totalFutureDebt)}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            {futureDebts.length} parcelamentos ativos
          </p>
        </div>
      </div>

      {/* Status de Contas Pagas e a Pagar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contas Pagas */}
        <div className="p-4 rounded-xl bg-zinc-900/70 border border-emerald-500/30 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-zinc-200">Contas Já Quitadas no Mês</span>
            </div>
            <span className="text-lg font-bold font-mono-numbers text-emerald-400">
              {formatBRL(billsPaidAmount)}
            </span>
            <span className="text-[11px] text-zinc-400 block">{billsPaidCount} itens pagos</span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400">
            Concluído
          </span>
        </div>

        {/* Contas a Pagar */}
        <div className="p-4 rounded-xl bg-zinc-900/70 border border-amber-500/30 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-zinc-200">Restante a Pagar no Banco</span>
            </div>
            <span className="text-lg font-bold font-mono-numbers text-amber-400">
              {formatBRL(billsPendingAmount)}
            </span>
            <span className="text-[11px] text-zinc-400 block">{billsPendingCount} pendências</span>
          </div>
          <button
            onClick={() => setActiveTab('monthly')}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
          >
            Quitar Agora →
          </button>
        </div>
      </div>

      {/* RECHARTS COMPOSED & AREA CHART - EVOLUÇÃO DO FLUXO DE CAIXA 12 MESES */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm space-y-4">
        {/* Header com Título, Seletor de Modo e Legenda */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-800/70">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Evolução do Fluxo de Caixa Projetado (Próximos 12 Meses)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Confronto visual direto entre <strong>Receitas (Entradas)</strong>, <strong>Despesas (Saídas)</strong> e a trajetória do <strong>Saldo Acumulado</strong> mês a mês
            </p>
          </div>

          {/* Toggle de Modos de Visualização */}
          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start lg:self-auto">
            <button
              onClick={() => setChartViewMode('composed')}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
                chartViewMode === 'composed'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Exibe barras de Receitas e Despesas lado a lado com a linha de Saldo Acumulado"
            >
              📊 Barras + Saldo
            </button>
            <button
              onClick={() => setChartViewMode('area')}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
                chartViewMode === 'area'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Exibe áreas preenchidas de Receitas vs Despesas"
            >
              🌊 Áreas de Fluxo
            </button>
            <button
              onClick={() => setChartViewMode('balance')}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
                chartViewMode === 'balance'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Foca exclusivamente na curva do Saldo Acumulado em conta"
            >
              📈 Curva de Saldo
            </button>
          </div>
        </div>

        {/* Indicadores Resumo dos 12 Meses */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500/50" />
                Receitas (12 Meses)
              </span>
              <span className="text-base font-bold font-mono-numbers text-emerald-400 block mt-0.5">
                {formatBRL(totalEntradas12M)}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono-numbers">
                Média: {formatBRL(mediaEntradas12M)}/mês
              </span>
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-500/40" />
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/70 border border-rose-500/20 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-sm shadow-rose-500/50" />
                Despesas (12 Meses)
              </span>
              <span className="text-base font-bold font-mono-numbers text-rose-400 block mt-0.5">
                {formatBRL(totalSaidas12M)}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono-numbers">
                Média: {formatBRL(mediaSaidas12M)}/mês
              </span>
            </div>
            <TrendingDown className="w-5 h-5 text-rose-500/40" />
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/70 border border-sky-500/20 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block shadow-sm shadow-sky-400/50" />
                Saldo Acumulado Final (Mês 12)
              </span>
              <span
                className={`text-base font-extrabold font-mono-numbers block mt-0.5 ${
                  saldoFinal12M >= 0 ? 'text-sky-300' : 'text-rose-400'
                }`}
              >
                {formatBRL(saldoFinal12M)}
              </span>
              <span className="text-[10px] text-zinc-500">
                {saldoFinal12M >= 0 ? 'Projeção Positiva em Caixa' : 'Atenção: Projeção Negativa'}
              </span>
            </div>
            <DollarSign className="w-5 h-5 text-sky-400/40" />
          </div>
        </div>

        {/* Gráfico Recharts */}
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartViewMode === 'composed' ? (
              <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSaldoLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => formatCompactBRL(val)}
                />
                <Tooltip content={<CustomAreaTooltip />} />
                <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                <Bar
                  dataKey="Entradas"
                  name="Receitas"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="Saidas"
                  name="Despesas"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  type="monotone"
                  dataKey="SaldoAcumulado"
                  name="Saldo Acumulado"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: '#0284c7', stroke: '#38bdf8', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#38bdf8' }}
                />
              </ComposedChart>
            ) : chartViewMode === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntradasArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorSaidasArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => formatCompactBRL(val)}
                />
                <Tooltip content={<CustomAreaTooltip />} />
                <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="Entradas"
                  name="Receitas"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEntradasArea)"
                />
                <Area
                  type="monotone"
                  dataKey="Saidas"
                  name="Despesas"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSaidasArea)"
                />
                <Line
                  type="monotone"
                  dataKey="SaldoAcumulado"
                  name="Saldo Acumulado"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: '#0284c7', stroke: '#38bdf8', strokeWidth: 1.5 }}
                />
              </AreaChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSaldoOnly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => formatCompactBRL(val)}
                />
                <Tooltip content={<CustomAreaTooltip />} />
                <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="SaldoAcumulado"
                  name="Saldo Acumulado"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSaldoOnly)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Projeção de dívidas e contas atrasadas (Postergadas) */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Projeção de Dívidas e Contas Atrasadas (Postergadas)
            </h3>
            <p className="text-xs text-zinc-400">
              Contas e obrigações reagendadas com projeção de juros e encargos de atraso
            </p>
          </div>
          <span className="font-mono-numbers font-bold text-amber-400 text-xs">
            Total Geral Acumulado: {formatBRL(
              Object.values(data.monthlyClosings || {})
                .flatMap((c) => c.pushedDebts || [])
                .filter((p) => p.status === 'pushed')
                .reduce((acc, p) => {
                  const rate = p.interestRate || 0;
                  const intType = p.interestType || 'monthly';
                  const monthsDiff = Math.max(1, getMonthDiff(p.month, p.targetMonth));
                  const daysDiff = monthsDiff * 30;
                  const projectedInterest = rate > 0
                    ? intType === 'monthly'
                      ? p.amount * (rate / 100) * monthsDiff
                      : p.amount * (rate / 100) * daysDiff
                    : 0;
                  return acc + p.amount + projectedInterest;
                }, 0)
            )}
          </span>
        </div>

        {/* Gráfico de Redução de Saldo Devedor & Simulador de Amortização Extra (Postergadas) */}
        {activePushedDebts.length > 0 && (
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">Evolução e Comparativo de Amortização (Próximos 12 Meses)</span>
                <span className="text-[11px] text-zinc-400">Compare o cenário atual com pagamentos extras mensais para acelerar a quitação.</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-zinc-300 font-medium">Amortização Extra Mensal (R$):</label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={extraAmortizationPushed}
                  onChange={(e) => setExtraAmortizationPushed(parseFloat(e.target.value) || 0)}
                  className="w-28 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white font-mono-numbers outline-none focus:border-amber-500 font-bold"
                />
              </div>
            </div>

            <div className="h-56 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={Array.from({ length: 12 }, (_, i) => {
                    const targetM = addMonths(selectedMonth, i);
                    const label = getMonthLabel(targetM);
                    let baseline = 0;
                    activePushedDebts.forEach((p) => {
                      if (getMonthDiff(targetM, p.targetMonth) >= 0) {
                        const rate = p.interestRate || 0;
                        const intType = p.interestType || 'monthly';
                        const monthsDiff = Math.max(1, getMonthDiff(p.month, p.targetMonth));
                        const daysDiff = monthsDiff * 30;
                        const projectedInterest = rate > 0
                          ? intType === 'monthly'
                            ? p.amount * (rate / 100) * monthsDiff
                            : p.amount * (rate / 100) * daysDiff
                          : 0;
                        baseline += p.amount + projectedInterest;
                      }
                    });
                    const withExtra = Math.max(0, baseline - extraAmortizationPushed * i);
                    return {
                      month: label,
                      CenarioAtual: baseline,
                      ComAmortizacaoExtra: withExtra,
                    };
                  })}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorBaselinePushed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorExtraPushed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} tickLine={false} tickFormatter={(v) => formatCompactBRL(v)} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-zinc-950 border border-zinc-700 p-2.5 rounded-lg text-xs space-y-1 shadow-xl">
                            <div className="font-bold text-white">{label}</div>
                            <div className="text-amber-400 font-mono-numbers">Cenário Atual: {formatBRL(Number(payload[0]?.value) || 0)}</div>
                            <div className="text-emerald-400 font-mono-numbers">Com Amortização Extra: {formatBRL(Number(payload[1]?.value) || 0)}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="CenarioAtual" name="Cenário Atual" stroke="#f59e0b" strokeWidth={2} fill="url(#colorBaselinePushed)" />
                  <Area type="monotone" dataKey="ComAmortizacaoExtra" name="Com Amortização Extra" stroke="#10b981" strokeWidth={2} fill="url(#colorExtraPushed)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activePushedDebts.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-950/60 rounded-xl border border-zinc-800">
            Nenhuma despesa ou conta postergada no momento.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-medium">Ordenar por:</span>
                <select
                  value={pushedSortBy}
                  onChange={(e) => setPushedSortBy(e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-medium outline-none focus:border-amber-500"
                >
                  <option value="amount-desc">Maior Valor (↓)</option>
                  <option value="amount-asc">Menor Valor (↑)</option>
                  <option value="title-asc">Alfabética (A-Z)</option>
                  <option value="title-desc">Alfabética (Z-A)</option>
                </select>
              </div>

              {selectedPushedIds.size > 0 && (
                <div className="text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg flex items-center gap-2">
                  <span>Selecionadas: {selectedPushedIds.size} linha(s)</span>
                  <span>•</span>
                  <span>Soma Selecionada: {formatBRL(selectedPushedTotal)}</span>
                  <button
                    onClick={() => setSelectedPushedIds(new Set())}
                    className="text-zinc-400 hover:text-white ml-2 text-[10px] underline"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-900/90 text-zinc-400 sticky top-0 border-b border-zinc-800 z-10 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedPushedIds.size === sortedPushedDebts.length && sortedPushedDebts.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPushedIds(new Set(sortedPushedDebts.map((p) => p.id)));
                          } else {
                            setSelectedPushedIds(new Set());
                          }
                        }}
                        className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0 cursor-pointer"
                        title="Selecionar todas"
                      />
                    </th>
                    <th className="py-2.5 px-3">Compromisso</th>
                    <th className="py-2.5 px-3">Mês Origem → Destino</th>
                    <th className="py-2.5 px-3 text-right">Valor Original</th>
                    <th className="py-2.5 px-3 text-right">Projeção de Juros</th>
                    <th className="py-2.5 px-3 text-right">Total por Linha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {sortedPushedDebts.map((p) => {
                    const rate = p.interestRate || 0;
                    const intType = p.interestType || 'monthly';
                    const monthsDiff = Math.max(1, getMonthDiff(p.month, p.targetMonth));
                    const daysDiff = monthsDiff * 30;
                    const projectedInterest = rate > 0
                      ? intType === 'monthly'
                        ? p.amount * (rate / 100) * monthsDiff
                        : p.amount * (rate / 100) * daysDiff
                      : 0;
                    const rowTotal = p.amount + projectedInterest;
                    const isSelected = selectedPushedIds.has(p.id);

                    return (
                      <tr
                        key={p.id}
                        onClick={() => {
                          const next = new Set(selectedPushedIds);
                          if (isSelected) next.delete(p.id);
                          else next.add(p.id);
                          setSelectedPushedIds(next);
                        }}
                        className={`hover:bg-zinc-900/50 text-zinc-300 cursor-pointer transition ${
                          isSelected ? 'bg-amber-500/10' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const next = new Set(selectedPushedIds);
                              if (e.target.checked) next.add(p.id);
                              else next.delete(p.id);
                              setSelectedPushedIds(next);
                            }}
                            className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 font-semibold text-white">{p.expenseTitle}</td>
                        <td className="py-2 px-3 text-zinc-400">
                          {getMonthLabel(p.month)} → <strong className="text-amber-400">{getMonthLabel(p.targetMonth)}</strong>
                        </td>
                        <td className="py-2 px-3 text-right font-mono-numbers text-zinc-200">
                          {formatBRL(p.amount)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono-numbers text-amber-400">
                          {rate > 0 ? `+${formatBRL(projectedInterest)} (${rate}% ${intType === 'monthly' ? 'a.m.' : 'a.d.'})` : 'R$ 0,00'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono-numbers font-bold text-white">
                          {formatBRL(rowTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Projeção da Dívida e Rastreabilidade */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Projeção e Rastreabilidade de Dívidas & Parcelas Futuras
            </h3>
            <p className="text-xs text-zinc-400">
              Rastreabilidade completa de mês de término e origem de cada compromisso financeiro
            </p>
          </div>
          <span className="font-mono-numbers font-bold text-emerald-400 text-xs">
            Total a Amortizar: {formatBRL(totalFutureDebt)}
          </span>
        </div>

        {/* Gráfico de Redução de Saldo Devedor & Simulador de Amortização Extra (Futuras) */}
        {futureDebts.length > 0 && (
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">Evolução e Comparativo de Amortização (Próximos 12 Meses)</span>
                <span className="text-[11px] text-zinc-400">Compare o saldo devedor projetado com pagamentos extras mensais.</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-zinc-300 font-medium">Amortização Extra Mensal (R$):</label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={extraAmortizationFuture}
                  onChange={(e) => setExtraAmortizationFuture(parseFloat(e.target.value) || 0)}
                  className="w-28 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white font-mono-numbers outline-none focus:border-emerald-500 font-bold"
                />
              </div>
            </div>

            <div className="h-56 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={Array.from({ length: 12 }, (_, i) => {
                    const targetM = addMonths(selectedMonth, i);
                    const label = getMonthLabel(targetM);
                    let baseline = 0;
                    futureDebts.forEach((item) => {
                      if (getMonthDiff(selectedMonth, targetM) >= 0 && getMonthDiff(targetM, item.endMonth) <= 0) {
                        baseline += item.monthlyAmount * Math.max(1, getMonthDiff(targetM, item.endMonth) + 1);
                      }
                    });
                    const withExtra = Math.max(0, baseline - extraAmortizationFuture * i);
                    return {
                      month: label,
                      CenarioAtual: baseline,
                      ComAmortizacaoExtra: withExtra,
                    };
                  })}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorBaselineFuture" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorExtraFuture" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} tickLine={false} tickFormatter={(v) => formatCompactBRL(v)} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-zinc-950 border border-zinc-700 p-2.5 rounded-lg text-xs space-y-1 shadow-xl">
                            <div className="font-bold text-white">{label}</div>
                            <div className="text-indigo-400 font-mono-numbers">Cenário Atual: {formatBRL(Number(payload[0]?.value) || 0)}</div>
                            <div className="text-emerald-400 font-mono-numbers">Com Amortização Extra: {formatBRL(Number(payload[1]?.value) || 0)}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="CenarioAtual" name="Cenário Atual" stroke="#6366f1" strokeWidth={2} fill="url(#colorBaselineFuture)" />
                  <Area type="monotone" dataKey="ComAmortizacaoExtra" name="Com Amortização Extra" stroke="#10b981" strokeWidth={2} fill="url(#colorExtraFuture)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {futureDebts.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-950/60 rounded-xl border border-zinc-800">
            Nenhuma dívida ou compra parcelada ativa cadastrada no momento.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-medium">Ordenar por:</span>
                <select
                  value={futureSortBy}
                  onChange={(e) => setFutureSortBy(e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-medium outline-none focus:border-emerald-500"
                >
                  <option value="amount-desc">Maior Saldo Devedor (↓)</option>
                  <option value="amount-asc">Menor Saldo Devedor (↑)</option>
                  <option value="title-asc">Alfabética (A-Z)</option>
                  <option value="title-desc">Alfabética (Z-A)</option>
                </select>
              </div>

              {selectedFutureIds.size > 0 && (
                <div className="text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-lg flex items-center gap-2">
                  <span>Selecionadas: {selectedFutureIds.size} linha(s)</span>
                  <span>•</span>
                  <span>Soma Selecionada: {formatBRL(selectedFutureTotal)}</span>
                  <button
                    onClick={() => setSelectedFutureIds(new Set())}
                    className="text-zinc-400 hover:text-white ml-2 text-[10px] underline"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-900/90 text-zinc-400 sticky top-0 border-b border-zinc-800 z-10 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedFutureIds.size === sortedFutureDebts.length && sortedFutureDebts.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFutureIds(new Set(sortedFutureDebts.map((item) => item.id)));
                          } else {
                            setSelectedFutureIds(new Set());
                          }
                        }}
                        className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0 cursor-pointer"
                        title="Selecionar todas"
                      />
                    </th>
                    <th className="py-2.5 px-3">Compromisso</th>
                    <th className="py-2.5 px-3">Origem</th>
                    <th className="py-2.5 px-3">Escopo</th>
                    <th className="py-2.5 px-3 text-right">Parcela Mensal</th>
                    <th className="py-2.5 px-3 text-center">Restantes</th>
                    <th className="py-2.5 px-3">Término</th>
                    <th className="py-2.5 px-3 text-right">Saldo Devedor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {sortedFutureDebts.map((item) => {
                    const isSelected = selectedFutureIds.has(item.id);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => {
                          const next = new Set(selectedFutureIds);
                          if (isSelected) next.delete(item.id);
                          else next.add(item.id);
                          setSelectedFutureIds(next);
                        }}
                        className={`hover:bg-zinc-900/50 text-zinc-300 cursor-pointer transition ${
                          isSelected ? 'bg-emerald-500/10' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const next = new Set(selectedFutureIds);
                              if (e.target.checked) next.add(item.id);
                              else next.delete(item.id);
                              setSelectedFutureIds(next);
                            }}
                            className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 font-semibold text-white">{item.title}</td>
                        <td className="py-2 px-3 text-zinc-400">{item.origin}</td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">
                            {item.scope}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono-numbers text-zinc-200">
                          {formatBRL(item.monthlyAmount)}
                        </td>
                        <td className="py-2 px-3 text-center font-mono-numbers font-semibold text-indigo-400">
                          {item.remainingInstallments}x
                        </td>
                        <td className="py-2 px-3 font-semibold text-emerald-400">
                          {getMonthLabel(item.endMonth)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono-numbers font-bold text-white">
                          {formatBRL(item.totalRemainingDebt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
