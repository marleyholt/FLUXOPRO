import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard as CreditCardIcon,
  AlertTriangle,
  CheckCircle2,
  Percent,
  ArrowRight,
  TrendingDown,
  Info,
} from 'lucide-react';
import { CreditCard } from '../../types/finance';
import { useFinance } from '../../context/FinanceContext';
import { formatBRL, getMonthLabel, addMonths } from '../../utils/calculations';

interface CardInvoicePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CreditCard | null;
  month: string;
  totalAmount: number;
}

export const CardInvoicePaymentModal: React.FC<CardInvoicePaymentModalProps> = ({
  isOpen,
  onClose,
  card,
  month,
  totalAmount,
}) => {
  const { payCardInvoiceWithRotativo } = useFinance();

  const [paymentMode, setPaymentMode] = useState<'full' | 'partial'>('full');
  const [paidInput, setPaidInput] = useState<string>('');
  const [customInterestRate, setCustomInterestRate] = useState<string>('');

  useEffect(() => {
    if (isOpen && card) {
      setPaymentMode('full');
      setPaidInput(totalAmount.toFixed(2));
      const defaultRate = card.rotativoRateMonthly !== undefined ? card.rotativoRateMonthly : 14.5;
      setCustomInterestRate(defaultRate.toString());
    }
  }, [isOpen, card, totalAmount]);

  if (!isOpen || !card) return null;

  const currentPaid = parseFloat(paidInput) || 0;
  const rotativoAmount = Math.max(0, totalAmount - (paymentMode === 'full' ? totalAmount : currentPaid));
  const rateNumber = parseFloat(customInterestRate) || 0;
  const calculatedInterest = rotativoAmount > 0 ? rotativoAmount * (rateNumber / 100) : 0;

  // Verifica se a fatura do mês anterior já estava no rotativo
  const prevMonth = addMonths(month, -1);
  const prevStatus = card.invoicePaymentStatusByMonth?.[prevMonth];
  const hadPrevRotativo = prevStatus === 'partial_late';

  const nextMonth = addMonths(month, 1);
  const nextMonthLabel = getMonthLabel(nextMonth);
  const currentMonthLabel = getMonthLabel(month);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMode === 'full') {
      payCardInvoiceWithRotativo(card.id, month, {
        paidAmount: totalAmount,
        isPartial: false,
      });
    } else {
      if (currentPaid <= 0) return;
      payCardInvoiceWithRotativo(card.id, month, {
        paidAmount: currentPaid,
        isPartial: true,
        rotativoAmount,
        interestAmount: calculatedInterest,
        interestRate: rateNumber,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CreditCardIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Pagamento de Fatura • {card.name}
              </h2>
              <p className="text-xs text-zinc-400">
                Competência: <strong className="text-zinc-200">{currentMonthLabel}</strong> | Total da Fatura:{' '}
                <strong className="text-emerald-400">{formatBRL(totalAmount)}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          {/* Alerta de rotativo consecutivo */}
          {hadPrevRotativo && (
            <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-600/40 text-amber-200 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-300 font-semibold mb-0.5">
                  Atenção: A fatura anterior ({getMonthLabel(prevMonth)}) já entrou no rotativo!
                </strong>
                Manter o rotativo de forma consecutiva pode gerar juros compostos elevados e comprometer o orçamento. Avalie uma renegociação ou quitação integral se possível.
              </div>
            </div>
          )}

          {/* Seleção do Tipo de Pagamento */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              Como foi realizado o pagamento?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setPaymentMode('full');
                  setPaidInput(totalAmount.toFixed(2));
                }}
                className={`p-3.5 rounded-xl border text-left transition ${
                  paymentMode === 'full'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-sm'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Pagamento Integral</span>
                  <CheckCircle2
                    className={`w-4 h-4 ${paymentMode === 'full' ? 'text-emerald-400' : 'text-zinc-600'}`}
                  />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Quita 100% da fatura ({formatBRL(totalAmount)}). Sem juros ou projeção de rotativo.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMode('partial');
                  if (parseFloat(paidInput) >= totalAmount || !paidInput) {
                    setPaidInput((totalAmount * 0.5).toFixed(2));
                  }
                }}
                className={`p-3.5 rounded-xl border text-left transition ${
                  paymentMode === 'partial'
                    ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-sm'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-300">Pagamento Parcial (Rotativo)</span>
                  <AlertTriangle
                    className={`w-4 h-4 ${paymentMode === 'partial' ? 'text-amber-400' : 'text-zinc-600'}`}
                  />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Paga um valor menor. O saldo restante e os juros serão projetados na próxima fatura.
                </p>
              </button>
            </div>
          </div>

          {/* Detalhes do Pagamento Parcial */}
          {paymentMode === 'partial' && (
            <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Valor Pago Efetivamente (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={totalAmount}
                    value={paidInput}
                    onChange={(e) => setPaidInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white font-mono-numbers outline-none focus:border-amber-500 font-bold"
                    placeholder="0,00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Taxa do Rotativo (% a.m.)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={customInterestRate}
                      onChange={(e) => setCustomInterestRate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white font-mono-numbers outline-none focus:border-amber-500 font-bold pr-8"
                      placeholder="14.5"
                    />
                    <Percent className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-3" />
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Cadastrado no cartão: {card.rotativoRateMonthly || 14.5}% a.m.
                  </span>
                </div>
              </div>

              {/* Box de Projeção para o próximo mês */}
              <div className="p-3.5 rounded-lg bg-zinc-900/90 border border-zinc-800/80 space-y-2 text-xs">
                <div className="text-zinc-300 font-semibold flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <ArrowRight className="w-3.5 h-3.5" />
                    Projeção Automática para a Fatura de {nextMonthLabel}:
                  </span>
                </div>

                <div className="flex items-center justify-between text-zinc-400 pt-1">
                  <span>1. Saldo Rotativado (Principal):</span>
                  <strong className="text-zinc-200 font-mono-numbers">
                    {formatBRL(rotativoAmount)}
                  </strong>
                </div>

                <div className="flex items-center justify-between text-zinc-400">
                  <span>2. Previsão de Juros do Rotativo ({rateNumber}% a.m.):</span>
                  <strong className="text-rose-400 font-mono-numbers">
                    + {formatBRL(calculatedInterest)}
                  </strong>
                </div>

                <div className="flex items-center justify-between text-white font-bold pt-2 border-t border-zinc-800">
                  <span>Total Acrescido na Próxima Fatura:</span>
                  <span className="text-amber-400 font-mono-numbers text-sm">
                    {formatBRL(rotativoAmount + calculatedInterest)}
                  </span>
                </div>

                <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800/50 text-[11px] text-zinc-400 flex items-start gap-1.5 mt-2">
                  <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                  <span>
                    Esses 2 lançamentos discriminados serão <strong>automaticamente removidos</strong> se você importar a fatura real de {nextMonthLabel}, evitando duplicidades.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Rodapé de Ações */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                paymentMode === 'full'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {paymentMode === 'full' ? 'Confirmar Quitação Integral' : 'Confirmar Pagamento com Rotativo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
