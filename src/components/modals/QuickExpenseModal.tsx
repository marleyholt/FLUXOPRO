import React, { useState } from 'react';
import { X, Sparkles, Plus, DollarSign, Calendar, Lock } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEnvelopeId?: string;
}

export const QuickExpenseModal: React.FC<QuickExpenseModalProps> = ({
  isOpen,
  onClose,
  defaultEnvelopeId,
}) => {
  const { data, selectedMonth, addVariableExpenseLog, isMonthClosed } = useFinance();
  const isClosed = isMonthClosed(selectedMonth);

  const [categoryId, setCategoryId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      setCategoryId(defaultEnvelopeId || data.budgetEnvelopes[0]?.id || '');
      setAmount('');
      setDescription('');
      setDate(`${selectedMonth}-15`);
    }
  }, [isOpen, defaultEnvelopeId, data.budgetEnvelopes, selectedMonth]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isClosed) {
      alert('Este mês está fechado e bloqueado contra novos lançamentos.');
      return;
    }
    const parsed = parseFloat(amount);
    if (!description || isNaN(parsed) || parsed <= 0) return;

    addVariableExpenseLog({
      categoryId,
      month: selectedMonth,
      amount: parsed,
      description,
      date,
    });

    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Lançar Gasto no Envelope</h3>
              <p className="text-[11px] text-zinc-400">Registro rápido do dia a dia</p>
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
          <div className="space-y-1">
            <label className="font-semibold text-zinc-300">Envelope / Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
            >
              {data.budgetEnvelopes.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-zinc-300">Descrição</label>
            <input
              type="text"
              required
              placeholder="Ex: Mercado Atacadão, Farmácia, Uber almoço..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-zinc-300">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-zinc-300">Data do Gasto</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
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
              {isClosed ? 'Mês Fechado (Bloqueado)' : 'Adicionar ao Envelope'}
            </button>
          </div>
        </form>


      </div>
    </div>
  );
};
