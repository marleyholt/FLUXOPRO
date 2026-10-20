import {
  AppData,
  CreditCard,
  MonthSummary,
  ScopeType,
} from '../types/finance';

// Helper to format currency in Brazilian Real
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompactBRL(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return formatBRL(value);
}

// Convert 'YYYY-MM' to Portuguese label like 'Dez/25'
export function getMonthLabel(monthStr: string): string {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthNumStr, 10);
  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];
  const shortYear = String(year).slice(-2);
  return `${monthNames[monthNum - 1]}/${shortYear}`;
}

// Add months to 'YYYY-MM'
export function addMonths(monthStr: string, count: number): string {
  const [yearStr, monthNumStr] = monthStr.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthNumStr, 10) - 1; // 0-indexed

  month += count;
  year += Math.floor(month / 12);
  month = ((month % 12) + 12) % 12;

  const paddedMonth = String(month + 1).padStart(2, '0');
  return `${year}-${paddedMonth}`;
}

// Get difference in months between two 'YYYY-MM' strings (target - base)
export function getMonthDiff(fromMonth: string, toMonth: string): number {
  const [y1, m1] = fromMonth.split('-').map(Number);
  const [y2, m2] = toMonth.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

// Generate an array of 13 consecutive months (e.g. Dec/25 to Dec/26)
export function generateForecastMonths(startMonth: string, count: number = 13): string[] {
  const months: string[] = [];
  for (let i = 0; i < count; i++) {
    months.push(addMonths(startMonth, i));
  }
  return months;
}

// Calculate the active installment info for an expense or card item
export function getInstallmentInfo(
  startMonth: string,
  totalInstallments: number,
  targetMonth: string
): { isActive: boolean; current: number; total: number; isLast: boolean } {
  const diff = getMonthDiff(startMonth, targetMonth);
  if (diff >= 0 && diff < totalInstallments) {
    return {
      isActive: true,
      current: diff + 1,
      total: totalInstallments,
      isLast: diff + 1 === totalInstallments,
    };
  }
  return {
    isActive: false,
    current: 0,
    total: totalInstallments,
    isLast: false,
  };
}

// Main cashflow forecast projection engine (12-13 months rolling)
export function calculateForecast(
  data: AppData,
  scopeFilter: ScopeType = 'ALL',
  totalMonths: number = 13
): MonthSummary[] {
  const months = generateForecastMonths(data.settings.startMonth, totalMonths);
  const summaries: MonthSummary[] = [];

  let carriedBalance = data.settings.initialBalance;

  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    const label = getMonthLabel(month);
    const monthIndex = parseInt(month.split('-')[1], 10);

    // 1. Incomes
    let fixedIncome = 0;
    let variableIncome = 0;

    data.incomes.forEach((inc) => {
      if (scopeFilter !== 'ALL' && inc.scope !== scopeFilter) return;

      if (inc.type === 'fixed') {
        const start = inc.startMonth || data.settings.startMonth;
        const diffFromStart = getMonthDiff(start, month);
        const diffFromEnd = inc.endMonth ? getMonthDiff(month, inc.endMonth) : 0;
        if (diffFromStart >= 0 && (!inc.endMonth || diffFromEnd >= 0)) {
          fixedIncome += inc.amount;
        }
      } else if (inc.type === 'variable') {
        if (inc.month === month) {
          variableIncome += inc.amount;
        }
      }
    });

    // 2. Expenses (PJ, PF Fixed, Financiamentos, Periódicos)
    let pjExpenses = 0;
    let pfFixedExpenses = 0;

    data.expenses.forEach((exp) => {
      if (scopeFilter !== 'ALL' && exp.scope !== scopeFilter) return;

      let isActive = false;
      if (exp.frequency === 'fixed') {
        if (getMonthDiff(exp.startMonth, month) >= 0) {
          isActive = true;
        }
      } else if (exp.frequency === 'installment' && exp.installmentsCount) {
        const inst = getInstallmentInfo(exp.startMonth, exp.installmentsCount, month);
        isActive = inst.isActive;
      } else if (exp.frequency === 'periodic' && exp.periodicMonths) {
        if (getMonthDiff(exp.startMonth, month) >= 0 && exp.periodicMonths.includes(monthIndex)) {
          isActive = true;
        }
      } else if (exp.frequency === 'single') {
        if (exp.singleMonth === month || exp.startMonth === month) {
          isActive = true;
        }
      }

      if (isActive) {
        if (exp.scope === 'PJ') {
          pjExpenses += exp.amount;
        } else {
          pfFixedExpenses += exp.amount;
        }
      }
    });

    // 3. Variable Envelopes (Mercado, iFood, Uber, etc.) - Only PF
    let variableEnvelopes = 0;
    if (scopeFilter !== 'PJ') {
      data.budgetEnvelopes.forEach((env) => {
        // Find logs for this month
        const logsForEnv = data.variableExpenseLogs.filter(
          (log) => log.categoryId === env.id && log.month === month
        );
        const totalLogged = logsForEnv.reduce((acc, curr) => acc + curr.amount, 0);
        // Rule: Future/current projection considers the higher between target and actual
        const effectiveAmount = Math.max(env.targetAmount, totalLogged);
        variableEnvelopes += effectiveAmount;
      });
    }

    // 4. Credit Cards
    let cardTotal = 0;
    const cardTotalsByCard: Record<string, number> = {};
    const cardUnmappedDiffByCard: Record<string, number> = {};
    const cardItemsCountByCard: Record<string, number> = {};

    data.creditCards.forEach((card) => {
      if (scopeFilter !== 'ALL' && card.scope !== scopeFilter) return;

      let cardDetailedSum = 0;
      let itemsCount = 0;

      data.cardTransactions.forEach((tx) => {
        if (tx.cardId !== card.id) return;
        if (tx.isPaused) return;

        let active = false;
        if (tx.type === 'recurring') {
          if (getMonthDiff(tx.startMonth, month) >= 0) {
            active = true;
          }
        } else if (tx.type === 'installment') {
          const inst = getInstallmentInfo(tx.startMonth, tx.totalInstallments, month);
          active = inst.isActive;
        } else if (tx.type === 'single') {
          if (tx.startMonth === month) {
            active = true;
          }
        }

        if (active) {
          cardDetailedSum += tx.installmentAmount;
          itemsCount += 1;
        }
      });

      // Check real bank invoice if entered
      const realInvoice = card.realInvoiceTotalByMonth?.[month];
      let unmappedDiff = 0;
      let effectiveCardTotal = cardDetailedSum;

      if (realInvoice !== undefined && realInvoice > cardDetailedSum) {
        unmappedDiff = realInvoice - cardDetailedSum;
        effectiveCardTotal = realInvoice;
      }

      cardTotalsByCard[card.id] = effectiveCardTotal;
      cardUnmappedDiffByCard[card.id] = unmappedDiff;
      cardItemsCountByCard[card.id] = itemsCount;
      cardTotal += effectiveCardTotal;
    });

    // 5. Fiscal Recovery / Rolling Balance Calculation
    const previousBalance = carriedBalance;
    const overdraftCover = previousBalance < 0 ? Math.abs(previousBalance) : 0;
    const positiveCarryover = previousBalance > 0 ? previousBalance : 0;

    const totalIncome = fixedIncome + variableIncome + positiveCarryover;
    const totalExpenses =
      pjExpenses +
      pfFixedExpenses +
      variableEnvelopes +
      cardTotal +
      overdraftCover;

    const finalBalance = totalIncome - totalExpenses;

    // Track for next month: check if there is an explicit monthly closing registered for this month
    if (data.monthlyClosings && data.monthlyClosings[month] && typeof data.monthlyClosings[month].closingRealBalance === 'number') {
      carriedBalance = data.monthlyClosings[month].closingRealBalance;
    } else {
      carriedBalance = finalBalance;
    }

    summaries.push({
      month,
      label,
      previousBalance,
      overdraftCover,
      fixedIncome,
      variableIncome,
      totalIncome,
      pjExpenses,
      pfFixedExpenses,
      variableEnvelopes,
      cardTotal,
      cardTotalsByCard,
      cardUnmappedDiffByCard,
      cardItemsCountByCard,
      totalExpenses,
      finalBalance,
      accumulatedBalance: finalBalance,
      isPositive: finalBalance >= 0,
    });
  }

  return summaries;
}

// Calculate the credit card decompression series across 12 months
export interface CardDecompressionPoint {
  month: string;
  label: string;
  subscriptions: number;
  installments: number;
  unmappedDiff: number;
  total: number;
  savingsVsFirstMonth: number;
}

export function calculateCardDecompression(
  data: AppData,
  scopeFilter: ScopeType = 'ALL',
  totalMonths: number = 12
): CardDecompressionPoint[] {
  const months = generateForecastMonths(data.settings.startMonth, totalMonths);
  const series: CardDecompressionPoint[] = [];
  let baseTotal = 0;

  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    let subscriptions = 0;
    let installments = 0;
    let unmappedDiff = 0;

    data.creditCards.forEach((card) => {
      if (scopeFilter !== 'ALL' && card.scope !== scopeFilter) return;

      let cardDetailedSum = 0;
      data.cardTransactions.forEach((tx) => {
        if (tx.cardId !== card.id || tx.isPaused) return;

        if (tx.type === 'recurring') {
          if (getMonthDiff(tx.startMonth, month) >= 0) {
            subscriptions += tx.installmentAmount;
            cardDetailedSum += tx.installmentAmount;
          }
        } else if (tx.type === 'installment') {
          const inst = getInstallmentInfo(tx.startMonth, tx.totalInstallments, month);
          if (inst.isActive) {
            installments += tx.installmentAmount;
            cardDetailedSum += tx.installmentAmount;
          }
        } else if (tx.type === 'single') {
          if (tx.startMonth === month) {
            installments += tx.installmentAmount;
            cardDetailedSum += tx.installmentAmount;
          }
        }
      });

      const realInvoice = card.realInvoiceTotalByMonth?.[month];
      if (realInvoice !== undefined && realInvoice > cardDetailedSum) {
        unmappedDiff += (realInvoice - cardDetailedSum);
      }
    });

    const total = subscriptions + installments + unmappedDiff;
    if (i === 0) {
      baseTotal = total;
    }

    const savingsVsFirstMonth = Math.max(0, baseTotal - total);

    series.push({
      month,
      label: getMonthLabel(month),
      subscriptions,
      installments,
      unmappedDiff,
      total,
      savingsVsFirstMonth,
    });
  }

  return series;
}

// Find month where balance stays permanently positive (Fiscal Recovery Milestone)
export function findRecoveryMilestone(summaries: MonthSummary[]): {
  achieved: boolean;
  month?: string;
  label?: string;
  monthIndex?: number;
  finalAccumulated?: number;
} {
  const milestoneIdx = summaries.findIndex((s) => s.finalBalance >= 0);
  if (milestoneIdx !== -1) {
    return {
      achieved: true,
      month: summaries[milestoneIdx].month,
      label: summaries[milestoneIdx].label,
      monthIndex: milestoneIdx + 1,
      finalAccumulated: summaries[summaries.length - 1].finalBalance,
    };
  }
  return {
    achieved: false,
    finalAccumulated: summaries[summaries.length - 1]?.finalBalance || 0,
  };
}
