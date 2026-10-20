import React from 'react';
import {
  PieChart as PieIcon,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Sparkles,
  ArrowRight,
  ShieldCheck,
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
  Legend,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { formatBRL } from '../../utils/calculations';

export const RaioXTab: React.FC = () => {
  const {
    data,
    selectedMonth,
    summaries,
    currentMonthSummary,
    updateBudgetEnvelopeTarget,
  } = useFinance();

  const current = currentMonthSummary || summaries[0];

  // Compare each budget envelope
  const envelopeComparisons = data.budgetEnvelopes.map((env) => {
    const logsThisMonth = data.variableExpenseLogs.filter(
      (l) => l.categoryId === env.id && l.month === selectedMonth
    );
    const spentThisMonth = logsThisMonth.reduce((acc, curr) => acc + curr.amount, 0);
    const diff = spentThisMonth - env.targetAmount;
    const pct = Math.round((spentThisMonth / env.targetAmount) * 100);

    // Calculate historical average across all months
    const allLogs = data.variableExpenseLogs.filter((l) => l.categoryId === env.id);
    const uniqueMonths = new Set(allLogs.map((l) => l.month));
    const monthCount = Math.max(1, uniqueMonths.size);
    const historicalTotal = allLogs.reduce((acc, curr) => acc + curr.amount, 0);
    const historicalAvg = Math.round(historicalTotal / monthCount);

    return {
      envelope: env,
      target: env.targetAmount,
      spent: spentThisMonth,
      diff,
      pct,
      historicalAvg: historicalAvg > 0 ? historicalAvg : env.targetAmount,
      isOver: diff > 0,
    };
  });

  // Calculate overall predictability score
  const totalTarget = envelopeComparisons.reduce((acc, c) => acc + c.target, 0);
  const totalSpent = envelopeComparisons.reduce((acc, c) => acc + c.spent, 0);
  const totalDiff = totalSpent - totalTarget;
  const adherenceScore = Math.max(
    0,
    Math.min(100, Math.round(100 - Math.abs(totalDiff / (totalTarget || 1)) * 50))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Calibração Orçamentária
            </span>
            <span className="text-xs text-zinc-400">{current.label}</span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-emerald-400" />
            Raio-X Geral: Previsto vs. Realizado
          </h2>
          <p className="text-xs text-zinc-400 max-w-2xl mt-1">
            Compare o que foi planejado com o que realmente aconteceu no mês. Ajuste os tetos com 1 clique para alinhar a projeção dos próximos 12 meses à realidade.
          </p>
        </div>

        {/* Predictability Score */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-zinc-400 block font-semibold uppercase">Índice de Previsibilidade</span>
            <span className="text-xl font-extrabold font-mono-numbers text-emerald-400">
              {adherenceScore}%
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Orçado Total em Envelopes:</span>
          <span className="text-xl font-bold font-mono-numbers text-zinc-100">
            {formatBRL(totalTarget)}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Total Realmente Gasto no Mês:</span>
          <span className="text-xl font-bold font-mono-numbers text-zinc-100">
            {formatBRL(totalSpent)}
          </span>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            totalDiff > 0
              ? 'bg-rose-950/20 border-rose-500/30'
              : 'bg-emerald-950/20 border-emerald-500/30'
          }`}
        >
          <span className="text-xs text-zinc-400 block mb-1">Desvio Geral do Orçamento:</span>
          <span
            className={`text-xl font-extrabold font-mono-numbers ${
              totalDiff > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {totalDiff > 0 ? `+${formatBRL(totalDiff)} (Estouro)` : `${formatBRL(totalDiff)} (Economia)`}
          </span>
        </div>
      </div>

      {/* Gráfico de Tendência Histórica: Despesas vs Orçado (12 Meses) */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Tendência Histórica: Despesas Reais vs. Orçado (12 Meses)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Evolução comparativa entre o teto planejado e o gasto efetivo ao longo do tempo.
            </p>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={summaries.slice(0, 12).map((s) => {
                const logsForMonth = data.variableExpenseLogs.filter((l) => l.month === s.month);
                const actualVar = logsForMonth.reduce((acc, curr) => acc + curr.amount, 0);
                const targetVar = data.budgetEnvelopes.reduce((acc, curr) => acc + curr.targetAmount, 0);
                const totalRealExpense = s.totalExpenses;
                return {
                  label: s.label,
                  Orcado: targetVar,
                  GastoReal: totalRealExpense,
                };
              })}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="label" stroke="#a1a1aa" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#a1a1aa"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: 12 }}
                formatter={(val: any) => [formatBRL(val), '']}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar dataKey="Orcado" name="Teto Orçado" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} opacity={0.8} />
              <Line
                type="monotone"
                dataKey="GastoReal"
                name="Despesa Realizada"
                stroke="#f43f5e"
                strokeWidth={3}
                dot={{ r: 4, fill: '#f43f5e' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category by Category Breakdown */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            Calibração de Categorias e Revisão de Tetos
          </h3>
          <span className="text-xs text-zinc-400">
            Média real calculada com base no histórico recente
          </span>
        </div>

        <div className="space-y-4">
          {envelopeComparisons.map((item) => (
            <div
              key={item.envelope.id}
              className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Category Info */}
              <div className="space-y-1 min-w-[220px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-zinc-100">{item.envelope.name}</span>
                  {item.isOver ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Estouro de {formatBRL(item.diff)}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Dentro do Teto
                    </span>
                  )}
                </div>

                <div className="text-xs text-zinc-400 flex items-center gap-3 font-mono-numbers">
                  <span>Teto Atual: <strong>{formatBRL(item.target)}</strong></span>
                  <span>•</span>
                  <span>Gasto Real: <strong className={item.isOver ? 'text-rose-400' : 'text-zinc-200'}>{formatBRL(item.spent)}</strong></span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex-1 max-w-xs space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-400 font-mono-numbers">
                  <span>Uso: {item.pct}%</span>
                  <span>Média Real: {formatBRL(item.historicalAvg)}</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.pct > 100
                        ? 'bg-rose-500'
                        : item.pct >= 70
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, item.pct)}%` }}
                  />
                </div>
              </div>

              {/* Quick Calibration Action */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => updateBudgetEnvelopeTarget(item.envelope.id, item.historicalAvg)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1.5"
                  title="Ajusta o teto orçado dos próximos meses para a média real gasta"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ajustar Teto para Média ({formatBRL(item.historicalAvg)})</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
