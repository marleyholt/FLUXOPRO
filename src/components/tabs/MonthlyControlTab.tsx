import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  Home,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Edit2,
  Lock,
  X,
  Check,
  Info,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatBRL, getMonthDiff, getInstallmentInfo } from '../../utils/calculations';
import { Expense, VariableExpenseLog } from '../../types/finance';

interface MonthlyControlTabProps {
  onOpenQuickExpense: (envelopeId?: string) => void;
  onOpenNewTransaction: () => void;
}

export const MonthlyControlTab: React.FC<MonthlyControlTabProps> = ({
  onOpenQuickExpense,
  onOpenNewTransaction,
}) => {
  const {
    data,
    selectedMonth,
    summaries,
    currentMonthSummary,
    toggleExpensePaid,
    updateExpense,
    deleteExpense,
    updateVariableExpenseLog,
    deleteVariableExpenseLog,
    createBudgetCategory,
    updateBudgetEnvelopeTarget,
    updateBudgetEnvelope,
    deleteBudgetEnvelope,
    addBudgetSubItem,
    updateBudgetSubItem,
    deleteBudgetSubItem,
    isMonthClosed,
    setActiveTab,
  } = useFinance();

  const isClosed = isMonthClosed(selectedMonth);

  const [billFilter, setBillFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [editingEnvelopeId, setEditingEnvelopeId] = useState<string | null>(null);
  const [newTargetValue, setNewTargetValue] = useState<string>('');
  const [minimizedEnvelopes, setMinimizedEnvelopes] = useState<Record<string, boolean>>({});
  const [subItemInputs, setSubItemInputs] = useState<Record<string, { name: string; amount: string }>>({});

  // Nova Categoria Modal State
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryTarget, setNewCategoryTarget] = useState<number>(500);

  // Modals for editing expenses, logs & envelopes
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingLog, setEditingLog] = useState<VariableExpenseLog | null>(null);
  const [editingEnvelopeModal, setEditingEnvelopeModal] = useState<{
    id: string;
    name: string;
    target: number;
  } | null>(null);

  // In-app deletion confirmation (never uses window.confirm which is blocked in iframes)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const current = currentMonthSummary || summaries[0];
  const monthIdx = parseInt(selectedMonth.split('-')[1], 10);

  // Compile checklist of bills active for this month
  interface ChecklistItem {
    id: string;
    type: 'expense' | 'card';
    title: string;
    amount: number;
    category: string;
    scope: 'PF' | 'PJ';
    isPaid: boolean;
    installmentText?: string;
    originalExpense?: Expense;
  }

  const checklistItems: ChecklistItem[] = [];

  // Add active expenses
  data.expenses.forEach((exp) => {
    let isActive = false;
    let instText = '';

    if (exp.frequency === 'fixed') {
      if (getMonthDiff(exp.startMonth, selectedMonth) >= 0) isActive = true;
    } else if (exp.frequency === 'installment' && exp.installmentsCount) {
      const inst = getInstallmentInfo(exp.startMonth, exp.installmentsCount, selectedMonth);
      if (inst.isActive) {
        isActive = true;
        instText = `Parcela ${inst.current}/${inst.total}`;
      }
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
      checklistItems.push({
        id: exp.id,
        type: 'expense',
        title: exp.title,
        amount: exp.amount,
        category: exp.category,
        scope: exp.scope,
        isPaid: !!exp.paidMonths?.[selectedMonth],
        installmentText: instText,
        originalExpense: exp,
      });
    }
  });

  // Add credit card bills as checklist items
  data.creditCards.forEach((card) => {
    const cardBillAmount = current.cardTotalsByCard[card.id] || 0;
    if (cardBillAmount > 0) {
      checklistItems.push({
        id: `card-bill-${card.id}`,
        type: 'card',
        title: `Fatura ${card.name}`,
        amount: cardBillAmount,
        category: 'Cartão de Crédito',
        scope: card.scope,
        isPaid: false,
      });
    }
  });

  // Filter checklist
  const filteredChecklist = checklistItems.filter((item) => {
    if (billFilter === 'PENDING') return !item.isPaid;
    if (billFilter === 'PAID') return item.isPaid;
    return true;
  });

  const totalBillsCount = checklistItems.length;
  const paidBillsCount = checklistItems.filter((i) => i.isPaid).length;
  const totalAmountBills = checklistItems.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPaidAmount = checklistItems
    .filter((i) => i.isPaid)
    .reduce((acc, curr) => acc + curr.amount, 0);
  const remainingAmountToPay = Math.max(0, totalAmountBills - totalPaidAmount);

  // Envelopes statistics: Planned (Previsão) vs Actual (Gasto Real)
  const totalPlannedEnvelopes = data.budgetEnvelopes.reduce((acc, curr) => acc + curr.targetAmount, 0);
  const allCurrentMonthLogs = data.variableExpenseLogs.filter((l) => l.month === selectedMonth);
  const totalActualSpentLogs = allCurrentMonthLogs.reduce((acc, curr) => acc + curr.amount, 0);

  const startEditTarget = (envelopeId: string, currentVal: number) => {
    if (isClosed) return;
    setEditingEnvelopeId(envelopeId);
    setNewTargetValue(String(currentVal));
  };

  const handleSaveTarget = (envelopeId: string) => {
    const val = parseFloat(newTargetValue);
    if (!isNaN(val) && val >= 0) {
      updateBudgetEnvelopeTarget(envelopeId, val);
    }
    setEditingEnvelopeId(null);
  };

  // Save Expense Edit
  const handleSaveExpenseEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    updateExpense(editingExpense);
    setEditingExpense(null);
  };

  // Save Log Edit
  const handleSaveLogEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    updateVariableExpenseLog(editingLog);
    setEditingLog(null);
  };

  // Save Envelope Edit
  const handleSaveEnvelopeEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isClosed || !editingEnvelopeModal) return;
    updateBudgetEnvelope(
      editingEnvelopeModal.id,
      editingEnvelopeModal.name,
      editingEnvelopeModal.target
    );
    setEditingEnvelopeModal(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Month Closed Lock Banner */}
      {isClosed && (
        <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/60 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <strong className="text-sm font-bold block text-white flex items-center gap-2">
                <span>🔒 Mês Fechado e Bloqueado ({current.label})</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Somente Leitura
                </span>
              </strong>
              <p className="text-amber-300/90 mt-0.5 max-w-2xl">
                O fechamento mensal deste período foi finalizado. Nenhuma conta, previsão, envelope ou lançamento real pode ser criado, alterado ou excluído. Para fazer novos lançamentos ou correções neste mês, acesse <strong>Fechamento Mensal</strong> e reabra o mês.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('closing')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition flex items-center gap-1.5 shrink-0 shadow self-start sm:self-auto"
          >
            <span>Ir para Fechamento</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner with Clear Definition */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Previsão & Controle das Despesas e Envelopes ({current.label})
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
              Gerencie a <strong>Previsão de Despesa</strong> (o teto planejado) e a <strong>Despesa Real</strong> (o gasto efetivamente realizado). Todos os lançamentos são discriminados abaixo com opção de edição e exclusão.
            </p>
          </div>

          {!isClosed && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => onOpenNewTransaction()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Nova Conta / Categoria</span>
              </button>
              <button
                onClick={() => onOpenQuickExpense()}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Lançar Gasto Real</span>
              </button>
            </div>
          )}
        </div>

        {/* DEFINIÇÃO DIDÁTICA: O QUE É PREVISÃO VS DESPESA REAL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          {/* Card 1: Previsão */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Previsão (Teto Orçado)
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-semibold">
                Planejamento
              </span>
            </div>
            <div className="font-mono-numbers font-bold text-base text-zinc-100">
              {formatBRL(totalPlannedEnvelopes)}
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Valor máximo planejado para o mês. É a sua meta de gastos para manter o fluxo positivo.
            </p>
          </div>

          {/* Card 2: Despesa Real */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Despesa Real (Efetivo)
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                Realizado
              </span>
            </div>
            <div className="font-mono-numbers font-bold text-base text-zinc-100">
              {formatBRL(totalActualSpentLogs)}
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Soma real de todos os gastos comprovados e lançados no dia a dia com comprovantes.
            </p>
          </div>

          {/* Card 3: Regra da Matriz */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/40 to-zinc-950/80 border border-indigo-500/30 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-indigo-400" /> Regra na Matriz Anual
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 font-semibold">
                Critério
              </span>
            </div>
            <div className="text-[11px] text-indigo-200/90 leading-relaxed mt-1">
              • Se <strong>Gasto Real ≤ Previsão</strong>: a <strong>Previsão</strong> é mantida na matriz (preserva a margem).<br />
              • Se <strong>Gasto Real &gt; Previsão</strong>: o <strong>Gasto Real</strong> substitui o valor na matriz (impacto real).
            </div>
          </div>
        </div>

      </div>

      {/* Two Column Layout: Left Checklist, Right Envelopes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA ESQUERDA: CHECKLIST DE CONTAS FIXAS & PARCELADAS (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm space-y-4">
            
            {/* Header & Stats */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  Checklist de Contas e Obrigações
                </h3>
                <span className="text-xs font-medium text-zinc-400">
                  {paidBillsCount} de {totalBillsCount} quitadas
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{
                    width: totalBillsCount > 0 ? `${(paidBillsCount / totalBillsCount) * 100}%` : '0%',
                  }}
                />
              </div>
            </div>

            {/* Quick summary badges */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Total Quitado</span>
                <span className="font-mono-numbers font-bold text-emerald-400">
                  {formatBRL(totalPaidAmount)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Restante a Pagar</span>
                <span className="font-mono-numbers font-bold text-amber-400">
                  {formatBRL(remainingAmountToPay)}
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
              <button
                onClick={() => setBillFilter('ALL')}
                className={`flex-1 py-1 rounded text-center font-medium transition ${
                  billFilter === 'ALL'
                    ? 'bg-zinc-800 text-white font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Todas ({totalBillsCount})
              </button>
              <button
                onClick={() => setBillFilter('PENDING')}
                className={`flex-1 py-1 rounded text-center font-medium transition ${
                  billFilter === 'PENDING'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Pendentes ({totalBillsCount - paidBillsCount})
              </button>
              <button
                onClick={() => setBillFilter('PAID')}
                className={`flex-1 py-1 rounded text-center font-medium transition ${
                  billFilter === 'PAID'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Pagas ({paidBillsCount})
              </button>
            </div>

            {/* Bills List */}
            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {filteredChecklist.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400 rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800">
                  Nenhuma conta encontrada neste filtro.
                </div>
              ) : (
                filteredChecklist.map((item) => (
                  <div
                    key={item.id}
                    id={`expense-${item.id}`}
                    className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                      item.isPaid
                        ? 'bg-zinc-950/40 border-zinc-800/50 opacity-60'
                        : 'bg-zinc-950/90 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <button
                        disabled={isClosed}
                        onClick={() => {
                          if (isClosed) return;
                          if (item.type === 'expense') toggleExpensePaid(item.id, selectedMonth);
                        }}
                        className={`shrink-0 ${isClosed ? 'cursor-not-allowed opacity-50' : 'text-zinc-400 hover:text-white'}`}
                        title={isClosed ? 'Mês fechado: bloqueado' : item.isPaid ? 'Marcar como Pendente' : 'Marcar como Pago'}
                      >
                        {item.isPaid ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/10" />
                        ) : (
                          <Square className="w-5 h-5 text-zinc-400" />
                        )}
                      </button>

                      <div className="truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`text-xs font-semibold truncate ${
                              item.isPaid ? 'line-through text-zinc-400' : 'text-zinc-200'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-400 shrink-0">
                            {item.scope}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                          <span>{item.category}</span>
                          {item.installmentText && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-400">{item.installmentText}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span
                          className={`text-xs font-bold font-mono-numbers block ${
                            item.isPaid ? 'text-zinc-400' : 'text-zinc-100'
                          }`}
                        >
                          {formatBRL(item.amount)}
                        </span>
                        <span
                          className={`text-[10px] font-medium ${
                            item.isPaid ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {item.isPaid ? 'Pago' : 'Pendente'}
                        </span>
                      </div>

                      {/* Edit / Delete Buttons for Expense */}
                      {!isClosed && item.type === 'expense' && item.originalExpense && (
                        <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
                          <button
                            onClick={() => setEditingExpense(item.originalExpense!)}
                            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                            title="Editar esta conta"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirm({
                                title: 'Excluir Conta / Despesa',
                                message: `Deseja realmente excluir a conta "${item.title}" (${formatBRL(item.amount)})?`,
                                onConfirm: () => deleteExpense(item.id),
                              });
                            }}
                            className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition"
                            title="Excluir esta conta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

        {/* COLUNA DIREITA: PREVISÃO & CONTROLE DE ENVELOPES (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Categorias & Envelopes de Despesas
                </h3>
                <p className="text-xs text-zinc-400">
                  Previsão (Teto planejado) vs. Gastos Reais discriminados. Clique no teto para editar.
                </p>
              </div>

              {!isClosed && (
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => {
                      setNewCategoryName('');
                      setNewCategoryTarget(500);
                      setIsNewCategoryModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Nova Categoria</span>
                  </button>

                  <button
                    onClick={() => onOpenQuickExpense()}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>+ Lançar Gasto</span>
                  </button>
                </div>
              )}
            </div>

            {/* Envelopes List */}
            <div className="space-y-4">
              {(() => {
                const envelopeList: Array<{ id: string; name: string; targetAmount: number; subItems?: any[]; isExtra?: boolean }> = [
                  ...data.budgetEnvelopes.map((e) => ({ ...e, isExtra: false })),
                ];

                const registeredNames = new Set(data.budgetEnvelopes.map((e) => e.name.trim().toLowerCase()));

                // Discover extra categories present in logs or card transactions for selectedMonth
                const extraCategoryNames = new Set<string>();
                data.variableExpenseLogs.forEach((l) => {
                  if (l.month === selectedMonth && l.categoryId && !registeredNames.has(l.categoryId.trim().toLowerCase())) {
                    extraCategoryNames.add(l.categoryId.trim());
                  }
                });

                data.cardTransactions.forEach((tx) => {
                  if (!tx.isPaused && tx.category && !registeredNames.has(tx.category.trim().toLowerCase())) {
                    let activeInMonth = false;
                    if (tx.type === 'recurring') activeInMonth = getMonthDiff(tx.startMonth, selectedMonth) >= 0;
                    else if (tx.type === 'installment') activeInMonth = getInstallmentInfo(tx.startMonth, tx.totalInstallments, selectedMonth).isActive;
                    else if (tx.type === 'single') activeInMonth = tx.startMonth === selectedMonth;

                    if (activeInMonth) {
                      extraCategoryNames.add(tx.category.trim());
                    }
                  }
                });

                extraCategoryNames.forEach((catName) => {
                  envelopeList.push({
                    id: `extra-${catName}`,
                    name: catName,
                    targetAmount: 0,
                    isExtra: true,
                  });
                });

                return envelopeList.map((env) => {
                  const lowerName = env.name.trim().toLowerCase();

                  // Variable logs for this envelope this month
                  const logs = data.variableExpenseLogs.filter(
                    (l) =>
                      l.month === selectedMonth &&
                      (l.categoryId === env.id || l.categoryId.trim().toLowerCase() === lowerName)
                  );
                  const logsTotal = logs.reduce((acc, curr) => acc + curr.amount, 0);

                  // Credit card transactions assigned to this envelope/category this month
                  const cardTxForEnv = data.cardTransactions.filter((tx) => {
                    if (tx.isPaused) return false;
                    const matchesCategory =
                      tx.category.trim().toLowerCase() === lowerName || tx.category === env.id;
                    if (!matchesCategory) return false;

                    if (tx.type === 'recurring') {
                      return getMonthDiff(tx.startMonth, selectedMonth) >= 0;
                    } else if (tx.type === 'installment') {
                      return getInstallmentInfo(tx.startMonth, tx.totalInstallments, selectedMonth).isActive;
                    } else if (tx.type === 'single') {
                      return tx.startMonth === selectedMonth;
                    }
                    return false;
                  });
                  const cardTotalForEnv = cardTxForEnv.reduce((acc, curr) => acc + curr.installmentAmount, 0);

                  const totalSpent = logsTotal + cardTotalForEnv;

                  // Teto = soma dos subitens (se existirem), senão env.targetAmount
                  const subItemsSum = env.subItems && env.subItems.length > 0
                    ? env.subItems.reduce((acc: number, curr: any) => acc + curr.amount, 0)
                    : 0;
                  const target = env.subItems && env.subItems.length > 0 ? subItemsSum : env.targetAmount;

                  const percentage = target > 0 ? Math.round((totalSpent / target) * 100) : totalSpent > 0 ? 100 : 0;
                  const remaining = target - totalSpent;
                  const isOverBudget = remaining < 0;
                  const isMinimized = !!minimizedEnvelopes[env.id];

                // Color status
                const statusColor =
                  percentage > 100
                    ? 'text-rose-400 bg-rose-500'
                    : percentage >= 70
                    ? 'text-amber-400 bg-amber-400'
                    : 'text-emerald-400 bg-emerald-400';

                return (
                  <div
                    key={env.id}
                    id={`envelope-${env.id}`}
                    className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3 shadow-sm transition-all"
                  >
                    {/* Envelope Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Minimize Button */}
                        <button
                          onClick={() => setMinimizedEnvelopes({ ...minimizedEnvelopes, [env.id]: !isMinimized })}
                          className="p-1 rounded-lg text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 transition"
                          title={isMinimized ? "Expandir e ver detalhes" : "Minimizar categoria"}
                        >
                          {isMinimized ? <ChevronDown className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />}
                        </button>

                        <span className="font-bold text-zinc-100 text-sm">{env.name}</span>

                        {isOverBudget ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Estourado (+{formatBRL(Math.abs(remaining))})
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400">
                            Dentro do Teto
                          </span>
                        )}

                        {!isClosed && (
                          <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
                            <button
                              onClick={() =>
                                setEditingEnvelopeModal({
                                  id: env.id,
                                  name: env.name,
                                  target: env.targetAmount,
                                })
                              }
                              className="p-1.5 rounded-lg text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition"
                              title="Editar nome da categoria"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteConfirm({
                                  title: 'Excluir Categoria / Envelope',
                                  message: `Deseja realmente excluir a categoria "${env.name}" e todos os seus lançamentos associados deste mês?`,
                                  onConfirm: () => deleteBudgetEnvelope(env.id),
                                });
                              }}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition"
                              title="Excluir envelope"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-[11px] text-zinc-400 font-mono-numbers">
                          Teto Orçado: <strong className="text-emerald-400 font-bold">{formatBRL(target)}</strong>
                          {env.subItems && env.subItems.length > 0 && (
                            <span className="text-[10px] text-zinc-500 block">({env.subItems.length} subitem/ns somados)</span>
                          )}
                        </span>

                        {!isClosed && (
                          <button
                            onClick={() => onOpenQuickExpense(env.id)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-semibold transition flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ Gasto</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar & Realized Numbers */}
                    <div>
                      <div className="flex justify-between text-xs text-zinc-400 mb-1.5 font-mono-numbers">
                        <span className="flex items-center gap-2">
                          <span>Gasto Real: <strong className="text-zinc-100 font-bold">{formatBRL(totalSpent)}</strong></span>
                          {cardTotalForEnv > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold border border-indigo-500/30">
                              💳 {formatBRL(cardTotalForEnv)} no Cartão
                            </span>
                          )}
                        </span>
                        <span>
                          {isOverBudget ? (
                            <span className="text-rose-400 font-bold">
                              Estouro: +{formatBRL(Math.abs(remaining))}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-medium">
                              Margem Restante: {formatBRL(remaining)}
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${statusColor.split(' ')[1]}`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                    </div>

                    {/* If NOT minimized, display Subcategories and Detailed Expense Logs */}
                    {!isMinimized && (
                      <div className="space-y-3 pt-2 border-t border-zinc-900">
                        {/* Subcategorias / Itens do Teto Orçado */}
                        <div className="space-y-2 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/60">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-400 block uppercase tracking-wider">
                              Subcategorias / Itens da Categoria ({env.subItems?.length || 0}):
                            </span>
                            {env.subItems && env.subItems.length > 0 && (
                              <span className="text-[11px] font-mono-numbers text-emerald-300 font-bold">
                                Soma Teto = {formatBRL(subItemsSum)}
                              </span>
                            )}
                          </div>

                          {(!env.subItems || env.subItems.length === 0) ? (
                            <p className="text-[11px] text-zinc-500 italic">
                              Nenhum item inserido nesta categoria. Adicione subcategorias abaixo (ex: Escola dos Filhos, Faculdade) para formar o teto de gastos automaticamente.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {env.subItems.map((sub) => (
                                <div key={sub.id} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200">
                                  <span className="font-medium truncate mr-2">{sub.name}</span>
                                  <div className="flex items-center gap-2 shrink-0 font-mono-numbers font-semibold text-emerald-400">
                                    <span>{formatBRL(sub.amount)}</span>
                                    {!isClosed && (
                                      <button
                                        onClick={() => deleteBudgetSubItem(env.id, sub.id)}
                                        className="text-zinc-500 hover:text-rose-400 p-1 transition"
                                        title="Excluir subcategoria"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Form to add new subcategory item */}
                          {!isClosed && (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const input = subItemInputs[env.id] || { name: '', amount: '' };
                                const amt = parseFloat(input.amount);
                                if (!input.name.trim() || isNaN(amt) || amt <= 0) return;
                                addBudgetSubItem(env.id, input.name.trim(), amt);
                                setSubItemInputs({ ...subItemInputs, [env.id]: { name: '', amount: '' } });
                              }}
                              className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-zinc-800/60"
                            >
                              <input
                                type="text"
                                placeholder="Nome do item (ex: Escola dos Filhos, Faculdade)..."
                                value={subItemInputs[env.id]?.name || ''}
                                onChange={(e) => setSubItemInputs({ ...subItemInputs, [env.id]: { ...(subItemInputs[env.id] || { amount: '' }), name: e.target.value } })}
                                className="flex-1 w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
                              />
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Valor Teto (R$)"
                                value={subItemInputs[env.id]?.amount || ''}
                                onChange={(e) => setSubItemInputs({ ...subItemInputs, [env.id]: { ...(subItemInputs[env.id] || { name: '' }), amount: e.target.value } })}
                                className="w-full sm:w-28 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white font-mono-numbers outline-none focus:border-emerald-500"
                              />
                              <button
                                type="submit"
                                className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition shrink-0"
                              >
                                + Adicionar Item
                              </button>
                            </form>
                          )}
                        </div>

                        {/* Lançamentos do Mês Discriminados em Detalhe */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-zinc-400 block">
                              Lançamentos do Mês ({logs.length + cardTxForEnv.length}):
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono-numbers">
                              Soma Real: {formatBRL(totalSpent)}
                            </span>
                          </div>

                          {logs.length === 0 && cardTxForEnv.length === 0 ? (
                            <p className="text-[11px] text-zinc-500 italic py-1">
                              Nenhum gasto registrado nesta categoria em {current.label}.
                            </p>
                          ) : (
                            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                              {/* Display Card Transactions for this category */}
                              {cardTxForEnv.map((tx) => (
                                <div
                                  key={`card-tx-${tx.id}`}
                                  className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-indigo-950/30 border border-indigo-500/20 text-indigo-200"
                                >
                                  <div className="truncate mr-2 flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 text-[9px] font-bold text-indigo-200">CARTÃO</span>
                                    <span className="font-medium truncate">{tx.description}</span>
                                  </div>
                                  <span className="font-mono-numbers font-semibold text-indigo-300">
                                    {formatBRL(tx.installmentAmount)}
                                  </span>
                                </div>
                              ))}

                              {/* Display Variable Expense Logs */}
                              {logs.map((log) => (
                                <div
                                  key={log.id}
                                  className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300 transition"
                                >
                                  <div className="truncate mr-2">
                                    <span className="font-medium text-zinc-200 truncate">{log.description}</span>
                                    <span className="text-[10px] text-zinc-400 ml-2">
                                      {log.date ? log.date.split('-').reverse().join('/') : ''}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-mono-numbers font-semibold text-zinc-100">
                                      {formatBRL(log.amount)}
                                    </span>

                                    {!isClosed && (
                                      <div className="flex items-center gap-1 border-l border-zinc-800 pl-1.5">
                                        <button
                                          onClick={() => setEditingLog(log)}
                                          className="text-zinc-400 hover:text-white p-1 transition"
                                          title="Editar este lançamento"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setDeleteConfirm({
                                              title: 'Remover Lançamento de Gasto Real',
                                              message: `Deseja realmente remover o lançamento "${log.description}" no valor de ${formatBRL(log.amount)}?`,
                                              onConfirm: () => deleteVariableExpenseLog(log.id),
                                            });
                                          }}
                                          className="text-zinc-400 hover:text-rose-400 p-1 transition"
                                          title="Remover lançamento"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>

          </div>
        </div>

      </div>

      {/* Modal de Edição de Conta Fixa / Parcelada */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                Editar Conta / Despesa
              </h3>
              <button
                onClick={() => setEditingExpense(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExpenseEdit} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={editingExpense.title}
                  onChange={(e) => setEditingExpense({ ...editingExpense, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingExpense.amount}
                    onChange={(e) =>
                      setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Escopo</label>
                  <select
                    value={editingExpense.scope}
                    onChange={(e) =>
                      setEditingExpense({ ...editingExpense, scope: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none"
                  >
                    <option value="PF">PF</option>
                    <option value="PJ">PJ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Categoria</label>
                <input
                  type="text"
                  required
                  value={editingExpense.category}
                  onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition"
                >
                  Salvar Alterações
                </button>
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-3 py-2 rounded-lg text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Lançamento de Gasto Real (Log) */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                Editar Lançamento Real
              </h3>
              <button
                onClick={() => setEditingLog(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLogEdit} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={editingLog.description}
                  onChange={(e) => setEditingLog({ ...editingLog, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingLog.amount}
                    onChange={(e) =>
                      setEditingLog({ ...editingLog, amount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={editingLog.date}
                    onChange={(e) => setEditingLog({ ...editingLog, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Envelope / Categoria</label>
                <select
                  value={editingLog.categoryId}
                  onChange={(e) => setEditingLog({ ...editingLog, categoryId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none"
                >
                  {data.budgetEnvelopes.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition"
                >
                  Salvar Alterações
                </button>
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-3 py-2 rounded-lg text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Envelope / Categoria */}
      {editingEnvelopeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                Editar Envelope / Categoria
              </h3>
              <button
                onClick={() => setEditingEnvelopeModal(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEnvelopeEdit} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Nome da Categoria / Envelope</label>
                <input
                  type="text"
                  required
                  value={editingEnvelopeModal.name}
                  onChange={(e) =>
                    setEditingEnvelopeModal({ ...editingEnvelopeModal, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">
                  Previsão (Teto Orçado Mensal) - R$
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editingEnvelopeModal.target}
                  onChange={(e) =>
                    setEditingEnvelopeModal({
                      ...editingEnvelopeModal,
                      target: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Define a meta máxima orçada para esta categoria na Matriz e no Controle.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition"
                >
                  Salvar Categoria
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEnvelopeModal(null)}
                  className="px-3 py-2 rounded-lg text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nova Categoria / Envelope */}
      {isNewCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Criar Nova Categoria / Envelope
              </h3>
              <button
                onClick={() => setIsNewCategoryModalOpen(false)}
                className="text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCategoryName.trim()) return;
                createBudgetCategory({
                  name: newCategoryName.trim(),
                  targetAmount: Math.max(0, newCategoryTarget),
                  color: '#10b981',
                });
                setIsNewCategoryModalOpen(false);
                setNewCategoryName('');
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Nome da Categoria</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: Pet Shop, Lazer, Delivery..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Teto Orçado Mensal (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={newCategoryTarget}
                  onChange={(e) => setNewCategoryTarget(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewCategoryModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition"
                >
                  Criar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-app Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">{deleteConfirm.title}</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{deleteConfirm.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-2 rounded-lg font-bold bg-rose-500 hover:bg-rose-400 text-white transition text-xs shadow-md shadow-rose-500/20"
              >
                Confirmar Exclusão
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
