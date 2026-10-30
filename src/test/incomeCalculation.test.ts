import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateForecast } from '../utils/calculations';
import { INITIAL_SEED_DATA } from '../data/seedData';
import { AppData, Income } from '../types/finance';

test('income calculation respects startMonth and endMonth in projections and updates on edit', () => {
  const initialData: AppData = {
    ...INITIAL_SEED_DATA,
    settings: {
      ...INITIAL_SEED_DATA.settings,
      startMonth: '2025-10',
      initialBalance: 0,
    },
    incomes: [
      {
        id: 'inc-1',
        title: 'Consultoria Recorrente',
        type: 'fixed',
        amount: 5000,
        category: 'Consultoria',
        scope: 'PJ',
        source: 'Filipe',
        startMonth: '2025-10',
        endMonth: '2025-11', // Encerra em novembro
      },
      {
        id: 'inc-2',
        title: 'Bônus Pontual',
        type: 'variable',
        amount: 2500,
        category: 'Bônus',
        scope: 'PF',
        source: 'Carol',
        month: '2025-11',
      },
    ],
  };

  // 1. Forecast inicial
  const forecast1 = calculateForecast(initialData);
  const oct = forecast1.find((s) => s.month === '2025-10');
  const nov = forecast1.find((s) => s.month === '2025-11');
  const dec = forecast1.find((s) => s.month === '2025-12');

  assert.equal(oct?.fixedIncome, 5000);
  assert.equal(oct?.variableIncome, 0);

  assert.equal(nov?.fixedIncome, 5000);
  assert.equal(nov?.variableIncome, 2500); // 5000 consultoria + 2500 bônus

  assert.equal(dec?.fixedIncome, 0); // Consultoria encerrou em nov!
  assert.equal(dec?.variableIncome, 0);

  // 2. Agora simulamos a edição da receita inc-1: estendendo endMonth para 2025-12 e alterando valor para 6000
  const updatedIncome: Income = {
    ...initialData.incomes[0],
    amount: 6000,
    endMonth: '2025-12',
    category: 'Consultoria Estratégica',
    title: 'Consultoria VIP',
    source: 'Filipe PJ',
  };

  const updatedData: AppData = {
    ...initialData,
    incomes: initialData.incomes.map((inc) => (inc.id === updatedIncome.id ? updatedIncome : inc)),
  };

  const forecast2 = calculateForecast(updatedData);
  const oct2 = forecast2.find((s) => s.month === '2025-10');
  const nov2 = forecast2.find((s) => s.month === '2025-11');
  const dec2 = forecast2.find((s) => s.month === '2025-12');
  const jan2 = forecast2.find((s) => s.month === '2026-01');

  assert.equal(oct2?.fixedIncome, 6000);
  assert.equal(nov2?.fixedIncome, 6000);
  assert.equal(nov2?.variableIncome, 2500); // 6000 + 2500
  assert.equal(dec2?.fixedIncome, 6000); // Agora está ativa em dezembro com o novo valor!
  assert.equal(jan2?.fixedIncome, 0); // Encerrou em dezembro
});
