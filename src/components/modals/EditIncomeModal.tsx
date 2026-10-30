import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  CheckCircle,
  Repeat,
  Zap,
  DollarSign,
  Layers,
  Calendar,
  User,
} from 'lucide-react';
import { Income } from '../../types/finance';
import { useFinance } from '../../context/FinanceContext';
import { formatBRL } from '../../utils/calculations';

interface EditIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  income: Income | null;
}

export const EditIncomeModal: React.FC<EditIncomeModalProps> = ({
  isOpen,
  onClose,
  income,
}) => {
  const { updateIncome, summaries, selectedMonth } = useFinance();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [scope, setScope] = useState<'PF' | 'PJ'>('PF');
  const [source, setSource] = useState<'Carol' | 'Filipe' | 'custom'>('Filipe');
  const [customSource, setCustomSource] = useState('');
  const [incomeType, setIncomeType] = useState<'fixed' | 'variable'>('fixed');
  const [month, setMonth] = useState(selectedMonth);
  const [startMonth, setStartMonth] = useState(selectedMonth);
  const [endMonth, setEndMonth] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (income) {
      setTitle(income.title || '');
      setAmount(income.amount !== undefined ? income.amount.toString() : '');
      setCategory(income.category || 'Salário / Recorrente');
      setScope(income.scope || 'PF');
      
      const src = income.source || 'Filipe';
      if (src === 'Filipe' || src === 'Carol') {
        setSource(src);
        setCustomSource('');
      } else {
        setSource('custom');
        setCustomSource(src);
      }

      setIncomeType(income.type || 'fixed');
      setMonth(income.month || selectedMonth);
      setStartMonth(income.startMonth || selectedMonth);
      setEndMonth(income.endMonth || '');
      setNotes(income.notes || '');
    }
  }, [income, selectedMonth]);

  if (!isOpen || !income) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const resolvedSource = source === 'custom' ? (customSource.trim() || 'Outro') : source;

    const updatedIncome: Income = {
      ...income,
      title: title.trim(),
      amount: parsedAmount,
      category: category.trim() || 'Receitas',
      scope,
      source: resolvedSource,
      type: incomeType,
      notes: notes.trim() || undefined,
      ...(incomeType === 'fixed'
        ? {
            startMonth,
            endMonth: endMonth.trim() ? endMonth : undefined,
            month: undefined,
          }
        : {
            month,
            startMonth: undefined,
            endMonth: undefined,
          }),
    };

    updateIncome(updatedIncome);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Editar Receita
              </h2>
              <p className="text-xs text-zinc-400">
                Altere valor, categoria, fonte, vigência e descrição.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Tipo de Receita */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Tipo de Receita</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIncomeType('fixed')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 transition ${
                  incomeType === 'fixed'
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-sm'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                Recorrente (Fixa)
              </button>
              <button
                type="button"
                onClick={() => setIncomeType('variable')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 transition ${
                  incomeType === 'variable'
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-sm'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Pontual (Variável)
              </button>
            </div>
          </div>

          {/* Descrição / Título */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">Descrição / Título</label>
            <input
              type="text"
              required
              placeholder="Ex: Salário CLT, Consultoria, Aluguel..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Valor e Escopo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Valor (R$)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white font-mono-numbers outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Escopo</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as 'PF' | 'PJ')}
                className="w-full px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white outline-none focus:border-emerald-500 transition"
              >
                <option value="PF">Pessoa Física (PF)</option>
                <option value="PJ">Pessoa Jurídica (PJ)</option>
              </select>
            </div>
          </div>

          {/* Categoria e Fonte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Categoria / Origem</label>
              <input
                type="text"
                required
                placeholder="Ex: Salário, Freelance, Dividendos..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Fonte / Responsável</label>
              <div className="flex gap-2">
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as any)}
                  className="flex-1 px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white outline-none focus:border-emerald-500 transition"
                >
                  <option value="Filipe">Filipe</option>
                  <option value="Carol">Carol</option>
                  <option value="custom">Outro...</option>
                </select>
                {source === 'custom' && (
                  <input
                    type="text"
                    placeholder="Nome"
                    value={customSource}
                    onChange={(e) => setCustomSource(e.target.value)}
                    className="w-24 px-2 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white outline-none focus:border-emerald-500"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Período / Vigência */}
          {incomeType === 'fixed' ? (
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3">
              <span className="text-[11px] font-bold text-emerald-400 block flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Vigência da Receita Recorrente
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400">Mês Inicial</label>
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-emerald-500 font-mono-numbers"
                  >
                    {summaries.map((s) => (
                      <option key={s.month} value={s.month}>
                        {s.label} ({s.month})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400">Mês Final (Término)</label>
                  <select
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-emerald-500 font-mono-numbers"
                  >
                    <option value="">Indefinido / Perpétuo</option>
                    {summaries.map((s) => (
                      <option key={s.month} value={s.month}>
                        {s.label} ({s.month})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500">
                Se definir mês final, a receita deixará de ser projetada a partir do mês seguinte ao término na Matriz Anual.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Mês da Receita Pontual</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white outline-none focus:border-emerald-500 transition font-mono-numbers"
              >
                {summaries.map((s) => (
                  <option key={s.month} value={s.month}>
                    {s.label} ({s.month})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">Observações (Opcional)</label>
            <textarea
              rows={2}
              placeholder="Anotações adicionais sobre esta entrada..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 transition resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
