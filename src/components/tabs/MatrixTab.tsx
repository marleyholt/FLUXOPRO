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
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  formatBRL,
  formatCompactBRL,
  getInstallmentInfo,
  getMonthDiff,
} from '../../utils/calculations';

interface MatrixTabProps {
  onOpenNewTransaction: () => void;
  onOpenCsvImport: () => void;
}

export const MatrixTab: React.FC<MatrixTabProps> = ({
  onOpenNewTransaction,
  onOpenCsvImport,
}) => {
  const { data, summaries, scopeFilter, selectedMonth, setSelectedMonth } = useFinance();

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

  // Filtered lists
  const filteredIncomes = data.incomes.filter(
    (inc) => scopeFilter === 'ALL' || inc.scope === scopeFilter
  );

  const filteredPjExpenses = data.expenses.filter(
    (exp) => exp.scope === 'PJ' && (scopeFilter === 'ALL' || scopeFilter === 'PJ')
  );

  const filteredPfExpenses = data.expenses.filter(
    (exp) => exp.scope === 'PF' && (scopeFilter === 'ALL' || scopeFilter === 'PF')
  );

  const filteredCards = data.creditCards.filter(
    (c) => scopeFilter === 'ALL' || c.scope === scopeFilter
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Matrix Controls & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-zinc-900/90 border border-zinc-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Matriz Anual de Fluxo de Caixa (Super Planilha)
          </h2>
          <p className="text-xs text-zinc-400">
            Visão consolidada mês a mês. O saldo de cada mês alimenta automaticamente o próximo.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
          <button
            onClick={onOpenNewTransaction}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Linha</span>
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
                {summaries.map((s) => {
                  const isSelected = s.month === selectedMonth;
                  return (
                    <th
                      key={s.month}
                      onClick={() => setSelectedMonth(s.month)}
                      className={`py-3 px-3 text-right font-bold transition cursor-pointer select-none min-w-[105px] ${
                        isSelected
                          ? 'bg-emerald-500/10 text-emerald-300 border-b-2 border-emerald-400'
                          : 'text-zinc-300 hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="text-[11px] font-semibold flex items-center justify-end gap-1">
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
                {summaries.map((s) => {
                  const isSelected = s.month === selectedMonth;
                  return (
                    <td
                      key={s.month}
                      className={`py-3 px-3 text-right font-mono-numbers font-extrabold ${
                        isSelected ? 'bg-emerald-500/10' : ''
                      } ${s.finalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {formatBRL(s.finalBalance)}
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
                {summaries.map((s) => (
                  <td
                    key={s.month}
                    className="py-2.5 px-3 text-right font-mono-numbers font-bold text-emerald-400 bg-zinc-900/40"
                  >
                    {formatBRL(s.totalIncome)}
                  </td>
                ))}
              </tr>

              {/* Incomes Details (if open) */}
              {openSections.incomes && (
                <>
                  {/* Linha de Saldo Mês Anterior */}
                  <tr className="text-zinc-400 hover:bg-zinc-900/30">
                    <td className="sticky left-0 z-10 bg-zinc-950 py-2 px-4 pl-9 text-zinc-300 font-medium shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                      <span className="truncate block">
                        (+) Saldo Disponível Mês Anterior
                      </span>
                    </td>
                    {summaries.map((s) => (
                      <td
                        key={s.month}
                        className="py-2 px-3 text-right font-mono-numbers text-zinc-400"
                      >
                        {s.previousBalance > 0 ? formatBRL(s.previousBalance) : 'R$ 0,00'}
                      </td>
                    ))}
                  </tr>

                  {/* Individual Incomes */}
                  {filteredIncomes.map((inc) => (
                    <tr key={inc.id} className="text-zinc-300 hover:bg-zinc-900/30">
                      <td className="sticky left-0 z-10 bg-zinc-950 py-2 px-4 pl-9 text-zinc-300 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{inc.title}</span>
                          <span className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-400 ml-1">
                            {inc.scope}
                          </span>
                        </div>
                      </td>
                      {summaries.map((s) => {
                        let amount = 0;
                        if (inc.type === 'fixed') {
                          if (getMonthDiff(inc.startMonth || '2025-12', s.month) >= 0) {
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
                            className={`py-2 px-3 text-right font-mono-numbers ${
                              amount > 0 ? 'text-zinc-200' : 'text-zinc-400'
                            }`}
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
                {summaries.map((s) => (
                  <td
                    key={s.month}
                    className="py-3 px-3 text-right font-mono-numbers font-extrabold text-rose-400 text-sm bg-rose-950/20"
                  >
                    {formatBRL(s.totalExpenses)}
                  </td>
                ))}
              </tr>

              {/* Submenus da Despesa Total */}
              {openSections.allExpenses && (
                <>
                  {/* 3.1 SUBMENU: SAÍDAS PJ */}
                  {(scopeFilter === 'ALL' || scopeFilter === 'PJ') && (
                    <>
                      <tr
                        onClick={() => toggleSection('pj')}
                        className="bg-zinc-900/40 hover:bg-zinc-900 cursor-pointer font-semibold text-zinc-300 pl-4 border-l-2 border-indigo-500"
                      >
                        <td className="sticky left-0 z-10 bg-zinc-950 py-2.5 px-4 pl-8 flex items-center justify-between shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                            {openSections.pj ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                            <Building2 className="w-3.5 h-3.5" />
                            <span>↳ Saídas PJ (Empresa)</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-normal">
                            {filteredPjExpenses.length} obrigações
                          </span>
                        </td>
                        {summaries.map((s) => (
                          <td
                            key={s.month}
                            className="py-2.5 px-3 text-right font-mono-numbers font-semibold text-rose-300 bg-zinc-900/30"
                          >
                            {formatBRL(s.pjExpenses)}
                          </td>
                        ))}
                      </tr>

                  {openSections.pj &&
                    filteredPjExpenses.map((exp) => (
                      <tr key={exp.id} className="text-zinc-300 hover:bg-zinc-900/30">
                        <td className="sticky left-0 z-10 bg-zinc-950 py-2 px-4 pl-9 text-zinc-300 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                          <span className="truncate block">{exp.title}</span>
                        </td>
                        {summaries.map((s) => (
                          <td
                            key={s.month}
                            className="py-2 px-3 text-right font-mono-numbers text-zinc-300"
                          >
                            {formatBRL(exp.amount)}
                          </td>
                        ))}
                      </tr>
                    ))}
                </>
              )}

              {/* 4. SEÇÃO: SAÍDAS PF - FIXAS E FINANCIAMENTOS */}
              {(scopeFilter === 'ALL' || scopeFilter === 'PF') && (
                <>
                  <tr
                    onClick={() => toggleSection('pf')}
                    className="bg-zinc-900/60 hover:bg-zinc-900 cursor-pointer font-semibold text-zinc-200"
                  >
                    <td className="sticky left-0 z-10 bg-zinc-900/90 py-2.5 px-4 flex items-center justify-between shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center gap-2 text-rose-400 font-bold">
                        {openSections.pf ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <Home className="w-3.5 h-3.5" />
                        <span>SAÍDAS PF (FIXAS, FINANC. & CHEQUE ESP.)</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-normal">
                        {filteredPfExpenses.length} despesas
                      </span>
                    </td>
                    {summaries.map((s) => (
                      <td
                        key={s.month}
                        className="py-2.5 px-3 text-right font-mono-numbers font-bold text-rose-400 bg-zinc-900/40"
                      >
                        {formatBRL(s.pfFixedExpenses + s.overdraftCover)}
                      </td>
                    ))}
                  </tr>

                  {openSections.pf && (
                    <>
                      {/* Linha Automática de Cheque Especial / Saldo Negativo Anterior */}
                      <tr className="bg-rose-950/20 text-rose-300 hover:bg-rose-950/30">
                        <td className="sticky left-0 z-10 bg-zinc-950 py-2 px-4 pl-9 text-rose-400 font-medium shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                          <span className="truncate block font-semibold">
                            (⚠️) Cobertura Cheque Especial / Saldo Negativo Anterior
                          </span>
                        </td>
                        {summaries.map((s) => (
                          <td
                            key={s.month}
                            className={`py-2 px-3 text-right font-mono-numbers ${
                              s.overdraftCover > 0 ? 'text-rose-400 font-bold' : 'text-zinc-400'
                            }`}
                          >
                            {s.overdraftCover > 0 ? formatBRL(s.overdraftCover) : '-'}
                          </td>
                        ))}
                      </tr>

                      {/* Individual PF Expenses */}
                      {filteredPfExpenses.map((exp) => (
                        <tr key={exp.id} className="text-zinc-300 hover:bg-zinc-900/30">
                          <td className="sticky left-0 z-10 bg-zinc-950 py-2 px-4 pl-9 text-zinc-300 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                            <div className="flex items-center justify-between">
                              <span className="truncate">{exp.title}</span>
                              {exp.frequency === 'periodic' && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 ml-1">
                                  Trimestral
                                </span>
                              )}
                            </div>
                          </td>
                          {summaries.map((s) => {
                            const monthIdx = parseInt(s.month.split('-')[1], 10);
                            let amount = 0;
                            let instText = '';

                            if (exp.frequency === 'fixed') {
                              if (getMonthDiff(exp.startMonth, s.month) >= 0) {
                                amount = exp.amount;
                              }
                            } else if (exp.frequency === 'installment' && exp.installmentsCount) {
                              const inst = getInstallmentInfo(
                                exp.startMonth,
                                exp.installmentsCount,
                                s.month
                              );
                              if (inst.isActive) {
                                amount = exp.amount;
                                instText = `${inst.current}/${inst.total}`;
                              }
                            } else if (exp.frequency === 'periodic' && exp.periodicMonths) {
                              if (
                                getMonthDiff(exp.startMonth, s.month) >= 0 &&
                                exp.periodicMonths.includes(monthIdx)
                              ) {
                                amount = exp.amount;
                              }
                            }

                            return (
                              <td
                                key={s.month}
                                className={`py-2 px-3 text-right font-mono-numbers ${
                                  amount > 0 ? 'text-zinc-200' : 'text-zinc-400'
                                }`}
                              >
                                {amount > 0 ? (
                                  <div>
                                    <span>{formatBRL(amount)}</span>
                                    {instText && (
                                      <span className="block text-[9px] text-zinc-400">
                                        P. {instText}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  )}
                </>
              )}

              {/* 5. SEÇÃO: ORÇAMENTO VARIÁVEL (TETOS ENVELOPES) */}
              {(scopeFilter === 'ALL' || scopeFilter === 'PF') && (
                <>
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
                        <span>ORÇAMENTO VARIÁVEL (TETOS DO DIA A DIA)</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-normal">
                        {data.budgetEnvelopes.length} categorias
                      </span>
                    </td>
                    {summaries.map((s) => (
                      <td
                        key={s.month}
                        className="py-2.5 px-3 text-right font-mono-numbers font-bold text-amber-400 bg-zinc-900/40"
                      >
                        {formatBRL(s.variableEnvelopes)}
                      </td>
                    ))}
                  </tr>

                  {openSections.envelopes &&
                    data.budgetEnvelopes.map((env) => (
                      <tr key={env.id} className="text-zinc-300 hover:bg-zinc-900/30">
                        <td className="sticky left-0 z-10 bg-zinc-950 py-2 px-4 pl-9 text-zinc-300 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                          <div className="flex items-center justify-between">
                            <span className="truncate">{env.name}</span>
                            <span className="text-[10px] text-zinc-400 font-mono-numbers">
                              (Teto: {formatBRL(env.targetAmount)})
                            </span>
                          </div>
                        </td>
                        {summaries.map((s) => {
                          const logs = data.variableExpenseLogs.filter(
                            (l) => l.categoryId === env.id && l.month === s.month
                          );
                          const logged = logs.reduce((acc, curr) => acc + curr.amount, 0);
                          const effective = Math.max(env.targetAmount, logged);
                          const isOverflow = logged > env.targetAmount;

                          return (
                            <td
                              key={s.month}
                              className={`py-2 px-3 text-right font-mono-numbers ${
                                isOverflow ? 'text-rose-400 font-bold' : 'text-zinc-300'
                              }`}
                            >
                              {formatBRL(effective)}
                              {logged > 0 && logged !== env.targetAmount && (
                                <span className="block text-[9px] text-zinc-400">
                                  Real: {formatBRL(logged)}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
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
                {summaries.map((s) => (
                  <td
                    key={s.month}
                    className="py-2.5 px-3 text-right font-mono-numbers font-bold text-white bg-zinc-900/40"
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
                    {summaries.map((s) => {
                      const total = s.cardTotalsByCard[card.id] || 0;
                      const diff = s.cardUnmappedDiffByCard[card.id] || 0;
                      return (
                        <td
                          key={s.month}
                          className="py-2 px-3 text-right font-mono-numbers text-zinc-200"
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
                </>
              )}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
