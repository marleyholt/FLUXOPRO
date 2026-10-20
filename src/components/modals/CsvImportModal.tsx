import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Building2,
  Calendar,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingDown,
  DollarSign,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { parseCreditCardCsv } from '../../utils/csvParser';
import { parseCsvBankStatement, ParsedBankStatement } from '../../utils/bankStatementParser';
import { CsvParsedItem, BankStatementUploadRecord } from '../../types/finance';
import { formatBRL } from '../../utils/calculations';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const {
    data,
    selectedMonth,
    summaries,
    importCsvTransactions,
    saveBankStatementResult,
    setCardRealInvoice,
  } = useFinance();

  // Mode: Fatura de Cartão vs Extrato Bancário
  const [importMode, setImportMode] = useState<'card' | 'bank'>('card');

  // --- CARD INVOICE STATE ---
  const [selectedCardId, setSelectedCardId] = useState<string>(
    data.creditCards[0]?.id || ''
  );
  const [targetMonth, setTargetMonth] = useState<string>(selectedMonth);

  useEffect(() => {
    if (!selectedCardId && data.creditCards && data.creditCards.length > 0) {
      setSelectedCardId(data.creditCards[0].id);
    }
  }, [data.creditCards, selectedCardId]);

  const selectedCard = data.creditCards.find((c) => c.id === selectedCardId) || data.creditCards[0];
  const defaultDueDay = selectedCard?.dueDay || 10;
  const [paymentDate, setPaymentDate] = useState<string>(
    `${selectedMonth}-${String(defaultDueDay).padStart(2, '0')}`
  );
  const [cardItems, setCardItems] = useState<CsvParsedItem[]>([]);
  const [cardFileName, setCardFileName] = useState<string>('');
  const [updateRealInvoice, setUpdateRealInvoice] = useState<boolean>(true);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');
  const [hideAlreadyImported, setHideAlreadyImported] = useState<boolean>(false);

  // --- BANK STATEMENT STATE ---
  const [selectedBankId, setSelectedBankId] = useState<string>(
    data.bankAccounts?.[0]?.id || ''
  );
  const [bankTargetMonth, setBankTargetMonth] = useState<string>(selectedMonth);
  const [parsedBankStatement, setParsedBankStatement] = useState<ParsedBankStatement | null>(null);
  const [bankFileName, setBankFileName] = useState<string>('');

  useEffect(() => {
    if (!selectedBankId && data.bankAccounts && data.bankAccounts.length > 0) {
      setSelectedBankId(data.bankAccounts[0].id);
    }
  }, [data.bankAccounts, selectedBankId]);

  // UI state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Process uploaded CSV file
  const handleProcessFile = (file: File) => {
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || '';

      if (importMode === 'card') {
        setCardFileName(file.name);
        try {
          const rawItems = parseCreditCardCsv(text, targetMonth);
          if (rawItems.length === 0) {
            setErrorMessage('Nenhuma compra encontrada no arquivo. Verifique se o CSV contém colunas de Data, Descrição e Valor.');
          } else {
            // Intelligent deduplication check against already registered transactions
            const existingTx = data.cardTransactions.filter((tx) => tx.cardId === selectedCardId);
            const markedItems = rawItems.map((item) => {
              const alreadyExists = existingTx.some((tx) => {
                const sameDesc = tx.description.toLowerCase().trim() === item.description.toLowerCase().trim();
                const sameAmount = Math.abs(tx.installmentAmount - item.amount) < 0.05;
                const sameDate = !tx.transactionDate || !item.date || tx.transactionDate === item.date;
                return sameDesc && sameAmount && sameDate;
              });
              return {
                ...item,
                isAlreadyImported: alreadyExists,
                selected: !alreadyExists, // Select only new items by default!
              };
            });
            setCardItems(markedItems);
            setSelectedDateFilter('ALL');
          }
        } catch (e: any) {
          setErrorMessage('Erro ao ler CSV da fatura: ' + (e?.message || 'Formato inválido'));
        }
      } else {
        setBankFileName(file.name);
        try {
          const result = parseCsvBankStatement(text, file.name);
          setParsedBankStatement(result);
        } catch (e: any) {
          setErrorMessage('Erro ao ler CSV do extrato bancário: ' + (e?.message || 'Formato inválido'));
        }
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  // Toggle card item
  const toggleCardItem = (id: string) => {
    setCardItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const selectAllCardItems = (select: boolean) => {
    setCardItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  const selectOnlyNewItems = () => {
    setCardItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: !item.isAlreadyImported,
      }))
    );
  };

  const selectSpecificDay = (date: string) => {
    setSelectedDateFilter(date);
    setCardItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: item.date === date && !item.isAlreadyImported,
      }))
    );
  };

  // Extract unique dates for day-by-day filtering
  const uniqueDates = Array.from(new Set(cardItems.map((i) => i.date).filter(Boolean))).sort();

  // Filtered items to display
  const displayedCardItems = cardItems.filter((item) => {
    if (hideAlreadyImported && item.isAlreadyImported) return false;
    if (selectedDateFilter !== 'ALL' && item.date !== selectedDateFilter) return false;
    return true;
  });

  const selectedCardCount = cardItems.filter((i) => i.selected).length;
  const totalSelectedAmount = cardItems
    .filter((i) => i.selected)
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Approve and consolidate card invoice
  const handleApproveCard = () => {
    const activeCardId = selectedCardId || data.creditCards[0]?.id;
    if (!activeCardId || selectedCardCount === 0) return;
    importCsvTransactions(activeCardId, targetMonth, cardItems, updateRealInvoice, paymentDate);
    const cardName = data.creditCards.find((c) => c.id === activeCardId)?.name || 'Cartão';
    setSuccessMessage(`Fatura de ${cardName} consolidada com sucesso! ${selectedCardCount} compras registradas. Lembre-se de clicar em "Salvar no Firebase" no topo.`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1800);
  };

  // Approve and consolidate bank statement
  const handleApproveBank = () => {
    if (!parsedBankStatement) return;
    const bankAccount = (data.bankAccounts || []).find((b) => b.id === selectedBankId);
    const bankName = bankAccount?.name || parsedBankStatement.bankName || 'Conta Corrente';

    const uploadRecord: BankStatementUploadRecord = {
      id: `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      bankName,
      fileName: bankFileName || 'extrato.csv',
      initialBalance: parsedBankStatement.initialBalance,
      finalBalance: parsedBankStatement.finalBalance,
      credits: parsedBankStatement.credits,
      debits: parsedBankStatement.debits,
      interestPaid: parsedBankStatement.interestPaid,
      iofPaid: parsedBankStatement.iofPaid,
      uploadedAt: new Date().toISOString(),
    };

    saveBankStatementResult(bankTargetMonth, uploadRecord, true);
    setSuccessMessage(`Extrato de ${bankName} consolidado com sucesso! Saldo final: ${formatBRL(parsedBankStatement.finalBalance)}`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  // Sample CSV generator for instant testing
  const loadSampleData = () => {
    if (importMode === 'card') {
      const sample = `Data,Descrição,Valor
2026-01-05,Drogaria Pacheco Farmácia,145.20
2026-01-08,Posto Ipiranga Combustível,210.00
2026-01-12,Magazine Luiza - Parcela 03/10,320.00
2026-01-15,Supermercado Pão de Açúcar,485.60
2026-01-18,Restaurante Outback,240.00
2026-01-22,Amazon Brasil Eletrônicos,189.90
2026-01-25,Uber Viagens,42.50`;
      const items = parseCreditCardCsv(sample, targetMonth);
      setCardItems(items);
      setCardFileName('exemplo_fatura_cartao.csv');
    } else {
      const sample = `Data;Descrição;Valor;Saldo
01/01/2026;SALDO ANTERIOR;0,00;2500,00
05/01/2026;PIX RECEBIDO CLIENTE;4500,00;7000,00
08/01/2026;PAGTO BOLETO FORNECEDOR;-1200,00;5800,00
15/01/2026;TARIFA BANCARIA;-45,00;5755,00
20/01/2026;COMPRA CARTAO DEBITO;-350,00;5405,00
30/01/2026;SALDO FINAL DO PERIODO;0,00;5405,00`;
      const result = parseCsvBankStatement(sample, 'exemplo_extrato_bancario.csv');
      setParsedBankStatement(result);
      setBankFileName('exemplo_extrato_bancario.csv');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Upload className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Importar CSV (Faturas & Extratos)
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold uppercase">
                  Padrão CSV
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Faça upload do CSV da sua fatura ou extrato a qualquer momento para consolidar os lançamentos daquele dia.
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

        {/* Mode Selector Tabs */}
        <div className="px-5 pt-4 bg-zinc-950 flex items-center gap-2 border-b border-zinc-800 text-xs">
          <button
            onClick={() => {
              setImportMode('card');
              setErrorMessage(null);
            }}
            className={`pb-3 px-3 font-bold border-b-2 transition flex items-center gap-2 ${
              importMode === 'card'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Fatura de Cartão de Crédito (CSV)</span>
          </button>

          <button
            onClick={() => {
              setImportMode('bank');
              setErrorMessage(null);
            }}
            className={`pb-3 px-3 font-bold border-b-2 transition flex items-center gap-2 ${
              importMode === 'bank'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Extrato Bancário de Conta (CSV)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Notifications */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: FATURA DE CARTÃO */}
          {importMode === 'card' && (
            <div className="space-y-4">
              {/* Selectors Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                    Vincular ao Cartão
                  </label>
                  <select
                    value={selectedCardId}
                    onChange={(e) => {
                      setSelectedCardId(e.target.value);
                      const newCard = data.creditCards.find((c) => c.id === e.target.value);
                      if (newCard) {
                        setPaymentDate(`${targetMonth}-${String(newCard.dueDay).padStart(2, '0')}`);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white outline-none focus:border-emerald-500 transition"
                  >
                    {data.creditCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name} ({card.scope} - Venc. Dia {card.dueDay})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    Mês da Fatura
                  </label>
                  <select
                    value={targetMonth}
                    onChange={(e) => {
                      setTargetMonth(e.target.value);
                      const newCard = data.creditCards.find((c) => c.id === selectedCardId);
                      const dueDay = newCard?.dueDay || 10;
                      setPaymentDate(`${e.target.value}-${String(dueDay).padStart(2, '0')}`);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white outline-none focus:border-emerald-500 transition"
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
                    Data de Vencimento / Pgto
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white outline-none focus:border-emerald-500 transition font-mono-numbers"
                  />
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-700/80 hover:border-emerald-500/60 bg-zinc-900/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-400">
                  <Upload className="w-5 h-5" />
                </div>

                <div>
                  <span className="font-bold text-white text-xs block">
                    {cardFileName ? `Arquivo: ${cardFileName}` : 'Clique para selecionar ou arraste o arquivo .CSV da sua fatura'}
                  </span>
                  <span className="text-[11px] text-zinc-400 mt-0.5 block">
                    Compatível com faturas exportadas em CSV de qualquer banco ou operadora
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadSampleData();
                  }}
                  className="mt-1 px-3 py-1 rounded-lg text-[11px] font-semibold bg-zinc-800 hover:bg-zinc-750 text-emerald-300 border border-zinc-700 transition"
                >
                  ⚡ Carregar Fatura CSV de Exemplo
                </button>
              </div>

              {/* Items List & Day Consolidation */}
              {cardItems.length > 0 && (
                <div className="space-y-3 pt-2">
                  {/* Date Filter & Day Consolidation Header */}
                  <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-white text-xs">
                          Consolidação por Data ({cardItems.length} compras detectadas):
                        </span>
                      </div>

                      {/* Quick Selection Buttons */}
                      <div className="flex items-center gap-2 text-[11px] flex-wrap">
                        <button
                          type="button"
                          onClick={selectOnlyNewItems}
                          className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-semibold border border-emerald-500/30 transition"
                          title="Marca apenas compras que ainda não foram importadas anteriormente"
                        >
                          Marcar Novas ({cardItems.filter((i) => !i.isAlreadyImported).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => selectAllCardItems(true)}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          Todas
                        </button>
                        <span className="text-zinc-600">•</span>
                        <button
                          type="button"
                          onClick={() => selectAllCardItems(false)}
                          className="text-zinc-400 hover:text-white"
                        >
                          Nenhuma
                        </button>
                      </div>
                    </div>

                    {/* Date Pills */}
                    {uniqueDates.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedDateFilter('ALL')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                            selectedDateFilter === 'ALL'
                              ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                              : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                          }`}
                        >
                          Todas as Datas ({cardItems.length})
                        </button>

                        {uniqueDates.map((date) => {
                          const dateCount = cardItems.filter((i) => i.date === date).length;
                          const dateTotal = cardItems
                            .filter((i) => i.date === date)
                            .reduce((s, c) => s + c.amount, 0);
                          const isCurrent = selectedDateFilter === date;
                          return (
                            <button
                              key={date}
                              type="button"
                              onClick={() => selectSpecificDay(date)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                                isCurrent
                                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                                  : 'bg-zinc-950 text-zinc-300 hover:text-white border border-zinc-800'
                              }`}
                            >
                              <span>{date}</span>
                              <span className={`text-[10px] ${isCurrent ? 'text-zinc-900 font-bold' : 'text-zinc-400'}`}>
                                ({dateCount} • {formatBRL(dateTotal)})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Option to hide already imported */}
                    {cardItems.some((i) => i.isAlreadyImported) && (
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[11px]">
                        <span className="text-amber-400/90 flex items-center gap-1">
                          ⚠️ Foram detectadas compras já cadastradas no sistema.
                        </span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={hideAlreadyImported}
                            onChange={(e) => setHideAlreadyImported(e.target.checked)}
                            className="w-3.5 h-3.5 rounded accent-emerald-500"
                          />
                          <span>Ocultar compras já importadas</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* List of items */}
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {displayedCardItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleCardItem(item.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                          item.selected
                            ? 'bg-zinc-900 border-emerald-500/40 text-white'
                            : 'bg-zinc-950/50 border-zinc-850 text-zinc-400 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleCardItem(item.id)}
                            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <strong className="block text-xs text-white">{item.description}</strong>
                              {item.isAlreadyImported && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-amber-300 border border-amber-500/30">
                                  Já no sistema
                                </span>
                              )}
                              {item.needsReview && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                                  ⚠️ Verificar
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono-numbers">
                              Data: {item.date || 'Não informada'} • Categoria: {item.category || 'Geral'}
                            </span>
                          </div>
                        </div>

                        <strong className="text-emerald-400 font-mono-numbers text-xs">
                          {formatBRL(item.amount)}
                        </strong>
                      </div>
                    ))}

                    {displayedCardItems.length === 0 && (
                      <div className="p-4 text-center text-zinc-500 text-xs">
                        Nenhuma compra visível com os filtros atuais.
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={updateRealInvoice}
                        onChange={(e) => setUpdateRealInvoice(e.target.checked)}
                        className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs text-zinc-200">
                        Atualizar a Fatura Real do cartão com o total aprovado ({formatBRL(totalSelectedAmount)})
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXTRATO BANCÁRIO */}
          {importMode === 'bank' && (
            <div className="space-y-4">
              {/* Selectors Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    Conta Bancária
                  </label>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white outline-none focus:border-emerald-500 transition"
                  >
                    {(data.bankAccounts || []).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.agency ? `Ag: ${b.agency}` : ''})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    Mês de Competência
                  </label>
                  <select
                    value={bankTargetMonth}
                    onChange={(e) => setBankTargetMonth(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white outline-none focus:border-emerald-500 transition"
                  >
                    {summaries.map((s) => (
                      <option key={s.month} value={s.month}>
                        {s.label} ({s.month})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-700/80 hover:border-emerald-500/60 bg-zinc-900/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.txt,.ofx"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-400">
                  <Building2 className="w-5 h-5" />
                </div>

                <div>
                  <span className="font-bold text-white text-xs block">
                    {bankFileName ? `Arquivo: ${bankFileName}` : 'Clique para selecionar ou arraste o arquivo .CSV do seu extrato bancário'}
                  </span>
                  <span className="text-[11px] text-zinc-400 mt-0.5 block">
                    Detecta automaticamente saldo inicial, entradas, saídas, juros de cheque especial e saldo final
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadSampleData();
                  }}
                  className="mt-1 px-3 py-1 rounded-lg text-[11px] font-semibold bg-zinc-800 hover:bg-zinc-750 text-emerald-300 border border-zinc-700 transition"
                >
                  ⚡ Carregar Extrato CSV de Exemplo
                </button>
              </div>

              {/* Parsed Result Card */}
              {parsedBankStatement && (
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                  <h4 className="font-bold text-white text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Resumo do Extrato Processado ({bankFileName})
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850">
                      <span className="text-[10px] text-zinc-400 block">Saldo Inicial</span>
                      <strong className="font-mono-numbers text-zinc-200">
                        {formatBRL(parsedBankStatement.initialBalance)}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850">
                      <span className="text-[10px] text-zinc-400 block">Total Entradas</span>
                      <strong className="font-mono-numbers text-emerald-400">
                        +{formatBRL(parsedBankStatement.credits)}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850">
                      <span className="text-[10px] text-zinc-400 block">Total Saídas</span>
                      <strong className="font-mono-numbers text-rose-400">
                        -{formatBRL(parsedBankStatement.debits)}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-300 block font-bold">Saldo Final Detectado</span>
                      <strong className="font-mono-numbers text-emerald-300 text-sm">
                        {formatBRL(parsedBankStatement.finalBalance)}
                      </strong>
                    </div>
                  </div>

                  {parsedBankStatement.interestPaid > 0 && (
                    <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-500/20 text-rose-300 text-[11px] flex justify-between">
                      <span>Juros de Cheque Especial cobrados no período:</span>
                      <strong className="font-mono-numbers">{formatBRL(parsedBankStatement.interestPaid)}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div>
            {importMode === 'card' ? (
              <div>
                <span className="text-xs text-zinc-400 block">Total Aprovado:</span>
                <span className="font-mono-numbers font-extrabold text-emerald-400 text-lg">
                  {formatBRL(totalSelectedAmount)}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-xs text-zinc-400 block">Saldo Final da Conta:</span>
                <span className="font-mono-numbers font-extrabold text-emerald-400 text-lg">
                  {parsedBankStatement ? formatBRL(parsedBankStatement.finalBalance) : 'R$ 0,00'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-750 text-zinc-300 transition"
            >
              Cancelar
            </button>

            {importMode === 'card' ? (
              <button
                onClick={handleApproveCard}
                disabled={selectedCardCount === 0}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Consolidar Compras na Fatura ({selectedCardCount})</span>
              </button>
            ) : (
              <button
                onClick={handleApproveBank}
                disabled={!parsedBankStatement}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Aprovar e Consolidar Extrato</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
