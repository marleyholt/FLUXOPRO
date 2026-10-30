import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Building2,
  Home,
  PieChart,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  History,
  Edit2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  formatBRL,
  formatCompactBRL,
  getInstallmentInfo,
  getMonthDiff,
} from '../../utils/calculations';
import { Income } from '../../types/finance';
import { EditIncomeModal } from '../modals/EditIncomeModal';

interface MatrixTabProps {
  onOpenNewTransaction: () => void;
  onOpenCsvImport: () => void;
}

export const MatrixTab: React.FC<MatrixTabProps> = ({
  onOpenNewTransaction,
  onOpenCsvImport,
}) => {
  const { data, summaries, scopeFilter, selectedMonth, setSelectedMonth, vigenteMonth, setActiveTab } = useFinance();
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  const handleCellClick = (
    month: string,
    targetTab: 'monthly' | 'cards' | 'variables' | 'closing',
    elementId?: string
  ) => {
    setSelectedMonth(month);
    setActiveTab(targetTab);

    if (elementId) {
      setTimeout(() => {
        const el = document.getElementById(elementId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-emerald-400', 'ring-offset-2', 'ring-offset-zinc-950');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-emerald-400', 'ring-offset-2', 'ring-offset-zinc-950');
          }, 3000);
        }
      }, 120);
    }
  };

  // Accordion state
  const [openSections, setOpenSections] = useState({
    balance: true,
    incomes: true,
    allExpenses: true,
    pj: true,
    pf: true,
    envelopes: true,
    cards: true,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    setOpenSections({
      balance: true,
      incomes: true,
      allExpenses: true,
      pj: true,
      pf: true,
      envelopes: true,
      cards: true,
    });
  };

  const collapseAll = () => {
    setOpenSections({
      balance: true,
      incomes: false,
      allExpenses: false,
      pj: false,
      pf: false,
      envelopes: false,
      cards: false,
    });
  };

  // Cell crosshair hover state
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);

  const getCellHoverClass = (rowId: string, month: string) => {
    const isRowHovered = hoveredRow === rowId;
    const isColHovered = hoveredCol === month;
    if (isRowHovered && isColHovered) {
      return 'bg-emerald-500/20 text-emerald-200 font-bold outline outline-1 outline-emerald-500/40 z-10';
    }
    if (isRowHovered || isColHovered) {
      return 'bg-zinc-800/70';
    }
    return '';
  };

  // Filtered lists
  // Horizon view state: 3 (trimestral), 6 (semestral), 12 (anual)
  const [horizonMonths, setHorizonMonths] = useState<number>(12);

  const displayedSummaries = summaries.slice(0, horizonMonths);

  const filteredIncomes = data.incomes.filter(
    (inc) => scopeFilter === 'ALL' || inc.scope === scopeFilter
  );

  const filteredPjExpenses = data.expenses.filter(
    (exp) => exp.scope === 'PJ' && exp.frequency !== 'single' && (scopeFilter === 'ALL' || scopeFilter === 'PJ')
  );

  const filteredPfExpenses = data.expenses.filter(
    (exp) => exp.scope === 'PF' && exp.frequency !== 'single' && (scopeFilter === 'ALL' || scopeFilter === 'PF')
  );

  const filteredCards = data.creditCards.filter(
    (c) => scopeFilter === 'ALL' || c.scope === scopeFilter
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Matrix Controls & Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-xl bg-zinc-900/90 border border-zinc-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Matriz de Fluxo de Caixa
          </h2>
          <p className="text-xs text-zinc-400">
            Visão consolidada mês a mês. O saldo de cada mês alimenta automaticamente o próximo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 3 Botões Discretos de Horizonte Temporal (Trimestral, Semestral, Anual) */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setHorizonMonths(3)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                horizonMonths === 3
                  ? 'bg-emerald-500 text-zinc-950 font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Trimestral (3M)
            </button>
            <button
              onClick={() => setHorizonMonths(6)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                horizonMonths === 6
                  ? 'bg-emerald-500 text-zinc-950 font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Semestral (6M)
            </button>
            <button
              onClick={() => setHorizonMonths(12)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                horizonMonths === 12
                  ? 'bg-emerald-500 text-zinc-950 font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Anual (12M)
            </button>
          </div>

          <button
            onClick={expandAll}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
          >
            Expandir Tudo
          </button>
          <button
            onClick={collapseAll}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
          >
            Recolher
          </button>
        </div>
      </div>

      {/* Main Responsive Horizontal Table */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/80 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            {/* Table Header: Month Columns */}
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/90 text-xs">
                <th className="sticky left-0 z-20 bg-zinc-900 py-3 px-4 font-bold text-zinc-300 w-72 min-w-[280px] shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                  Estrutura de Contas / Linhas
                </th>
                {displayedSummaries.map((s) => {
                  const isSelected = s.month === selectedMonth;
                  const isVigente = s.month === vigenteMonth;
                  return (
                    <th
                      key={s.month}
                      onClick={() => setSelectedMonth(s.month)}
                      className={`py-3 px-3 text-right font-bold transition cursor-pointer select-none min-w-[110px] ${
                        isVigente
                          ? 'bg-emerald-500/20 text-emerald-200 ring-2 ring-emerald-400 ring-inset z-10'
                          : isSelected
                          ? 'bg-emerald-500/10 text-emerald-300 border-b-2 border-emerald-400'
                          : 'text-zinc-300 hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="text-[11px] font-semibold flex items-center justify-end gap-1">
                        {isVigente && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 text-[9px] font-extrabold border border-emerald-400/40 shrink-0">
                            ⭐ Vigente
                          </span>
                        )}
                        <span>{s.label}</span>
                        {data.monthlyClosings?.[s.month]?.isClosed && (
                          <span title="Mês Fechado e Bloqueado" className="text-[10px]">🔒</span>
                        )}
                      </div>

                      <div
                        className={`text-[10px] font-mono-numbers mt-0.5 ${
                          s.finalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatCompactBRL(s.finalBalance)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="text-xs divide-y divide-zinc-900">
              
              {/* 1. SEÇÃO FIXA NO TOPO: BALANÇO DO MÊS */}
              <tr className="bg-zinc-900/95 font-bold border-b border-zinc-800 text-sm">
                <td className="sticky left-0 z-10 bg-zinc-900/95 py-3 px-4 text-white flex items-center justify-between shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span>BALANÇO FINAL DO MÊS</span>
                  </div>
                </td>
                {displayedSummaries.map((s) => {
                  const isSelected = s.month === selectedMonth;
                  return (
                    <td
                      key={s.month}
                      onClick={() => handleCellClick(s.month, 'monthly')}
                      title={`Clique para ir para Previsão & Controle (${s.label})`}
                      className={`py-3 px-3 text-right font-mono-numbers font-extrabold cursor-pointer transition hover:bg-emerald-500/20 ${
                        isSelected ? 'bg-emerald-500/10' : ''
                      } ${s.finalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {formatBRL(s.finalBalance)}
                    </td>
                  );
                })}
              </tr>

              {/* Linha Fixa: Saldo Inicial / Abertura de Mês */}
              <tr className="bg-zinc-900/60 font-semibold border-b border-zinc-800 text-xs">
                <td className="sticky left-0 z-10 bg-zinc-900/90 py-2.5 px-4 text-zinc-300 flex items-center justify-between shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-zinc-400" />
                    <span>SALDO INICIAL (ABERTURA DO MÊS)</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-normal">Início</span>
                </td>
                {displayedSummaries.map((s) => {
                  const isNeg = s.previousBalance < 0;
                  return (
                    <td
                      key={s.month}
                      onClick={() => handleCellClick(s.month, 'closing')}
                      title={`Clique para ir para Abertura de Mês (${s.label})`}
                      className={`py-2.5 px-3 text-right font-mono-numbers font-bold cursor-pointer transition ${
                        isNeg
                          ? 'text-rose-400 bg-rose-950/20 hover:bg-rose-900/30 font-extrabold'
                          : s.previousBalance > 0
                          ? 'text-emerald-400 hover:bg-emerald-500/10'
                          : 'text-zinc-500 hover:bg-zinc-800/60'
                      }`}
                    >
                      {isNeg
                        ? `-${formatBRL(Math.abs(s.previousBalance))}`
                        : s.previousBalance > 0
                        ? `+${formatBRL(s.previousBalance)}`
                        : 'R$ 0,00'}
                    </td>
                  );
                })}
              </tr>

              {/* 2. SEÇÃO: ENTRADAS */}
              <tr
                onClick={() => toggleSection('incomes')}
                className="bg-zinc-900/60 hover:bg-zinc-900 cursor-pointer font-semibold text-zinc-200"
              >
                <td className="sticky left-0 z-10 bg-zinc-900/90 py-2.5 px-4 flex items-center justify-between shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    {openSections.incomes ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>ENTRADAS (RECEITAS)</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-normal">
                    {filteredIncomes.length} fontes
                  </span>
                </td>
                {displayedSummaries.map((s) => (
                  <td
                    key={s.month}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCellClick(s.month, 'variables');
                    }}
                    title={`Clique para ir para Receitas (${s.label})`}
                    className="py-2.5 px-3 text-right font-mono-numbers font-bold text-emerald-400 bg-zinc-900/40 cursor-pointer hover:bg-emerald-500/20 transition"
                  >
                    {formatBRL(s.totalIncome)}
                  </td>
                ))}
              </tr>

              {/* Incomes Details (if open) */}
              {openSections.incomes && (
                <>
                  {/* Linha de Saldo Mês Anterior */}
                  <tr className="text-zinc-300 hover:bg-zinc-900/30">
                    <td className="sticky left-0 z-10 bg-zinc-950 py-2 px-4 pl-9 text-zinc-300 font-medium shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center justify-between">
                        <span className="truncate block font-medium">
                          (+) Saldo Disponível Mês Anterior
                        </span>
                        <span className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-400">
                          Início
                        </span>
                      </div>
                    </td>
                    {displayedSummaries.map((s) => (
                      <td
                        key={s.month}
                        onClick={() => handleCellClick(s.month, 'closing')}
                        title={`Clique para ir para Abertura de Mês (${s.label})`}
                        className={`py-2 px-3 text-right font-mono-numbers cursor-pointer transition ${
                          s.previousBalance < 0
                            ? 'text-rose-400 font-extrabold bg-rose-950/30 hover:bg-rose-900/40'
                            : s.previousBalance > 0
                            ? 'text-emerald-400 hover:bg-emerald-500/10'
                            : 'text-zinc-500 hover:bg-zinc-800/60'
                        }`}
                      >
                        {s.previousBalance < 0
                          ? `-${formatBRL(Math.abs(s.previousBalance))}`
                          : s.previousBalance > 0
                          ? `+${formatBRL(s.previousBalance)}`
                          : 'R$ 0,00'}
                      </td>
                    ))}
                  </tr>

                  {/* Individual Incomes */}
                  {filteredIncomes.map((inc) => (
                    <tr key={inc.id} className="text-zinc-300 hover:bg-zinc-900/30 group">
                      <td className="sticky left-0 z-10 bg-zinc-950 py-2 px-4 pl-9 text-zinc-300 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate" title={inc.title}>{inc.title}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingIncome(inc);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition shrink-0"
                              title={`Editar receita "${inc.title}"`}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-400 shrink-0">
                            {inc.scope}
                          </span>
                        </div>
                      </td>
                      {displayedSummaries.map((s) => {
                        let amount = 0;
                        if (inc.type === 'fixed') {
                          const diffFromStart = getMonthDiff(inc.startMonth || '2025-12', s.month);
                          const diffFromEnd = inc.endMonth ? getMonthDiff(s.month, inc.endMonth) : 0;
                          if (diffFromStart >= 0 && (!inc.endMonth || diffFromEnd >= 0)) {
                            amount = inc.amount;
                          }
                        } else if (inc.type === 'variable') {
                          if (inc.month === s.month) {
                            amount = inc.amount;
                          }
                        }
                        return (
                          <td
                            key={s.month}
                            onClick={() => handleCellClick(s.month, 'variables', `income-${inc.id}`)}
                            title={`Clique para ir até "${inc.title}" em Receitas (${s.label})`}
                            onMouseEnter={() => {
                              setHoveredRow(inc.id);
                              setHoveredCol(s.month);
                            }}
                            onMouseLeave={() => {
                              setHoveredRow(null);
                              setHoveredCol(null);
                            }}
                            className={`py-2 px-3 text-right font-mono-numbers cursor-pointer transition ${getCellHoverClass(
                              inc.id,
                              s.month
                            )} ${amount > 0 ? 'text-zinc-200' : 'text-zinc-400'}`}
                          >
                            {amount > 0 ? formatBRL(amount) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              )}

              {/* 3. SEÇÃO PRINCIPAL DESTACADA: DESPESA TOTAL DO MÊS */}
              <tr
                onClick={() => toggleSection('allExpenses')}
                className="bg-rose-950/40 hover:bg-rose-950/60 cursor-pointer font-bold border-y-2 border-rose-500/40 text-rose-200"
              >
                <td className="sticky left-0 z-10 bg-zinc-950 py-3 px-4 flex items-center justify-between shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-2 text-rose-400 font-extrabold text-xs tracking-wide">
                    {openSections.allExpenses ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <TrendingDown className="w-4 h-4" />
                    <span>DESPESA TOTAL DO MÊS (TODAS AS SAÍDAS)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                    Consolidado
                  </span>
                </td>
                {displayedSummaries.map((s) => (
                  <td
                    key={s.month}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCellClick(s.month, 'monthly');
                    }}
                    title={`Clique para ir para Previsão & Controle (${s.label})`}
                    className="py-3 px-3 text-right font-mono-numbers font-extrabold text-rose-400 text-sm bg-rose-950/20 cursor-pointer hover:bg-rose-900/40 transition"
                  >
                    {formatBRL(s.totalExpenses)}
                  </td>
                ))}
              </tr>

              {/* Linha Automática de Cheque Especial (Juros e IOF Provisionados) */}
              <tr className="bg-rose-950/25 text-rose-300 hover:bg-rose-950/40 border-b border-rose-950/60">
                <td className="sticky left-0 z-10 bg-zinc-950 py-2.5 px-4 pl-6 text-rose-400 font-semibold shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between">
                    <span className="truncate block font-bold text-xs flex items-center gap-1.5">
                      <span>(⚠️) Projeção de Juros & IOF (Cheque Especial)</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Encargos
                    </span>
                  </div>
                </td>
                {displayedSummaries.map((s) => (
                  <td
                    key={s.month}
                    onClick={() => handleCellClick(s.month, 'closing')}
                    title={`Clique para ir para Abertura de Mês (${s.label})`}
                    className={`py-2.5 px-3 text-right font-mono-numbers cursor-pointer transition ${
                      s.overdraftCover > 0
                        ? 'text-rose-400 font-bold bg-rose-950/40 hover:bg-rose-900/60'
                        : 'text-zinc-500 hover:bg-zinc-800/60'
                    }`}
                  >
                    {s.overdraftCover > 0 ? formatBRL(s.overdraftCover) : '-'}
                  </td>
                ))}
              </tr>

              {/* Submenus da Despesa Total */}
              {openSections.allExpenses && (
                <>
                  {/* SEÇÃO: CATEGORIAS & ENVELOPES DE DESPESAS (CONSOLIDADO) */}
                  <tr
                    onClick={() => toggleSection('envelopes')}
                    className="bg-zinc-900/60 hover:bg-zinc-900 cursor-pointer font-semibold text-zinc-200"
                  >
                    <td className="sticky left-0 z-10 bg-zinc-900/90 py-2.5 px-4 flex items-center justify-between shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center gap-2 text-amber-400 font-bold">
                        {openSections.envelopes ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <PieChart className="w-3.5 h-3.5" />
                        <span>CATEGORIAS & ENVELOPES DE DESPESAS (CONTAS & ENVELOPES)</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-normal">
                        {data.budgetEnvelopes.length} categorias
                      </span>
                    </td>
                    {displayedSummaries.map((s) => (
                      <td
                        key={s.month}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCellClick(s.month, 'monthly');
                        }}
                        title={`Clique para ir para Previsão & Controle (${s.label})`}
                        className="py-2.5 px-3 text-right font-mono-numbers font-bold text-amber-400 bg-zinc-900/40 cursor-pointer hover:bg-amber-500/20 transition"
                      >
                        {formatBRL(s.variableEnvelopes)}
                      </td>
                    ))}
                  </tr>

                  {openSections.envelopes && (() => {
                    // Collect registered envelopes and any extra custom categories present in logs or card transactions
                    const envelopeList: Array<{ id: string; name: string; targetAmount: number; subItems?: any[]; isExtra?: boolean }> = [
                      ...data.budgetEnvelopes.map((e) => ({ ...e, isExtra: false })),
                    ];

                    const registeredNames = new Set(data.budgetEnvelopes.map((e) => e.name.trim().toLowerCase()));
                    const registeredIds = new Set(data.budgetEnvelopes.map((e) => e.id));

                    // Discover extra categories
                    const extraCategoryNames = new Set<string>();
                    data.variableExpenseLogs.forEach((l) => {
                      if (l.categoryId) {
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
                          extraCategoryNames.add(cat);
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

                    const renderedEnvelopes = envelopeList.map((env) => (
                      <tr key={env.id} className="text-zinc-300 hover:bg-zinc-900/30">
                        <td className="sticky left-0 z-10 bg-zinc-950 py-2 px-4 pl-9 text-zinc-300 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                          <div className="flex items-center justify-between">
                            <span className="truncate flex items-center gap-1.5">
                              <span>{env.name}</span>
                              {env.isExtra && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                                  Cartão/Extra
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono-numbers">
                              (Teto: {formatBRL(env.targetAmount)})
                            </span>
                          </div>
                        </td>
                        {displayedSummaries.map((s) => {
                          const lowerName = env.name.trim().toLowerCase();

                          // Active fixed/installment expenses in this category for s.month
                          const activeCategoryExpenses = data.expenses.filter((exp) => {
                            let isActive = false;
                            const mIdx = parseInt(s.month.split('-')[1], 10);
                            if (exp.frequency === 'fixed') {
                              const startDiff = getMonthDiff(exp.startMonth, s.month);
                              const endDiff = exp.endMonth ? getMonthDiff(s.month, exp.endMonth) : 0;
                              isActive = startDiff >= 0 && (!exp.endMonth || endDiff >= 0);
                            } else if (exp.frequency === 'installment' && exp.installmentsCount) {
                              isActive = getInstallmentInfo(exp.startMonth, exp.installmentsCount, s.month).isActive;
                            } else if (exp.frequency === 'periodic' && exp.periodicMonths) {
                              isActive = getMonthDiff(exp.startMonth, s.month) >= 0 && exp.periodicMonths.includes(mIdx);
                            } else if (exp.frequency === 'single') {
                              isActive = exp.singleMonth === s.month || exp.startMonth === s.month;
                            }
                            const matchesCategory =
                              exp.category.trim().toLowerCase() === lowerName || exp.category === env.id;
                            return isActive && matchesCategory;
                          });
                          const expSum = activeCategoryExpenses.reduce((acc, curr) => acc + curr.amount, 0);

                          // Variable Expense Logs
                          const logs = data.variableExpenseLogs.filter(
                            (l) =>
                              l.month === s.month &&
                              (l.categoryId === env.id || l.categoryId.trim().toLowerCase() === lowerName)
                          );
                          const logged = logs.reduce((acc, curr) => acc + curr.amount, 0);

                          // Credit Card Transactions classified under this category/envelope
                          const cardTx = data.cardTransactions.filter((tx) => {
                            if (tx.isPaused) return false;
                            const matches =
                              tx.category.trim().toLowerCase() === lowerName || tx.category === env.id;
                            if (!matches) return false;

                            if (tx.type === 'recurring') return getMonthDiff(tx.startMonth, s.month) >= 0;
                            if (tx.type === 'installment') return getInstallmentInfo(tx.startMonth, tx.totalInstallments, s.month).isActive;
                            if (tx.type === 'single') return tx.startMonth === s.month;
                            return false;
                          });
                          const cardTotal = cardTx.reduce((acc, curr) => acc + curr.installmentAmount, 0);

                          const totalSpent = expSum + logged + cardTotal;

                          const activeSubItems = (env.subItems || []).filter((sub: any) => {
                            if (sub.startMonth && getMonthDiff(sub.startMonth, s.month) < 0) {
                              return false;
                            }
                            if (sub.endMonth && getMonthDiff(s.month, sub.endMonth) < 0) {
                              return false;
                            }
                            return true;
                          });

                          const subItemsSum = env.subItems && env.subItems.length > 0
                            ? activeSubItems.reduce((acc: number, curr: any) => acc + curr.amount, 0)
                            : 0;
                          const baseTarget = env.subItems && env.subItems.length > 0 ? subItemsSum : env.targetAmount;
                          const target = baseTarget + expSum;

                          const effective = Math.max(target, totalSpent);
                          const isOverflow = totalSpent > target;

                          const isVigente = s.month === vigenteMonth;
                          const isFuture = s.month > vigenteMonth;
                          const isPast = s.month < vigenteMonth;

                          return (
                            <td
                              key={s.month}
                              onClick={() => handleCellClick(s.month, 'monthly', `envelope-${env.id}`)}
                              title={`Clique para destacar a categoria "${env.name}" em Previsão & Controle (${s.label})`}
                              onMouseEnter={() => {
                                setHoveredRow(env.id);
                                setHoveredCol(s.month);
                              }}
                              onMouseLeave={() => {
                                setHoveredRow(null);
                                setHoveredCol(null);
                              }}
                              className={`py-2 px-3 text-right font-mono-numbers cursor-pointer transition ${
                                s.month === vigenteMonth ? 'bg-emerald-950/20 border-x border-emerald-500/20' : ''
                              } ${getCellHoverClass(
                                env.id,
                                s.month
                              )} ${isVigente && totalSpent > target ? 'text-rose-400 font-bold' : isOverflow && isPast ? 'text-rose-400 font-bold' : 'text-zinc-300'}`}
                            >
                              {isVigente ? (
                                totalSpent > target ? (
                                  <>
                                    <div className="font-bold text-rose-400 text-xs">
                                      {formatBRL(totalSpent)}
                                    </div>
                                    <div className="text-[9px] text-zinc-400 font-normal mt-0.5">
                                      Previsto: {formatBRL(target)}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="font-bold text-amber-300 text-xs">
                                      {formatBRL(target)}
                                    </div>
                                    <div className="text-[9px] text-zinc-400 font-medium mt-0.5">
                                      Real: {formatBRL(totalSpent)}
                                      {cardTotal > 0 && <span className="text-indigo-400 ml-1">💳</span>}
                                    </div>
                                  </>
                                )
                              ) : isFuture ? (
                                <>
                                  <div className="font-bold text-amber-300 text-xs">
                                    {formatBRL(target)}
                                  </div>
                                  <div className="text-[9px] text-zinc-400 font-medium mt-0.5">
                                    Real: {formatBRL(totalSpent)}
                                    {cardTotal > 0 && <span className="text-indigo-400 ml-1">💳</span>}
                                  </div>
                                </>
                              ) : (
                                <>
                                  {formatBRL(effective)}
                                  {totalSpent > 0 && (
                                    <span className="block text-[9px] text-zinc-400">
                                      Real: {formatBRL(totalSpent)}
                                      {cardTotal > 0 && <span className="text-indigo-400 ml-1">💳</span>}
                                    </span>
                                  )}
                                </>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ));

                    const hasUnmappedInAnyMonth = summaries.some(
                      (s) => Object.values(s.cardUnmappedDiffByCard).reduce((a, b) => a + b, 0) > 0
                    );

                    return (
                      <>
                        {renderedEnvelopes}
                        {hasUnmappedInAnyMonth && (
                          <tr className="text-zinc-300 hover:bg-zinc-900/30 border-t border-zinc-900">
                            <td className="sticky left-0 z-10 bg-zinc-950 py-2 px-4 pl-9 text-indigo-300 font-medium shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                              <div className="flex items-center justify-between">
                                <span className="truncate flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                                  <span>💳 Compras de Cartão a Classificar</span>
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono-numbers">
                                  (Diferença/Projeção)
                                </span>
                              </div>
                            </td>
                            {displayedSummaries.map((s) => {
                              const unmapped = Object.values(s.cardUnmappedDiffByCard).reduce((a, b) => a + b, 0);
                              return (
                                <td
                                  key={s.month}
                                  onClick={() => handleCellClick(s.month, 'cards')}
                                  title={`Clique para ir até Central de Cartões em ${s.label} e classificar itens`}
                                  className="py-2 px-3 text-right font-mono-numbers text-indigo-300 font-semibold cursor-pointer hover:bg-indigo-950/30 transition"
                                >
                                  {unmapped > 0 ? formatBRL(unmapped) : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        )}
                      </>
                    );
                  })()}
                </>
              )}

              {/* 6. SEÇÃO: CARTÕES DE CRÉDITO */}
              <tr
                onClick={() => toggleSection('cards')}
                className="bg-zinc-900/60 hover:bg-zinc-900 cursor-pointer font-semibold text-zinc-200"
              >
                <td className="sticky left-0 z-10 bg-zinc-900/90 py-2.5 px-4 flex items-center justify-between shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold">
                    {openSections.cards ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>CARTÕES DE CRÉDITO (FATURAS TOTAIS)</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-normal">
                    {filteredCards.length} cartões
                  </span>
                </td>
                {displayedSummaries.map((s) => (
                  <td
                    key={s.month}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCellClick(s.month, 'cards');
                    }}
                    title={`Clique para abrir Central de Cartões em ${s.label}`}
                    className="py-2.5 px-3 text-right font-mono-numbers font-bold text-white bg-zinc-900/40 cursor-pointer hover:bg-indigo-950/40 transition"
                  >
                    {formatBRL(s.cardTotal)}
                  </td>
                ))}
              </tr>

              {/* Individual Cards & Unmapped differences */}
              {openSections.cards &&
                filteredCards.map((card) => (
                  <tr key={card.id} className="text-zinc-300 hover:bg-zinc-900/30">
                    <td className="sticky left-0 z-10 bg-zinc-950 py-2 px-4 pl-9 text-zinc-300 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: card.color }}
                          />
                          <span className="truncate">{card.name}</span>
                        </div>
                        <span className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-400">
                          Venc. {card.dueDay}
                        </span>
                      </div>
                    </td>
                    {displayedSummaries.map((s) => {
                      const total = s.cardTotalsByCard[card.id] || 0;
                      const diff = s.cardUnmappedDiffByCard[card.id] || 0;
                      return (
                        <td
                          key={s.month}
                          onClick={() => handleCellClick(s.month, 'cards', `card-${card.id}`)}
                          title={`Clique para ir até o cartão "${card.name}" em ${s.label}`}
                          onMouseEnter={() => {
                            setHoveredRow(card.id);
                            setHoveredCol(s.month);
                          }}
                          onMouseLeave={() => {
                            setHoveredRow(null);
                            setHoveredCol(null);
                          }}
                          className={`py-2 px-3 text-right font-mono-numbers cursor-pointer transition ${getCellHoverClass(
                            card.id,
                            s.month
                          )} text-zinc-200`}
                        >
                          {total > 0 ? formatBRL(total) : '-'}
                          {diff > 0 && (
                            <span className="block text-[9px] text-amber-400">
                              (+{formatBRL(diff)} dif.)
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}


            </tbody>
          </table>
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
