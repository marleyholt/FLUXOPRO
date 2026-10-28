import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  Sparkles,
  Calendar,
  Building2,
  FileText,
} from 'lucide-react';
import { PushedDebtBill } from '../../types/finance';
import { useFinance } from '../../context/FinanceContext';
import { formatBRL } from '../../utils/calculations';

interface DebtSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: PushedDebtBill | null;
}

export const DebtSettlementModal: React.FC<DebtSettlementModalProps> = ({
  isOpen,
  onClose,
  debt,
}) => {
  const { settlePushedDebt } = useFinance();

  const [isNegotiated, setIsNegotiated] = useState(false);
  const [actualPaidAmount, setActualPaidAmount] = useState('');
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [negotiationNotes, setNegotiationNotes] = useState('');

  useEffect(() => {
    if (isOpen && debt) {
      setIsNegotiated(false);
      setActualPaidAmount(debt.amount.toFixed(2));
      setPaidDate(new Date().toISOString().split('T')[0]);
      setNegotiationNotes(debt.reason || '');
    }
  }, [isOpen, debt]);

  if (!isOpen || !debt) return null;

  const paidNum = parseFloat(actualPaidAmount) || 0;
  const discount = Math.max(0, debt.amount - paidNum);
  const discountPercent = debt.amount > 0 ? ((discount / debt.amount) * 100).toFixed(1) : '0';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paidNum < 0) return;

    settlePushedDebt(debt.id, {
      actualPaidAmount: paidNum,
      isNegotiated,
      paidDate,
      negotiationNotes: negotiationNotes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Quitar / Negociar Dívida
              </h2>
              <p className="text-xs text-zinc-400">
                {debt.creditorSource ? `${debt.creditorSource} • ` : ''}{debt.expenseTitle}
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Card Resumo do Valor Original */}
          <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-zinc-400 block">Saldo Devedor Registrado:</span>
              <span className="text-lg font-bold font-mono-numbers text-white">
                {formatBRL(debt.amount)}
              </span>
            </div>
            {debt.creditorSource && (
              <div className="text-right">
                <span className="text-[11px] text-zinc-400 block">Credor / Origem:</span>
                <span className="text-xs font-semibold text-amber-300">
                  {debt.creditorSource}
                </span>
              </div>
            )}
          </div>

          {/* Toggle Negociação com Desconto */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-200 block">
                  Houve negociação ou acordo com desconto?
                </span>
                <span className="text-[11px] text-zinc-400">
                  Permite abater encargos e registrar a economia real obtida
                </span>
              </div>
              <input
                type="checkbox"
                checked={isNegotiated}
                onChange={(e) => {
                  setIsNegotiated(e.target.checked);
                  if (!e.target.checked) {
                    setActualPaidAmount(debt.amount.toFixed(2));
                  }
                }}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-zinc-900 border-zinc-700 cursor-pointer"
              />
            </div>

            {isNegotiated && (
              <div className="pt-2 space-y-3 border-t border-zinc-800/80">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Valor Efetivamente Pago após Negociação (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={actualPaidAmount}
                    onChange={(e) => setActualPaidAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm font-mono-numbers text-emerald-400 font-bold outline-none focus:border-emerald-500"
                    placeholder="0,00"
                  />
                </div>

                {discount > 0 && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Economia Obtida na Negociação:
                    </span>
                    <strong className="font-mono-numbers text-sm">
                      {formatBRL(discount)} ({discountPercent}%)
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Data do Pagamento */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Data da Quitação / Pagamento *
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="date"
                required
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Anotações da Negociação */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Anotações do Acordo / Comprovante (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Acordo fechado pelo portal Serasa Limpa Nome, quitado via PIX com comprovante nº..."
              value={negotiationNotes}
              onChange={(e) => setNegotiationNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Rodapé de Ações */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar Quitação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
