import {
  AppData,
  CreditCard,
  MonthSummary,
  ScopeType,
} from '../types/finance';
import { calculateOverdraftProjections } from './bankStatementParser';

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

    // 2. Expenses & Budget Categories (Contas, Obrigações e Envelopes por Categoria)
    let pjExpenses = 0;
    let pfFixedExpenses = 0;

    // Process all active fixed/installment/periodic expenses for this month
    const activeExpensesByCat: Record<string, number> = {};

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

        const catKey = exp.category.trim().toLowerCase();
        activeExpensesByCat[catKey] = (activeExpensesByCat[catKey] || 0) + exp.amount;
      }
    });

    // 3. Credit Cards calculation
    let cardTotal = 0;
    let totalUnmappedDiff = 0;
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
      totalUnmappedDiff += unmappedDiff;
    });

    // 4. Categorias & Envelopes de Despesas (Integrando Contas Fixas + Variáveis)
    let variableEnvelopes = 0;
    const processedCategoryNames = new Set<string>();
    const processedCategoryIds = new Set<string>();

    // Process registered budget envelopes
    data.budgetEnvelopes.forEach((env) => {
      const lowerName = env.name.trim().toLowerCase();
      processedCategoryNames.add(lowerName);
      processedCategoryIds.add(env.id);

      // Active expenses in this category
      const expSum = activeExpensesByCat[lowerName] || activeExpensesByCat[env.id] || 0;

      // Find variable logs for this month
      const logsForEnv = data.variableExpenseLogs.filter(
        (log) =>
          (log.categoryId === env.id || log.categoryId.trim().toLowerCase() === lowerName) &&
          log.month === month
      );
      const totalLogged = logsForEnv.reduce((acc, curr) => acc + curr.amount, 0);

      // Count credit card transactions classified under this category/envelope
      const cardTxForEnv = data.cardTransactions.filter((tx) => {
        if (tx.isPaused) return false;
        const matchesCategory =
          tx.category.trim().toLowerCase() === lowerName ||
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

      const subItemsSum = env.subItems && env.subItems.length > 0
        ? env.subItems.reduce((acc, curr) => acc + curr.amount, 0)
        : 0;
      const baseTarget = env.subItems && env.subItems.length > 0 ? subItemsSum : env.targetAmount;

      // Target inclui o teto da categoria + as contas/obrigações fixas da categoria
      const totalTarget = baseTarget + expSum;
      const totalSpent = expSum + totalLogged + cardTotalForEnv;

      const effectiveAmount = Math.max(totalTarget, totalSpent);
      variableEnvelopes += effectiveAmount;
    });

    // Discover extra categories from expenses, logs or card tx (strictly real category names, never IDs)
    const extraCategories = new Set<string>();

    Object.keys(activeExpensesByCat).forEach((catLower) => {
      if (!processedCategoryNames.has(catLower) && !processedCategoryIds.has(catLower)) {
        extraCategories.add(catLower);
      }
    });

    data.variableExpenseLogs.forEach((l) => {
      if (l.month === month && l.categoryId) {
        const cat = l.categoryId.trim();
        if (processedCategoryIds.has(cat)) return; // Already part of registered envelope
        const lower = cat.toLowerCase();
        if (!processedCategoryNames.has(lower) && !cat.startsWith('env-')) {
          extraCategories.add(lower);
        }
      }
    });

    data.cardTransactions.forEach((tx) => {
      if (!tx.isPaused && tx.category) {
        const cat = tx.category.trim();
        if (processedCategoryIds.has(cat)) return;
        const lower = cat.toLowerCase();
        if (!processedCategoryNames.has(lower) && !cat.startsWith('env-')) {
          let activeInMonth = false;
          if (tx.type === 'recurring') activeInMonth = getMonthDiff(tx.startMonth, month) >= 0;
          else if (tx.type === 'installment') activeInMonth = getInstallmentInfo(tx.startMonth, tx.totalInstallments, month).isActive;
          else if (tx.type === 'single') activeInMonth = tx.startMonth === month;

          if (activeInMonth) {
            extraCategories.add(lower);
          }
        }
      }
    });

    extraCategories.forEach((lowerCat) => {
      const expSum = activeExpensesByCat[lowerCat] || 0;

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

      const totalSpent = expSum + totalLogged + cardTotalForCat;
      variableEnvelopes += totalSpent;
    });

    // Add unmapped card difference / projected trend
    variableEnvelopes += totalUnmappedDiff;

    // Adjust for pushed / postponed debts targeting this month or from this month
    let pushedOutflows = 0;
    let pushedDeductions = 0;
    Object.values(data.monthlyClosings || {}).forEach((closing) => {
      (closing.pushedDebts || []).forEach((pd) => {
        if (pd.status === 'pushed') {
          if (pd.targetMonth === month) {
            pushedOutflows += pd.amount;
          }
          if (pd.month === month && pd.targetMonth !== month) {
            pushedDeductions += pd.amount;
          }
        }
      });
    });

    variableEnvelopes = variableEnvelopes + pushedOutflows - pushedDeductions;

    // 5. Fiscal Recovery / Rolling Balance Calculation
    // Check if there is an explicit starting bank balance registered in monthlyClosings for THIS month
    let previousBalance = carriedBalance;
    let bankConfig = data.bankAccounts?.[0];

    if (data.monthlyClosings && data.monthlyClosings[month]) {
      const closingObj = data.monthlyClosings[month];
      if (closingObj.closingRealBalance !== undefined && closingObj.closingRealBalance !== null) {
        const rawVal = closingObj.closingRealBalance;
        let strVal = String(rawVal).trim();
        if (strVal.includes(',') && strVal.includes('.')) {
          strVal = strVal.replace(/\./g, '').replace(',', '.');
        } else if (strVal.includes(',')) {
          strVal = strVal.replace(',', '.');
        }
        const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(strVal);
        if (!isNaN(numVal)) {
          previousBalance = numVal;
        }
      }
      if (closingObj.bankAccountId) {
        const found = (data.bankAccounts || []).find((b) => b.id === closingObj.bankAccountId);
        if (found) bankConfig = found;
      }
    }

    // Se o saldo for negativo, calcula a projeção de juros e IOF do cheque especial provisionada nas despesas
    let overdraftFees = 0;
    if (previousBalance < 0) {
      const rate = bankConfig?.overdraftRateMonthly || 8.0;
      const freeDays = bankConfig?.overdraftFreeDays || 0;
      const proj = calculateOverdraftProjections(previousBalance, rate, freeDays, 30);
      
      const closingObj = data.monthlyClosings?.[month];
      const manualInterest = closingObj?.manualInterest;
      const manualIof = closingObj?.manualIof;

      const effectiveInterest = manualInterest !== undefined && !isNaN(manualInterest) ? manualInterest : proj.projectedInterest;
      const effectiveIof = manualIof !== undefined && !isNaN(manualIof) ? manualIof : proj.totalProjectedIof;

      overdraftFees = effectiveInterest + effectiveIof;
    }

    // O Saldo Disponível Mês Anterior entra diretamente em Entradas (se for negativo, reduz o montante disponível)
    const totalIncome = fixedIncome + variableIncome + previousBalance;

    // A linha de Cheque Especial nas saídas provisiona o custo financeiro (Juros + IOF)
    const overdraftCover = overdraftFees;
    const totalExpenses = variableEnvelopes + overdraftCover;

    const finalBalance = totalIncome - totalExpenses;

    // Track for next month
    carriedBalance = finalBalance;

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
