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
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatBRL, getMonthLabel } from '../../utils/calculations';

interface VariableIncomesTabProps {
  onOpenNewTransaction: () => void;
}

export const VariableIncomesTab: React.FC<VariableIncomesTabProps> = ({
  onOpenNewTransaction,
}) => {
  const { data, selectedMonth, summaries, deleteIncome, addIncome } = useFinance();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Extra / Projetos');
  const [scope, setScope] = useState<'PF' | 'PJ'>('PF');
  const [month, setMonth] = useState(selectedMonth);
  const [notes, setNotes] = useState('');

  // All variable incomes
  const variableIncomes = data.incomes.filter((inc) => inc.type === 'variable');

  // Sum for selected month
  const totalThisMonth = variableIncomes
    .filter((inc) => inc.month === selectedMonth)
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Sum for full 12M period
  const totalAllPeriod = variableIncomes.reduce((acc, curr) => acc + curr.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title || isNaN(parsedAmount) || parsedAmount <= 0) return;

    addIncome({
      title,
      type: 'variable',
      amount: parsedAmount,
      category,
      scope,
      month,
      notes,
    });

    // Reset form
    setTitle('');
    setAmount('');
    setNotes('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Receitas Variáveis & Lançamentos Extras
          </h2>
          <p className="text-xs text-zinc-400">
            Substitui a antiga aba secundária de SUMIFS da planilha. Registre bônus, 13º, projetos e consultorias avulsas.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-400 block text-[10px]">No Mês Selecionado:</span>
            <span className="font-mono-numbers font-bold text-emerald-400 text-sm">
              {formatBRL(totalThisMonth)}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-400 block text-[10px]">Total Projetado 12M:</span>
            <span className="font-mono-numbers font-bold text-zinc-200 text-sm">
              {formatBRL(totalAllPeriod)}
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
              Lançar Nova Receita Extra
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Descrição / Título</label>
              <input
                type="text"
                required
                placeholder="Ex: Projeto Freelance TI, Restituição IR..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Valor (R$)</label>
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
                <label className="text-xs font-medium text-zinc-300">Mês da Entrada</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white outline-none focus:border-emerald-500 transition"
                >
                  {summaries.map((s) => (
                    <option key={s.month} value={s.month}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white outline-none focus:border-emerald-500 transition"
                >
                  <option value="Extra / Projetos">Extra / Projetos</option>
                  <option value="13º Salário">13º Salário</option>
                  <option value="PLR / Bonificação">PLR / Bonificação</option>
                  <option value="Restituição IR">Restituição IR</option>
                  <option value="Venda de Ativos">Venda de Ativos</option>
                  <option value="Dividendos">Dividendos</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Escopo</label>
                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === 'PF'}
                      onChange={() => setScope('PF')}
                      className="accent-emerald-500"
                    />
                    PF
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === 'PJ'}
                      onChange={() => setScope('PJ')}
                      className="accent-emerald-500"
                    />
                    PJ
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Observações (opcional)</label>
              <input
                type="text"
                placeholder="Ex: Recebimento previsto para o dia 20"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-md shadow-emerald-500/20"
            >
              Adicionar Receita Variável
            </button>
          </form>
        </div>

        {/* Incomes Table List (8 cols) */}
        <div className="lg:col-span-8">
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Histórico de Entradas Variáveis ({variableIncomes.length})
              </h3>
            </div>

            {variableIncomes.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 bg-zinc-950/60 rounded-xl border border-zinc-800">
                Nenhuma receita variável cadastrada ainda.
              </div>
            ) : (
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 font-semibold">
                      <th className="py-2.5 px-3">Mês</th>
                      <th className="py-2.5 px-3">Descrição</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3">Escopo</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                      <th className="py-2.5 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {variableIncomes.map((inc) => (
                      <tr key={inc.id} className="hover:bg-zinc-900/40 text-zinc-300">
                        <td className="py-2.5 px-3 font-semibold text-emerald-400">
                          {inc.month ? getMonthLabel(inc.month) : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-white">
                          {inc.title}
                          {inc.notes && (
                            <span className="block text-[10px] text-zinc-400 italic">
                              {inc.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-400">{inc.category}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            {inc.scope}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-numbers font-bold text-emerald-400">
                          {formatBRL(inc.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => deleteIncome(inc.id)}
                            className="p-1 rounded text-zinc-400 hover:text-rose-400 transition"
                            title="Excluir receita"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
