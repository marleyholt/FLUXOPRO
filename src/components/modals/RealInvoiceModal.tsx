import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, Calculator, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatBRL, getInstallmentInfo, getMonthDiff } from '../../utils/calculations';
import { InvoicePaymentStatus } from '../../types/finance';

interface RealInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
}

export const RealInvoiceModal: React.FC<RealInvoiceModalProps> = ({
  isOpen,
  onClose,
  cardId,
}) => {
  const { data, selectedMonth, summaries, setCardRealInvoice } = useFinance();

  const card = data.creditCards.find((c) => c.id === cardId);

  // Mês da fatura selecionado (permite escolher qualquer mês)
  const [targetMonth, setTargetMonth] = useState<string>(selectedMonth);

  // Data de pagamento / vencimento da fatura
  const [paymentDate, setPaymentDate] = useState<string>('');

  const [inputValue, setInputValue] = useState<string>('');

  // Status e valor do pagamento
  const [paymentStatus, setPaymentStatus] = useState<InvoicePaymentStatus>('paid_on_time');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [paymentMonth, setPaymentMonth] = useState<string>(selectedMonth);

  useEffect(() => {
    if (isOpen) {
      setTargetMonth(selectedMonth);
    }
  }, [isOpen, selectedMonth]);

  useEffect(() => {
    if (card) {
      const existingVal = card.realInvoiceTotalByMonth?.[targetMonth];
      setInputValue(existingVal !== undefined ? String(existingVal) : '');

      const existingDate = card.invoicePaymentDateByMonth?.[targetMonth];
      if (existingDate) {
        setPaymentDate(existingDate);
      } else {
        const dayStr = String(card.dueDay).padStart(2, '0');
        setPaymentDate(`${targetMonth}-${dayStr}`);
      }

      const existingStatus = card.invoicePaymentStatusByMonth?.[targetMonth];
      setPaymentStatus(existingStatus || 'paid_on_time');

      const existingPaidAmt = card.invoicePaidAmountByMonth?.[targetMonth];
      setPaidAmountInput(existingPaidAmt !== undefined ? String(existingPaidAmt) : '');
      setPaymentMonth(card.invoicePaymentMonthByMonth?.[targetMonth] || targetMonth);
    }
  }, [card, targetMonth, isOpen]);

  if (!isOpen || !card) return null;

  // Calculate detailed sum of active transactions for this card this target month
  const cardTransactions = data.cardTransactions.filter(
    (tx) => tx.cardId === cardId && !tx.isPaused
  );

  let detailedSum = 0;
  cardTransactions.forEach((tx) => {
    if (tx.type === 'recurring') {
      if (getMonthDiff(tx.startMonth, targetMonth) >= 0) {
        detailedSum += tx.installmentAmount;
      }
    } else if (tx.type === 'installment') {
      const inst = getInstallmentInfo(tx.startMonth, tx.totalInstallments, targetMonth);
      if (inst.isActive) {
        detailedSum += tx.installmentAmount;
      }
    } else if (tx.type === 'single') {
      if (tx.startMonth === targetMonth) {
        detailedSum += tx.installmentAmount;
      }
    }
  });

  const parsedReal = parseFloat(inputValue);
  const parsedPaid = parseFloat(paidAmountInput);
  const diff = !isNaN(parsedReal) && parsedReal > detailedSum ? parsedReal - detailedSum : 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const realVal = inputValue.trim() === '' ? undefined : parsedReal;
    const paidVal = paidAmountInput.trim() === '' ? undefined : parsedPaid;

    setCardRealInvoice(cardId, targetMonth, realVal, paymentDate, paymentStatus, paidVal, paymentMonth);
    onClose();
  };

  const handleClear = () => {
    setCardRealInvoice(cardId, targetMonth, undefined);
    onClose();
  };

  const selectedSummary = summaries.find((s) => s.month === targetMonth) || summaries[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: card.color }}
            >
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Informar / Ajustar Fatura & Status</h3>
              <p className="text-[11px] text-zinc-400">Cartão: {card.name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {/* Seletores: Mês da Fatura e Data de Pagamento */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
            <div className="space-y-1">
              <label className="font-semibold text-zinc-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                Mês da Fatura
              </label>
              <select
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-white outline-none focus:border-emerald-500 font-mono-numbers"
              >
                {summaries.map((s) => (
                  <option key={s.month} value={s.month}>
                    {s.label} ({s.month})
                  </option>
                ))}
              </select>
            </div>
          {/* Mês de Desembolso / Pagamento */}
          <div className="space-y-1 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
            <label className="font-semibold text-emerald-300 block mb-1">
              Mês de Desembolso / Pagamento Efetivo na Matriz
            </label>
            <select
              value={paymentMonth}
              onChange={(e) => setPaymentMonth(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-white outline-none focus:border-emerald-500 font-mono-numbers text-xs"
            >
              {summaries.map((s) => (
                <option key={s.month} value={s.month}>
                  {s.label} ({s.month}) {s.month === targetMonth ? '(Mes da Fatura)' : ''}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-zinc-400 mt-1">
              Define em qual mês a grana sai da conta para influenciar o fluxo de caixa, gráficos e tendências.
            </p>
          </div>

            <div className="space-y-1">
              <label className="font-semibold text-zinc-300 block">
                Data de Vencimento / Pgto
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-white outline-none focus:border-emerald-500 font-mono-numbers"
              />
            </div>
          </div>

          {/* Status de Pagamento */}
          <div className="space-y-1.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
            <label className="font-semibold text-zinc-300 block flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Status do Pagamento da Fatura
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as InvoicePaymentStatus)}
              className="w-full px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white outline-none focus:border-indigo-500 font-medium"
            >
              <option value="paid_on_time">🟢 Pago integral no vencimento</option>
              <option value="paid_late">🟡 Pago com atraso (com encargos)</option>
              <option value="partial_late">🟠 Pagamento parcial com atraso (Rotativo/Parcelado)</option>
              <option value="unpaid">⚪ Em aberto / Não paga ainda (Pendente)</option>
            </select>
          </div>

          {/* Se pagamento for parcial, exibe campo do valor pago */}
          {paymentStatus === 'partial_late' && (
            <div className="space-y-1 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
              <label className="font-semibold text-amber-200 block">
                Valor Realmente Pago nesta Fatura (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 1200.00"
                value={paidAmountInput}
                onChange={(e) => setPaidAmountInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-amber-500/50 text-white font-mono-numbers outline-none focus:border-amber-400"
              />
              <p className="text-[10px] text-amber-300/80 mt-1">
                O saldo remanescente não pago será automaticamente somado ao rotativo / saldo devedor do próximo mês.
              </p>
            </div>
          )}

          <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Soma dos lançamentos detalhados ({selectedSummary?.label}):</span>
              <strong className="text-zinc-200 font-mono-numbers">{formatBRL(detailedSum)}</strong>
            </div>

            <div className="space-y-1 pt-1">
              <label className="font-semibold text-zinc-200 block">
                Valor Total da Fatura (Extrato do Banco / Operadora)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-zinc-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder={detailedSum.toFixed(2)}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-emerald-500 font-bold"
                />
              </div>
              <p className="text-[10px] text-zinc-500">
                Se deixar em branco, o sistema usará a soma automática dos lançamentos ({formatBRL(detailedSum)}).
              </p>
            </div>

            {diff > 0 && (
              <div className="pt-2 flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  Há uma diferença de <strong>{formatBRL(diff)}</strong> acima dos lançamentos detalhados (provavelmente taxas, IOF ou despesas avulsas). O sistema consolidará este valor total.
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
            {card.realInvoiceTotalByMonth?.[targetMonth] !== undefined ? (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
              >
                Remover Ajuste Real
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-md shadow-emerald-500/20"
              >
                Salvar Fatura & Status
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
