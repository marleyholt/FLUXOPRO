import React from 'react';
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
  AreaChart,
  Area,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import {
  formatBRL,
  formatCompactBRL,
  calculateCardDecompression,
  findRecoveryMilestone,
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
  } = useFinance();

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

  // Prepare data for 12M Cashflow Chart
  const chartData = summaries.slice(0, 12).map((s) => ({
    label: s.label,
    month: s.month,
    Entradas: s.totalIncome,
    Saidas: s.totalExpenses,
    SaldoAcumulado: s.finalBalance,
  }));

  // Custom Tooltip for Cashflow Chart
  const CustomCashflowTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pEntradas = payload.find((p: any) => p.dataKey === 'Entradas')?.value || 0;
      const pSaidas = payload.find((p: any) => p.dataKey === 'Saidas')?.value || 0;
      const pSaldo = payload.find((p: any) => p.dataKey === 'SaldoAcumulado')?.value || 0;
      return (
        <div className="bg-zinc-900 border border-zinc-700/80 rounded-xl p-3 shadow-xl text-xs space-y-1.5 min-w-[200px]">
          <div className="font-bold text-white border-b border-zinc-800 pb-1 flex justify-between">
            <span>Mês: {label}</span>
            <span className={pSaldo >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {pSaldo >= 0 ? 'Superávit' : 'Déficit'}
            </span>
          </div>
          <div className="flex justify-between text-zinc-300">
            <span>Entradas Disponíveis:</span>
            <span className="font-mono-numbers text-emerald-400 font-semibold">{formatBRL(pEntradas)}</span>
          </div>
          <div className="flex justify-between text-zinc-300">
            <span>Total Saídas:</span>
            <span className="font-mono-numbers text-rose-400 font-semibold">{formatBRL(pSaidas)}</span>
          </div>
          <div className="border-t border-zinc-800 pt-1.5 flex justify-between font-bold">
            <span className="text-zinc-200">Saldo Acumulado:</span>
            <span
              className={`font-mono-numbers ${
                pSaldo >= 0 ? 'text-emerald-300 font-extrabold' : 'text-rose-400 font-extrabold'
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

  // Custom Tooltip for Decompression Chart
  const CustomDecompressionTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pSub = payload.find((p: any) => p.dataKey === 'subscriptions')?.value || 0;
      const pInst = payload.find((p: any) => p.dataKey === 'installments')?.value || 0;
      const pDiff = payload.find((p: any) => p.dataKey === 'unmappedDiff')?.value || 0;
      const total = pSub + pInst + pDiff;
      return (
        <div className="bg-zinc-900 border border-zinc-700/80 rounded-xl p-3 shadow-xl text-xs space-y-1.5 min-w-[210px]">
          <div className="font-bold text-white border-b border-zinc-800 pb-1">
            Fatura Projetada: {label}
          </div>
          <div className="flex justify-between text-zinc-300">
            <span>Parcelamentos:</span>
            <span className="font-mono-numbers text-indigo-400 font-semibold">{formatBRL(pInst)}</span>
          </div>
          <div className="flex justify-between text-zinc-300">
            <span>Assinaturas Fixas:</span>
            <span className="font-mono-numbers text-amber-400 font-semibold">{formatBRL(pSub)}</span>
          </div>
          {pDiff > 0 && (
            <div className="flex justify-between text-zinc-400">
              <span>Diferença Informada:</span>
              <span className="font-mono-numbers text-zinc-300">{formatBRL(pDiff)}</span>
            </div>
          )}
          <div className="border-t border-zinc-800 pt-1.5 flex justify-between font-bold text-emerald-400">
            <span>Total no Mês:</span>
            <span className="font-mono-numbers">{formatBRL(total)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Recovery Milestone Banner (if applicable) */}
      <div className="rounded-2xl p-4 sm:p-5 border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Diagnóstico de Recuperação Fiscal
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                Rolling Forecast 12 Meses
              </span>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {milestone.achieved ? (
                <>
                  Ponto de Virada Positivo previsto em{' '}
                  <span className="text-emerald-400 underline decoration-emerald-500/50 underline-offset-4">
                    {milestone.label}
                  </span>
                </>
              ) : (
                'Projeção de Equilíbrio em Andamento'
              )}
            </h1>
            
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mt-1">
              {milestone.achieved ? (
                <>
                  Ao manter as despesas dentro dos tetos orçados e aguardar o término dos parcelamentos atuais,
                  o fluxo de caixa encerra o ano acumulando{' '}
                  <strong className="text-emerald-300 font-bold font-mono-numbers">
                    {formatBRL(milestone.finalAccumulated || 0)}
                  </strong>{' '}
                  em reserva líquida.
                </>
              ) : (
                'Ajuste os tetos de mercado/iFood e audite as assinaturas para antecipar a saída do cheque especial.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('matrix')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1.5"
            >
              <span>Ver Matriz 12M</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenCsvImport}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Importar Fatura CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards for Selected Month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Card 1: Saldo Anterior */}
        <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm relative overflow-hidden">
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
              ? 'Abatido automaticamente nas saídas'
              : 'Soma à disponibilidade do mês'}
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

        {/* Card 5: Cartões no Mês */}
        <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Cartões de Crédito</span>
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono-numbers text-white">
            {formatBRL(current.cardTotal)}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  cardCommitmentRate > 40 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, cardCommitmentRate)}%` }}
              />
            </div>
            <span className="text-[10px] font-mono-numbers text-zinc-400">
              {cardCommitmentRate}% da renda
            </span>
          </div>
        </div>

      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Curva de Recuperação Fiscal (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Curva de Recuperação Fiscal (Rolling Forecast 12 Meses)
              </h2>
              <p className="text-xs text-zinc-400">
                Barras de Entradas vs Saídas com linha contínua da evolução do Saldo Acumulado
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Entradas
              </span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2.5 h-2.5 rounded bg-rose-500/80 inline-block" /> Saídas
              </span>
              <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> Saldo Final
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => formatCompactBRL(val)}
                />
                <Tooltip content={<CustomCashflowTooltip />} />
                <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Saidas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} opacity={0.85} />
                <Line
                  type="monotone"
                  dataKey="SaldoAcumulado"
                  stroke="#34d399"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#09090b' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Descompressão de Faturas de Cartão (1 col) */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                Descompressão dos Cartões
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Queda natural das faturas conforme os parcelamentos atuais terminam
            </p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={decompressionSeries} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="label" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#71717a"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => formatCompactBRL(val)}
                  />
                  <Tooltip content={<CustomDecompressionTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="installments"
                    stackId="1"
                    stroke="#818cf8"
                    fill="#6366f1"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="subscriptions"
                    stackId="1"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.4}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Decompression Key Stat */}
          <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-zinc-400 block text-[11px]">Alívio até o fim do ano:</span>
              <span className="text-emerald-400 font-extrabold font-mono-numbers text-sm">
                +{formatBRL(decompressionSeries[decompressionSeries.length - 1]?.savingsVsFirstMonth || 0)} / mês
              </span>
            </div>
            <button
              onClick={() => setActiveTab('cards')}
              className="text-indigo-400 hover:text-indigo-300 font-medium text-xs flex items-center gap-1"
            >
              Ver Detalhes <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* Quick Alerts & Subscriptions Audit Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card: Auditoria de Itens ⚠️ Verificar */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Auditoria de Faturas ({pendingReviewItems.length} pendentes)
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              ⚠️ Verificar
            </span>
          </div>
          <p className="text-xs text-zinc-400 mb-3">
            Cobranças atípicas, assinaturas não reconhecidas ou compras pendentes de conferência:
          </p>

          {pendingReviewItems.length === 0 ? (
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-center text-xs text-emerald-400 flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Nenhum item pendente de auditoria no momento!
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {pendingReviewItems.map((tx) => (
                <div
                  key={tx.id}
                  className="p-2.5 rounded-xl bg-zinc-950/70 border border-amber-500/20 flex items-center justify-between text-xs"
                >
                  <div className="truncate mr-2">
                    <span className="font-semibold text-zinc-200 block truncate">{tx.description}</span>
                    <span className="text-[10px] text-zinc-400">
                      {tx.category} • {formatBRL(tx.installmentAmount)}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleCardTransactionReview(tx.id)}
                    className="shrink-0 text-[10px] px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 transition"
                    title="Remover marcação de verificação"
                  >
                    Resolvido
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card: Raio-X de Assinaturas Recorrentes */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Raio-X de Assinaturas Fixas
              </h3>
              <span className="text-xs font-mono-numbers font-bold text-emerald-400">
                {formatBRL(totalSubscriptionsThisMonth)} / mês
              </span>
            </div>
            <p className="text-xs text-zinc-400 mb-3">
              Total comprometido apenas com streamings, clubes, apps e licenças recorrentes nos cartões.
            </p>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {data.cardTransactions
                .filter((tx) => tx.type === 'recurring')
                .map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-zinc-950/40 text-xs border border-zinc-800/40"
                  >
                    <span className="text-zinc-300 truncate mr-2">{sub.description}</span>
                    <span className="font-mono-numbers text-zinc-200 font-semibold shrink-0">
                      {formatBRL(sub.installmentAmount)}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 mt-3 pt-2 border-t border-zinc-800">
            Dica: Cancelar 2 assinaturas que você pouco usa libera até R$ 900/ano no caixa livre.
          </p>
        </div>

        {/* Card: Orçamento Variável & Envelopes Resumo */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-amber-400" />
                Tetos do Mês ({current.label})
              </h3>
              <span className="text-xs font-mono-numbers font-bold text-zinc-300">
                {formatBRL(current.variableEnvelopes)}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mb-3">
              Mercado, iFood, Uber e outros gastos do dia a dia orçados:
            </p>

            <div className="space-y-2.5">
              {data.budgetEnvelopes.map((env) => {
                const logs = data.variableExpenseLogs.filter(
                  (l) => l.categoryId === env.id && l.month === current.month
                );
                const spent = logs.reduce((acc, curr) => acc + curr.amount, 0);
                const pct = Math.round((spent / env.targetAmount) * 100);
                return (
                  <div key={env.id} className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-300 font-medium">{env.name}</span>
                      <span className="font-mono-numbers text-zinc-400">
                        {formatBRL(spent)} / {formatBRL(env.targetAmount)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct > 100 ? 'bg-rose-500' : pct > 75 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('monthly')}
            className="mt-4 w-full py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition text-center"
          >
            Lançar Gastos do Dia a Dia →
          </button>
        </div>

      </div>
    </div>
  );
};
