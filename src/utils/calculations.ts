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
      const processedCategoryNames = new Set<string>();

      // Process registered budget envelopes
      data.budgetEnvelopes.forEach((env) => {
        processedCategoryNames.add(env.name.trim().toLowerCase());

        // Find variable logs for this month
        const logsForEnv = data.variableExpenseLogs.filter(
          (log) =>
            (log.categoryId === env.id || log.categoryId.trim().toLowerCase() === env.name.trim().toLowerCase()) &&
            log.month === month
        );
        const totalLogged = logsForEnv.reduce((acc, curr) => acc + curr.amount, 0);

        // Also count credit card transactions classified under this category/envelope for this month
        const cardTxForEnv = data.cardTransactions.filter((tx) => {
          if (tx.isPaused) return false;
          const matchesCategory =
            tx.category.trim().toLowerCase() === env.name.trim().toLowerCase() ||
            tx.category === env.id;
          if (!matchesCategory) return false;

          if (tx.type === 'recurring') {
            return getMonthDiff(tx.startMonth, month) >= 0;
          } else if (tx.type === 'installment') {
            return getInstallmentInfo(tx.startMonth, tx.totalInstallments, month).isActive;
          } else if (tx.type === 'single') {
            return tx.startMonth === month;
          }
          return false;
        });
        const cardTotalForEnv = cardTxForEnv.reduce((acc, curr) => acc + curr.installmentAmount, 0);

        const totalSpent = totalLogged + cardTotalForEnv;
        const subItemsSum = env.subItems && env.subItems.length > 0
          ? env.subItems.reduce((acc, curr) => acc + curr.amount, 0)
          : 0;
        const target = env.subItems && env.subItems.length > 0 ? subItemsSum : env.targetAmount;

        // Rule: Future/current projection considers the higher between target and actual
        const effectiveAmount = Math.max(target, totalSpent);
        variableEnvelopes += effectiveAmount;
      });

      // Discover and process extra custom categories from logs or credit card transactions
      const extraCategories = new Set<string>();

      data.variableExpenseLogs.forEach((l) => {
        if (l.month === month && l.categoryId) {
          const lower = l.categoryId.trim().toLowerCase();
          if (!processedCategoryNames.has(lower)) {
            extraCategories.add(l.categoryId.trim());
          }
        }
      });

      data.cardTransactions.forEach((tx) => {
        if (!tx.isPaused && tx.category) {
          const lower = tx.category.trim().toLowerCase();
          if (!processedCategoryNames.has(lower)) {
            let activeInMonth = false;
            if (tx.type === 'recurring') activeInMonth = getMonthDiff(tx.startMonth, month) >= 0;
            else if (tx.type === 'installment') activeInMonth = getInstallmentInfo(tx.startMonth, tx.totalInstallments, month).isActive;
            else if (tx.type === 'single') activeInMonth = tx.startMonth === month;

            if (activeInMonth) {
              extraCategories.add(tx.category.trim());
            }
          }
        }
      });

      extraCategories.forEach((catName) => {
        const lowerCat = catName.toLowerCase();
        const logsForCat = data.variableExpenseLogs.filter(
          (l) => l.month === month && l.categoryId.trim().toLowerCase() === lowerCat
        );
        const totalLogged = logsForCat.reduce((acc, curr) => acc + curr.amount, 0);

        const cardTxForCat = data.cardTransactions.filter((tx) => {
          if (tx.isPaused) return false;
          if (tx.category.trim().toLowerCase() !== lowerCat) return false;

          if (tx.type === 'recurring') return getMonthDiff(tx.startMonth, month) >= 0;
          if (tx.type === 'installment') return getInstallmentInfo(tx.startMonth, tx.totalInstallments, month).isActive;
          if (tx.type === 'single') return tx.startMonth === month;
          return false;
        });
        const cardTotalForCat = cardTxForCat.reduce((acc, curr) => acc + curr.installmentAmount, 0);

        const totalSpent = totalLogged + cardTotalForCat;
        variableEnvelopes += totalSpent;
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

      if (realInvoice !== undefined) {
        if (realInvoice > cardDetailedSum) {
          unmappedDiff = realInvoice - cardDetailedSum;
        }
        effectiveCardTotal = Math.max(realInvoice, cardDetailedSum);
      } else {
        // Projeta tendência para meses futuros
        let projectedTrend = 0;

        if (card.manualProjectedTrend !== undefined && card.manualProjectedTrend !== null) {
          projectedTrend = card.manualProjectedTrend;
        } else {
          // Busca a fatura real fechada mais recente
          const realInvoiceMonths = Object.keys(card.realInvoiceTotalByMonth || {}).sort();
          if (realInvoiceMonths.length > 0) {
            const latestRealMonth = realInvoiceMonths[realInvoiceMonths.length - 1];
            const latestRealTotal = card.realInvoiceTotalByMonth![latestRealMonth];

            // Calcula compras mapeadas no último mês real
            let sumForLatest = 0;
            data.cardTransactions.forEach((tx) => {
              if (tx.cardId !== card.id || tx.isPaused) return;
              if (tx.type === 'recurring' && getMonthDiff(tx.startMonth, latestRealMonth) >= 0) sumForLatest += tx.installmentAmount;
              else if (tx.type === 'installment' && getInstallmentInfo(tx.startMonth, tx.totalInstallments, latestRealMonth).isActive) sumForLatest += tx.installmentAmount;
              else if (tx.type === 'single' && tx.startMonth === latestRealMonth) sumForLatest += tx.installmentAmount;
            });

            const baseDiff = Math.max(0, latestRealTotal - sumForLatest);
            const monthsAhead = getMonthDiff(latestRealMonth, month);

            if (monthsAhead > 0) {
              // Redução automática de 10% ao mês (0.90^n) para projetar redução gradual de gastos avulsos
              projectedTrend = Math.round(baseDiff * Math.pow(0.90, monthsAhead));
            } else {
              projectedTrend = baseDiff;
            }
          }
        }

        effectiveCardTotal = cardDetailedSum + projectedTrend;
        unmappedDiff = projectedTrend;
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
    // cardTotal é mantido de forma informativa no final da matriz sem ser somado ao montante de desembolso para evitar duplicidade de lançamentos
    const totalExpenses =
      pjExpenses +
      pfFixedExpenses +
      variableEnvelopes +
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
