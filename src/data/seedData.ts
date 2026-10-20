import { AppData } from '../types/finance';

// DADOS 100% VAZIOS E LIMPOS (SEM NENHUMA CONFIGURAÇÃO OU CONTA PADRÃO)
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
  budgetEnvelopes: [],
  variableExpenseLogs: [],
  creditCards: [],
  cardTransactions: [],
  bankAccounts: [],
};

// Dados de Demonstração Opcionais (apenas se o usuário solicitar restauração para testar)
export const DEMO_SAMPLE_DATA: AppData = {
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
    { id: 'env-1', name: 'Mercado / Supermercado', targetAmount: 2000, color: '#10b981', icon: 'ShoppingCart' },
    { id: 'env-2', name: 'iFood & Restaurantes', targetAmount: 800, color: '#f59e0b', icon: 'Utensils' },
    { id: 'env-3', name: 'Uber & Combustível', targetAmount: 500, color: '#6366f1', icon: 'Car' },
    { id: 'env-4', name: 'Lazer & Diversos', targetAmount: 400, color: '#ec4899', icon: 'Sparkles' },
    { id: 'env-5', name: 'Fator de Correção / Reserva', targetAmount: 300, color: '#14b8a6', icon: 'ShieldAlert' },
  ],
  variableExpenseLogs: [],
  creditCards: [],
  cardTransactions: [],
  bankAccounts: [],
};
