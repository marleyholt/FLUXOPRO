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
  X,
  Check,
  Search,
  CheckSquare,
  Square,
  Tag,
  History,
  Download,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  formatBRL,
  getInstallmentInfo,
  getMonthDiff,
  addMonths,
  getMonthLabel,
} from '../../utils/calculations';
import { CardTransaction } from '../../types/finance';
import { InvoiceVersionsModal } from '../modals/InvoiceVersionsModal';
import { downloadStandardCsvTemplate } from '../../utils/csvTemplate';

interface CardsTabProps {
  onOpenNewTransaction: (cardId?: string) => void;
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
    updateCardTransaction,
    bulkUpdateCardTransactions,
    bulkDeleteCardTransactions,
    setCardRealInvoice,
    updateCreditCardTrend,
    hasUnsavedChanges,
    saveToFirebase,
    isSavingToFirebase,
    setActiveInvoiceVersion,
  } = useFinance();

  const [selectedCardId, setSelectedCardId] = useState<string>(
    data.creditCards[0]?.id || ''
  );
  const [filterType, setFilterType] = useState<
    'ALL' | 'INSTALLMENT' | 'RECURRING' | 'REVIEW'
  >('ALL');
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState(false);

  // Modal para editar lançamento
  const [editingTx, setEditingTx] = useState<CardTransaction | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editType, setEditType] = useState<'recurring' | 'installment' | 'single'>('installment');
  const [editRemainingInstallments, setEditRemainingInstallments] = useState('1');
  const [editLinkedSubItemId, setEditLinkedSubItemId] = useState<string>('unplanned');

  // Seleção e Classificação em Lote
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkCategory, setBulkCategory] = useState('');

  const current = currentMonthSummary || summaries[0];
  const activeCard =
    data.creditCards.find((c) => c.id === selectedCardId) || data.creditCards[0];

  const cardVersionsThisMonth = activeCard?.invoiceVersionsByMonth?.[selectedMonth] || [];
  const activeVersionId = activeCard?.activeInvoiceVersionIdByMonth?.[selectedMonth];
  const currentActiveVersion =
    cardVersionsThisMonth.find((v) => v.id === activeVersionId) ||
    (cardVersionsThisMonth.length > 0 ? cardVersionsThisMonth[cardVersionsThisMonth.length - 1] : undefined);

  if (!activeCard) {
    return (
      <div className="p-8 text-center text-zinc-400">
        Nenhum cartão cadastrado. Adicione um novo cartão em "Novo Lançamento".
      </div>
    );
  }

  // All transactions for active card
  const allCardTransactions = data.cardTransactions.filter(
    (tx) => tx.cardId === activeCard.id
  );

  // Exibir apenas os lançamentos que incidem na fatura do mês selecionado
  const monthTransactions = allCardTransactions.filter((tx) => {
    if (tx.isPaused) return false;
    if (tx.type === 'recurring') {
      return getMonthDiff(tx.startMonth, selectedMonth) >= 0;
    } else if (tx.type === 'installment') {
      const inst = getInstallmentInfo(tx.startMonth, tx.totalInstallments, selectedMonth);
      return inst.isActive;
    } else if (tx.type === 'single') {
      return tx.startMonth === selectedMonth;
    }
    return false;
  });

  // Filter transactions
  const filteredTransactions = monthTransactions.filter((tx) => {
    if (filterType === 'INSTALLMENT') return tx.type === 'installment';
    if (filterType === 'RECURRING') return tx.type === 'recurring';
    if (filterType === 'REVIEW') return tx.needsReview;
    return true;
  });

  // Filter transactions by search query (ex: "Uber", "iFood", "Farmacia")
  const searchedTransactions = filteredTransactions.filter((tx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      tx.description.toLowerCase().includes(q) ||
      tx.category.toLowerCase().includes(q) ||
      (tx.notes && tx.notes.toLowerCase().includes(q))
    );
  });

  const toggleSelectTx = (id: string) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllSearched = () => {
    if (selectedTxIds.size >= searchedTransactions.length && searchedTransactions.length > 0) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(searchedTransactions.map((t) => t.id)));
    }
  };

  const handleApplyBulkCategory = () => {
    if (selectedTxIds.size === 0) return;
    const catToApply = bulkCategory || availableCategories[0] || 'Outros';
    bulkUpdateCardTransactions(selectedTxIds, { category: catToApply });
    setSelectedTxIds(new Set());
  };

  const handleApplyBulkReviewToggle = () => {
    if (selectedTxIds.size === 0) return;
    const anyNeedsReview = monthTransactions.some(
      (tx) => selectedTxIds.has(tx.id) && tx.needsReview
    );
    bulkUpdateCardTransactions(selectedTxIds, { needsReview: !anyNeedsReview });
    setSelectedTxIds(new Set());
  };

  const handleApplyBulkDelete = () => {
    if (selectedTxIds.size === 0) return;
    bulkDeleteCardTransactions(selectedTxIds);
    setSelectedTxIds(new Set());
  };

  // Calculate numbers for active card in selected month
  let detailedSumThisMonth = 0;
  let recurringSum = 0;
  let installmentSum = 0;

  monthTransactions.forEach((tx) => {
    detailedSumThisMonth += tx.installmentAmount;
    if (tx.type === 'recurring') {
      recurringSum += tx.installmentAmount;
    } else {
      installmentSum += tx.installmentAmount;
    }
  });

  const realInvoice = activeCard.realInvoiceTotalByMonth?.[selectedMonth];
  const unmappedDiff =
    realInvoice !== undefined && realInvoice > detailedSumThisMonth
      ? realInvoice - detailedSumThisMonth
      : 0;
  const effectiveInvoiceTotal = Math.max(detailedSumThisMonth, realInvoice || 0);

  // Abrir Modal de Edição
  const handleOpenEdit = (tx: CardTransaction) => {
    setEditingTx(tx);
    setEditDescription(tx.description);
    setEditAmount(String(tx.installmentAmount));
    setEditCategory(tx.category || 'Outros');
    setEditType(tx.type);
    setEditLinkedSubItemId(tx.linkedSubItemId ? `sub_${tx.linkedSubItemId}` : 'unplanned');

    if (tx.type === 'installment') {
      const instInfo = getInstallmentInfo(tx.startMonth, tx.totalInstallments, selectedMonth);
      const remaining = instInfo.isActive
        ? Math.max(1, tx.totalInstallments - instInfo.current + 1)
        : tx.totalInstallments;
      setEditRemainingInstallments(String(remaining));
    } else {
      setEditRemainingInstallments('1');
    }
  };

  // Salvar Edição
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    const parsedAmount = parseFloat(editAmount);
    if (!editDescription.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    let updatedStartMonth = editingTx.startMonth;
    let updatedTotalInstallments = editingTx.totalInstallments;

    if (editType === 'single') {
      updatedStartMonth = selectedMonth;
      updatedTotalInstallments = 1;
    } else if (editType === 'recurring') {
      updatedTotalInstallments = 1;
    } else if (editType === 'installment') {
      const remaining = parseInt(editRemainingInstallments, 10) || 1;
      // Define a partir do mês selecionado a quantidade de parcelas restantes
      updatedStartMonth = selectedMonth;
      updatedTotalInstallments = remaining;
    }

    let linkedSubItemId: string | undefined = undefined;
    let isUnplanned = true;
    if (editLinkedSubItemId.startsWith('sub_')) {
      linkedSubItemId = editLinkedSubItemId.replace('sub_', '');
      isUnplanned = false;
    }

    const updatedTx: CardTransaction = {
      ...editingTx,
      description: editDescription.trim(),
      installmentAmount: parsedAmount,
      category: editCategory,
      type: editType,
      startMonth: updatedStartMonth,
      totalInstallments: updatedTotalInstallments,
      linkedSubItemId,
      isUnplanned,
    };

    updateCardTransaction(updatedTx);
    setEditingTx(null);
  };

  // Lista de Categorias cadastradas nas Configurações + categorias existentes
  const availableCategories = Array.from(
    new Set([
      ...(data.budgetEnvelopes && data.budgetEnvelopes.length > 0
        ? data.budgetEnvelopes.map((e) => e.name)
        : []),
      ...data.cardTransactions.map((tx) => tx.category).filter(Boolean),
    ])
  );
  if (availableCategories.length === 0) {
    availableCategories.push('Outros');
  }

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
          <span>Importar Fatura CSV</span>
        </button>
      </div>

      {/* Active Card Invoice Summary Banner */}
      <div id={`card-${activeCard.id}`} className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Card Info */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: activeCard.color }}
            >
              <CreditCardIcon className="w-6 h-6" />
            </div>
            <div>
              <h2
                onClick={() => setIsVersionsModalOpen(true)}
                className="text-base font-bold text-white flex items-center gap-2 cursor-pointer hover:text-emerald-400 transition group"
                title="Clique para gerenciar versões desta fatura"
              >
                <span>{activeCard.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {activeCard.scope}
                </span>
                <History className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition" />
              </h2>
              <p className="text-xs text-zinc-400">
                Fatura de <strong>{current.label} ({selectedMonth})</strong> • Fechamento: Dia {activeCard.closingDay} | Vencimento: Dia {activeCard.dueDay}
              </p>

              {/* Version Pill & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsVersionsModalOpen(true)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                    currentActiveVersion
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                  title="Abrir gerenciador de versões da fatura"
                >
                  <History className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Versão: <strong className="text-white">{currentActiveVersion ? currentActiveVersion.name : 'Padrão / Sem Versão'}</strong>
                  </span>
                  {currentActiveVersion && (
                    <span className="text-[10px] text-zinc-400">
                      ({currentActiveVersion.statementDate})
                    </span>
                  )}
                  <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-300 ml-1">
                    {cardVersionsThisMonth.length} salvas
                  </span>
                </button>

                <button
                  type="button"
                  onClick={downloadStandardCsvTemplate}
                  className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition flex items-center gap-1.5"
                  title="Baixar arquivo modelo CSV para preenchimento"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  Baixar Modelo CSV
                </button>
              </div>
            </div>
          </div>

          {/* Totals & Real Invoice Adjustment */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Detailed Sum */}
            <div className="px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
              <span className="text-zinc-400 block text-[11px]">Soma Lançamentos no Mês:</span>
              <span className="font-mono-numbers font-bold text-white text-sm">
                {formatBRL(detailedSumThisMonth)}
              </span>
            </div>

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

              {/* Payment Status Badge */}
              {(() => {
                const status = activeCard.invoicePaymentStatusByMonth?.[selectedMonth] || 'paid_on_time';
                const paidAmt = activeCard.invoicePaidAmountByMonth?.[selectedMonth];
                if (status === 'paid_on_time') {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 mt-1">
                      🟢 Pago Integral
                    </span>
                  );
                }
                if (status === 'paid_late') {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 mt-1">
                      🟡 Pago com Atraso
                    </span>
                  );
                }
                if (status === 'partial_late') {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-bold border border-orange-500/30 mt-1">
                      🟠 Parcial {paidAmt ? `(${formatBRL(paidAmt)})` : ''}
                    </span>
                  );
                }
                return (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-300 text-[10px] font-bold border border-zinc-600 mt-1">
                    ⚪ Em Aberto
                  </span>
                );
              })()}
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

      {/* Projection Trend Control Box */}
      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-zinc-200 flex items-center gap-2">
              <span>Projeção Futurista do Cartão ({activeCard.name})</span>
              {activeCard.manualProjectedTrend !== undefined ? (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                  Manual Definitivo
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-semibold border border-blue-500/30">
                  Automático (-10%/mês)
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {activeCard.manualProjectedTrend !== undefined
                ? `Projetando R$ ${activeCard.manualProjectedTrend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} fixos/mês para compras avulsas em meses futuros.`
                : 'Projetando parcelas restantes somadas à diferença da fatura com redução automática de 10% a cada mês futuro para simular queda de consumo.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="text-[11px] text-zinc-300 font-medium">
            Projeção Avulsa (R$):
          </label>
          <input
            type="number"
            placeholder="Auto (-10%)"
            value={activeCard.manualProjectedTrend !== undefined ? activeCard.manualProjectedTrend : ''}
            onChange={(e) => {
              const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
              updateCreditCardTrend(activeCard.id, val);
            }}
            className="w-28 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
          />
          {activeCard.manualProjectedTrend !== undefined && (
            <button
              onClick={() => updateCreditCardTrend(activeCard.id, undefined)}
              className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition text-[11px]"
              title="Voltar para projeção de redução automática de 10% a.m."
            >
              Resetar Auto
            </button>
          )}
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
            Fatura {current.label} ({monthTransactions.length})
          </button>
          <button
            onClick={() => setFilterType('INSTALLMENT')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              filterType === 'INSTALLMENT'
                ? 'bg-zinc-800 text-indigo-300 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Parcelamentos ({monthTransactions.filter((t) => t.type === 'installment').length})
          </button>
          <button
            onClick={() => setFilterType('RECURRING')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              filterType === 'RECURRING'
                ? 'bg-zinc-800 text-amber-300 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Assinaturas Fixas ({monthTransactions.filter((t) => t.type === 'recurring').length})
          </button>
          <button
            onClick={() => setFilterType('REVIEW')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              filterType === 'REVIEW'
                ? 'bg-zinc-800 text-amber-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ⚠️ Verificar ({monthTransactions.filter((t) => t.needsReview).length})
          </button>
        </div>

        <button
          onClick={() => onOpenNewTransaction(activeCard.id)}
          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition flex items-center gap-1.5 shrink-0 self-end sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Nova Compra ou Assinatura</span>
        </button>
      </div>

      {/* Search and Bulk Selection Header Bar */}
      <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar lançamentos da fatura por nome (ex: Uber, iFood, Mercado)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Select All / Deselect All Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSelectAllSearched}
            disabled={searchedTransactions.length === 0}
            className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition flex items-center gap-2 disabled:opacity-50"
          >
            {selectedTxIds.size >= searchedTransactions.length && searchedTransactions.length > 0 ? (
              <>
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span>Desmarcar Todos ({searchedTransactions.length})</span>
              </>
            ) : (
              <>
                <Square className="w-4 h-4 text-zinc-400" />
                <span>Selecionar Todos ({searchedTransactions.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating Sticky Bulk Actions Bar */}
      {selectedTxIds.size > 0 && (
        <div className="sticky top-20 z-20 p-4 rounded-2xl bg-zinc-900 border-2 border-emerald-500/80 shadow-2xl backdrop-blur-md flex flex-col lg:flex-row lg:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500 text-zinc-950 font-extrabold text-sm flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
              {selectedTxIds.size}
            </span>
            <div>
              <span className="font-bold text-white text-xs block">
                {selectedTxIds.size} lançamento(s) selecionado(s)
              </span>
              <span className="text-[11px] text-zinc-400">
                Selecione a categoria desejada e clique em <strong>Classificar em Lote</strong> para alterar todos simultaneamente:
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-700 rounded-lg p-1">
              <Tag className="w-3.5 h-3.5 text-emerald-400 ml-1.5 shrink-0" />
              <select
                value={bulkCategory || availableCategories[0]}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="bg-transparent text-xs text-white outline-none pr-2 font-medium"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat} className="bg-zinc-950 text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleApplyBulkCategory}
              className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Classificar em Lote</span>
            </button>

            <button
              onClick={handleApplyBulkReviewToggle}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-semibold transition"
              title="Alternar marcação '⚠️ Verificar' para os selecionados"
            >
              ⚠️ Alternar Verificar
            </button>

            <button
              onClick={handleApplyBulkDelete}
              className="px-2.5 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition border border-rose-500/30 flex items-center gap-1"
              title="Excluir selecionados"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>

            <button
              onClick={() => setSelectedTxIds(new Set())}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
              title="Cancelar Seleção em Lote"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="space-y-3">
        {searchedTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400 rounded-2xl bg-zinc-900/40 border border-zinc-800">
            Nenhum lançamento encontrado na fatura de <strong>{current.label} ({selectedMonth})</strong> para este filtro.
          </div>
        ) : (
          searchedTransactions.map((tx) => {
            const isRecurring = tx.type === 'recurring';
            const isInstallment = tx.type === 'installment';
            const instInfo = isInstallment
              ? getInstallmentInfo(tx.startMonth, tx.totalInstallments, selectedMonth)
              : null;

            // Calculate end month for installments
            const endMonth = isInstallment
              ? addMonths(tx.startMonth, tx.totalInstallments - 1)
              : null;

            // Remaining balance for installment starting from selected month
            const remainingInstallments = instInfo
              ? Math.max(0, tx.totalInstallments - instInfo.current + 1)
              : 0;
            const remainingBalance = remainingInstallments * tx.installmentAmount;

            const isSelected = selectedTxIds.has(tx.id);

            return (
              <div
                key={tx.id}
                className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-emerald-950/20 border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                    : tx.needsReview
                    ? 'bg-amber-950/10 border-amber-500/30'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Left Description, Checkbox & Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectTx(tx.id)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 cursor-pointer shrink-0"
                    />

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

                    {tx.transactionDate && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono-numbers bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {tx.transactionDate}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-3">
                    <span>Categoria: <strong className="text-zinc-200">{tx.category}</strong></span>
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
                        <span>Progresso: Parcela {instInfo.current} de {instInfo.total} ({remainingInstallments} restante/s)</span>
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
                    {/* Botão de Edição */}
                    <button
                      onClick={() => handleOpenEdit(tx)}
                      className="p-2 rounded-lg text-xs bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 transition"
                      title="Editar este lançamento"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

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

      {/* Modal de Edição de Lançamento do Cartão */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/60">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Editar Lançamento do Cartão</h3>
              </div>
              <button
                onClick={() => setEditingTx(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Descrição / Título da Compra</label>
                <input
                  type="text"
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Valor Parcela / Mês (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Categoria</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500 font-medium"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vínculo com a Previsão (Previsão & Controle) */}
              <div className="space-y-1 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <label className="font-semibold text-emerald-300 block mb-1">
                  Vincular ao Item Previsto (Previsão & Controle)
                </label>
                <select
                  value={editLinkedSubItemId}
                  onChange={(e) => setEditLinkedSubItemId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white outline-none focus:border-emerald-500 text-xs"
                >
                  <option value="unplanned">
                    ⚠️ Sem previsão específica (Gasto Não Previsto / Extra)
                  </option>
                  {(() => {
                    // Find envelope matching editCategory
                    const matchedEnvelope = data.budgetEnvelopes.find(
                      (e) => e.name.trim().toLowerCase() === editCategory.trim().toLowerCase() || e.id === editCategory
                    );
                    if (!matchedEnvelope || !matchedEnvelope.subItems || matchedEnvelope.subItems.length === 0) {
                      return null;
                    }
                    return (
                      <optgroup label={`Subitens do Envelope "${matchedEnvelope.name}"`}>
                        {matchedEnvelope.subItems.map((sub) => (
                          <option key={sub.id} value={`sub_${sub.id}`}>
                            {sub.name} (Previsto: {formatBRL(sub.amount)})
                          </option>
                        ))}
                      </optgroup>
                    );
                  })()}
                </select>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Associe este gasto de cartão ao subitem correspondente para abater da previsão e evitar duplicidade.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Tipo de Compra</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="single">Compra Única (Mês Atual)</option>
                  <option value="installment">Parcelada (Várias Vezes)</option>
                  <option value="recurring">Assinatura Mensal Recorrente</option>
                </select>
              </div>

              {editType === 'installment' && (
                <div className="space-y-1 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30">
                  <label className="font-semibold text-indigo-200 block">
                    Quantas parcelas restam a partir de {selectedMonth}?
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={editRemainingInstallments}
                    onChange={(e) => setEditRemainingInstallments(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-indigo-500/50 text-white font-mono-numbers outline-none focus:border-indigo-400 font-bold"
                  />
                  <p className="text-[10px] text-indigo-300/80">
                    O sistema reajustará o plano do parcelamento para durar exatamente {editRemainingInstallments} parcelas a partir da fatura de {selectedMonth}.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-md shadow-emerald-500/20"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BARRA FLUTUANTE INFERIOR FIXA DE CARTÕES E VERSÕES */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-5xl w-[96%] sm:w-auto shadow-2xl rounded-2xl bg-zinc-950/95 border border-zinc-700/80 backdrop-blur-md px-3.5 py-2 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-bottom-3 duration-200">
        {/* Left: Lista Flutuante de Cartões */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider hidden md:inline mr-1">
            Cartões:
          </span>
          {data.creditCards.map((card) => {
            const isSelected = card.id === activeCard.id;
            const invoiceAmt = current.cardTotalsByCard[card.id] || 0;
            const vers = card.invoiceVersionsByMonth?.[selectedMonth] || [];
            return (
              <button
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-semibold whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-zinc-800 border-zinc-600 text-white shadow-sm ring-1 ring-emerald-400/40'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
                title={`Selecionar ${card.name}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: card.color || '#3b82f6' }}
                />
                <span>{card.name}</span>
                <span className="font-mono-numbers text-[11px] font-bold text-zinc-300">
                  {formatBRL(invoiceAmt)}
                </span>
                {vers.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30">
                    v{vers.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Center / Right: Seletor de Versão + Ações Rápidas */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Seletor rápido de versão */}
          {cardVersionsThisMonth.length > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-700/80">
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <select
                value={activeVersionId || cardVersionsThisMonth[cardVersionsThisMonth.length - 1]?.id || ''}
                onChange={(e) => setActiveInvoiceVersion(activeCard.id, selectedMonth, e.target.value)}
                className="bg-transparent text-white font-semibold text-xs outline-none cursor-pointer max-w-[150px] truncate"
                title="Alternar versão ativa visualizada em todo o sistema"
              >
                {cardVersionsThisMonth.map((v) => (
                  <option key={v.id} value={v.id} className="bg-zinc-900 text-white">
                    {v.name} ({formatBRL(v.totalAmount)})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsVersionsModalOpen(true)}
                className="p-1 rounded text-zinc-400 hover:text-white"
                title="Abrir modal completo de versões"
              >
                <History className="w-3 h-3 text-emerald-400" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsVersionsModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-700/80 transition flex items-center gap-1.5 font-medium"
              title="Gerenciar versões de extrato deste cartão"
            >
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span>Versões</span>
            </button>
          )}

          {/* Baixar Modelo CSV */}
          <button
            onClick={downloadStandardCsvTemplate}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 transition flex items-center gap-1"
            title="Baixar Modelo CSV Padrão"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Modelo</span>
          </button>

          {/* Importar CSV */}
          <button
            onClick={onOpenCsvImport}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition flex items-center gap-1.5 shadow-sm"
            title="Importar novo extrato/fatura em CSV"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importar</span>
          </button>

          {/* Salvar no Firebase se houver pendências locais */}
          {hasUnsavedChanges && (
            <button
              onClick={() => saveToFirebase()}
              disabled={isSavingToFirebase}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition flex items-center gap-1 shadow-md animate-pulse"
              title="Salvar alterações pendentes no Firebase"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSavingToFirebase ? 'Salvando...' : 'Salvar Cloud'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal de Gerenciamento de Versões da Fatura */}
      <InvoiceVersionsModal
        isOpen={isVersionsModalOpen}
        onClose={() => setIsVersionsModalOpen(false)}
        cardId={activeCard.id}
        month={selectedMonth}
        onOpenCsvImport={onOpenCsvImport}
      />
    </div>
  );
};
