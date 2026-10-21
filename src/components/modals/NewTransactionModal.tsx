import React, { useState, useMemo } from 'react';
import {
  X,
  CreditCard,
  Plus,
  TrendingDown,
  TrendingUp,
  Calendar,
  Layers,
  Sparkles,
  Lock,
} from 'lucide-react';

import { useFinance } from '../../context/FinanceContext';
import { ExpenseFrequency, ScopeType } from '../../types/finance';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    data,
    selectedMonth,
    summaries,
    addIncome,
    addCardTransaction,
    addOrIncrementExpense,
    isMonthClosed,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'expense' | 'income' | 'cardTx'>('expense');


  // Common fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [scope, setScope] = useState<'PF' | 'PJ'>('PF');
  const [startMonth, setStartMonth] = useState(selectedMonth);
  const [notes, setNotes] = useState('');
  const [needsReview, setNeedsReview] = useState(false);

  // Expense specific
  const [expenseCategory, setExpenseCategory] = useState('Moradia/Contas');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customCategoryTarget, setCustomCategoryTarget] = useState('');
  const [frequency, setFrequency] = useState<ExpenseFrequency>('fixed');
  const [installmentsCount, setInstallmentsCount] = useState('12');
  const [periodicInterval, setPeriodicInterval] = useState<'quarterly' | 'annual'>('quarterly');

  // Dynamic Categories list - strictly uses configured budgetEnvelopes from Configurações
  const availableCategories = useMemo(() => {
    const configuredEnvelopes = (data.budgetEnvelopes || []).map((e) => e.name);
    if (configuredEnvelopes.length > 0) {
      return Array.from(new Set(configuredEnvelopes.filter(Boolean)));
    }
    return [
      'Moradia/Contas',
      'Educação',
      'Mercado',
      'Outros',
    ];
  }, [data.budgetEnvelopes]);

  // Income specific
  const [incomeType, setIncomeType] = useState<'fixed' | 'variable'>('fixed');
  const [incomeCategory, setIncomeCategory] = useState('Salário');
  const [incomeSource, setIncomeSource] = useState<'Carol' | 'Filipe' | 'custom'>('Filipe');
  const [customIncomeSource, setCustomIncomeSource] = useState('');

  // Card Tx specific
  const [selectedCardId, setSelectedCardId] = useState(data.creditCards[0]?.id || '');
  const [cardTxType, setCardTxType] = useState<'recurring' | 'installment' | 'single'>('installment');
  const [cardInstallments, setCardInstallments] = useState('10');
  const [cardCategory, setCardCategory] = useState('Eletrônicos');

  if (!isOpen) return null;

  const isTargetMonthClosed = isMonthClosed(startMonth);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTargetMonthClosed) {
      alert(`O mês de ${startMonth} está fechado e bloqueado contra novos lançamentos.`);
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!title || isNaN(parsedAmount) || parsedAmount <= 0) return;

    if (activeTab === 'expense') {
      const resolvedCategory = isNewCategory ? customCategoryName.trim() : expenseCategory;
      if (!resolvedCategory) return;


      addOrIncrementExpense({
        title,
        amount: parsedAmount,
        category: resolvedCategory,
        scope,
        month: startMonth,
        frequency,
        installmentsCount: frequency === 'installment' ? parseInt(installmentsCount, 10) : undefined,
        notes,
        targetEnvelopeAmount: customCategoryTarget ? parseFloat(customCategoryTarget) : undefined,
      });
    } else if (activeTab === 'income') {
      const resolvedSource =
        incomeSource === 'custom' ? customIncomeSource || 'Outro' : incomeSource;
      addIncome({
        title,
        type: incomeType,
        amount: parsedAmount,
        category: incomeCategory,
        scope,
        source: resolvedSource,
        month: incomeType === 'variable' ? startMonth : undefined,
        startMonth: incomeType === 'fixed' ? startMonth : undefined,
        notes,
      });
    } else if (activeTab === 'cardTx') {
      const numInst = cardTxType === 'installment' ? parseInt(cardInstallments, 10) : 1;
      addCardTransaction({
        cardId: selectedCardId,
        description: title,
        type: cardTxType,
        installmentAmount: parsedAmount,
        totalAmount: parsedAmount * numInst,
        totalInstallments: numInst,
        startMonth,
        category: cardCategory,
        needsReview,
        notes,
      });
    }

    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Novo Lançamento</h3>
              <p className="text-xs text-zinc-400">Cadastre despesas, receitas ou compras de cartão</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/40 p-1.5 gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('expense')}
            className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'expense'
                ? 'bg-zinc-800 text-rose-300 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Despesa / Conta
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('income')}
            className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'income'
                ? 'bg-zinc-800 text-emerald-300 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Receita
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cardTx')}
            className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'cardTx'
                ? 'bg-zinc-800 text-indigo-300 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Cartão de Crédito
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Card Selection & Start Month (if card tab) */}
          {activeTab === 'cardTx' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Cartão de Crédito</label>
                <select
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
                >
                  {data.creditCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name} ({card.scope} - Venc. Dia {card.dueDay})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Mês da Fatura (Início da Cobrança)</label>
                <input
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="font-semibold text-zinc-300">
              {activeTab === 'cardTx' ? 'Descrição da Compra / Assinatura' : 'Título do Lançamento'}
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Financiamento Carro, Netflix, Compra Supermercado..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
            />
          </div>

          {/* Amount & Month */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-zinc-300">
                {activeTab === 'cardTx' && cardTxType === 'installment'
                  ? 'Valor da Parcela (R$)'
                  : 'Valor (R$)'}
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-zinc-300">
                {activeTab === 'expense' && frequency === 'installment'
                  ? 'Mês da 1ª Parcela'
                  : 'Mês de Início / Execução'}
              </label>
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
              >
                {summaries.map((s) => (
                  <option key={s.month} value={s.month}>
                    {s.label} ({s.month}) {isMonthClosed(s.month) ? '🔒 Fechado' : ''}
                  </option>
                ))}
              </select>
              {isTargetMonthClosed && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-1.5 mt-1">
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Mês fechado e bloqueado contra alterações.</span>
                </div>
              )}
            </div>
          </div>


          {/* Scope & Frequency or Types */}
          {activeTab === 'expense' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Frequência</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as ExpenseFrequency)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="fixed">Fixa Mensal (Repete todo mês)</option>
                    <option value="installment">Parcelada / Prazo Definido (Ex: 36x)</option>
                    <option value="periodic">Periódica (Ex: Trimestral/Anual)</option>
                    <option value="single">Única / Avulsa neste mês</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Escopo</label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as 'PF' | 'PJ')}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="PF">Pessoa Física (PF)</option>
                    <option value="PJ">Pessoa Jurídica (PJ)</option>
                  </select>
                </div>
              </div>

              {frequency === 'installment' && (
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Número Total de Parcelas</label>
                  <input
                    type="number"
                    min="2"
                    max="120"
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {frequency === 'periodic' && (
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Periodicidade</label>
                  <select
                    value={periodicInterval}
                    onChange={(e) => setPeriodicInterval(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="quarterly">Trimestral (Mar, Jun, Set, Dez)</option>
                    <option value="annual">Anual (Janeiro)</option>
                  </select>
                </div>
              )}

              <div className="space-y-2 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-zinc-300">Categoria da Despesa</label>
                  <button
                    type="button"
                    onClick={() => setIsNewCategory(!isNewCategory)}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition"
                  >
                    {isNewCategory ? '← Escolher existente' : '+ Criar Nova Categoria'}
                  </button>
                </div>

                {!isNewCategory ? (
                  <>
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
                    >
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-zinc-400">
                      💡 Ao lançar em uma categoria existente, o valor é somado na matriz e discriminado em detalhes na aba Previsão & Controle.
                    </p>
                  </>
                ) : (
                  <div className="space-y-2 animate-in fade-in">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Nome da Nova Categoria (gerará uma nova linha na matriz):
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Consultas Médicas, Manutenção Carro, Petshop..."
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-emerald-500/50 text-white outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Teto / Previsão Mensal Inicial (R$) (opcional):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 500.00"
                        value={customCategoryTarget}
                        onChange={(e) => setCustomCategoryTarget(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}


          {activeTab === 'income' && (
            <div className="space-y-3">
              {/* Fonte da Receita Selector */}
              <div className="space-y-1.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <label className="font-semibold text-zinc-300 block">
                  Fonte da Receita (Quem recebeu?)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIncomeSource('Filipe')}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition ${
                      incomeSource === 'Filipe'
                        ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    Filipe
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncomeSource('Carol')}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition ${
                      incomeSource === 'Carol'
                        ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    Carol
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncomeSource('custom')}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition ${
                      incomeSource === 'custom'
                        ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    + Outro...
                  </button>
                </div>

                {incomeSource === 'custom' && (
                  <input
                    type="text"
                    required
                    placeholder="Digite o nome da fonte (ex: Consultoria externa, Dividendos...)"
                    value={customIncomeSource}
                    onChange={(e) => setCustomIncomeSource(e.target.value)}
                    className="w-full mt-2 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white outline-none focus:border-emerald-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Tipo de Receita</label>
                  <select
                    value={incomeType}
                    onChange={(e) => setIncomeType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="fixed">Fixa Recorrente (Salário, Renda Base)</option>
                    <option value="variable">Variável / Extra (Bônus, Projeto)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Escopo</label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as 'PF' | 'PJ')}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="PF">Pessoa Física (PF)</option>
                    <option value="PJ">Pessoa Jurídica (PJ)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cardTx' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Tipo no Cartão</label>
                <select
                  value={cardTxType}
                  onChange={(e) => setCardTxType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
                >
                  <option value="installment">Compra Parcelada</option>
                  <option value="recurring">Assinatura Mensal (Netflix, Prime...)</option>
                  <option value="single">Compra À Vista na Fatura</option>
                </select>
              </div>

              {cardTxType === 'installment' ? (
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Total de Parcelas</label>
                  <input
                    type="number"
                    min="2"
                    max="48"
                    value={cardInstallments}
                    onChange={(e) => setCardInstallments(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-emerald-500"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Categoria</label>
                  <select
                    value={cardCategory}
                    onChange={(e) => setCardCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="Assinaturas">Assinaturas</option>
                    <option value="Eletrônicos">Eletrônicos</option>
                    <option value="Supermercado">Supermercado</option>
                    <option value="Restaurante">Restaurante</option>
                    <option value="Viagem">Viagem</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Notes & Verification Tag */}
          <div className="space-y-2 pt-1 border-t border-zinc-800">
            <div className="space-y-1">
              <label className="font-semibold text-zinc-300">Observações (opcional)</label>
              <input
                type="text"
                placeholder="Ex: Cobrança via débito em conta dia 10"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-zinc-300 pt-1">
              <input
                type="checkbox"
                checked={needsReview}
                onChange={(e) => setNeedsReview(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>Marcar com a tag ⚠️ <strong>Verificar</strong> para auditoria posterior</span>
            </label>
          </div>

          {/* Submit */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isTargetMonthClosed}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition shadow-md ${
                isTargetMonthClosed
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20'
              }`}
            >
              {isTargetMonthClosed ? 'Mês Fechado (Bloqueado)' : 'Confirmar e Salvar Lançamento'}
            </button>
          </div>


        </form>

      </div>
    </div>
  );
};
