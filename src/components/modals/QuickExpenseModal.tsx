import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, DollarSign, Calendar, Lock, Link2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatBRL, getMonthDiff, getInstallmentInfo } from '../../utils/calculations';

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEnvelopeId?: string;
  defaultSubItemId?: string;
  defaultExpenseId?: string;
}

export const QuickExpenseModal: React.FC<QuickExpenseModalProps> = ({
  isOpen,
  onClose,
  defaultEnvelopeId,
  defaultSubItemId,
  defaultExpenseId,
}) => {
  const { data, selectedMonth, addVariableExpenseLog, isMonthClosed } = useFinance();
  const isClosed = isMonthClosed(selectedMonth);

  const [categoryId, setCategoryId] = useState<string>('');
  const [linkTarget, setLinkTarget] = useState<string>('unplanned'); // 'unplanned' | 'sub_<id>' | 'exp_<id>'
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>('');

  // Selected envelope object
  const activeEnvelope = useMemo(() => {
    return data.budgetEnvelopes.find((e) => e.id === categoryId);
  }, [data.budgetEnvelopes, categoryId]);

  // Active fixed/periodic/installment expenses matching this envelope for selectedMonth
  const activeCategoryExpenses = useMemo(() => {
    if (!activeEnvelope) return [];
    const lowerName = activeEnvelope.name.trim().toLowerCase();
    const monthIdx = parseInt(selectedMonth.split('-')[1], 10);

    return data.expenses.filter((exp) => {
      let isActive = false;
      if (exp.frequency === 'fixed') {
        isActive = getMonthDiff(exp.startMonth, selectedMonth) >= 0;
      } else if (exp.frequency === 'installment' && exp.installmentsCount) {
        isActive = getInstallmentInfo(exp.startMonth, exp.installmentsCount, selectedMonth).isActive;
      } else if (exp.frequency === 'periodic' && exp.periodicMonths) {
        isActive = getMonthDiff(exp.startMonth, selectedMonth) >= 0 && exp.periodicMonths.includes(monthIdx);
      } else if (exp.frequency === 'single') {
        isActive = exp.singleMonth === selectedMonth || exp.startMonth === selectedMonth;
      }
      const matchesCategory =
        exp.category.trim().toLowerCase() === lowerName || exp.category === activeEnvelope.id;
      return isActive && matchesCategory;
    });
  }, [data.expenses, activeEnvelope, selectedMonth]);

  // Spent amounts for each subitem in selectedMonth (from logs and card transactions)
  const spentBySubItem = useMemo(() => {
    const map: Record<string, number> = {};
    if (!activeEnvelope) return map;

    data.variableExpenseLogs.forEach((l) => {
      if (l.month === selectedMonth && l.categoryId === activeEnvelope.id && l.linkedSubItemId) {
        map[l.linkedSubItemId] = (map[l.linkedSubItemId] || 0) + l.amount;
      }
    });

    data.cardTransactions.forEach((tx) => {
      if (!tx.isPaused && tx.linkedSubItemId) {
        let active = false;
        if (tx.type === 'recurring') active = getMonthDiff(tx.startMonth, selectedMonth) >= 0;
        else if (tx.type === 'installment') active = getInstallmentInfo(tx.startMonth, tx.totalInstallments, selectedMonth).isActive;
        else if (tx.type === 'single') active = tx.startMonth === selectedMonth;
        if (active) {
          map[tx.linkedSubItemId] = (map[tx.linkedSubItemId] || 0) + tx.installmentAmount;
        }
      }
    });

    return map;
  }, [data.variableExpenseLogs, data.cardTransactions, activeEnvelope, selectedMonth]);

  useEffect(() => {
    if (isOpen) {
      const initialCatId = defaultEnvelopeId || data.budgetEnvelopes[0]?.id || '';
      setCategoryId(initialCatId);

      if (defaultSubItemId) {
        setLinkTarget(`sub_${defaultSubItemId}`);
      } else if (defaultExpenseId) {
        setLinkTarget(`exp_${defaultExpenseId}`);
      } else {
        setLinkTarget('unplanned');
      }

      setAmount('');
      setDescription('');
      setDate(`${selectedMonth}-15`);
    }
  }, [isOpen, defaultEnvelopeId, defaultSubItemId, defaultExpenseId, data.budgetEnvelopes, selectedMonth]);

  // When linkTarget changes, autofill description and amount if appropriate
  const handleLinkTargetChange = (newTarget: string) => {
    setLinkTarget(newTarget);

    if (newTarget.startsWith('sub_')) {
      const subId = newTarget.replace('sub_', '');
      const sub = activeEnvelope?.subItems?.find((s) => s.id === subId);
      if (sub) {
        setDescription(sub.name);
        const alreadyPaid = spentBySubItem[sub.id] || 0;
        const pending = Math.max(0, sub.amount - alreadyPaid);
        setAmount(String(pending > 0 ? pending : sub.amount));
      }
    } else if (newTarget.startsWith('exp_')) {
      const expId = newTarget.replace('exp_', '');
      const exp = activeCategoryExpenses.find((e) => e.id === expId);
      if (exp) {
        setDescription(exp.title);
        setAmount(String(exp.amount));
      }
    } else {
      // Unplanned: keep existing or empty
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isClosed) {
      alert('Este mês está fechado e bloqueado contra novos lançamentos.');
      return;
    }
    const parsed = parseFloat(amount);
    if (!description || isNaN(parsed) || parsed <= 0) return;

    let linkedSubItemId: string | undefined = undefined;
    let linkedExpenseId: string | undefined = undefined;
    let isUnplanned = true;

    if (linkTarget.startsWith('sub_')) {
      linkedSubItemId = linkTarget.replace('sub_', '');
      isUnplanned = false;
    } else if (linkTarget.startsWith('exp_')) {
      linkedExpenseId = linkTarget.replace('exp_', '');
      isUnplanned = false;
    }

    addVariableExpenseLog({
      categoryId,
      month: selectedMonth,
      amount: parsed,
      description,
      date,
      linkedSubItemId,
      linkedExpenseId,
      isUnplanned,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Lançar Gasto Real</h3>
              <p className="text-[11px] text-zinc-400">
                Vincule o gasto a um item da sua previsão ou marque como despesa avulsa
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Categoria / Envelope */}
          <div className="space-y-1">
            <label className="font-semibold text-zinc-300">Envelope / Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setLinkTarget('unplanned');
              }}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500 font-medium"
            >
              {data.budgetEnvelopes.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name} (Teto: {formatBRL(env.targetAmount)})
                </option>
              ))}
            </select>
          </div>

          {/* Vínculo com a Previsão */}
          <div className="space-y-1 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                <span>Vincular ao Item Previsto (Previsão & Controle)</span>
              </label>
              {linkTarget !== 'unplanned' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Previsão Vinculada
                </span>
              )}
            </div>

            <select
              value={linkTarget}
              onChange={(e) => handleLinkTargetChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white outline-none focus:border-emerald-500 text-xs"
            >
              <option value="unplanned">
                ⚠️ Gasto Avulso (Sem Previsão Específica / Gasto Extra)
              </option>

              {activeEnvelope?.subItems && activeEnvelope.subItems.length > 0 && (
                <optgroup label="📋 Itens / Subcategorias Planejadas no Envelope">
                  {activeEnvelope.subItems.map((sub) => {
                    const paid = spentBySubItem[sub.id] || 0;
                    const diff = sub.amount - paid;
                    const statusText =
                      diff === 0
                        ? 'Quitado'
                        : diff < 0
                        ? `Estourado (+${formatBRL(Math.abs(diff))})`
                        : `Resta pagar: ${formatBRL(diff)}`;
                    return (
                      <option key={sub.id} value={`sub_${sub.id}`}>
                        {sub.name} — Previsto: {formatBRL(sub.amount)} ({statusText})
                      </option>
                    );
                  })}
                </optgroup>
              )}

              {activeCategoryExpenses.length > 0 && (
                <optgroup label="🏷️ Contas / Obrigações Fixas da Categoria">
                  {activeCategoryExpenses.map((exp) => (
                    <option key={exp.id} value={`exp_${exp.id}`}>
                      {exp.title} — Conta Fixa: {formatBRL(exp.amount)} (
                      {exp.paidMonths?.[selectedMonth] ? 'Já marcada paga' : 'Pendente'})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            <p className="text-[10px] text-zinc-400 mt-1">
              {linkTarget === 'unplanned'
                ? 'Este gasto entrará como despesa sem previsão no envelope, permitindo identificar desvios do orçamento.'
                : 'O valor lançado abaterá a previsão correspondente, evitando duplicidade e mostrando o saldo restante.'}
            </p>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-zinc-300">Descrição do Gasto Real</label>
            <input
              type="text"
              required
              placeholder="Ex: Mercado Atacadão, Conta ENEL, IPTU..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-zinc-300">Valor Efetivo Pago (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-zinc-300">Data do Pagamento</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          {isClosed && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Este mês está fechado e bloqueado contra novos lançamentos.</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isClosed}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition shadow-md ${
                isClosed
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20'
              }`}
            >
              {isClosed ? 'Mês Fechado (Bloqueado)' : 'Confirmar e Adicionar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
