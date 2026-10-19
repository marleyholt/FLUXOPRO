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
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatBRL, getMonthDiff, getInstallmentInfo } from '../../utils/calculations';

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
    deleteVariableExpenseLog,
    updateBudgetEnvelopeTarget,
  } = useFinance();

  const [billFilter, setBillFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [editingEnvelopeId, setEditingEnvelopeId] = useState<string | null>(null);
  const [newTargetValue, setNewTargetValue] = useState<string>('');

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
      });
    }
  });

  // Add credit card bills as checklist items
  data.creditCards.forEach((card) => {
    const cardBillAmount = current.cardTotalsByCard[card.id] || 0;
    if (cardBillAmount > 0) {
      // Check if paid in mock/settings or paid map
      checklistItems.push({
        id: `card-bill-${card.id}`,
        type: 'card',
        title: `Fatura ${card.name}`,
        amount: cardBillAmount,
        category: 'Cartão de Crédito',
        scope: card.scope,
        isPaid: false, // card bills can be tracked
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

  const startEditTarget = (envelopeId: string, currentVal: number) => {
    setEditingEnvelopeId(envelopeId);
    setNewTargetValue(String(currentVal));
  };

  const handleSaveTarget = (envelopeId: string) => {
    const val = parseFloat(newTargetValue);
    if (!isNaN(val) && val > 0) {
      updateBudgetEnvelopeTarget(envelopeId, val);
    }
    setEditingEnvelopeId(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Controle Operacional do Mês ({current.label})
          </h2>
          <p className="text-xs text-zinc-400">
            Checklist diário de quitação de contas e termômetro em tempo real de Orçado vs Realizado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenQuickExpense()}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Lançar Gasto Rápido</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Left Checklist, Right Envelopes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA ESQUERDA: CHECKLIST DE CONTAS (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm space-y-4">
            
            {/* Header & Stats */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  Checklist de Contas a Pagar
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

            {/* Remaining To Pay Alert Card */}
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-zinc-400 block font-medium">Total Restante a Pagar no Banco:</span>
                <span className="text-lg font-bold font-mono-numbers text-amber-400">
                  {formatBRL(remainingAmountToPay)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-zinc-400 block">Total Previsto:</span>
                <span className="text-xs font-mono-numbers text-zinc-300">
                  {formatBRL(totalAmountBills)}
                </span>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-zinc-950 rounded-lg border border-zinc-800 text-xs">
              <button
                onClick={() => setBillFilter('ALL')}
                className={`flex-1 py-1 rounded-md transition font-medium ${
                  billFilter === 'ALL' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Todas ({checklistItems.length})
              </button>
              <button
                onClick={() => setBillFilter('PENDING')}
                className={`flex-1 py-1 rounded-md transition font-medium ${
                  billFilter === 'PENDING' ? 'bg-zinc-800 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Pendentes ({checklistItems.filter((i) => !i.isPaid).length})
              </button>
              <button
                onClick={() => setBillFilter('PAID')}
                className={`flex-1 py-1 rounded-md transition font-medium ${
                  billFilter === 'PAID' ? 'bg-zinc-800 text-emerald-300' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Pagas ({paidBillsCount})
              </button>
            </div>

            {/* Bills List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredChecklist.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-400">
                  Nenhuma conta para este filtro no mês selecionado.
                </div>
              ) : (
                filteredChecklist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.type === 'expense') {
                        toggleExpensePaid(item.id, selectedMonth);
                      }
                    }}
                    className={`p-3 rounded-xl border transition cursor-pointer select-none flex items-center justify-between gap-3 ${
                      item.isPaid
                        ? 'bg-zinc-950/40 border-zinc-800/50 opacity-60'
                        : 'bg-zinc-950/90 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <button
                        className="shrink-0 text-zinc-400 hover:text-white"
                        title={item.isPaid ? 'Marcar como Pendente' : 'Marcar como Pago'}
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

                    <div className="text-right shrink-0">
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
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

        {/* COLUNA DIREITA: TERMÔMETRO DE ENVELOPES (ORÇADO VS REALIZADO) (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Termômetro de Envelopes (Orçado vs. Realizado)
                </h3>
                <p className="text-xs text-zinc-400">
                  Lançamento de gastos do dia a dia. Se o realizado superar o teto, o fluxo de caixa projeta o valor maior.
                </p>
              </div>

              <button
                onClick={() => onOpenQuickExpense()}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Lançar Gasto</span>
              </button>
            </div>

            {/* Envelopes Grid */}
            <div className="space-y-4">
              {data.budgetEnvelopes.map((env) => {
                const logs = data.variableExpenseLogs.filter(
                  (l) => l.categoryId === env.id && l.month === selectedMonth
                );
                const totalSpent = logs.reduce((acc, curr) => acc + curr.amount, 0);
                const target = env.targetAmount;
                const percentage = Math.round((totalSpent / target) * 100);
                const remaining = target - totalSpent;
                const isOverBudget = remaining < 0;

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
                    className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3"
                  >
                    {/* Envelope Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-100 text-sm">{env.name}</span>
                        {isOverBudget && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Estourado (+{formatBRL(Math.abs(remaining))})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        {editingEnvelopeId === env.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={newTargetValue}
                              onChange={(e) => setNewTargetValue(e.target.value)}
                              className="w-24 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs font-mono-numbers text-white outline-none"
                            />
                            <button
                              onClick={() => handleSaveTarget(env.id)}
                              className="px-2 py-1 rounded bg-emerald-500 text-zinc-950 text-xs font-bold"
                            >
                              Salvar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditTarget(env.id, target)}
                            className="text-zinc-400 hover:text-zinc-200 underline decoration-dashed text-[11px]"
                            title="Clique para editar o teto mensal deste envelope"
                          >
                            Teto: <span className="font-mono-numbers font-semibold text-zinc-200">{formatBRL(target)}</span>
                          </button>
                        )}

                        <button
                          onClick={() => onOpenQuickExpense(env.id)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-semibold transition"
                        >
                          + Gasto
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Numbers */}
                    <div>
                      <div className="flex justify-between text-xs text-zinc-400 mb-1.5 font-mono-numbers">
                        <span>
                          Gasto Real: <strong className="text-zinc-100 font-bold">{formatBRL(totalSpent)}</strong>
                        </span>
                        <span className={isOverBudget ? 'text-rose-400 font-bold' : 'text-zinc-400'}>
                          {isOverBudget
                            ? `Estouro: ${formatBRL(Math.abs(remaining))}`
                            : `Margem: ${formatBRL(remaining)}`}
                        </span>
                      </div>

                      <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${statusColor.split(' ')[1]}`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Logs Accordion */}
                    {logs.length > 0 && (
                      <div className="pt-2 border-t border-zinc-900 space-y-1.5">
                        <span className="text-[11px] font-semibold text-zinc-400 block">
                          Lançamentos do Mês ({logs.length}):
                        </span>
                        <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                          {logs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between text-xs py-1 px-2 rounded bg-zinc-900/60 text-zinc-300"
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
                                <button
                                  onClick={() => deleteVariableExpenseLog(log.id)}
                                  className="text-zinc-400 hover:text-rose-400 p-0.5 transition"
                                  title="Remover lançamento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
