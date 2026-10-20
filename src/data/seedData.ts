import { AppData } from '../types/finance';

// DADOS LIMPOS E REAIS (SEM DADOS DE EXEMPLO FICTÍCIOS)
export const INITIAL_SEED_DATA: AppData = {
  settings: {
    startMonth: '2026-01',
    initialBalance: 0,
    lastBackupDate: new Date().toISOString(),
    lastVisitTimestamp: new Date().toISOString(),
    checklistState: {},
  },
  incomes: [],
  expenses: [],
  budgetEnvelopes: [
    {
      id: 'env-1',
      name: 'Mercado / Supermercado',
      targetAmount: 2000,
      color: '#10b981',
      icon: 'ShoppingCart',
    },
    {
      id: 'env-2',
      name: 'iFood & Restaurantes',
      targetAmount: 800,
      color: '#f59e0b',
      icon: 'Utensils',
    },
    {
      id: 'env-3',
      name: 'Uber & Combustível',
      targetAmount: 500,
      color: '#6366f1',
      icon: 'Car',
    },
    {
      id: 'env-4',
      name: 'Lazer & Diversos',
      targetAmount: 400,
      color: '#ec4899',
      icon: 'Sparkles',
    },
    {
      id: 'env-5',
      name: 'Fator de Correção / Reserva',
      targetAmount: 300,
      color: '#14b8a6',
      icon: 'ShieldAlert',
    },
  ],
  variableExpenseLogs: [],
  creditCards: [
    {
      id: 'card-1',
      name: 'Cartão Principal',
      bank: 'Nubank / Itaú',
      scope: 'PF',
      color: '#8b5cf6',
      dueDay: 10,
      closingDay: 3,
      realInvoiceTotalByMonth: {},
    },
  ],
  cardTransactions: [],
};

// Dados de Demonstração Opcionais (apenas se o usuário solicitar restauração para testar)
export const DEMO_SAMPLE_DATA: AppData = {
  settings: {
    startMonth: '2026-01',
    initialBalance: -2500,
    lastBackupDate: new Date().toISOString(),
    lastVisitTimestamp: new Date().toISOString(),
    lastExpenseLogged: {
      description: 'Supermercado Mensal',
      amount: 450,
      timestamp: new Date().toISOString(),
    },
    checklistState: {
      'daily-1': true,
      'weekly-1': true,
    },
  },
  incomes: [
    {
      id: 'inc-demo-1',
      title: 'Salário Principal CLT',
      type: 'fixed',
      amount: 9500,
      category: 'Salário',
      scope: 'PF',
      source: 'Filipe',
      startMonth: '2026-01',
    },
    {
      id: 'inc-demo-2',
      title: 'Renda Consultoria',
      type: 'fixed',
      amount: 4500,
      category: 'Renda Familiar',
      scope: 'PF',
      source: 'Carol',
      startMonth: '2026-01',
    },
  ],
  expenses: [
    {
      id: 'exp-demo-1',
      title: 'Financiamento Residencial',
      amount: 2200,
      scope: 'PF',
      category: 'Financiamento/Dívidas',
      frequency: 'fixed',
      startMonth: '2026-01',
      paidMonths: { '2026-01': true },
    },
    {
      id: 'exp-demo-2',
      title: 'DAS Simples Nacional',
      amount: 650,
      scope: 'PJ',
      category: 'Impostos/DAS',
      frequency: 'fixed',
      startMonth: '2026-01',
      paidMonths: { '2026-01': true },
    },
  ],
  budgetEnvelopes: [
    { id: 'env-1', name: 'Mercado / Supermercado', targetAmount: 2000, color: '#10b981', icon: 'ShoppingCart' },
    { id: 'env-2', name: 'iFood & Restaurantes', targetAmount: 800, color: '#f59e0b', icon: 'Utensils' },
    { id: 'env-3', name: 'Uber & Combustível', targetAmount: 500, color: '#6366f1', icon: 'Car' },
    { id: 'env-4', name: 'Lazer & Diversos', targetAmount: 400, color: '#ec4899', icon: 'Sparkles' },
    { id: 'env-5', name: 'Fator de Correção / Reserva', targetAmount: 300, color: '#14b8a6', icon: 'ShieldAlert' },
  ],
  variableExpenseLogs: [],
  creditCards: [
    {
      id: 'card-1',
      name: 'Cartão Principal',
      bank: 'Nubank',
      scope: 'PF',
      color: '#8b5cf6',
      dueDay: 10,
      closingDay: 3,
      realInvoiceTotalByMonth: {},
    },
  ],
  cardTransactions: [],
};
