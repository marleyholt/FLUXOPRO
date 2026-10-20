import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Calendar,
  Check,
  Sparkles,
  Bot,
  Copy,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { parseCreditCardCsv } from '../../utils/csvParser';
import {
  parseInvoicePdfWithGemini,
  GEMINI_WEB_MANUAL_PROMPT,
} from '../../services/aiInvoiceService';
import { CsvParsedItem } from '../../types/finance';
import { formatBRL } from '../../utils/calculations';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const { data, selectedMonth, summaries, importCsvTransactions } = useFinance();

  const [selectedCardId, setSelectedCardId] = useState<string>(
    data.creditCards[0]?.id || ''
  );
  const [targetMonth, setTargetMonth] = useState<string>(selectedMonth);
  const selectedCard = data.creditCards.find((c) => c.id === selectedCardId) || data.creditCards[0];
  const defaultDueDay = selectedCard?.dueDay || 10;
  const [paymentDate, setPaymentDate] = useState<string>(
    `${selectedMonth}-${String(defaultDueDay).padStart(2, '0')}`
  );
  const [parsedItems, setParsedItems] = useState<CsvParsedItem[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [updateRealInvoice, setUpdateRealInvoice] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessingAi, setIsProcessingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setFileName(file.name);
    setAiError(null);

    // If PDF, process with Gemini AI
    if (file.name.toLowerCase().endsWith('.pdf') || file.type.includes('pdf')) {
      setIsProcessingAi(true);
      try {
        const items = await parseInvoicePdfWithGemini(file, apiKeyInput || undefined);
        setParsedItems(items);
      } catch (err: any) {
        setAiError(
          err.message || 'Erro ao processar PDF com a IA Gemini. Tente exportar em CSV ou use o prompt manual.'
        );
      } finally {
        setIsProcessingAi(false);
      }
      return;
    }

    // If CSV or text
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const items = parseCreditCardCsv(text, targetMonth);
        setParsedItems(items);
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

  const toggleItem = (id: string) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const toggleSelectAll = (select: boolean) => {
    setParsedItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  const toggleItemReview = (id: string) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, needsReview: !item.needsReview } : item))
    );
  };

  const selectedCount = parsedItems.filter((i) => i.selected).length;
  const totalSelectedAmount = parsedItems
    .filter((i) => i.selected)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const handleApprove = () => {
    if (!selectedCardId || selectedCount === 0) return;
    importCsvTransactions(selectedCardId, targetMonth, parsedItems, updateRealInvoice, paymentDate);
    onClose();
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(GEMINI_WEB_MANUAL_PROMPT);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  // Sample CSV generator for instant test
  const loadSampleData = () => {
    const sample = `Data,Descrição,Valor
2026-01-05,Drogaria Pacheco Farmácia,145.20
2026-01-08,Posto Ipiranga Combustível,210.00
2026-01-12,Magazine Luiza - Parcela 03/10,320.00
2026-01-15,Supermercado Pão de Açúcar,485.60
2026-01-18,Restaurante Outback,240.00
2026-01-22,COMPRA SUSPEITA WEB ELETRO,189.90
2026-01-25,Uber Viagens,42.50`;
    const items = parseCreditCardCsv(sample, targetMonth);
    setParsedItems(items);
    setFileName('exemplo_fatura_mensal.csv');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Importar Fatura com IA (PDF ou CSV)
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold uppercase">
                  Gemini Flash
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Envie o PDF ou CSV da fatura. A IA extrai e você valida tudo antes de salvar no banco de dados.
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Card & Month & Payment Date Selector */}
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

          {/* AI Processing Banner */}
          {isProcessingAi && (
            <div className="p-8 rounded-2xl bg-zinc-900/80 border border-emerald-500/40 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <div>
                <span className="font-bold text-sm text-white block">
                  A IA Gemini está lendo o PDF da sua fatura...
                </span>
                <span className="text-xs text-zinc-400 mt-0.5 block">
                  Identificando parcelas, estabelecimentos e valores com precisão cirúrgica.
                </span>
              </div>
            </div>
          )}

          {/* AI Error Notification */}
          {aiError && (
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{aiError}</span>
              </div>
              <button
                onClick={handleCopyPrompt}
                className="shrink-0 px-2.5 py-1 rounded bg-zinc-800 text-white hover:bg-zinc-700 transition"
              >
                Copiar Prompt Manual
              </button>
            </div>
          )}

          {/* Upload Drop Zone */}
          {!isProcessingAi && parsedItems.length === 0 && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
                <Upload className="w-6 h-6 text-emerald-400" />
              </div>

              <div>
                <span className="text-sm font-bold text-white block">
                  Arraste a fatura em PDF ou CSV aqui
                </span>
                <span className="text-xs text-zinc-400 mt-1 block">
                  A IA Gemini lê PDFs nativamente e converte as parcelas automaticamente
                </span>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-semibold hover:bg-zinc-700 transition">
                  Selecionar Arquivo PDF / CSV
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadSampleData();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/20 transition"
                >
                  Carregar Exemplo de Teste
                </button>
              </div>
            </div>
          )}

          {/* Parsed Items Preview Table */}
          {!isProcessingAi && parsedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-zinc-200">{fileName}</span>
                  <span className="text-zinc-400">
                    ({selectedCount} de {parsedItems.length} selecionados)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSelectAll(true)}
                    className="text-[11px] text-zinc-400 hover:text-white"
                  >
                    Marcar Todos
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => toggleSelectAll(false)}
                    className="text-[11px] text-zinc-400 hover:text-white"
                  >
                    Desmarcar Todos
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => {
                      setParsedItems([]);
                      setFileName('');
                    }}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Trocar Arquivo
                  </button>
                </div>
              </div>

              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-900/90 text-zinc-400 sticky top-0 border-b border-zinc-800 z-10 font-semibold">
                    <tr>
                      <th className="py-2 px-3 w-8">#</th>
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Descrição Detectada</th>
                      <th className="py-2 px-3">Parcela</th>
                      <th className="py-2 px-3 text-right">Valor</th>
                      <th className="py-2 px-3 text-center">Auditar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {parsedItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`transition ${
                          item.selected ? 'bg-zinc-900/40 text-zinc-200' : 'opacity-40 text-zinc-400'
                        }`}
                      >
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleItem(item.id)}
                            className="rounded accent-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono-numbers text-zinc-400">{item.date}</td>
                        <td className="py-2 px-3 font-medium text-white">{item.description}</td>
                        <td className="py-2 px-3">
                          {item.installmentsTotal ? (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-semibold">
                              {item.installmentsCurrent || 1}/{item.installmentsTotal}
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400">À vista</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono-numbers font-bold text-white">
                          {formatBRL(item.amount)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleItemReview(item.id)}
                            className={`p-1 rounded text-xs transition ${
                              item.needsReview
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'text-zinc-400 hover:text-amber-400'
                            }`}
                            title="Marcar como ⚠️ Verificar"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Automatic Real Invoice Sync */}
              <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateRealInvoice}
                    onChange={(e) => setUpdateRealInvoice(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span>
                    Ajustar automaticamente o <strong>Total Real da Fatura do Cartão</strong> para este mês ({formatBRL(totalSelectedAmount)})
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Option 1: Manual Gemini Web Prompt Box */}
          <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Opção Alternativa: Usar o Gemini Web (Manual)
              </span>
              <button
                onClick={handleCopyPrompt}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition flex items-center gap-1 text-[11px]"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Prompt Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar Prompt para Gemini Web</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">
              Copie este prompt, cole no <strong>gemini.google.com</strong> junto com o anexo da sua fatura e baixe o CSV resultante para enviar aqui.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 block">Total Aprovado:</span>
            <span className="font-mono-numbers font-extrabold text-emerald-400 text-lg">
              {formatBRL(totalSelectedAmount)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleApprove}
              disabled={selectedCount === 0 || isProcessingAi}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Aprovar e Integrar ao Banco de Dados</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
