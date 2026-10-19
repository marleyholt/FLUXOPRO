import { CsvParsedItem } from '../types/finance';
import { addMonths } from './calculations';

// Smart CSV parser for Brazilian credit card statements (Nubank, Itaú, Bradesco, Inter, etc.)
export function parseCreditCardCsv(csvContent: string, targetMonth: string): CsvParsedItem[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // Determine separator (comma or semicolon)
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const separator = semiCount > commaCount ? ';' : ',';

  // Helper to split line with quote awareness
  const splitLine = (text: string): string[] => {
    const pattern = new RegExp(
      `(?:^|${separator})(?:"([^"]*(?:""[^"]*)*)"|([^"${separator}]*))`,
      'g'
    );
    const matches: string[] = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      matches.push((match[1] || match[2] || '').trim());
      if (pattern.lastIndex === 0) break;
    }
    return matches;
  };

  const header = splitLine(firstLine).map((h) => h.toLowerCase());

  // Find column indices
  let dateIdx = header.findIndex((h) => h.includes('data') || h.includes('date'));
  let descIdx = header.findIndex(
    (h) =>
      h.includes('descri') ||
      h.includes('título') ||
      h.includes('titulo') ||
      h.includes('title') ||
      h.includes('estabelecimento') ||
      h.includes('historico')
  );
  let amountIdx = header.findIndex(
    (h) => h.includes('valor') || h.includes('amount') || h.includes('quantia')
  );
  let catIdx = header.findIndex(
    (h) => h.includes('categor') || h.includes('category')
  );

  // Fallbacks if no header detected
  if (dateIdx === -1 && header.length >= 3) dateIdx = 0;
  if (descIdx === -1 && header.length >= 3) descIdx = 1;
  if (amountIdx === -1 && header.length >= 3) amountIdx = 2;

  const items: CsvParsedItem[] = [];
  const startRow = (dateIdx !== -1 && (header[dateIdx].includes('data') || header[dateIdx].includes('date'))) ? 1 : 0;

  for (let i = startRow; i < lines.length; i++) {
    const rawCols = splitLine(lines[i]);
    if (rawCols.length < 2) continue;

    const rawDate = rawCols[dateIdx] || '';
    const rawDesc = rawCols[descIdx] || rawCols[0] || 'Lançamento Cartão';
    const rawAmount = rawCols[amountIdx] || rawCols[rawCols.length - 1] || '0';
    const rawCat = catIdx !== -1 ? rawCols[catIdx] : 'Fatura';

    // Parse amount
    // Clean currency symbols, spaces, handles both 1.250,50 and 1250.50
    let cleanAmountStr = rawAmount
      .replace(/R\$/gi, '')
      .replace(/\s/g, '')
      .replace(/[()]/g, '');

    // If both dot and comma exist, e.g. 1.250,50
    if (cleanAmountStr.includes('.') && cleanAmountStr.includes(',')) {
      cleanAmountStr = cleanAmountStr.replace(/\./g, '').replace(',', '.');
    } else if (cleanAmountStr.includes(',')) {
      cleanAmountStr = cleanAmountStr.replace(',', '.');
    }

    let parsedAmount = Math.abs(parseFloat(cleanAmountStr));
    if (isNaN(parsedAmount) || parsedAmount === 0) continue;

    // Filter out payments (e.g. "Pagamento recebido", "Pagamento de fatura")
    const lowerDesc = rawDesc.toLowerCase();
    const isPayment =
      lowerDesc.includes('pagamento recebido') ||
      lowerDesc.includes('pagamento de fatura') ||
      lowerDesc.includes('pagamento efetuado');

    // Detect installments in description, e.g. "Magazine Luiza - Parcela 02/10" or "02/10"
    let installmentsCurrent: number | undefined;
    let installmentsTotal: number | undefined;
    let cleanDesc = rawDesc;

    const installmentRegex = /(?:parcela\s*)?(\d{1,2})\s*[\/|de]\s*(\d{1,2})/i;
    const match = rawDesc.match(installmentRegex);

    if (match) {
      const current = parseInt(match[1], 10);
      const total = parseInt(match[2], 10);
      if (total >= 2 && current <= total) {
        installmentsCurrent = current;
        installmentsTotal = total;
        // Clean out suffix for clean name
        cleanDesc = rawDesc.replace(match[0], '').replace(/[-–—]\s*$/, '').trim();
      }
    }

    // Flag for review if description looks suspicious or unusually high
    const needsReview =
      lowerDesc.includes('desconhecid') ||
      lowerDesc.includes('pendente') ||
      lowerDesc.includes('checar') ||
      parsedAmount > 1500;

    items.push({
      id: `csv-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      date: rawDate,
      description: cleanDesc,
      amount: parsedAmount,
      installmentsCurrent,
      installmentsTotal,
      category: rawCat || 'Fatura Cartão',
      selected: !isPayment,
      needsReview,
    });
  }

  return items;
}

// Convert approved CSV item to a CardTransaction for the store
export function convertCsvItemToTransaction(
  item: CsvParsedItem,
  cardId: string,
  invoiceMonth: string
) {
  let type: 'recurring' | 'installment' | 'single' = 'single';
  let totalInstallments = 1;
  let startMonth = invoiceMonth;

  if (item.installmentsTotal && item.installmentsTotal > 1) {
    type = 'installment';
    totalInstallments = item.installmentsTotal;
    const current = item.installmentsCurrent || 1;
    // Calculate backwards starting month: start = invoiceMonth - (current - 1)
    const offsetMonths = -(current - 1);
    startMonth = addMonths(invoiceMonth, offsetMonths);
  }

  return {
    id: `tx-csv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cardId,
    description: item.description,
    type,
    installmentAmount: item.amount,
    totalAmount: item.amount * totalInstallments,
    totalInstallments,
    startMonth,
    category: item.category || 'Fatura Cartão',
    needsReview: item.needsReview,
    importedFromCsv: true,
  };
}
