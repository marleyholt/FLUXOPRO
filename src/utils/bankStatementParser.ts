/**
 * Parser inteligente de Extratos Bancários Brasileiros
 * Suporta formatos: .OFX, .CSV, .TXT
 * Compatível com Itaú, Santander, Bradesco, Banco do Brasil, Nubank, Inter, Caixa, Sicredi e Sicoob.
 */

export interface ParsedBankStatement {
  bankName: string;
  fileName: string;
  initialBalance: number;
  finalBalance: number;
  credits: number;
  debits: number;
  interestPaid: number; // Juros de cheque especial / encargos detectados
  iofPaid: number;      // IOF debitado no extrato
  transactionCount: number;
  detectedAccount?: string;
}

// Converte string monetária brasileira (ex: "1.450,20", "-320,50", "450.00 D", "(120,00)") para número
export function parseBRLNumber(raw: string | number): number {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  if (!raw) return 0;
  let s = String(raw).trim();

  const isDebitIndicator = /[\(\)]|\bD\b/i.test(s);
  const isNegativeSign = s.startsWith('-') || s.endsWith('-');

  // Remove parênteses, letras D/C e espaços
  s = s.replace(/[()DCdc\sR$\+]/g, '').trim();

  // Se tiver formato brasileiro 1.234,56
  if (s.includes(',') && s.includes('.')) {
    // 1.234,56 -> remove ponto, substitui virgula por ponto
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    // 1234,56 -> 1234.56
    s = s.replace(',', '.');
  }

  let num = parseFloat(s) || 0;
  if (isDebitIndicator || isNegativeSign) {
    num = -Math.abs(num);
  }
  return num;
}

// Parser de arquivo OFX (padrão universal dos bancos brasileiros)
export function parseOfxStatement(text: string, fileName: string): ParsedBankStatement {
  let bankName = 'Banco / Conta Corrente';
  let finalBalance = 0;
  let foundFinalBalance = false;
  let credits = 0;
  let debits = 0;
  let interestPaid = 0;
  let iofPaid = 0;
  let transactionCount = 0;
  let detectedAccount = '';

  // Identificação do banco no cabeçalho ou tags OFX
  const orgMatch = text.match(/<ORG>([^<\r\n]+)/i);
  const fidMatch = text.match(/<FID>([^<\r\n]+)/i);
  const bankIdMatch = text.match(/<BANKID>([^<\r\n]+)/i);
  const acctIdMatch = text.match(/<ACCTID>([^<\r\n]+)/i);

  if (acctIdMatch) detectedAccount = acctIdMatch[1].trim();

  const bankIdentifier = (orgMatch?.[1] || fidMatch?.[1] || bankIdMatch?.[1] || '').toUpperCase();
  if (bankIdentifier.includes('SANTANDER') || bankIdMatch?.[1] === '033') bankName = 'Santander';
  else if (bankIdentifier.includes('ITAU') || bankIdMatch?.[1] === '341') bankName = 'Itaú Unibanco';
  else if (bankIdentifier.includes('BRADESCO') || bankIdMatch?.[1] === '237') bankName = 'Bradesco';
  else if (bankIdentifier.includes('BRASIL') || bankIdMatch?.[1] === '001') bankName = 'Banco do Brasil';
  else if (bankIdentifier.includes('NUBANK') || bankIdMatch?.[1] === '260') bankName = 'Nubank';
  else if (bankIdentifier.includes('INTER') || bankIdMatch?.[1] === '077') bankName = 'Banco Inter';
  else if (bankIdentifier.includes('CAIXA') || bankIdMatch?.[1] === '104') bankName = 'Caixa Econômica';
  else if (orgMatch?.[1]) bankName = orgMatch[1].trim();

  // Saldo final no balanço contábil <LEDGERBAL> ou <AVAILBAL>
  const ledgerMatch = text.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([\-\d\.,]+)/i);
  const availMatch = text.match(/<AVAILBAL>[\s\S]*?<BALAMT>([\-\d\.,]+)/i);
  const balMatch = ledgerMatch || availMatch;

  if (balMatch) {
    finalBalance = parseBRLNumber(balMatch[1]);
    foundFinalBalance = true;
  }

  // Parse de todas as transações <STMTTRN>
  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let trnMatch;

  while ((trnMatch = trnRegex.exec(text)) !== null) {
    const block = trnMatch[1];
    const amtMatch = block.match(/<TRNAMT>([\-\d\.,]+)/i);
    const memoMatch = block.match(/<MEMO>([^<\r\n]+)/i);
    const memo = (memoMatch ? memoMatch[1] : '').toUpperCase();

    if (amtMatch) {
      const amt = parseBRLNumber(amtMatch[1]);
      transactionCount++;

      if (amt > 0) {
        credits += amt;
      } else {
        debits += Math.abs(amt);
      }

      // Detecção de juros de cheque especial / adiantamento depositante
      if (
        memo.includes('JUROS') ||
        memo.includes('ENCARGOS') ||
        memo.includes('CHEQUE ESPECIAL') ||
        memo.includes('LIS') ||
        memo.includes('ADIANT.DEPOSIT')
      ) {
        interestPaid += Math.abs(amt);
      }

      // Detecção de IOF
      if (memo.includes('IOF')) {
        iofPaid += Math.abs(amt);
      }
    }
  }

  // Se não achou tag formal de saldo, deduz do fluxo líquido
  const netFlow = credits - debits;
  const initialBalance = foundFinalBalance ? finalBalance - netFlow : 0;
  if (!foundFinalBalance) {
    finalBalance = netFlow;
  }

  return {
    bankName,
    fileName,
    initialBalance: Math.round(initialBalance * 100) / 100,
    finalBalance: Math.round(finalBalance * 100) / 100,
    credits: Math.round(credits * 100) / 100,
    debits: Math.round(debits * 100) / 100,
    interestPaid: Math.round(interestPaid * 100) / 100,
    iofPaid: Math.round(iofPaid * 100) / 100,
    transactionCount,
    detectedAccount,
  };
}

// Parser de arquivo CSV ou TXT de extrato bancário
export function parseCsvBankStatement(text: string, fileName: string): ParsedBankStatement {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let bankName = 'Extrato Bancário';
  let credits = 0;
  let debits = 0;
  let interestPaid = 0;
  let iofPaid = 0;
  let transactionCount = 0;
  let finalBalance = 0;
  let foundFinalBalance = false;
  let initialBalance = 0;

  // Tenta identificar o banco pelo nome do arquivo ou cabeçalho
  const upperFileName = fileName.toUpperCase();
  if (upperFileName.includes('SANTANDER')) bankName = 'Santander';
  else if (upperFileName.includes('ITAU')) bankName = 'Itaú Unibanco';
  else if (upperFileName.includes('BRADESCO')) bankName = 'Bradesco';
  else if (upperFileName.includes('NUBANK') || upperFileName.includes('NUCONTA')) bankName = 'Nubank';
  else if (upperFileName.includes('INTER')) bankName = 'Banco Inter';
  else if (upperFileName.includes('BB') || upperFileName.includes('BRASIL')) bankName = 'Banco do Brasil';

  // Analisa cada linha
  let balanceCandidates: number[] = [];

  for (const line of lines) {
    const upperLine = line.toUpperCase();

    // Verifica se a linha contém indicação de saldo final/atual
    if (
      upperLine.includes('SALDO FINAL') ||
      upperLine.includes('SALDO ATUAL') ||
      upperLine.includes('SALDO DISPONIVEL') ||
      upperLine.includes('SALDO EM CONTA') ||
      upperLine.includes('SALDO DO DIA')
    ) {
      // Procura valores na linha
      const tokens = line.split(/[;,\t]/);
      for (let i = tokens.length - 1; i >= 0; i--) {
        const val = parseBRLNumber(tokens[i]);
        if (tokens[i].match(/[\d]/)) {
          finalBalance = val;
          foundFinalBalance = true;
          break;
        }
      }
    }

    // Identificação de transações
    const sep = line.includes(';') ? ';' : line.includes('\t') ? '\t' : ',';
    const parts = line.split(sep).map((p) => p.trim());

    if (parts.length >= 2) {
      // Procura coluna com data (DD/MM ou YYYY-MM)
      const hasDate = parts.some((p) => /^\d{2}[\/\-]\d{2}([\/\-]\d{2,4})?$/.test(p) || /^\d{4}\-\d{2}\-\d{2}$/.test(p));
      if (!hasDate) continue;

      // Procura colunas numéricas
      let rowAmount = 0;
      let rowDesc = '';
      let rowBalance: number | null = null;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (/[a-zA-ZÀ-ÿ]{3,}/.test(part) && !/^\d+$/.test(part)) {
          if (!rowDesc || part.length > rowDesc.length) rowDesc = part;
        }
      }

      // Procura valor e possível saldo corrente
      const numbersInRow: number[] = [];
      for (const part of parts) {
        if (/[\d]/.test(part) && !/^\d{2}[\/\-]\d{2}/.test(part) && !/^\d{4}\-/.test(part)) {
          const n = parseBRLNumber(part);
          if (n !== 0 || part === '0' || part === '0,00') {
            numbersInRow.push(n);
          }
        }
      }

      if (numbersInRow.length > 0) {
        rowAmount = numbersInRow[0];
        if (numbersInRow.length > 1) {
          rowBalance = numbersInRow[numbersInRow.length - 1];
          balanceCandidates.push(rowBalance);
        }

        transactionCount++;
        if (rowAmount > 0) {
          credits += rowAmount;
        } else {
          debits += Math.abs(rowAmount);
        }

        const upperDesc = (rowDesc || upperLine).toUpperCase();
        if (
          upperDesc.includes('JUROS') ||
          upperDesc.includes('ENCARGOS') ||
          upperDesc.includes('CHEQUE ESPECIAL') ||
          upperDesc.includes('LIS')
        ) {
          interestPaid += Math.abs(rowAmount);
        }
        if (upperDesc.includes('IOF')) {
          iofPaid += Math.abs(rowAmount);
        }
      }
    }
  }

  // Se não achou tag explícita de saldo, mas tem candidatos de saldo no extrato
  if (!foundFinalBalance && balanceCandidates.length > 0) {
    finalBalance = balanceCandidates[balanceCandidates.length - 1];
    foundFinalBalance = true;
  }

  const netFlow = credits - debits;
  initialBalance = foundFinalBalance ? finalBalance - netFlow : 0;
  if (!foundFinalBalance) {
    finalBalance = netFlow;
  }

  return {
    bankName,
    fileName,
    initialBalance: Math.round(initialBalance * 100) / 100,
    finalBalance: Math.round(finalBalance * 100) / 100,
    credits: Math.round(credits * 100) / 100,
    debits: Math.round(debits * 100) / 100,
    interestPaid: Math.round(interestPaid * 100) / 100,
    iofPaid: Math.round(iofPaid * 100) / 100,
    transactionCount,
  };
}

// Roteador unificado para processar qualquer arquivo de extrato
export async function parseBankStatementFile(file: File): Promise<ParsedBankStatement> {
  const text = await file.text();
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.ofx')) {
    return parseOfxStatement(text, file.name);
  }
  return parseCsvBankStatement(text, file.name);
}

/**
 * Cálculo de Projeção de Dívida, Juros e IOF para o próximo mês
 * @param balance Saldo bancário consolidado final do mês
 * @param overdraftRateMonthly Taxa de cheque especial (% a.m. - ex: 8.0)
 * @param overdraftFreeDays Dias sem juros concedidos (ex: 10 dias Santander)
 * @param daysInOverdraft Dias estimados no cheque especial durante o próximo mês (padrão 30)
 */
export function calculateOverdraftProjections(
  balance: number,
  overdraftRateMonthly: number = 8.0,
  overdraftFreeDays: number = 0,
  daysInOverdraft: number = 30
): {
  isOverdraft: boolean;
  debtAmount: number;
  taxableDays: number;
  projectedInterest: number;
  projectedIofFixed: number;
  projectedIofDaily: number;
  totalProjectedIof: number;
  totalProjectedCost: number;
  nextMonthProjectedBalanceWithFees: number;
} {
  if (balance >= 0) {
    return {
      isOverdraft: false,
      debtAmount: 0,
      taxableDays: 0,
      projectedInterest: 0,
      projectedIofFixed: 0,
      projectedIofDaily: 0,
      totalProjectedIof: 0,
      totalProjectedCost: 0,
      nextMonthProjectedBalanceWithFees: balance,
    };
  }

  const debtAmount = Math.abs(balance);

  // Se os dias de uso forem menores ou iguais aos dias grátis, juros são ZERO!
  const taxableDays = Math.max(0, daysInOverdraft - overdraftFreeDays);

  // Juros proporcionais aos dias tributados (taxa mensal dividida por 30)
  const dailyRate = (overdraftRateMonthly / 100) / 30;
  const projectedInterest = taxableDays > 0 ? debtAmount * dailyRate * taxableDays : 0;

  // IOF sobre cheque especial:
  // Alíquota adicional fixa: 0,38% sobre a concessão do crédito
  // Alíquota diária: 0,0082% ao dia (PJ) ou 0,0082% (PF) limitado a 365 dias
  const projectedIofFixed = debtAmount * 0.0038;
  const projectedIofDaily = debtAmount * 0.000082 * Math.min(30, daysInOverdraft);
  const totalProjectedIof = projectedIofFixed + projectedIofDaily;

  const totalProjectedCost = projectedInterest + totalProjectedIof;
  const nextMonthProjectedBalanceWithFees = -(debtAmount + totalProjectedCost);

  return {
    isOverdraft: true,
    debtAmount: Math.round(debtAmount * 100) / 100,
    taxableDays,
    projectedInterest: Math.round(projectedInterest * 100) / 100,
    projectedIofFixed: Math.round(projectedIofFixed * 100) / 100,
    projectedIofDaily: Math.round(projectedIofDaily * 100) / 100,
    totalProjectedIof: Math.round(totalProjectedIof * 100) / 100,
    totalProjectedCost: Math.round(totalProjectedCost * 100) / 100,
    nextMonthProjectedBalanceWithFees: Math.round(nextMonthProjectedBalanceWithFees * 100) / 100,
  };
}
