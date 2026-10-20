import { AppData } from '../types/finance';

/**
 * Utilitário para gerar Script SQL (MySQL) e Migrações Laravel
 * Projetado para usuários pouco experientes em Laravel e MySQL.
 */

export function generateMysqlDump(data: AppData): string {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  let sql = `-- ==============================================================
-- FLUXOPRO - BANCO DE DADOS MYSQL
-- Gerado em: ${now}
-- Instruções:
-- 1. Abra o phpMyAdmin ou terminal MySQL no servidor da sua empresa.
-- 2. Crie o banco de dados: CREATE DATABASE IF NOT EXISTS fluxo_caixa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- 3. Selecione o banco e execute este arquivo SQL.
-- ==============================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS monthly_closings;
DROP TABLE IF EXISTS bank_statement_uploads;
DROP TABLE IF EXISTS card_transactions;
DROP TABLE IF EXISTS variable_expense_logs;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS incomes;
DROP TABLE IF EXISTS budget_envelopes;
DROP TABLE IF EXISTS credit_cards;
DROP TABLE IF EXISTS bank_accounts;
DROP TABLE IF EXISTS app_settings;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Tabela de Configurações
CREATE TABLE app_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    start_month VARCHAR(7) NOT NULL DEFAULT '2026-01',
    initial_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    last_backup_at DATETIME NULL,
    last_visit_at DATETIME NULL,
    checklist_state JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de Contas Bancárias
CREATE TABLE bank_accounts (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    agency VARCHAR(20) NULL,
    account_number VARCHAR(30) NULL,
    overdraft_limit DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    overdraft_rate_monthly DECIMAL(5, 2) NOT NULL DEFAULT 8.00,
    overdraft_free_days INT NOT NULL DEFAULT 0,
    color VARCHAR(20) DEFAULT '#3b82f6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Cartões de Crédito
CREATE TABLE credit_cards (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    bank VARCHAR(120) NOT NULL,
    scope ENUM('PF', 'PJ') NOT NULL DEFAULT 'PF',
    due_day INT NOT NULL,
    closing_day INT NOT NULL,
    credit_limit DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    rotativo_rate_monthly DECIMAL(5, 2) NOT NULL DEFAULT 14.50,
    parcelamento_rate_monthly DECIMAL(5, 2) NOT NULL DEFAULT 4.20,
    color VARCHAR(20) DEFAULT '#8b5cf6',
    real_invoices_json JSON NULL,
    payment_dates_json JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de Categorias e Envelopes de Despesas Variáveis
CREATE TABLE budget_envelopes (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    target_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    color VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela de Receitas
CREATE TABLE incomes (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type ENUM('fixed', 'variable') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    category VARCHAR(120) NOT NULL,
    scope ENUM('PF', 'PJ') NOT NULL,
    month VARCHAR(7) NULL,
    start_month VARCHAR(7) NULL,
    source VARCHAR(120) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabela de Despesas Fixas, Parceladas e Periódicas
CREATE TABLE expenses (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    scope ENUM('PF', 'PJ') NOT NULL,
    category VARCHAR(120) NOT NULL,
    frequency ENUM('fixed', 'installment', 'periodic', 'single') NOT NULL,
    start_month VARCHAR(7) NOT NULL,
    installments_count INT NULL,
    periodic_months JSON NULL,
    single_month VARCHAR(7) NULL,
    notes TEXT NULL,
    needs_review BOOLEAN DEFAULT FALSE,
    paid_months_json JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabela de Gastos das Categorias (Envelopes)
CREATE TABLE variable_expense_logs (
    id VARCHAR(64) PRIMARY KEY,
    category_id VARCHAR(64) NOT NULL,
    month VARCHAR(7) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    log_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_month (category_id, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabela de Transações de Cartão de Crédito
CREATE TABLE card_transactions (
    id VARCHAR(64) PRIMARY KEY,
    card_id VARCHAR(64) NOT NULL,
    description VARCHAR(255) NOT NULL,
    type ENUM('recurring', 'installment', 'single') NOT NULL,
    installment_amount DECIMAL(15, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NULL,
    total_installments INT NOT NULL DEFAULT 1,
    start_month VARCHAR(7) NOT NULL,
    category VARCHAR(120) NOT NULL,
    needs_review BOOLEAN DEFAULT FALSE,
    is_paused BOOLEAN DEFAULT FALSE,
    imported_from_csv BOOLEAN DEFAULT FALSE,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_card (card_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabela de Fechamentos Mensais
CREATE TABLE monthly_closings (
    month VARCHAR(7) PRIMARY KEY,
    is_closed BOOLEAN DEFAULT FALSE,
    closed_at DATETIME NULL,
    closing_real_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    projected_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    adjustment_difference DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    is_overdraft BOOLEAN DEFAULT FALSE,
    notes TEXT NULL,
    reopened_reason TEXT NULL,
    reopened_at DATETIME NULL,
    reopen_history_json JSON NULL,
    scheduled_reminders_json JSON NULL,
    pushed_debts_json JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================
-- INSERÇÃO DOS DADOS ATUAIS
-- ==============================================================

-- Inserindo Contas Bancárias
`;

  // Bank accounts
  (data.bankAccounts || []).forEach((b) => {
    sql += `INSERT INTO bank_accounts (id, name, agency, account_number, overdraft_limit, overdraft_rate_monthly, overdraft_free_days, color) VALUES (${escapeSql(
      b.id
    )}, ${escapeSql(b.name)}, ${escapeSql(b.agency || '')}, ${escapeSql(
      b.accountNumber || ''
    )}, ${b.overdraftLimit || 0}, ${b.overdraftRateMonthly || 8.0}, ${
      b.overdraftFreeDays || 0
    }, ${escapeSql(b.color || '#3b82f6')});\n`;
  });

  // Credit Cards
  sql += `\n-- Inserindo Cartões de Crédito\n`;
  data.creditCards.forEach((c) => {
    const realJson = JSON.stringify(c.realInvoiceTotalByMonth || {});
    const datesJson = JSON.stringify(c.invoicePaymentDateByMonth || {});
    sql += `INSERT INTO credit_cards (id, name, bank, scope, due_day, closing_day, credit_limit, rotativo_rate_monthly, parcelamento_rate_monthly, color, real_invoices_json, payment_dates_json) VALUES (${escapeSql(
      c.id
    )}, ${escapeSql(c.name)}, ${escapeSql(c.bank)}, ${escapeSql(c.scope)}, ${
      c.dueDay
    }, ${c.closingDay}, ${c.limit || 0}, ${c.rotativoRateMonthly || 14.5}, ${
      c.parcelamentoRateMonthly || 4.2
    }, ${escapeSql(c.color)}, ${escapeSql(realJson)}, ${escapeSql(datesJson)});\n`;
  });

  // Budget Envelopes
  sql += `\n-- Inserindo Categorias & Envelopes\n`;
  data.budgetEnvelopes.forEach((e) => {
    sql += `INSERT INTO budget_envelopes (id, name, target_amount, color) VALUES (${escapeSql(
      e.id
    )}, ${escapeSql(e.name)}, ${e.targetAmount}, ${escapeSql(e.color || '#10b981')});\n`;
  });

  // Incomes
  sql += `\n-- Inserindo Receitas\n`;
  data.incomes.forEach((i) => {
    sql += `INSERT INTO incomes (id, title, type, amount, category, scope, month, start_month, source, notes) VALUES (${escapeSql(
      i.id
    )}, ${escapeSql(i.title)}, ${escapeSql(i.type)}, ${i.amount}, ${escapeSql(
      i.category
    )}, ${escapeSql(i.scope)}, ${escapeSql(i.month || '')}, ${escapeSql(
      i.startMonth || ''
    )}, ${escapeSql(i.source || '')}, ${escapeSql(i.notes || '')});\n`;
  });

  // Expenses
  sql += `\n-- Inserindo Despesas\n`;
  data.expenses.forEach((e) => {
    const paidJson = JSON.stringify(e.paidMonths || {});
    const periodicJson = JSON.stringify(e.periodicMonths || []);
    sql += `INSERT INTO expenses (id, title, amount, scope, category, frequency, start_month, installments_count, periodic_months, single_month, notes, needs_review, paid_months_json) VALUES (${escapeSql(
      e.id
    )}, ${escapeSql(e.title)}, ${e.amount}, ${escapeSql(e.scope)}, ${escapeSql(
      e.category
    )}, ${escapeSql(e.frequency)}, ${escapeSql(e.startMonth)}, ${
      e.installmentsCount || 'NULL'
    }, ${escapeSql(periodicJson)}, ${escapeSql(e.singleMonth || '')}, ${escapeSql(
      e.notes || ''
    )}, ${e.needsReview ? 1 : 0}, ${escapeSql(paidJson)});\n`;
  });

  // Variable Expense Logs
  sql += `\n-- Inserindo Lançamentos Variáveis\n`;
  data.variableExpenseLogs.forEach((l) => {
    sql += `INSERT INTO variable_expense_logs (id, category_id, month, amount, description, log_date) VALUES (${escapeSql(
      l.id
    )}, ${escapeSql(l.categoryId)}, ${escapeSql(l.month)}, ${l.amount}, ${escapeSql(
      l.description
    )}, ${escapeSql(l.date)});\n`;
  });

  // Card Transactions
  sql += `\n-- Inserindo Transações de Cartões\n`;
  data.cardTransactions.forEach((t) => {
    sql += `INSERT INTO card_transactions (id, card_id, description, type, installment_amount, total_amount, total_installments, start_month, category, needs_review, is_paused, imported_from_csv, notes) VALUES (${escapeSql(
      t.id
    )}, ${escapeSql(t.cardId)}, ${escapeSql(t.description)}, ${escapeSql(
      t.type
    )}, ${t.installmentAmount}, ${t.totalAmount || 'NULL'}, ${
      t.totalInstallments
    }, ${escapeSql(t.startMonth)}, ${escapeSql(t.category)}, ${
      t.needsReview ? 1 : 0
    }, ${t.isPaused ? 1 : 0}, ${t.importedFromCsv ? 1 : 0}, ${escapeSql(
      t.notes || ''
    )});\n`;
  });

  // Monthly Closings
  sql += `\n-- Inserindo Fechamentos Mensais\n`;
  if (data.monthlyClosings) {
    Object.values(data.monthlyClosings).forEach((c) => {
      const reopenJson = JSON.stringify(c.reopenHistory || []);
      const schedJson = JSON.stringify(c.scheduledReminders || []);
      const pushedJson = JSON.stringify(c.pushedDebts || []);
      sql += `INSERT INTO monthly_closings (month, is_closed, closed_at, closing_real_balance, projected_balance, adjustment_difference, is_overdraft, notes, reopened_reason, reopened_at, reopen_history_json, scheduled_reminders_json, pushed_debts_json) VALUES (${escapeSql(
        c.month
      )}, ${c.isClosed ? 1 : 0}, ${escapeSql(c.closedAt || null)}, ${
        c.closingRealBalance
      }, ${c.projectedBalance}, ${c.adjustmentDifference}, ${
        c.isOverdraft ? 1 : 0
      }, ${escapeSql(c.notes || '')}, ${escapeSql(c.reopenedReason || '')}, ${escapeSql(
        c.reopenedAt || null
      )}, ${escapeSql(reopenJson)}, ${escapeSql(schedJson)}, ${escapeSql(pushedJson)});\n`;
    });
  }

  sql += `\n-- Concluído com sucesso!\n`;
  return sql;
}

function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  const str = String(val).replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case '\0':
        return '\\0';
      case '\x08':
        return '\\b';
      case '\x09':
        return '\\t';
      case '\x1a':
        return '\\z';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '"':
      case "'":
      case '\\':
      case '%':
        return '\\' + char;
      default:
        return char;
    }
  });
  return `'${str}'`;
}
