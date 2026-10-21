import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCreditCardCsv, convertCsvItemToTransaction } from '../utils/csvParser';

test('parseCreditCardCsv parses standard CSV with Brazilian numbers', () => {
  const sample = `Data,Descrição,Valor,Parcela
2026-01-05,Drogaria Pacheco Farmácia,145.20,À vista
2026-01-08,Posto Ipiranga Combustível,210.00,
2026-01-12,Magazine Luiza - Parcela 03/10,320.00,
2026-01-22,ASA ENSINA MAIS EDIT,234.01,09/12`;

  const items = parseCreditCardCsv(sample, '2026-01');
  assert.equal(items.length, 4);
  assert.equal(items[0].date, '2026-01-05');
  assert.equal(items[0].amount, 145.2);
  assert.equal(items[2].installmentsCurrent, 3);
  assert.equal(items[2].installmentsTotal, 10);
  assert.equal(items[3].installmentsCurrent, 9);
  assert.equal(items[3].installmentsTotal, 12);
});

test('convertCsvItemToTransaction includes transactionDate and cardId', () => {
  const item = {
    id: 'test-1',
    date: '2026-01-15',
    description: 'Restaurante',
    amount: 85.5,
    selected: true,
    needsReview: false,
    category: 'Alimentação',
  };

  const tx = convertCsvItemToTransaction(item, 'card-1', '2026-01');
  assert.equal(tx.cardId, 'card-1');
  assert.equal(tx.transactionDate, '2026-01-15');
  assert.equal(tx.installmentAmount, 85.5);
  assert.equal(tx.importedFromCsv, true);
});
