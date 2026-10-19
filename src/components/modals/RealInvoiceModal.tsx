import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, Calculator, Check } from 'lucide-react';
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
  const { data, selectedMonth, summaries, currentMonthSummary, setCardRealInvoice } =
    useFinance();

  const card = data.creditCards.find((c) => c.id === cardId);
  const current = currentMonthSummary || summaries[0];

  // Calculate detailed sum of active transactions for this card this month
  const cardTransactions = data.cardTransactions.filter(
    (tx) => tx.cardId === cardId && !tx.isPaused
  );

  let detailedSum = 0;
  cardTransactions.forEach((tx) => {
    if (tx.type === 'recurring') {
      if (getMonthDiff(tx.startMonth, selectedMonth) >= 0) {
        detailedSum += tx.installmentAmount;
      }
    } else if (tx.type === 'installment') {
      const inst = getInstallmentInfo(tx.startMonth, tx.totalInstallments, selectedMonth);
      if (inst.isActive) {
        detailedSum += tx.installmentAmount;
      }
    } else if (tx.type === 'single') {
      if (tx.startMonth === selectedMonth) {
        detailedSum += tx.installmentAmount;
      }
    }
  });

  const existingRealTotal = card?.realInvoiceTotalByMonth?.[selectedMonth];
  const [inputValue, setInputValue] = useState<string>(
    existingRealTotal !== undefined ? String(existingRealTotal) : ''
  );

  useEffect(() => {
    if (existingRealTotal !== undefined) {
      setInputValue(String(existingRealTotal));
    } else {
      setInputValue('');
    }
  }, [existingRealTotal, isOpen]);

  if (!isOpen || !card) return null;

  const parsedReal = parseFloat(inputValue);
  const diff =
    !isNaN(parsedReal) && parsedReal > detailedSum ? parsedReal - detailedSum : 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === '') {
      setCardRealInvoice(cardId, selectedMonth, undefined);
    } else {
      setCardRealInvoice(cardId, selectedMonth, parsedReal);
    }
    onClose();
  };

  const handleClear = () => {
    setCardRealInvoice(cardId, selectedMonth, undefined);
    onClose();
  };

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
              <h3 className="text-sm font-bold text-white">Ajustar Fatura Real ({card.name})</h3>
              <p className="text-[11px] text-zinc-400">Mês: {current.label}</p>
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
          <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Soma dos itens cadastrados:</span>
              <span className="font-mono-numbers font-semibold text-zinc-200">
                {formatBRL(detailedSum)}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Se a sua fatura fechou com valor maior que os lançamentos individuais, informe o total real abaixo. O sistema calculará a diferença automaticamente para fechar a projeção.
            </p>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-zinc-300">
              Valor Total Fechado na Fatura Real (R$)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder={`Ex: ${detailedSum ? detailedSum + 250 : '1500.00'}`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-emerald-500 text-sm font-bold"
            />
          </div>

          {diff > 0 && (
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-amber-400 font-bold block">
                  Diferença Não Mapeada Detectada:
                </span>
                <span className="text-[10px] text-zinc-400">
                  Gastos menores, juros ou compras não cadastradas
                </span>
              </div>
              <span className="font-mono-numbers font-extrabold text-amber-300 text-sm">
                +{formatBRL(diff)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            {existingRealTotal !== undefined && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-rose-400 transition"
              >
                Limpar Ajuste
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Salvar Total Real da Fatura</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
