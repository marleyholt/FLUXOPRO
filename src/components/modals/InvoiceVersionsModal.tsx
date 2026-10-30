import React from 'react';
import {
  X,
  History,
  CheckCircle2,
  Trash2,
  Upload,
  Download,
  Calendar,
  Layers,
  Info,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatBRL, getMonthLabel } from '../../utils/calculations';
import { downloadStandardCsvTemplate } from '../../utils/csvTemplate';

interface InvoiceVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  month: string;
  onOpenCsvImport?: () => void;
}

export const InvoiceVersionsModal: React.FC<InvoiceVersionsModalProps> = ({
  isOpen,
  onClose,
  cardId,
  month,
  onOpenCsvImport,
}) => {
  const { data, setActiveInvoiceVersion, deleteInvoiceVersion } = useFinance();

  if (!isOpen) return null;

  const card = data.creditCards.find((c) => c.id === cardId);
  if (!card) return null;

  const versions = card.invoiceVersionsByMonth?.[month] || [];
  const activeVersionId = card.activeInvoiceVersionIdByMonth?.[month];
  const monthLabel = getMonthLabel(month);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
              style={{ backgroundColor: card.color || '#3b82f6' }}
            >
              {card.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Versões da Fatura: {card.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono-numbers">
                  {monthLabel} ({month})
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Alterne entre prévias semanais e extratos fechados. A versão ativa reflete em todo o sistema.
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

        {/* Action Bar */}
        <div className="px-5 py-3 border-b border-zinc-800/80 bg-zinc-950/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <History className="w-4 h-4 text-emerald-400" />
            <span>
              Total de versões salvas:{' '}
              <strong className="text-white">{versions.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadStandardCsvTemplate}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 transition flex items-center gap-1.5 font-medium"
              title="Baixar arquivo modelo CSV para preenchimento"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Baixar Modelo CSV Padrão
            </button>

            {onOpenCsvImport && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCsvImport();
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                Nova Versão (CSV)
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {versions.length === 0 ? (
            <div className="p-8 rounded-xl bg-zinc-950 border border-zinc-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <History className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Nenhuma versão salva para este mês</p>
                <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                  Importe o extrato ou CSV da fatura a qualquer momento. Você pode criar novas versões semanalmente para atualizar sua projeção sem esperar o fechamento mensal.
                </p>
              </div>
              {onOpenCsvImport && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenCsvImport();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs inline-flex items-center gap-2 transition"
                >
                  <Upload className="w-4 h-4" />
                  Importar Primeira Versão
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {versions
                .slice()
                .reverse()
                .map((version, idx) => {
                  const isActive = version.id === activeVersionId;
                  const formattedDate = new Date(version.createdAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={version.id}
                      className={`p-4 rounded-xl border transition ${
                        isActive
                          ? 'bg-emerald-950/20 border-emerald-500/50 shadow-sm shadow-emerald-500/5'
                          : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {version.name}
                            </span>
                            {isActive ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Versão Ativa no Sistema
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-medium">
                                Histórico
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                              Extrato de: <strong className="text-zinc-200">{version.statementDate}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-zinc-500" />
                              Criada: <span className="text-zinc-300">{formattedDate}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-zinc-500" />
                              Lançamentos: <strong className="text-zinc-200">{version.transactionCount}</strong>
                            </span>
                          </div>

                          {version.notes && (
                            <p className="text-xs text-zinc-300 bg-zinc-900/80 px-2.5 py-1.5 rounded-lg border border-zinc-800/60 mt-1.5 italic">
                              "{version.notes}"
                            </p>
                          )}
                        </div>

                        {/* Amount & Actions */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] text-zinc-500 block">Total da Fatura</span>
                            <span className="font-mono-numbers font-extrabold text-base text-emerald-400">
                              {formatBRL(version.totalAmount)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {!isActive && (
                              <button
                                onClick={() => setActiveInvoiceVersion(cardId, month, version.id)}
                                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 text-white text-xs font-bold transition flex items-center gap-1 border border-zinc-700"
                                title="Ativar esta versão em todo o sistema"
                              >
                                Tornar Ativa
                              </button>
                            )}

                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Deseja realmente excluir a versão "${version.name}"?`
                                  )
                                ) {
                                  deleteInvoiceVersion(cardId, month, version.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Excluir esta versão"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-start gap-2 text-[11px] text-zinc-400">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            <strong>Como funciona:</strong> Ao alternar a versão ativa, os lançamentos desta fatura são substituídos instantaneamente na Central de Cartões, no Controle Mensal e na Matriz Anual. As alterações ficam no estado local e só geram requisição ao Firebase após clicar no botão <strong>"Salvar"</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
