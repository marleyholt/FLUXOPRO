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
  Search,
  Filter,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatBRL, getMonthDiff, getInstallmentInfo, getMonthLabel } from '../../utils/calculations';
import { Expense, VariableExpenseLog } from '../../types/finance';

interface MonthlyControlTabProps {
  onOpenQuickExpense: (envelopeId?: string, subItemId?: string, expenseId?: string) => void;
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
    updateCardTransaction,
    isMonthClosed,
    setActiveTab,
  } = useFinance();

  const isClosed = isMonthClosed(selectedMonth);

  const [billFilter, setBillFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [editingEnvelopeId, setEditingEnvelopeId] = useState<string | null>(null);
  const [newTargetValue, setNewTargetValue] = useState<string>('');
  // Padrão: Categorias minimizadas. O usuário abre se decidir.
  const [expandedEnvelopes, setExpandedEnvelopes] = useState<Record<string, boolean>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
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
  const [editingSubItem, setEditingSubItem] = useState<{
    categoryId: string;
    subItem: { id: string; name: string; amount: number; startMonth?: string; endMonth?: string };
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
      const startDiff = getMonthDiff(exp.startMonth, selectedMonth);
      const endDiff = exp.endMonth ? getMonthDiff(selectedMonth, exp.endMonth) : 0;
      if (startDiff >= 0 && (!exp.endMonth || endDiff >= 0)) isActive = true;
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
                A abertura deste período foi consolidada. Nenhuma conta, previsão, envelope ou lançamento real pode ser criado, alterado ou excluído. Para fazer novos lançamentos ou correções neste mês, acesse <strong>Abertura de Mês</strong> e reabra o mês.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('closing')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition flex items-center gap-1.5 shrink-0 shadow self-start sm:self-auto"
          >
            <span>Ir para Abertura de Mês</span>
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

      {/* Layout Empilhado: Checklist no Topo (100%), Categorias & Envelopes Abaixo (100%) */}
      <div className="space-y-6">
        
        {/* SEÇÃO SUPERIOR: CHECKLIST DE CONTAS FIXAS & PARCELADAS */}
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm space-y-4">
            
            {/* Header, Stats & Resumos Horizontais */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    Checklist de Contas e Obrigações
                  </h3>
                  <span className="text-xs font-medium text-zinc-400">
                    {paidBillsCount} de {totalBillsCount} quitadas
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                    style={{
                      width: totalBillsCount > 0 ? `${(paidBillsCount / totalBillsCount) * 100}%` : '0%',
                    }}
                  />
                </div>
              </div>

              {/* Quick summary badges */}
              <div className="grid grid-cols-2 gap-3 text-xs shrink-0 lg:w-96">
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Total Quitado</span>
                    <span className="font-mono-numbers font-bold text-emerald-400 text-sm">
                      {formatBRL(totalPaidAmount)}
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                    {paidBillsCount} pagas
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Restante a Pagar</span>
                    <span className="font-mono-numbers font-bold text-amber-400 text-sm">
                      {formatBRL(remainingAmountToPay)}
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">
                    {totalBillsCount - paidBillsCount} pend.
                  </span>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs w-full sm:w-80">
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

            {/* Bills List (Grid de 2 colunas para aproveitar o espaço amplo) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[440px] overflow-y-auto pr-1">
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

        {/* SEÇÃO INFERIOR: PREVISÃO & CONTROLE DE ENVELOPES (LARGURA TOTAL) */}
        <div className="space-y-4">
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

            {/* Envelopes List & Filter Bar */}
            <div className="space-y-4">
              {(() => {
                const envelopeList: Array<{ id: string; name: string; targetAmount: number; subItems?: any[]; isExtra?: boolean }> = [
                  ...data.budgetEnvelopes.map((e) => ({ ...e, isExtra: false })),
                ];

                const registeredNames = new Set(data.budgetEnvelopes.map((e) => e.name.trim().toLowerCase()));
                const registeredIds = new Set(data.budgetEnvelopes.map((e) => e.id));

                // Discover extra categories present in logs or card transactions for selectedMonth (never treat envelope IDs as categories)
                const extraCategoryNames = new Set<string>();
                data.variableExpenseLogs.forEach((l) => {
                  if (l.month === selectedMonth && l.categoryId) {
                    const cat = l.categoryId.trim();
                    if (registeredIds.has(cat)) return;
                    if (!registeredNames.has(cat.toLowerCase()) && !cat.startsWith('env-')) {
                      extraCategoryNames.add(cat);
                    }
                  }
                });

                data.cardTransactions.forEach((tx) => {
                  if (!tx.isPaused && tx.category) {
                    const cat = tx.category.trim();
                    if (registeredIds.has(cat)) return;
                    if (!registeredNames.has(cat.toLowerCase()) && !cat.startsWith('env-')) {
                      let activeInMonth = false;
                      if (tx.type === 'recurring') activeInMonth = getMonthDiff(tx.startMonth, selectedMonth) >= 0;
                      else if (tx.type === 'installment') activeInMonth = getInstallmentInfo(tx.startMonth, tx.totalInstallments, selectedMonth).isActive;
                      else if (tx.type === 'single') activeInMonth = tx.startMonth === selectedMonth;

                      if (activeInMonth) {
                        extraCategoryNames.add(cat);
                      }
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

                // Filter categories
                const filteredEnvelopes = envelopeList.filter((env) => {
                  if (categoryFilter !== 'ALL' && env.id !== categoryFilter && env.name.toLowerCase() !== categoryFilter.toLowerCase()) {
                    return false;
                  }
                  if (categorySearchQuery.trim() && !env.name.toLowerCase().includes(categorySearchQuery.trim().toLowerCase())) {
                    return false;
                  }
                  return true;
                });

                const expandAll = () => {
                  const all: Record<string, boolean> = {};
                  envelopeList.forEach((e) => { all[e.id] = true; });
                  setExpandedEnvelopes(all);
                };

                const collapseAll = () => {
                  setExpandedEnvelopes({});
                };

                return (
                  <>
                    {/* Barra de Filtro de Categoria & Controle de Visualização */}
                    <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-2 text-xs">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                        
                        {/* Seletor de Categoria e Busca */}
                        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                            <input
                              type="text"
                              placeholder="Buscar categoria..."
                              value={categorySearchQuery}
                              onChange={(e) => setCategorySearchQuery(e.target.value)}
                              className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
                            />
                            {categorySearchQuery && (
                              <button
                                onClick={() => setCategorySearchQuery('')}
                                className="absolute right-2 top-2 text-zinc-400 hover:text-white"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <select
                              value={categoryFilter}
                              onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                if (e.target.value !== 'ALL') {
                                  // Auto-expande a categoria selecionada para facilitar visualização
                                  setExpandedEnvelopes((prev) => ({ ...prev, [e.target.value]: true }));
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white font-medium outline-none focus:border-emerald-500 max-w-[200px]"
                            >
                              <option value="ALL">Todas as Categorias ({envelopeList.length})</option>
                              {envelopeList.map((e) => (
                                <option key={e.id} value={e.id}>
                                  {e.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Botões Expandir e Recolher Todas */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <button
                            onClick={expandAll}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                            title="Expandir todas as categorias"
                          >
                            Expandir Todas
                          </button>
                          <button
                            onClick={collapseAll}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                            title="Minimizar todas as categorias (Padrão)"
                          >
                            Recolher Todas
                          </button>
                        </div>

                      </div>

                      {/* Contador de Filtro */}
                      {(categoryFilter !== 'ALL' || categorySearchQuery.trim()) && (
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-850">
                          <span>
                            Exibindo <strong>{filteredEnvelopes.length}</strong> de <strong>{envelopeList.length}</strong> categorias
                          </span>
                          <button
                            onClick={() => {
                              setCategoryFilter('ALL');
                              setCategorySearchQuery('');
                            }}
                            className="text-emerald-400 hover:underline"
                          >
                            Limpar filtros
                          </button>
                        </div>
                      )}
                    </div>

                    {filteredEnvelopes.length === 0 ? (
                      <div className="p-8 text-center bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-2">
                        <p className="text-zinc-400 text-xs">Nenhuma categoria encontrada com os filtros selecionados.</p>
                        <button
                          onClick={() => {
                            setCategoryFilter('ALL');
                            setCategorySearchQuery('');
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-emerald-300"
                        >
                          Ver Todas as Categorias
                        </button>
                      </div>
                    ) : (
                      filteredEnvelopes.map((env) => {
                        const lowerName = env.name.trim().toLowerCase();

                        // Active fixed/installment/periodic expenses assigned to this category for selectedMonth
                        const activeCategoryExpenses = data.expenses.filter((exp) => {
                    let isActive = false;
                    if (exp.frequency === 'fixed') {
                      const startDiff = getMonthDiff(exp.startMonth, selectedMonth);
                      const endDiff = exp.endMonth ? getMonthDiff(selectedMonth, exp.endMonth) : 0;
                      isActive = startDiff >= 0 && (!exp.endMonth || endDiff >= 0);
                    } else if (exp.frequency === 'installment' && exp.installmentsCount) {
                      isActive = getInstallmentInfo(exp.startMonth, exp.installmentsCount, selectedMonth).isActive;
                    } else if (exp.frequency === 'periodic' && exp.periodicMonths) {
                      isActive = getMonthDiff(exp.startMonth, selectedMonth) >= 0 && exp.periodicMonths.includes(monthIdx);
                    } else if (exp.frequency === 'single') {
                      isActive = exp.singleMonth === selectedMonth || exp.startMonth === selectedMonth;
                    }
                    const matchesCategory =
                      exp.category.trim().toLowerCase() === lowerName || exp.category === env.id;
                    return isActive && matchesCategory;
                  });
                  const activeExpensesSum = activeCategoryExpenses.reduce((acc, curr) => acc + curr.amount, 0);

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

                  const totalSpent = activeExpensesSum + logsTotal + cardTotalForEnv;

                  // Teto = (soma dos subitens ativos para selectedMonth ou env.targetAmount) + soma das contas fixas da categoria
                  const activeSubItems = (env.subItems || []).filter((sub: any) => {
                    if (sub.startMonth && getMonthDiff(sub.startMonth, selectedMonth) < 0) return false;
                    if (sub.endMonth && getMonthDiff(selectedMonth, sub.endMonth) < 0) return false;
                    return true;
                  });
                  const subItemsSum = env.subItems && env.subItems.length > 0
                    ? activeSubItems.reduce((acc: number, curr: any) => acc + curr.amount, 0)
                    : 0;
                  const baseTarget = env.subItems && env.subItems.length > 0 ? subItemsSum : env.targetAmount;
                  const target = baseTarget + activeExpensesSum;

                  const percentage = target > 0 ? Math.round((totalSpent / target) * 100) : totalSpent > 0 ? 100 : 0;
                  const remaining = target - totalSpent;
                  const isOverBudget = remaining < 0;
                  // Padrão: minimizado. Aberto apenas se isExpanded for true.
                  const isExpanded = !!expandedEnvelopes[env.id];

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
                        {/* Minimize/Expand Button */}
                        <button
                          onClick={() => setExpandedEnvelopes({ ...expandedEnvelopes, [env.id]: !isExpanded })}
                          className="p-1 rounded-lg text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 transition"
                          title={isExpanded ? "Minimizar categoria" : "Expandir e ver detalhes"}
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />}
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
                            <span className="text-[10px] text-zinc-500 block">({activeSubItems.length} subitem/ns ativos no mês)</span>
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

                    {/* If expanded, display Subcategories and Detailed Expense Logs (Minimizado por padrão) */}
                    {isExpanded && (
                      <div className="space-y-4 pt-3 border-t border-zinc-900">
                        {/* Subcategorias / Itens do Teto Orçado com Rastreamento de Pagamento */}
                        <div className="space-y-3 bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-800/60">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[11px] font-bold text-emerald-400 block uppercase tracking-wider">
                                Previsão & Controle de Subitens ({activeSubItems.length}):
                              </span>
                              <p className="text-[10px] text-zinc-400">
                                Cada item planejado deduz os gastos reais vinculados a ele para evitar duplicidades.
                              </p>
                            </div>
                            {activeSubItems.length > 0 && (
                              <span className="text-[11px] font-mono-numbers text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                Teto Somado = {formatBRL(subItemsSum)}
                              </span>
                            )}
                          </div>

                          {activeSubItems.length === 0 ? (
                            <p className="text-[11px] text-zinc-500 italic py-1">
                              Nenhum subitem previsto ativo para este mês ({getMonthLabel(selectedMonth)}). Adicione subcategorias abaixo (ex: Luz, Condomínio, Supermercado) para planejar o teto deste mês.
                            </p>
                          ) : (
                            <div className="space-y-2.5">
                              {activeSubItems.map((sub) => {
                                const linkedLogs = logs.filter((l) => l.linkedSubItemId === sub.id);
                                const linkedCardTxs = cardTxForEnv.filter((tx) => tx.linkedSubItemId === sub.id);
                                const spentOnSub =
                                  linkedLogs.reduce((acc, l) => acc + l.amount, 0) +
                                  linkedCardTxs.reduce((acc, t) => acc + t.installmentAmount, 0);
                                const diff = sub.amount - spentOnSub;
                                const isOver = diff < 0;
                                const isPaidFull = diff === 0 && spentOnSub > 0;
                                const isPartial = spentOnSub > 0 && diff > 0;
                                const isUnpaid = spentOnSub === 0;

                                return (
                                  <div
                                    key={sub.id}
                                    className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800/90 space-y-2 hover:border-zinc-700 transition"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="font-bold text-zinc-100 text-xs">
                                          {sub.name}
                                        </span>

                                        {/* Tag de Vigência Informativa */}
                                        {(sub.startMonth || sub.endMonth) && (
                                          <span className="text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                            📅 {sub.startMonth && sub.endMonth
                                              ? `${getMonthLabel(sub.startMonth)} até ${getMonthLabel(sub.endMonth)}`
                                              : sub.startMonth
                                              ? `A partir de ${getMonthLabel(sub.startMonth)}`
                                              : `Até ${getMonthLabel(sub.endMonth)}`}
                                          </span>
                                        )}

                                        {/* Status Badge */}
                                        {isPaidFull && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Quitado Integral
                                          </span>
                                        )}
                                        {isPartial && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                            🟡 Parcial (Resta: {formatBRL(diff)})
                                          </span>
                                        )}
                                        {isOver && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                            🔴 Estourado (+{formatBRL(Math.abs(diff))})
                                          </span>
                                        )}
                                        {isUnpaid && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                                            ⏳ Pendente
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-3 self-end sm:self-auto text-xs font-mono-numbers">
                                        <div className="text-right">
                                          <span className="text-[10px] text-zinc-500 block">Previsto / Pago</span>
                                          {!isClosed ? (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setEditingSubItem({
                                                  categoryId: env.id,
                                                  subItem: {
                                                    id: sub.id,
                                                    name: sub.name,
                                                    amount: sub.amount,
                                                    startMonth: sub.startMonth,
                                                    endMonth: sub.endMonth,
                                                  },
                                                })
                                              }
                                              className="font-semibold text-zinc-300 hover:text-emerald-400 hover:underline transition cursor-pointer inline-flex items-center gap-1"
                                              title="Clique para editar o valor previsto e as datas de vigência"
                                            >
                                              <span>{formatBRL(sub.amount)}</span>
                                              <Edit2 className="w-2.5 h-2.5 opacity-60" />
                                            </button>
                                          ) : (
                                            <span className="font-semibold text-zinc-300">
                                              {formatBRL(sub.amount)}
                                            </span>
                                          )}
                                          <span className="text-zinc-500 mx-1">/</span>
                                          <span className={`font-bold ${spentOnSub > 0 ? (isOver ? 'text-rose-400' : 'text-emerald-400') : 'text-zinc-500'}`}>
                                            {formatBRL(spentOnSub)}
                                          </span>
                                        </div>

                                        {!isClosed && (
                                          <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
                                            <button
                                              onClick={() => onOpenQuickExpense(env.id, sub.id)}
                                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition"
                                              title={`Lançar pagamento para "${sub.name}"`}
                                            >
                                              <Plus className="w-3 h-3" />
                                              <span>{spentOnSub > 0 ? '+ Adicionar' : 'Pagar'}</span>
                                            </button>

                                            <button
                                              onClick={() => deleteBudgetSubItem(env.id, sub.id)}
                                              className="text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-zinc-900 transition"
                                              title="Excluir subcategoria"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Linked Payments Detail for this subitem */}
                                    {(linkedLogs.length > 0 || linkedCardTxs.length > 0) && (
                                      <div className="pt-1.5 border-t border-zinc-900 space-y-1">
                                        <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                                          Lançamentos Vinculados ({linkedLogs.length + linkedCardTxs.length}):
                                        </span>
                                        <div className="space-y-1 pl-1">
                                          {linkedLogs.map((log) => (
                                            <div
                                              key={log.id}
                                              className="flex items-center justify-between text-xs py-1 px-2 rounded bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300 transition"
                                            >
                                              <div className="truncate mr-2 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                <span className="font-medium text-zinc-200 truncate">{log.description}</span>
                                                <span className="text-[10px] text-zinc-500">
                                                  ({log.date ? log.date.split('-').reverse().join('/') : ''})
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 shrink-0">
                                                <span className="font-mono-numbers font-semibold text-emerald-400">
                                                  {formatBRL(log.amount)}
                                                </span>
                                                {!isClosed && (
                                                  <div className="flex items-center gap-1 border-l border-zinc-800 pl-1.5">
                                                    <button
                                                      onClick={() => setEditingLog(log)}
                                                      className="text-zinc-400 hover:text-white p-0.5 transition"
                                                      title="Editar lançamento"
                                                    >
                                                      <Edit2 className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                      onClick={() => {
                                                        setDeleteConfirm({
                                                          title: 'Remover Lançamento',
                                                          message: `Deseja realmente remover o lançamento "${log.description}" (${formatBRL(log.amount)})?`,
                                                          onConfirm: () => deleteVariableExpenseLog(log.id),
                                                        });
                                                      }}
                                                      className="text-zinc-400 hover:text-rose-400 p-0.5 transition"
                                                      title="Remover lançamento"
                                                    >
                                                      <Trash2 className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ))}

                                          {linkedCardTxs.map((tx) => (
                                            <div
                                              key={`card-linked-${tx.id}`}
                                              className="flex items-center justify-between text-xs py-1 px-2 rounded bg-indigo-950/20 border border-indigo-500/20 text-indigo-300 transition"
                                            >
                                              <div className="truncate mr-2 flex items-center gap-1.5">
                                                <CreditCard className="w-3 h-3 text-indigo-400" />
                                                <span className="font-medium truncate">{tx.description}</span>
                                              </div>
                                              <span className="font-mono-numbers font-semibold text-indigo-300">
                                                {formatBRL(tx.installmentAmount)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
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
                                addBudgetSubItem(env.id, input.name.trim(), amt, selectedMonth);
                                setSubItemInputs({ ...subItemInputs, [env.id]: { name: '', amount: '' } });
                              }}
                              className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-zinc-800/60"
                            >
                              <input
                                type="text"
                                placeholder="Nome do item (ex: Luz, Internet, Combustível)..."
                                value={subItemInputs[env.id]?.name || ''}
                                onChange={(e) =>
                                  setSubItemInputs({
                                    ...subItemInputs,
                                    [env.id]: {
                                      ...(subItemInputs[env.id] || { amount: '' }),
                                      name: e.target.value,
                                    },
                                  })
                                }
                                className="flex-1 w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
                              />
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Valor Previsto (R$)"
                                value={subItemInputs[env.id]?.amount || ''}
                                onChange={(e) =>
                                  setSubItemInputs({
                                    ...subItemInputs,
                                    [env.id]: {
                                      ...(subItemInputs[env.id] || { name: '' }),
                                      amount: e.target.value,
                                    },
                                  })
                                }
                                className="w-full sm:w-32 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white font-mono-numbers outline-none focus:border-emerald-500"
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

                        {/* SEÇÃO DEDICADA: GASTOS SEM PREVISÃO (EXTRAS) NESTA CATEGORIA */}
                        {(() => {
                          const unplannedLogs = logs.filter(
                            (l) => (!l.linkedSubItemId && !l.linkedExpenseId) || l.isUnplanned
                          );
                          const unplannedCards = cardTxForEnv.filter(
                            (tx) => (!tx.linkedSubItemId && !tx.linkedExpenseId) || tx.isUnplanned
                          );
                          const unplannedTotal =
                            unplannedLogs.reduce((acc, l) => acc + l.amount, 0) +
                            unplannedCards.reduce((acc, t) => acc + t.installmentAmount, 0);

                          if (unplannedLogs.length === 0 && unplannedCards.length === 0) {
                            return (
                              <div className="p-2.5 rounded-xl bg-zinc-900/30 border border-zinc-800/50 flex items-center justify-between text-xs text-zinc-400">
                                <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  Nenhum gasto avulso / sem previsão registrado neste envelope.
                                </span>
                                {!isClosed && (
                                  <button
                                    onClick={() => onOpenQuickExpense(env.id)}
                                    className="text-xs text-emerald-400 hover:underline"
                                  >
                                    + Lançar Gasto
                                  </button>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-2 bg-amber-950/20 p-3.5 rounded-xl border border-amber-500/30">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                                    ⚠️ Gastos Sem Previsão
                                  </span>
                                  <span className="text-xs font-bold text-amber-200">
                                    {unplannedLogs.length + unplannedCards.length} despesa(s) avulsa(s)
                                  </span>
                                </div>
                                <span className="text-xs font-mono-numbers font-bold text-amber-300">
                                  Total Sem Previsão: {formatBRL(unplannedTotal)}
                                </span>
                              </div>
                              <p className="text-[10px] text-amber-300/80">
                                Estes gastos foram realizados na categoria, mas não correspondem a nenhuma previsão planejada. Clique em editar para associar a um subitem a qualquer momento.
                              </p>

                              <div className="space-y-1.5 pt-1">
                                {unplannedLogs.map((log) => {
                                  const env = data.budgetEnvelopes.find((e) => e.id === log.categoryId);
                                  return (
                                    <div
                                      key={log.id}
                                      className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-2 px-2.5 rounded bg-zinc-950/80 border border-amber-500/20 text-zinc-200 hover:border-amber-500/40 transition gap-2"
                                    >
                                      <div className="truncate mr-2 flex items-center gap-2">
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 shrink-0">
                                          SEM PREVISÃO
                                        </span>
                                        <span className="font-medium truncate">{log.description}</span>
                                        <span className="text-[10px] text-zinc-500 shrink-0">
                                          ({log.date ? log.date.split('-').reverse().join('/') : ''})
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                        {/* Menu simples e discreto para vincular a uma previsão */}
                                        <select
                                          value={log.linkedSubItemId ? `sub_${log.linkedSubItemId}` : 'unplanned'}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            let linkedSubItemId: string | undefined = undefined;
                                            let isUnplanned = true;
                                            if (val.startsWith('sub_')) {
                                              linkedSubItemId = val.replace('sub_', '');
                                              isUnplanned = false;
                                            }
                                            updateVariableExpenseLog({
                                              ...log,
                                              linkedSubItemId,
                                              isUnplanned,
                                            });
                                          }}
                                          className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-[11px] text-emerald-300 font-medium outline-none focus:border-emerald-500"
                                          title="Associar a um item previsto desta categoria"
                                        >
                                          <option value="unplanned">🔗 Vincular Previsão...</option>
                                          {env?.subItems && env.subItems.map((sub) => (
                                            <option key={sub.id} value={`sub_${sub.id}`}>
                                              {sub.name} ({formatBRL(sub.amount)})
                                            </option>
                                          ))}
                                        </select>

                                        <span className="font-mono-numbers font-bold text-amber-300">
                                          {formatBRL(log.amount)}
                                        </span>

                                        {!isClosed && (
                                          <div className="flex items-center gap-1 border-l border-zinc-800 pl-1.5">
                                            <button
                                              onClick={() => setEditingLog(log)}
                                              className="text-zinc-400 hover:text-white p-1 transition"
                                              title="Editar lançamento"
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
                                  );
                                })}

                                {unplannedCards.map((tx) => (
                                  <div
                                    key={`unplanned-card-${tx.id}`}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-2 px-2.5 rounded bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 gap-2"
                                  >
                                    <div className="truncate mr-2 flex items-center gap-2">
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/30 text-indigo-200">
                                        CARTÃO • SEM PREVISÃO
                                      </span>
                                      <span className="font-medium truncate">{tx.description}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                      <select
                                        value={tx.linkedSubItemId ? `sub_${tx.linkedSubItemId}` : 'unplanned'}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          let linkedSubItemId: string | undefined = undefined;
                                          let isUnplanned = true;
                                          if (val.startsWith('sub_')) {
                                            linkedSubItemId = val.replace('sub_', '');
                                            isUnplanned = false;
                                          }
                                          updateCardTransaction({
                                            ...tx,
                                            linkedSubItemId,
                                            isUnplanned,
                                          });
                                        }}
                                        className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-[11px] text-indigo-300 font-medium outline-none focus:border-indigo-500"
                                        title="Associar a um item previsto desta categoria"
                                      >
                                        <option value="unplanned">🔗 Vincular Previsão...</option>
                                        {env?.subItems && env.subItems.map((sub) => (
                                          <option key={sub.id} value={`sub_${sub.id}`}>
                                            {sub.name} ({formatBRL(sub.amount)})
                                          </option>
                                        ))}
                                      </select>
                                      <span className="font-mono-numbers font-bold text-indigo-300">
                                        {formatBRL(tx.installmentAmount)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Display Active Fixed/Installment Expenses in this Category (if any) */}
                        {activeCategoryExpenses.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[11px] font-semibold text-zinc-400 block">
                              Contas & Obrigações Fixas ({activeCategoryExpenses.length}):
                            </span>
                            <div className="space-y-1">
                              {activeCategoryExpenses.map((exp) => (
                                <div
                                  key={`fixed-exp-${exp.id}`}
                                  className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-amber-950/20 border border-amber-500/20 text-amber-200"
                                >
                                  <div className="truncate mr-2 flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-[9px] font-bold text-amber-200">CONTA FIXA</span>
                                    <span className="font-medium truncate">{exp.title}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 font-mono-numbers font-semibold text-amber-300">
                                    <span>{formatBRL(exp.amount)}</span>
                                    <span
                                      className={`text-[10px] px-1.5 py-0.2 rounded ${
                                        exp.paidMonths?.[selectedMonth]
                                          ? 'bg-emerald-500/20 text-emerald-300'
                                          : 'bg-rose-500/20 text-rose-300'
                                      }`}
                                    >
                                      {exp.paidMonths?.[selectedMonth] ? 'Pago' : 'Pendente'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        );
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

      {/* Subitem Edit Modal */}
      {editingSubItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                Editar Subitem / Previsão
              </h3>
              <button
                type="button"
                onClick={() => setEditingSubItem(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const parsed = parseFloat(editingSubItem.subItem.amount as any);
                if (!editingSubItem.subItem.name.trim() || isNaN(parsed) || parsed < 0) return;
                updateBudgetSubItem(
                  editingSubItem.categoryId,
                  editingSubItem.subItem.id,
                  editingSubItem.subItem.name.trim(),
                  parsed,
                  editingSubItem.subItem.endMonth,
                  editingSubItem.subItem.startMonth
                );
                setEditingSubItem(null);
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Nome do Subitem</label>
                <input
                  type="text"
                  required
                  value={editingSubItem.subItem.name}
                  onChange={(e) =>
                    setEditingSubItem({
                      ...editingSubItem,
                      subItem: { ...editingSubItem.subItem, name: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Valor Previsto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editingSubItem.subItem.amount}
                  onChange={(e) =>
                    setEditingSubItem({
                      ...editingSubItem,
                      subItem: { ...editingSubItem.subItem, amount: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white font-mono-numbers outline-none focus:border-emerald-500"
                />
              </div>

              {/* Iniciar Projeção Em (Mês / Ano) */}
              <div className="space-y-1.5 pt-1 border-t border-zinc-900">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Iniciar projeção em (Mês / Ano):</label>
                  {editingSubItem.subItem.startMonth && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditingSubItem({
                          ...editingSubItem,
                          subItem: { ...editingSubItem.subItem, startMonth: undefined },
                        })
                      }
                      className="text-[10px] text-zinc-500 hover:text-amber-400"
                    >
                      Limpar início
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editingSubItem.subItem.startMonth ? editingSubItem.subItem.startMonth.split('-')[1] || '' : ''}
                    onChange={(e) => {
                      const m = e.target.value;
                      const currentYearPart = editingSubItem.subItem.startMonth
                        ? editingSubItem.subItem.startMonth.split('-')[0]
                        : selectedMonth.split('-')[0] || String(new Date().getFullYear());
                      const newStart = m ? `${currentYearPart}-${m}` : undefined;
                      setEditingSubItem({
                        ...editingSubItem,
                        subItem: { ...editingSubItem.subItem, startMonth: newStart },
                      });
                    }}
                    className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-emerald-500 font-mono-numbers font-bold"
                  >
                    <option value="">Mês (Imediato)</option>
                    {[
                      { value: '01', label: 'Janeiro (01)' },
                      { value: '02', label: 'Fevereiro (02)' },
                      { value: '03', label: 'Março (03)' },
                      { value: '04', label: 'Abril (04)' },
                      { value: '05', label: 'Maio (05)' },
                      { value: '06', label: 'Junho (06)' },
                      { value: '07', label: 'Julho (07)' },
                      { value: '08', label: 'Agosto (08)' },
                      { value: '09', label: 'Setembro (09)' },
                      { value: '10', label: 'Outubro (10)' },
                      { value: '11', label: 'Novembro (11)' },
                      { value: '12', label: 'Dezembro (12)' },
                    ].map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>

                  <select
                    value={editingSubItem.subItem.startMonth ? editingSubItem.subItem.startMonth.split('-')[0] || '' : ''}
                    onChange={(e) => {
                      const y = e.target.value;
                      const currentMonthPart = editingSubItem.subItem.startMonth
                        ? editingSubItem.subItem.startMonth.split('-')[1]
                        : selectedMonth.split('-')[1] || '01';
                      const newStart = y ? `${y}-${currentMonthPart}` : undefined;
                      setEditingSubItem({
                        ...editingSubItem,
                        subItem: { ...editingSubItem.subItem, startMonth: newStart },
                      });
                    }}
                    className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-emerald-500 font-mono-numbers font-bold"
                  >
                    <option value="">Ano</option>
                    {(() => {
                      const currentYear = new Date().getFullYear();
                      const years: number[] = [];
                      for (let y = currentYear - 2; y <= currentYear + 35; y++) {
                        years.push(y);
                      }
                      return years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ));
                    })()}
                  </select>
                </div>
                <span className="text-[10px] text-zinc-400 block">
                  Define a partir de quando a despesa entra na projeção e na matriz. Meses anteriores ficam zerados.
                </span>
              </div>

              {/* Encerrar Projeção Em (Mês / Ano) */}
              <div className="space-y-1.5 pt-1 border-t border-zinc-900">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Encerrar projeção em (Mês / Ano):</label>
                  {editingSubItem.subItem.endMonth && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditingSubItem({
                          ...editingSubItem,
                          subItem: { ...editingSubItem.subItem, endMonth: undefined },
                        })
                      }
                      className="text-[10px] text-zinc-500 hover:text-amber-400"
                    >
                      Não encerrar (Eterno)
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editingSubItem.subItem.endMonth ? editingSubItem.subItem.endMonth.split('-')[1] || '' : ''}
                    onChange={(e) => {
                      const m = e.target.value;
                      const currentYearPart = editingSubItem.subItem.endMonth
                        ? editingSubItem.subItem.endMonth.split('-')[0]
                        : selectedMonth.split('-')[0] || String(new Date().getFullYear());
                      const newEnd = m ? `${currentYearPart}-${m}` : undefined;
                      setEditingSubItem({
                        ...editingSubItem,
                        subItem: { ...editingSubItem.subItem, endMonth: newEnd },
                      });
                    }}
                    className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-emerald-500 font-mono-numbers font-bold"
                  >
                    <option value="">Mês</option>
                    {[
                      { value: '01', label: 'Janeiro (01)' },
                      { value: '02', label: 'Fevereiro (02)' },
                      { value: '03', label: 'Março (03)' },
                      { value: '04', label: 'Abril (04)' },
                      { value: '05', label: 'Maio (05)' },
                      { value: '06', label: 'Junho (06)' },
                      { value: '07', label: 'Julho (07)' },
                      { value: '08', label: 'Agosto (08)' },
                      { value: '09', label: 'Setembro (09)' },
                      { value: '10', label: 'Outubro (10)' },
                      { value: '11', label: 'Novembro (11)' },
                      { value: '12', label: 'Dezembro (12)' },
                    ].map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>

                  <select
                    value={editingSubItem.subItem.endMonth ? editingSubItem.subItem.endMonth.split('-')[0] || '' : ''}
                    onChange={(e) => {
                      const y = e.target.value;
                      const currentMonthPart = editingSubItem.subItem.endMonth
                        ? editingSubItem.subItem.endMonth.split('-')[1]
                        : '12';
                      const newEnd = y ? `${y}-${currentMonthPart}` : undefined;
                      setEditingSubItem({
                        ...editingSubItem,
                        subItem: { ...editingSubItem.subItem, endMonth: newEnd },
                      });
                    }}
                    className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-emerald-500 font-mono-numbers font-bold"
                  >
                    <option value="">Ano (Eterno)</option>
                    {(() => {
                      const currentYear = new Date().getFullYear();
                      const years: number[] = [];
                      for (let y = currentYear; y <= currentYear + 35; y++) {
                        years.push(y);
                      }
                      return years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ));
                    })()}
                  </select>
                </div>
                <span className="text-[10px] text-zinc-400 block">
                  Define o último mês em que a despesa ocorre. Meses seguintes não projetarão mais esta despesa.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingSubItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow"
                >
                  Salvar Alterações
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
