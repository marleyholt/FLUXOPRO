import React, { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Zap,
  ArrowRight,
  DollarSign,
  Percent,
  Calendar,
  Sparkles,
  Building2,
  CreditCard as CreditCardIcon,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatBRL } from '../../utils/calculations';

export const SimulationTab: React.FC = () => {
  const { data, summaries, currentMonthSummary } = useFinance();

  const current = currentMonthSummary || summaries[0];

  // Simulação Interativa - Estados
  const [simulatedDebtAmount, setSimulatedDebtAmount] = useState<number>(5000);
  const [simulatedExtraMonthlySavings, setSimulatedExtraMonthlySavings] = useState<number>(400);

  // Encontra bancos e cartões com suas taxas cadastradas
  const banksWithFreeDays = (data.bankAccounts || []).filter((b) => b.overdraftFreeDays > 0);
  const bestFreeDaysBank = banksWithFreeDays.sort((a, b) => b.overdraftFreeDays - a.overdraftFreeDays)[0] || {
    name: 'Santander',
    overdraftFreeDays: 10,
    overdraftRateMonthly: 8.0,
  };

  const highestCardRate = Math.max(
    ...data.creditCards.map((c) => c.rotativoRateMonthly || 14.5),
    14.5
  );

  const averageOverdraftRate =
    (data.bankAccounts || []).length > 0
      ? (data.bankAccounts || []).reduce((acc, curr) => acc + (curr.overdraftRateMonthly || 8.0), 0) /
        (data.bankAccounts || []).length
      : 8.0;

  // Cálculos da Estratégia 1: Uso Tático dos Dias Grátis
  // Se o usuário paga a fatura com o cheque especial e cobre antes do prazo grátis
  const rotativoMonthlyCost = simulatedDebtAmount * (highestCardRate / 100);
  const freeDaysSavingsMonthly = rotativoMonthlyCost;
  const freeDaysSavingsAnnual = freeDaysSavingsMonthly * 12;

  // Cálculos da Estratégia 2: Troca de Dívida Cara por Barata (12 Meses)
  // 1. Manter no Rotativo do Cartão (~14.5% a.m.)
  const rotativoAnnualCompound = simulatedDebtAmount * Math.pow(1 + highestCardRate / 100, 12);
  const rotativoTotalInterest = rotativoAnnualCompound - simulatedDebtAmount;

  // 2. Cheque Especial (~8.0% a.m.)
  const overdraftAnnualCompound = simulatedDebtAmount * Math.pow(1 + averageOverdraftRate / 100, 12);
  const overdraftTotalInterest = overdraftAnnualCompound - simulatedDebtAmount;

  // 3. Empréstimo Consignado / Parcelado Renegociado (~2.2% a.m.)
  const cheapLoanRate = 2.2;
  const cheapLoanAnnualCompound = simulatedDebtAmount * Math.pow(1 + cheapLoanRate / 100, 12);
  const cheapLoanTotalInterest = cheapLoanAnnualCompound - simulatedDebtAmount;

  // Economia direta trocando Rotativo por Empréstimo Barato
  const debtSwapSavings = rotativoTotalInterest - cheapLoanTotalInterest;

  // Cálculos da Estratégia 3: Aceleração da Amortização com Aporte Extra
  const monthsToZeroWithoutExtra = Math.ceil(simulatedDebtAmount / Math.max(100, simulatedDebtAmount * 0.05));
  const monthsToZeroWithExtra = Math.ceil(
    simulatedDebtAmount / (Math.max(100, simulatedDebtAmount * 0.05) + simulatedExtraMonthlySavings)
  );
  const monthsSaved = Math.max(0, monthsToZeroWithoutExtra - monthsToZeroWithExtra);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-teal-950/80 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            Simulador Estratégico de Redução de Juros & Dívidas
          </h2>
          <p className="text-xs text-emerald-200/90 mt-1 max-w-2xl">
            Descubra como reduzir drasticamente os juros bancários usando as regras do seu banco a seu favor, como os dias grátis de cheque especial e a troca de dívida cara por barata.
          </p>
        </div>

        <div className="px-4 py-2.5 rounded-xl bg-black/40 border border-emerald-500/30 self-start md:self-auto text-xs font-mono-numbers">
          <span className="text-zinc-400 block text-[11px]">Taxa do Rotativo do seu Cartão</span>
          <strong className="text-rose-400 text-base">{highestCardRate.toFixed(1)}% a.m.</strong>{' '}
          <span className="text-zinc-400 text-[10px]">(~{((Math.pow(1 + highestCardRate / 100, 12) - 1) * 100).toFixed(0)}% a.a.)</span>
        </div>
      </div>

      {/* PAINEL DE CONTROLE DA SIMULAÇÃO */}
      <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Ajuste os Valores para Simular o seu Cenário Real
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Slider 1: Valor da Fatura / Dívida */}
          <div className="space-y-2 p-4 rounded-xl bg-zinc-950 border border-zinc-850">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-zinc-300">Valor da Fatura ou Dívida em Aberto</label>
              <strong className="text-base text-emerald-400 font-mono-numbers">
                {formatBRL(simulatedDebtAmount)}
              </strong>
            </div>
            <input
              type="range"
              min="500"
              max="40000"
              step="500"
              value={simulatedDebtAmount}
              onChange={(e) => setSimulatedDebtAmount(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono-numbers">
              <span>R$ 500</span>
              <span>R$ 20.000</span>
              <span>R$ 40.000</span>
            </div>
          </div>

          {/* Slider 2: Aporte Extra Mensal */}
          <div className="space-y-2 p-4 rounded-xl bg-zinc-950 border border-zinc-850">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-zinc-300">Quanto Você Consegue Poupar a Mais p/ Amortizar?</label>
              <strong className="text-base text-indigo-400 font-mono-numbers">
                {formatBRL(simulatedExtraMonthlySavings)}/mês
              </strong>
            </div>
            <input
              type="range"
              min="100"
              max="3000"
              step="100"
              value={simulatedExtraMonthlySavings}
              onChange={(e) => setSimulatedExtraMonthlySavings(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono-numbers">
              <span>R$ 100/mês</span>
              <span>R$ 1.500/mês</span>
              <span>R$ 3.000/mês</span>
            </div>
          </div>
        </div>
      </div>

      {/* ESTRATÉGIA 1: DIAS GRÁTIS DO CHEQUE ESPECIAL */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4 relative overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Estratégia Recomendada #1
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                Estratégia Tática: Uso dos Dias Grátis do Cheque Especial
              </h3>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-zinc-400 block">Economia Estimada</span>
            <strong className="text-xl text-emerald-400 font-mono-numbers">
              {formatBRL(freeDaysSavingsMonthly)} <span className="text-xs font-normal text-zinc-400">/mês</span>
            </strong>
          </div>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          Se você tem um banco que concede <strong>{bestFreeDaysBank.overdraftFreeDays} dias sem juros</strong> (como o {bestFreeDaysBank.name}), você pode pagar a fatura do cartão à vista usando o limite de cheque especial no dia do vencimento. Ao cobrir a conta dentro do prazo de {bestFreeDaysBank.overdraftFreeDays} dias (por exemplo, quando entrar sua receita no início do mês), você paga <strong>ZERO de juros do rotativo</strong> e <strong>ZERO de juros do cheque especial</strong>!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-850">
            <span className="text-[11px] text-zinc-400 block">Juros no Rotativo ({highestCardRate}% a.m.)</span>
            <strong className="text-rose-400 font-mono-numbers text-sm block mt-0.5">
              +{formatBRL(rotativoMonthlyCost)} <span className="text-[10px] text-zinc-400 font-normal">/mês</span>
            </strong>
            <span className="text-[10px] text-rose-300/70 block mt-0.5">Se deixar a fatura rodar</span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-850">
            <span className="text-[11px] text-zinc-400 block">Juros no Cheque ({bestFreeDaysBank.overdraftFreeDays} dias grátis)</span>
            <strong className="text-emerald-400 font-mono-numbers text-sm block mt-0.5">
              R$ 0,00 <span className="text-[10px] text-zinc-400 font-normal">(Isento)</span>
            </strong>
            <span className="text-[10px] text-emerald-300/70 block mt-0.5">Cobriu antes do prazo grátis</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
            <span className="text-[11px] text-emerald-300 block font-semibold">Economia em 1 Ano</span>
            <strong className="text-emerald-400 font-mono-numbers text-base block mt-0.5">
              {formatBRL(freeDaysSavingsAnnual)}
            </strong>
            <span className="text-[10px] text-emerald-200/80 block mt-0.5">Dinheiro que fica na sua conta</span>
          </div>
        </div>
      </div>

      {/* ESTRATÉGIA 2: TROCA DE DÍVIDA CARA POR BARATA */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Estratégia #2: Portabilidade de Dívida
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                Troca de Dívida: Rotativo ➔ Crédito Parcelado / Consignado
              </h3>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-zinc-400 block">Economia em 12 Meses</span>
            <strong className="text-xl text-indigo-400 font-mono-numbers">
              {formatBRL(debtSwapSavings)}
            </strong>
          </div>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          O rotativo do cartão de crédito é a linha mais cara do Brasil ({highestCardRate}% a.m.). Nunca permaneça no rotativo por mais de 30 dias! Se não for possível cobrir a conta no prazo dos dias grátis, faça a contratação de uma linha de crédito pessoal ou consignado ({cheapLoanRate}% a.m.) para quitar o rotativo à vista.
        </p>

        {/* Comparativo de Juros em 12 Meses */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-4 rounded-xl bg-zinc-950 border border-rose-500/30 space-y-1">
            <span className="text-[10px] uppercase font-bold text-rose-400">1. Rotativo do Cartão</span>
            <span className="text-xs text-zinc-400 block font-mono-numbers">Taxa: {highestCardRate}% a.m.</span>
            <div className="pt-2">
              <span className="text-[10px] text-zinc-400 block">Juros Acumulados em 1 Ano:</span>
              <strong className="text-rose-400 font-mono-numbers text-base block">
                +{formatBRL(rotativoTotalInterest)}
              </strong>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/30 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-400">2. Cheque Especial</span>
            <span className="text-xs text-zinc-400 block font-mono-numbers">Taxa: {averageOverdraftRate.toFixed(1)}% a.m.</span>
            <div className="pt-2">
              <span className="text-[10px] text-zinc-400 block">Juros Acumulados em 1 Ano:</span>
              <strong className="text-amber-400 font-mono-numbers text-base block">
                +{formatBRL(overdraftTotalInterest)}
              </strong>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 space-y-1">
            <span className="text-[10px] uppercase font-bold text-indigo-300">3. Crédito Barato / Consignado</span>
            <span className="text-xs text-zinc-400 block font-mono-numbers">Taxa: {cheapLoanRate}% a.m.</span>
            <div className="pt-2">
              <span className="text-[10px] text-zinc-400 block">Juros Acumulados em 1 Ano:</span>
              <strong className="text-emerald-400 font-mono-numbers text-base block">
                +{formatBRL(cheapLoanTotalInterest)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ESTRATÉGIA 3: PLANO DE AÇÃO AVALANCHE / BOLA DE NEVE */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Método Avalanche: Ordem de Pagamento para Estancar Juros
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Priorize sempre quitar a dívida com a maior taxa de juros primeiro.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 font-semibold text-zinc-400 text-[11px]">
            <span>Prioridade de Quitação</span>
            <span>Tipo de Dívida / Linha</span>
            <span>Taxa Real</span>
            <span>Ação Recomendada</span>
          </div>

          <div className="flex items-center justify-between py-1.5 text-zinc-200">
            <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-300 font-bold flex items-center justify-center text-xs">
              1º
            </span>
            <strong className="text-white">Rotativo do Cartão de Crédito</strong>
            <span className="text-rose-400 font-mono-numbers font-bold">{highestCardRate}% a.m.</span>
            <span className="text-rose-300 font-semibold">Pagar Imediatamente ou Cobrir com Cheque</span>
          </div>

          <div className="flex items-center justify-between py-1.5 text-zinc-200">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs">
              2º
            </span>
            <strong className="text-white">Cheque Especial sem Dias Grátis</strong>
            <span className="text-amber-400 font-mono-numbers font-bold">{averageOverdraftRate.toFixed(1)}% a.m.</span>
            <span className="text-amber-300">Cobrir em até 10 dias com receitas</span>
          </div>

          <div className="flex items-center justify-between py-1.5 text-zinc-200">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-xs">
              3º
            </span>
            <strong className="text-white">Parcelamentos Fixos e Empréstimos</strong>
            <span className="text-emerald-400 font-mono-numbers font-bold">2.5% a 4.2% a.m.</span>
            <span className="text-emerald-300">Manter parcelas em dia normalmente</span>
          </div>
        </div>
      </div>
    </div>
  );
};
