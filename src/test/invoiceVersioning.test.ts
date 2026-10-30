import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateForecast } from '../utils/calculations';
import { INITIAL_SEED_DATA } from '../data/seedData';
import { AppData, CreditCard, CardTransaction, InvoiceVersion } from '../types/finance';

test('credit card invoice versions can be switched and reflect in forecast projection', () => {
  const cardId = 'card-nubank';
  const month = '2026-10';

  const card: CreditCard = {
    id: cardId,
    name: 'Nubank PF',
    bank: 'Nubank',
    scope: 'PF',
    color: '#820ad1',
    dueDay: 10,
    closingDay: 3,
    realInvoiceTotalByMonth: {
      [month]: 1200, // Versão 1 inicial
    },
    activeInvoiceVersionIdByMonth: {
      [month]: 'ver-1',
    },
    invoiceVersionsByMonth: {
      [month]: [
        {
          id: 'ver-1',
          cardId,
          month,
          name: 'Semana 1 - Prévia',
          statementDate: '2026-10-07',
          createdAt: new Date().toISOString(),
          totalAmount: 1200,
          transactionCount: 2,
          transactions: [
            {
              id: 'tx-1',
              cardId,
              description: 'Supermercado',
              type: 'single',
              installmentAmount: 800,
              totalInstallments: 1,
              startMonth: month,
              category: 'Mercado',
              needsReview: false,
              importedFromCsv: true,
            },
            {
              id: 'tx-2',
              cardId,
              description: 'Combustível',
              type: 'single',
              installmentAmount: 400,
              totalInstallments: 1,
              startMonth: month,
              category: 'Transporte',
              needsReview: false,
              importedFromCsv: true,
            },
          ],
        },
        {
          id: 'ver-2',
          cardId,
          month,
          name: 'Semana 2 - Prévia Completa',
          statementDate: '2026-10-14',
          createdAt: new Date().toISOString(),
          totalAmount: 2600,
          transactionCount: 3,
          transactions: [
            {
              id: 'tx-1',
              cardId,
              description: 'Supermercado',
              type: 'single',
              installmentAmount: 800,
              totalInstallments: 1,
              startMonth: month,
              category: 'Mercado',
              needsReview: false,
              importedFromCsv: true,
            },
            {
              id: 'tx-2',
              cardId,
              description: 'Combustível',
              type: 'single',
              installmentAmount: 400,
              totalInstallments: 1,
              startMonth: month,
              category: 'Transporte',
              needsReview: false,
              importedFromCsv: true,
            },
            {
              id: 'tx-3',
              cardId,
              description: 'Notebook Parcela 1/10',
              type: 'installment',
              installmentAmount: 1400,
              totalInstallments: 10,
              startMonth: month,
              category: 'Eletrônicos',
              needsReview: false,
              importedFromCsv: true,
            },
          ],
        },
      ],
    },
  };

  const appDataWithV1: AppData = {
    ...INITIAL_SEED_DATA,
    settings: {
      ...INITIAL_SEED_DATA.settings,
      startMonth: '2026-10',
      initialBalance: 10000,
    },
    creditCards: [card],
    cardTransactions: card.invoiceVersionsByMonth![month][0].transactions,
  };

  // Forecast com Versão 1 ativa
  const forecastV1 = calculateForecast(appDataWithV1);
  const octV1 = forecastV1.find((s) => s.month === month);
  assert.equal(octV1?.cardTotal, 1200);

  // Alterna para Versão 2
  const targetVer2 = card.invoiceVersionsByMonth![month][1];
  const appDataWithV2: AppData = {
    ...appDataWithV1,
    creditCards: [
      {
        ...card,
        activeInvoiceVersionIdByMonth: { [month]: targetVer2.id },
        realInvoiceTotalByMonth: { [month]: targetVer2.totalAmount },
      },
    ],
    cardTransactions: targetVer2.transactions,
  };

  const forecastV2 = calculateForecast(appDataWithV2);
  const octV2 = forecastV2.find((s) => s.month === month);
  assert.equal(octV2?.cardTotal, 2600); // Reflete imediatamente os 2600 da versão 2!
});
