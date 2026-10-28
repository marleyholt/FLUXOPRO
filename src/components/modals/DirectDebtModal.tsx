import React, { useState } from 'react';
import {
  X,
  Clock,
  Building2,
  Calendar,
  Percent,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Infinity as InfinityIcon,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatBRL } from '../../utils/calculations';

interface DirectDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const DirectDebtModal: React.FC<DirectDebtModalProps> = ({ isOpen, onClose }) => {
  const { addDirectDebt, selectedMonth } = useFinance();

  const [creditorSource, setCreditorSource] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [interestRate, setInterestRate] = useState('2.5');
  const [interestType, setInterestType] = useState<'monthly' | 'daily'>('monthly');
  const [isIndefinite, setIsIndefinite] = useState(true);
  const [endMonthVal, setEndMonthVal] = useState('12');
  const [endYearVal, setEndYearVal] = useState('2027');
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 25 }, (_, i) => String(currentYear - 2 + i));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;
    if (!creditorSource.trim() || !expenseTitle.trim()) return;

    const targetEndMonth = !isIndefinite
      ? `${endYearVal}-${endMonthVal.padStart(2, '0')}`
      : undefined;

    addDirectDebt({
      creditorSource: creditorSource.trim(),
      expenseTitle: expenseTitle.trim(),
      amount: parsedAmount,
      startDate,
      interestRate: parseFloat(interestRate) || 0,
      interestType,
      targetEndMonth,
      reason: reason.trim() || undefined,
    });

    onClose();
    // Reseta estado
    setCreditorSource('');
    setExpenseTitle('');
    setAmount('');
    setReason('');
    setIsIndefinite(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Cadastrar Dívida / Saldo Atrasado do Passado
              </h2>
              <p className="text-xs text-zinc-400">
                Traga dívidas anteriores diretamente para o planejamento atual sem navegar nos meses passados
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Informações Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Fonte / Credor *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Santander, Receita Federal, Fornecedor X"
                  value={creditorSource}
                  onChange={(e) => setCreditorSource(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Descrição da Dívida *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Empréstimo Capital de Giro, Cheque Especial Antigo"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Valor do Saldo Devedor (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm font-mono-numbers text-white font-bold placeholder-zinc-500 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Data de Início da Dívida *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Taxa de Juros de Atraso */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
            <span className="text-xs font-bold text-zinc-200 block">
              Juros e Encargos de Atraso
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Taxa de Juros (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white font-mono-numbers outline-none focus:border-amber-500 font-bold pr-7"
                  />
                  <Percent className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Periodicidade da Taxa
                </label>
                <select
                  value={interestType}
                  onChange={(e) => setInterestType(e.target.value as 'monthly' | 'daily')}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-amber-500 font-medium"
                >
                  <option value="monthly">% ao mês (% a.m.)</option>
                  <option value="daily">% ao dia (% a.d.)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Projeção de Vigência / Prazo Planejado */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-200 block">
                  Planejamento de Manutenção / Quitação
                </span>
                <span className="text-[11px] text-zinc-400">
                  Até quando você pretende manter ou quitar essa dívida?
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsIndefinite(true)}
                className={`p-2.5 rounded-lg border text-left transition flex items-center gap-2 ${
                  isIndefinite
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <InfinityIcon className="w-4 h-4 shrink-0" />
                <span className="text-xs">Prazo Indeterminado (Até quitar)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsIndefinite(false)}
                className={`p-2.5 rounded-lg border text-left transition flex items-center gap-2 ${
                  !isIndefinite
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="text-xs">Definir Mês/Ano Limite</span>
              </button>
            </div>

            {!isIndefinite && (
              <div className="pt-2 grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Mês de Encerramento
                  </label>
                  <select
                    value={endMonthVal}
                    onChange={(e) => setEndMonthVal(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-amber-500"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={idx} value={String(idx + 1).padStart(2, '0')}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Ano de Encerramento
                  </label>
                  <select
                    value={endYearVal}
                    onChange={(e) => setEndYearVal(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-amber-500"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Observações / Histórico de Negociação (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Contrato número 1234, proposta recebida com 30% de desconto para pagamento à vista..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500 resize-none"
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
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Salvar Dívida no Planejamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
