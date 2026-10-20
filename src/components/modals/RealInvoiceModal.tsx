import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, Calculator, Calendar } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatBRL, getInstallmentInfo, getMonthDiff } from '../../utils/calculations';

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
  const diff = !isNaN(parsedReal) && parsedReal > detailedSum ? parsedReal - detailedSum : 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === '') {
      setCardRealInvoice(cardId, targetMonth, undefined, paymentDate);
    } else {
      setCardRealInvoice(cardId, targetMonth, parsedReal, paymentDate);
    }
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
              <h3 className="text-sm font-bold text-white">Informar / Ajustar Fatura Real</h3>
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

            <div className="space-y-1">
              <label className="font-semibold text-zinc-300 block">
                Data do Pagamento
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

          <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Soma dos lançamentos detalhados ({selectedSummary?.label}):</span>
              <strong className="text-zinc-200 font-mono-numbers">{formatBRL(detailedSum)}</strong>
            </div>

            {diff > 0 && (
              <div className="flex justify-between text-amber-400 font-medium">
                <span>Diferença a ser ajustada:</span>
                <span className="font-mono-numbers">+{formatBRL(diff)}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-zinc-200">
              Valor Total Fechado na Fatura do Banco (R$):
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 1420.50"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono-numbers text-base font-bold outline-none focus:border-emerald-500"
                autoFocus
              />
              <span className="absolute right-3 top-3 text-xs text-zinc-400">BRL</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Se a fatura do banco for maior do que os itens lançados, a diferença será somada automaticamente na Matriz Anual para manter seu fluxo de caixa 100% fiel à realidade.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            {card.realInvoiceTotalByMonth?.[targetMonth] !== undefined ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-rose-400 hover:text-rose-300 font-medium text-xs transition"
              >
                Remover Ajuste
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-md shadow-emerald-500/20"
              >
                Salvar Fatura
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
