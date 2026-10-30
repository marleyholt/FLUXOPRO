import React, { useState } from 'react';
import {
  TrendingUp,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Filter,
  CheckCircle,
  Sparkles,
  Repeat,
  Edit2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatBRL, getMonthLabel } from '../../utils/calculations';
import { Income } from '../../types/finance';
import { EditIncomeModal } from '../modals/EditIncomeModal';

interface VariableIncomesTabProps {
  onOpenNewTransaction: () => void;
}

export const VariableIncomesTab: React.FC<VariableIncomesTabProps> = ({
  onOpenNewTransaction,
}) => {
  const { data, selectedMonth, summaries, deleteIncome, addIncome } = useFinance();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Salário / Recorrente');
  const [scope, setScope] = useState<'PF' | 'PJ'>('PF');
  const [source, setSource] = useState<'Carol' | 'Filipe' | 'custom'>('Filipe');
  const [customSource, setCustomSource] = useState('');
  
  // Tipo: 'fixed' (recorrente) ou 'variable' (pontual)
  const [incomeType, setIncomeType] = useState<'fixed' | 'variable'>('fixed');
  const [month, setMonth] = useState(selectedMonth); // para variável
  const [startMonth, setStartMonth] = useState(selectedMonth); // para recorrente início
  const [endMonth, setEndMonth] = useState(''); // para recorrente término (opcional)
  const [notes, setNotes] = useState('');
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  // Todas as receitas cadastradas
  const allIncomes = data.incomes;

  // Total no mês selecionado (considerando fixas ativas e variáveis do mês)
  let totalThisMonth = 0;
  allIncomes.forEach((inc) => {
    if (inc.type === 'fixed') {
      const start = inc.startMonth || data.settings.startMonth;
      const [y1, m1] = start.split('-').map(Number);
      const [y2, m2] = selectedMonth.split('-').map(Number);
      const diffStart = (y2 - y1) * 12 + (m2 - m1);

      let matchesEnd = true;
      if (inc.endMonth) {
        const [ye, me] = inc.endMonth.split('-').map(Number);
        const diffEnd = (ye - y2) * 12 + (me - m2);
        if (diffEnd < 0) matchesEnd = false;
      }

      if (diffStart >= 0 && matchesEnd) {
        totalThisMonth += inc.amount;
      }
    } else if (inc.type === 'variable') {
      if (inc.month === selectedMonth) {
        totalThisMonth += inc.amount;
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const resolvedSource = source === 'custom' ? customSource || 'Outro' : source;

    if (incomeType === 'fixed') {
      addIncome({
        title,
        type: 'fixed',
        amount: parsedAmount,
        category,
        scope,
        source: resolvedSource,
        startMonth,
        endMonth: endMonth.trim() ? endMonth : undefined,
        notes,
      });
    } else {
      addIncome({
        title,
        type: 'variable',
        amount: parsedAmount,
        category,
        scope,
        source: resolvedSource,
        month,
        notes,
      });
    }

    // Reset form
    setTitle('');
    setAmount('');
    setNotes('');
    setCustomSource('');
    setEndMonth('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Central de Receitas (Salários, Recorrentes & Variáveis)
          </h2>
          <p className="text-xs text-zinc-400">
            Cadastre receitas recorrentes (como salário, adicionando uma vez e definindo até qual mês considerar) ou receitas pontuais/variáveis.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-400 block text-[10px]">No Mês Selecionado ({selectedMonth}):</span>
            <span className="font-mono-numbers font-bold text-emerald-400 text-sm">
              {formatBRL(totalThisMonth)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Quick Add Form (4 cols) */}
        <div className="lg:col-span-4">
          <form
            onSubmit={handleSubmit}
            className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm space-y-4"
          >
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              Adicionar Nova Receita
            </h3>

            {/* Tipo de Receita: Recorrente vs Variável */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Tipo de Receita</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIncomeType('fixed')}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${
                    incomeType === 'fixed'
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-sm'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  🔄 Recorrente (Fixa)
                </button>
                <button
                  type="button"
                  onClick={() => setIncomeType('variable')}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${
                    incomeType === 'variable'
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-sm'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  ⚡ Pontual (Variável)
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Descrição / Título</label>
              <input
                type="text"
                required
                placeholder={incomeType === 'fixed' ? 'Ex: Salário CLT, Aluguel Recebido...' : 'Ex: Bônus, Freelance, 13º...'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Valor Mensal (R$)</label>
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

            {incomeType === 'fixed' ? (
              <div className="space-y-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-300">Mês Inicial (Quando começa)</label>
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-emerald-500 font-mono-numbers"
                  >
                    {summaries.map((s) => (
                      <option key={s.month} value={s.month}>
                        {s.label} ({s.month})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-300">Mês Final (Até quando considerar)</label>
                  <select
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-emerald-500 font-mono-numbers"
                  >
                    <option value="">Indefinido / Sem Limite (Perpétuo)</option>
                    {summaries.map((s) => (
                      <option key={s.month} value={s.month}>
                        {s.label} ({s.month})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-zinc-500 block">Deixe em branco se for recorrente contínua.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Mês da Entrada Pontual</label>
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

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Categoria / Origem (Ex: Salário, Freelance)</label>
              <input
                type="text"
                placeholder="Ex: Salário CLT, Consultoria..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Responsável / Fonte</label>
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

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-md shadow-emerald-500/20 text-xs"
            >
              Cadastrar Receita
            </button>
          </form>
        </div>

        {/* List of Incomes (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Todas as Receitas Cadastradas ({allIncomes.length})</span>
            </h3>

            {allIncomes.length === 0 ? (
              <div className="p-8 rounded-xl bg-zinc-950 border border-zinc-800/80 text-center text-zinc-500 text-xs">
                Nenhuma receita cadastrada. Adicione salários, rendas fixas ou bônus ao lado.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {allIncomes.map((inc) => (
                  <div
                    key={inc.id}
                    id={`income-${inc.id}`}
                    className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-4 text-xs transition hover:border-zinc-700"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{inc.title}</span>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                          {inc.scope}
                        </span>
                        {inc.type === 'fixed' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                            <Repeat className="w-3 h-3" /> Recorrente
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                            ⚡ Pontual ({inc.month})
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-zinc-400 flex items-center gap-3">
                        <span>Categoria: <strong className="text-zinc-200">{inc.category}</strong></span>
                        <span>Fonte: <strong className="text-zinc-200">{inc.source}</strong></span>
                        {inc.type === 'fixed' && (
                          <span>
                            Período: <strong className="text-emerald-400">{inc.startMonth} até {inc.endMonth || 'Indefinido'}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono-numbers font-extrabold text-emerald-400 text-sm">
                        {formatBRL(inc.amount)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingIncome(inc)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition"
                          title="Editar receita"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteIncome(inc.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Excluir receita"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal de Edição de Receita */}
      <EditIncomeModal
        isOpen={!!editingIncome}
        income={editingIncome}
        onClose={() => setEditingIncome(null)}
      />
    </div>
  );
};
