import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMonthLabel,
  addMonths,
  getMonthDiff,
  getInstallmentInfo,
  calculateForecast,
} from './calculations.js';
import { INITIAL_SEED_DATA } from '../data/seedData.js';

test('addMonths calculations', () => {
  assert.equal(addMonths('2025-12', 1), '2026-01');
  assert.equal(addMonths('2025-12', 12), '2026-12');
  assert.equal(addMonths('2026-01', -1), '2025-12');
});

test('getMonthDiff calculations', () => {
  assert.equal(getMonthDiff('2025-12', '2026-01'), 1);
  assert.equal(getMonthDiff('2025-12', '2026-12'), 12);
  assert.equal(getMonthDiff('2026-03', '2026-03'), 0);
});

test('getInstallmentInfo installment progress', () => {
  const info = getInstallmentInfo('2025-10', 6, '2026-01');
  assert.equal(info.isActive, true);
  assert.equal(info.current, 4); // 2025-10 (1), 2025-11 (2), 2025-12 (3), 2026-01 (4)
  assert.equal(info.total, 6);
  assert.equal(info.isLast, false);

  const pastInfo = getInstallmentInfo('2025-10', 6, '2026-05');
  assert.equal(pastInfo.isActive, false);
});

test('calculateForecast rolling balance carryover', () => {
  const summaries = calculateForecast(INITIAL_SEED_DATA, 'ALL', 13);
  assert.equal(summaries.length, 13);
  assert.equal(summaries[0].previousBalance, -3200); // starts in overdraft
  assert.equal(summaries[0].overdraftCover, 3200);
  // Month 1 previousBalance must match Month 0 finalBalance
  assert.equal(summaries[1].previousBalance, summaries[0].finalBalance);
});
