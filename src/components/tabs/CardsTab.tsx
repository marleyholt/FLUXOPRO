import React, { useState } from 'react';
import {
  CreditCard as CreditCardIcon,
  Plus,
  Upload,
  AlertTriangle,
  Sparkles,
  Calendar,
  CheckCircle,
  Trash2,
  Edit2,
  DollarSign,
  TrendingDown,
  Info,
  Clock,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  formatBRL,
  getInstallmentInfo,
  getMonthDiff,
  addMonths,
  getMonthLabel,
} from '../../utils/calculations';

interface CardsTabProps {
  onOpenNewTransaction: () => void;
  onOpenCsvImport: () => void;
  onOpenRealInvoiceModal: (cardId: string) => void;
}

export const CardsTab: React.FC<CardsTabProps> = ({
  onOpenNewTransaction,
  onOpenCsvImport,
  onOpenRealInvoiceModal,
}) => {
  const {
    data,
    selectedMonth,
    summaries,
    currentMonthSummary,
    toggleCardTransactionReview,
    deleteCardTransaction,
    setCardRealInvoice,
  } = useFinance();

  const [selectedCardId, setSelectedCardId] = useState<string>(
    data.creditCards[0]?.id || ''
  );
  const [filterType, setFilterType] = useState<
    'ALL' | 'INSTALLMENT' | 'RECURRING' | 'REVIEW'
  >('ALL');

  const current = currentMonthSummary || summaries[0];
  const activeCard =
    data.creditCards.find((c) => c.id === selectedCardId) || data.creditCards[0];

  if (!activeCard) {
    return (
      <div className="p-8 text-center text-zinc-400">
        Nenhum cartão cadastrado. Adicione um novo cartão em "Novo Lançamento".
      </div>
    );
  }

  // All transactions for active card
  const cardTransactions = data.cardTransactions.filter(
    (tx) => tx.cardId === activeCard.id
  );

  // Filter transactions
  const filteredTransactions = cardTransactions.filter((tx) => {
    if (filterType === 'INSTALLMENT') return tx.type === 'installment';
    if (filterType === 'RECURRING') return tx.type === 'recurring';
    if (filterType === 'REVIEW') return tx.needsReview;
    return true;
  });

  // Calculate numbers for active card in selected month
  let detailedSumThisMonth = 0;
  let recurringSum = 0;
  let installmentSum = 0;

  cardTransactions.forEach((tx) => {
    if (tx.isPaused) return;

    if (tx.type === 'recurring') {
      if (getMonthDiff(tx.startMonth, selectedMonth) >= 0) {
        detailedSumThisMonth += tx.installmentAmount;
        recurringSum += tx.installmentAmount;
      }
    } else if (tx.type === 'installment') {
      const inst = getInstallmentInfo(tx.startMonth, tx.totalInstallments, selectedMonth);
      if (inst.isActive) {
        detailedSumThisMonth += tx.installmentAmount;
        installmentSum += tx.installmentAmount;
      }
    } else if (tx.type === 'single') {
      if (tx.startMonth === selectedMonth) {
        detailedSumThisMonth += tx.installmentAmount;
        installmentSum += tx.installmentAmount;
      }
    }
  });

  const realInvoice = activeCard.realInvoiceTotalByMonth?.[selectedMonth];
  const unmappedDiff =
    realInvoice !== undefined && realInvoice > detailedSumThisMonth
      ? realInvoice - detailedSumThisMonth
      : 0;
  const effectiveInvoiceTotal = Math.max(detailedSumThisMonth, realInvoice || 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Card Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {data.creditCards.map((card) => {
          const isSelected = card.id === activeCard.id;
          const invoiceThisMonth = current.cardTotalsByCard[card.id] || 0;
          return (
            <button
              key={card.id}
              onClick={() => setSelectedCardId(card.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition ${
                isSelected
                  ? 'bg-zinc-900 border-zinc-700 text-white shadow-md'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: card.color }}
              />
              <span>{card.name}</span>
              <span className="font-mono-numbers text-zinc-400 font-normal">
                ({formatBRL(invoiceThisMonth)})
              </span>
            </button>
          );
        })}

        <button
          onClick={onOpenCsvImport}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-emerald-500/30 transition shrink-0 ml-auto"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Importar CSV</span>
        </button>
      </div>

      {/* Active Card Executive Banner */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm relative overflow-hidden">
        <div
          className="absolute -top-12 -right-12 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ backgroundColor: activeCard.color }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: activeCard.color }}
              />
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                {activeCard.name}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold uppercase">
                {activeCard.scope}
              </span>
            </div>

            <p className="text-xs text-zinc-400 flex items-center gap-3">
              <span>Vencimento: Dia <strong>{activeCard.dueDay}</strong></span>
              <span>•</span>
              <span>Fechamento: Dia <strong>{activeCard.closingDay}</strong></span>
              <span>•</span>
              <span>Banco: <strong>{activeCard.bank}</strong></span>
            </p>
          </div>

          {/* Invoice Reconciliation Cards */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Detailed Sum */}
            <div className="px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
              <span className="text-zinc-400 block text-[11px]">Soma dos Itens:</span>
              <span className="font-mono-numbers font-bold text-zinc-200 text-sm">
                {formatBRL(detailedSumThisMonth)}
              </span>
            </div>

            {/* Unmapped Diff */}
            {unmappedDiff > 0 && (
              <div className="px-3.5 py-2 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs">
                <span className="text-amber-400 block text-[11px] font-semibold">
                  Diferença Não Mapeada:
                </span>
                <span className="font-mono-numbers font-bold text-amber-300 text-sm">
                  +{formatBRL(unmappedDiff)}
                </span>
              </div>
            )}

            {/* Effective Invoice Total */}
            <div className="px-4 py-2 rounded-xl bg-zinc-950 border border-emerald-500/30 text-xs shadow-sm">
              <span className="text-emerald-400 block text-[11px] font-semibold">
                Fatura Total ({current.label}):
              </span>
              <span className="font-mono-numbers font-extrabold text-emerald-300 text-base">
                {formatBRL(effectiveInvoiceTotal)}
              </span>
              {activeCard.invoicePaymentDateByMonth?.[selectedMonth] ? (
                <span className="text-[10px] text-zinc-300 block font-mono-numbers mt-0.5">
                  Pgto: {new Date(activeCard.invoicePaymentDateByMonth[selectedMonth] + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-400 block font-mono-numbers mt-0.5">
                  Venc. padrão: Dia {activeCard.dueDay}
                </span>
              )}
            </div>

            {/* Adjust Real Invoice Button */}
            <button
              onClick={() => onOpenRealInvoiceModal(activeCard.id)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
              title="Informar o valor exato fechado no extrato do cartão deste mês"
            >
              {realInvoice !== undefined ? 'Ajustar Fatura Real' : 'Informar Fatura Real'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              filterType === 'ALL'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todos ({cardTransactions.length})
          </button>
          <button
            onClick={() => setFilterType('INSTALLMENT')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              filterType === 'INSTALLMENT'
                ? 'bg-zinc-800 text-indigo-300 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Parcelamentos ({cardTransactions.filter((t) => t.type === 'installment').length})
          </button>
          <button
            onClick={() => setFilterType('RECURRING')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              filterType === 'RECURRING'
                ? 'bg-zinc-800 text-amber-300 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Assinaturas Fixas ({cardTransactions.filter((t) => t.type === 'recurring').length})
          </button>
          <button
            onClick={() => setFilterType('REVIEW')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              filterType === 'REVIEW'
                ? 'bg-zinc-800 text-amber-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ⚠️ Verificar ({cardTransactions.filter((t) => t.needsReview).length})
          </button>
        </div>

        <button
          onClick={onOpenNewTransaction}
          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition flex items-center gap-1.5 shrink-0 self-end sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Nova Compra ou Assinatura</span>
        </button>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400 rounded-2xl bg-zinc-900/40 border border-zinc-800">
            Nenhuma transação encontrada para este filtro no cartão selecionado.
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isRecurring = tx.type === 'recurring';
            const isInstallment = tx.type === 'installment';
            const instInfo = isInstallment
              ? getInstallmentInfo(tx.startMonth, tx.totalInstallments, selectedMonth)
              : null;

            // Calculate end month for installments
            const endMonth = isInstallment
              ? addMonths(tx.startMonth, tx.totalInstallments - 1)
              : null;

            // Remaining balance for installment
            const remainingInstallments = instInfo
              ? Math.max(0, tx.totalInstallments - instInfo.current + 1)
              : 0;
            const remainingBalance = remainingInstallments * tx.installmentAmount;

            return (
              <div
                key={tx.id}
                className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  tx.needsReview
                    ? 'bg-amber-950/10 border-amber-500/30'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Left Description & Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-zinc-100 text-sm truncate">
                      {tx.description}
                    </span>

                    {/* Badge type */}
                    {isRecurring ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Assinatura Mensal
                      </span>
                    ) : isInstallment ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {instInfo?.isActive
                          ? `Parcela ${instInfo.current} de ${instInfo.total}`
                          : `${tx.totalInstallments}x Parcelas`}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300">
                        Compra Única
                      </span>
                    )}

                    {/* Tag ⚠️ Verificar */}
                    {tx.needsReview && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Verificar
                      </span>
                    )}

                    {tx.importedFromCsv && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-800 text-zinc-400">
                        CSV
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-3">
                    <span>Categoria: {tx.category}</span>
                    {endMonth && (
                      <>
                        <span>•</span>
                        <span>Término: <strong>{getMonthLabel(endMonth)}</strong></span>
                      </>
                    )}
                    {tx.notes && (
                      <>
                        <span>•</span>
                        <span className="text-zinc-400 italic">"{tx.notes}"</span>
                      </>
                    )}
                  </div>

                  {/* Installment Progress Bar */}
                  {isInstallment && instInfo && (
                    <div className="max-w-md pt-1">
                      <div className="flex justify-between text-[10px] text-zinc-400 mb-1 font-mono-numbers">
                        <span>Progresso: {instInfo.current}/{instInfo.total}</span>
                        <span>Saldo Restante: {formatBRL(remainingBalance)}</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (instInfo.current / instInfo.total) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Value & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800">
                  <div className="text-left md:text-right">
                    <span className="text-xs text-zinc-400 block text-[11px]">
                      {isRecurring ? 'Mensalidade:' : 'Parcela no Mês:'}
                    </span>
                    <span className="text-base font-extrabold font-mono-numbers text-white">
                      {formatBRL(tx.installmentAmount)}
                    </span>
                    {tx.totalAmount && tx.totalAmount > tx.installmentAmount && (
                      <span className="block text-[10px] font-mono-numbers text-zinc-400">
                        Total da Compra: {formatBRL(tx.totalAmount)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleCardTransactionReview(tx.id)}
                      className={`p-2 rounded-lg text-xs transition border ${
                        tx.needsReview
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60 hover:text-amber-300'
                      }`}
                      title="Marcar / Desmarcar como ⚠️ Verificar"
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => deleteCardTransaction(tx.id)}
                      className="p-2 rounded-lg text-xs bg-zinc-800/80 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-zinc-700/60 transition"
                      title="Excluir Lançamento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
