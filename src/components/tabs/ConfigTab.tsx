import React, { useState } from 'react';
import {
  Building2,
  CreditCard as CreditCardIcon,
  Settings,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Percent,
  Calendar,
  DollarSign,
  Download,
  Database,
  Server,
  HelpCircle,
  Copy,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { BankAccountConfig, CreditCard, VariableBudgetCategory } from '../../types/finance';
import { formatBRL } from '../../utils/calculations';
import { generateMysqlDump } from '../../utils/laravelSqlGenerator';

export const ConfigTab: React.FC = () => {
  const {
    data,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    createBudgetCategory,
    updateBudgetEnvelope,
    deleteBudgetEnvelope,
  } = useFinance();

  // Active sub-section
  const [activeSection, setActiveSection] = useState<'banks' | 'cards' | 'envelopes' | 'migration'>('banks');

  // Bank Account Modal State
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccountConfig | null>(null);
  const [bankForm, setBankForm] = useState({
    name: '',
    agency: '',
    accountNumber: '',
    overdraftLimit: 5000,
    overdraftRateMonthly: 8.0,
    overdraftFreeDays: 10,
    color: '#ef4444',
  });

  // Credit Card Modal State
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [cardForm, setCardForm] = useState({
    name: '',
    bank: '',
    scope: 'PF' as 'PF' | 'PJ',
    dueDay: 10,
    closingDay: 3,
    limit: 10000,
    rotativoRateMonthly: 14.5,
    parcelamentoRateMonthly: 4.2,
    color: '#8b5cf6',
  });

  // Envelope Modal State
  const [envelopeModalOpen, setEnvelopeModalOpen] = useState(false);
  const [editingEnvelope, setEditingEnvelope] = useState<VariableBudgetCategory | null>(null);
  const [envelopeForm, setEnvelopeForm] = useState({
    name: '',
    targetAmount: 500,
    color: '#10b981',
  });

  // In-app Delete Confirmation (Never uses window.confirm in iframes)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Copy feedback
  const [copiedScript, setCopiedScript] = useState(false);

  // Bank Handlers
  const handleOpenBankModal = (bank?: BankAccountConfig) => {
    if (bank) {
      setEditingBank(bank);
      setBankForm({
        name: bank.name,
        agency: bank.agency || '',
        accountNumber: bank.accountNumber || '',
        overdraftLimit: bank.overdraftLimit,
        overdraftRateMonthly: bank.overdraftRateMonthly,
        overdraftFreeDays: bank.overdraftFreeDays,
        color: bank.color || '#3b82f6',
      });
    } else {
      setEditingBank(null);
      setBankForm({
        name: '',
        agency: '',
        accountNumber: '',
        overdraftLimit: 3000,
        overdraftRateMonthly: 8.0,
        overdraftFreeDays: 0,
        color: '#3b82f6',
      });
    }
    setBankModalOpen(true);
  };

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.name.trim()) return;

    if (editingBank) {
      updateBankAccount({
        ...editingBank,
        name: bankForm.name.trim(),
        agency: bankForm.agency.trim() || undefined,
        accountNumber: bankForm.accountNumber.trim() || undefined,
        overdraftLimit: Number(bankForm.overdraftLimit) || 0,
        overdraftRateMonthly: Number(bankForm.overdraftRateMonthly) || 0,
        overdraftFreeDays: Number(bankForm.overdraftFreeDays) || 0,
        color: bankForm.color,
      });
    } else {
      addBankAccount({
        name: bankForm.name.trim(),
        agency: bankForm.agency.trim() || undefined,
        accountNumber: bankForm.accountNumber.trim() || undefined,
        overdraftLimit: Number(bankForm.overdraftLimit) || 0,
        overdraftRateMonthly: Number(bankForm.overdraftRateMonthly) || 0,
        overdraftFreeDays: Number(bankForm.overdraftFreeDays) || 0,
        color: bankForm.color,
      });
    }
    setBankModalOpen(false);
  };

  // Card Handlers
  const handleOpenCardModal = (card?: CreditCard) => {
    if (card) {
      setEditingCard(card);
      setCardForm({
        name: card.name,
        bank: card.bank,
        scope: card.scope,
        dueDay: card.dueDay,
        closingDay: card.closingDay,
        limit: card.limit || 0,
        rotativoRateMonthly: card.rotativoRateMonthly || 14.5,
        parcelamentoRateMonthly: card.parcelamentoRateMonthly || 4.2,
        color: card.color,
      });
    } else {
      setEditingCard(null);
      setCardForm({
        name: '',
        bank: '',
        scope: 'PF',
        dueDay: 10,
        closingDay: 3,
        limit: 5000,
        rotativoRateMonthly: 14.5,
        parcelamentoRateMonthly: 4.2,
        color: '#8b5cf6',
      });
    }
    setCardModalOpen(true);
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.name.trim()) return;

    if (editingCard) {
      updateCreditCard({
        ...editingCard,
        name: cardForm.name.trim(),
        bank: cardForm.bank.trim() || 'Banco',
        scope: cardForm.scope,
        dueDay: Number(cardForm.dueDay) || 10,
        closingDay: Number(cardForm.closingDay) || 3,
        limit: Number(cardForm.limit) || 0,
        rotativoRateMonthly: Number(cardForm.rotativoRateMonthly) || 14.5,
        parcelamentoRateMonthly: Number(cardForm.parcelamentoRateMonthly) || 4.2,
        color: cardForm.color,
      });
    } else {
      addCreditCard({
        name: cardForm.name.trim(),
        bank: cardForm.bank.trim() || 'Banco',
        scope: cardForm.scope,
        dueDay: Number(cardForm.dueDay) || 10,
        closingDay: Number(cardForm.closingDay) || 3,
        limit: Number(cardForm.limit) || 0,
        rotativoRateMonthly: Number(cardForm.rotativoRateMonthly) || 14.5,
        parcelamentoRateMonthly: Number(cardForm.parcelamentoRateMonthly) || 4.2,
        color: cardForm.color,
        realInvoiceTotalByMonth: {},
        invoicePaymentDateByMonth: {},
      });
    }
    setCardModalOpen(false);
  };

  // Envelope Handlers
  const handleOpenEnvelopeModal = (env?: VariableBudgetCategory) => {
    if (env) {
      setEditingEnvelope(env);
      setEnvelopeForm({
        name: env.name,
        targetAmount: env.targetAmount,
        color: env.color || '#10b981',
      });
    } else {
      setEditingEnvelope(null);
      setEnvelopeForm({
        name: '',
        targetAmount: 500,
        color: '#10b981',
      });
    }
    setEnvelopeModalOpen(true);
  };

  const handleSaveEnvelope = (e: React.FormEvent) => {
    e.preventDefault();
    if (!envelopeForm.name.trim()) return;

    if (editingEnvelope) {
      updateBudgetEnvelope(editingEnvelope.id, envelopeForm.name.trim(), Number(envelopeForm.targetAmount) || 0);
    } else {
      createBudgetCategory({
        name: envelopeForm.name.trim(),
        targetAmount: Number(envelopeForm.targetAmount) || 0,
        color: envelopeForm.color,
      });
    }
    setEnvelopeModalOpen(false);
  };

  // SQL Download
  const handleDownloadSql = () => {
    const sql = generateMysqlDump(data);
    const blob = new Blob([sql], { type: 'application/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluxopro_banco_mysql_${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySql = () => {
    const sql = generateMysqlDump(data);
    navigator.clipboard.writeText(sql);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            Configurações & Parâmetros Bancários
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Configure as taxas de juros reais de cada banco, dias de cheque especial grátis, cartões e prepare sua migração para Laravel + MySQL.
          </p>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800 self-start sm:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveSection('banks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
              activeSection === 'banks'
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Bancos & Cheque Especial</span>
          </button>
          <button
            onClick={() => setActiveSection('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
              activeSection === 'cards'
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CreditCardIcon className="w-3.5 h-3.5" />
            <span>Cartões de Crédito</span>
          </button>
          <button
            onClick={() => setActiveSection('envelopes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
              activeSection === 'envelopes'
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Categorias / Envelopes</span>
          </button>
          <button
            onClick={() => setActiveSection('migration')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
              activeSection === 'migration'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm'
                : 'text-indigo-300 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Migração Laravel + MySQL</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: BANCOS & CONTAS */}
      {activeSection === 'banks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                Contas Bancárias & Limites de Cheque Especial
              </h3>
              <p className="text-xs text-zinc-400">
                O sistema usa essas taxas para calcular juros e dias grátis na projeção do fechamento do mês.
              </p>
            </div>
            <button
              onClick={() => handleOpenBankModal()}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Cadastrar Novo Banco</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data.bankAccounts || []).map((bank) => (
              <div
                key={bank.id}
                className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4 hover:border-zinc-700 transition relative overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: bank.color || '#3b82f6' }}
                />

                <div className="flex items-start justify-between pt-1">
                  <div>
                    <h4 className="font-bold text-white text-base">{bank.name}</h4>
                    <p className="text-xs text-zinc-400 font-mono-numbers mt-0.5">
                      {bank.agency ? `Ag: ${bank.agency}` : ''} {bank.accountNumber ? `• CC: ${bank.accountNumber}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenBankModal(bank)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-750 transition"
                      title="Editar banco"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirm({
                          title: 'Excluir Banco / Conta',
                          message: `Deseja realmente remover o banco "${bank.name}" das configurações?`,
                          onConfirm: () => deleteBankAccount(bank.id),
                        });
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 bg-zinc-800/80 hover:bg-zinc-750 transition"
                      title="Excluir banco"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-zinc-800/80 text-xs">
                  <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-850">
                    <span className="text-[11px] text-zinc-400 block">Limite Cheque Especial</span>
                    <strong className="text-emerald-400 font-mono-numbers text-sm block mt-0.5">
                      {formatBRL(bank.overdraftLimit)}
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-850">
                    <span className="text-[11px] text-zinc-400 block">Taxa Cheque Especial</span>
                    <strong className="text-rose-400 font-mono-numbers text-sm block mt-0.5">
                      {bank.overdraftRateMonthly}% <span className="text-[10px] text-zinc-400 font-normal">a.m.</span>
                    </strong>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-850 flex items-center justify-between text-xs">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Dias Grátis sem Juros:
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-xs ${
                      bank.overdraftFreeDays > 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {bank.overdraftFreeDays > 0 ? `${bank.overdraftFreeDays} dias grátis` : 'Nenhum dia'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: CARTÕES DE CRÉDITO */}
      {activeSection === 'cards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCardIcon className="w-4 h-4 text-indigo-400" />
                Cartões de Crédito & Taxas do Rotativo
              </h3>
              <p className="text-xs text-zinc-400">
                Configure os dias de vencimento e as taxas cobradas pelo cartão em caso de atraso ou parcelamento.
              </p>
            </div>
            <button
              onClick={() => handleOpenCardModal()}
              className="px-3.5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Cadastrar Novo Cartão</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.creditCards.map((card) => (
              <div
                key={card.id}
                className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4 hover:border-zinc-700 transition relative overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: card.color || '#8b5cf6' }}
                />

                <div className="flex items-start justify-between pt-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-base">{card.name}</h4>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300">
                        {card.scope}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{card.bank}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenCardModal(card)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-750 transition"
                      title="Editar cartão"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirm({
                          title: 'Excluir Cartão de Crédito',
                          message: `Deseja realmente remover o cartão "${card.name}" e todas as suas transações?`,
                          onConfirm: () => deleteCreditCard(card.id),
                        });
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 bg-zinc-800/80 hover:bg-zinc-750 transition"
                      title="Excluir cartão"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-850">
                    <span className="text-[11px] text-zinc-400 block">Vencimento / Fechamento</span>
                    <strong className="text-zinc-200 font-mono-numbers text-xs block mt-0.5">
                      Dia {card.dueDay} <span className="text-zinc-400 text-[10px]">(Fecha dia {card.closingDay})</span>
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-850">
                    <span className="text-[11px] text-zinc-400 block">Limite Total</span>
                    <strong className="text-emerald-400 font-mono-numbers text-xs block mt-0.5">
                      {formatBRL(card.limit || 0)}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20">
                    <span className="text-[10px] text-rose-300 font-semibold block uppercase">Juros Rotativo</span>
                    <strong className="text-rose-400 font-mono-numbers text-sm block mt-0.5">
                      {card.rotativoRateMonthly || 14.5}% <span className="text-[10px] font-normal text-zinc-400">a.m.</span>
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20">
                    <span className="text-[10px] text-amber-300 font-semibold block uppercase">Parcelamento Fatura</span>
                    <strong className="text-amber-400 font-mono-numbers text-sm block mt-0.5">
                      {card.parcelamentoRateMonthly || 4.2}% <span className="text-[10px] font-normal text-zinc-400">a.m.</span>
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: CATEGORIAS / ENVELOPES */}
      {activeSection === 'envelopes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Categorias & Teto dos Envelopes
              </h3>
              <p className="text-xs text-zinc-400">
                Gerencie todos os envelopes de despesas variáveis. Você pode alterar nomes, metas e excluir o que não usar.
              </p>
            </div>
            <button
              onClick={() => handleOpenEnvelopeModal()}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nova Categoria</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.budgetEnvelopes.map((env) => (
              <div
                key={env.id}
                className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-3 hover:border-zinc-700 transition"
              >
                <div className="space-y-0.5">
                  <h4 className="font-bold text-white text-sm">{env.name}</h4>
                  <span className="text-xs text-zinc-400 font-mono-numbers">
                    Teto Mensal: <strong className="text-emerald-400">{formatBRL(env.targetAmount)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEnvelopeModal(env)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition"
                    title="Editar categoria"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConfirm({
                        title: 'Excluir Categoria / Envelope',
                        message: `Deseja realmente remover o envelope "${env.name}" e seus lançamentos associados?`,
                        onConfirm: () => deleteBudgetEnvelope(env.id),
                      });
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 bg-zinc-800 hover:bg-zinc-750 transition"
                    title="Excluir categoria"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: GUIA DE MIGRAÇÃO LARAVEL + MYSQL */}
      {activeSection === 'migration' && (
        <div className="space-y-6">
          {/* Banner de Boas-Vindas & Explicação */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-zinc-900 to-purple-950/80 border border-indigo-500/30 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Guia Descomplicado de Migração: Firebase ➔ Laravel + MySQL
                </h3>
                <p className="text-xs text-indigo-200/90 mt-0.5">
                  Criado especialmente para você que tem pouca experiência e quer colocar o sistema no servidor da empresa sem dor de cabeça!
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs text-zinc-300 leading-relaxed">
              <strong className="text-white block font-semibold">💡 O que são esses arquivos e o que você vai fazer com eles?</strong>
              <p>
                <strong>1. O que é o arquivo SQL (.sql):</strong> É a receita completa do seu banco de dados. Ele cria as tabelas (onde guardamos contas, cartões e despesas) e já insere <strong>todos os seus dados atuais</strong> dentro dele.
              </p>
              <p>
                <strong>2. O que é o Laravel:</strong> É o sistema em PHP que vai rodar no servidor da empresa e se conectar a esse banco MySQL.
              </p>
              <p>
                <strong>3. Segurança Total:</strong> O MySQL roda dentro da rede da sua empresa, sem custos adicionais de nuvem e com backup fácil.
              </p>
            </div>

            {/* Ações de Download */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleDownloadSql}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Baixar Banco MySQL Completo (.sql)</span>
              </button>

              <button
                onClick={handleCopySql}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 transition flex items-center gap-2"
              >
                {copiedScript ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedScript ? 'SQL Copiado para a Área de Transferência!' : 'Copiar Script SQL'}</span>
              </button>
            </div>
          </div>

          {/* Passo a Passo Visual */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Passo 1 */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 text-sm">
                1
              </div>
              <h4 className="font-bold text-white text-sm">Criar o Banco no MySQL</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                No servidor da empresa (pelo terminal ou phpMyAdmin), crie o banco de dados digitando:
              </p>
              <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-emerald-300 overflow-x-auto">
{`CREATE DATABASE fluxo_caixa 
CHARACTER SET utf8mb4;`}
              </pre>
            </div>

            {/* Passo 2 */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 text-sm">
                2
              </div>
              <h4 className="font-bold text-white text-sm">Importar o arquivo .sql</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Clique no botão verde acima para baixar o arquivo <strong>.sql</strong>. No terminal do servidor, execute:
              </p>
              <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-indigo-300 overflow-x-auto">
{`mysql -u seu_usuario -p 
fluxo_caixa < fluxopro.sql`}
              </pre>
            </div>

            {/* Passo 3 */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-bold text-purple-400 text-sm">
                3
              </div>
              <h4 className="font-bold text-white text-sm">Configurar o .env do Laravel</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                No projeto Laravel, abra o arquivo <strong>.env</strong> e preencha as credenciais:
              </p>
              <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-purple-300 overflow-x-auto">
{`DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fluxo_caixa
DB_USERNAME=root
DB_PASSWORD=sua_senha`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRAR / EDITAR BANCO */}
      {bankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                {editingBank ? 'Editar Banco / Conta' : 'Cadastrar Novo Banco'}
              </h3>
              <button onClick={() => setBankModalOpen(false)} className="text-zinc-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBank} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Nome do Banco / Conta</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Santander, Itaú PJ, Nubank..."
                  value={bankForm.name}
                  onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Agência (opcional)</label>
                  <input
                    type="text"
                    placeholder="0342"
                    value={bankForm.agency}
                    onChange={(e) => setBankForm({ ...bankForm, agency: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Nº da Conta (opcional)</label>
                  <input
                    type="text"
                    placeholder="13004567-8"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Limite Cheque Especial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bankForm.overdraftLimit}
                    onChange={(e) => setBankForm({ ...bankForm, overdraftLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Taxa Juros Cheque (% a.m.)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="8.0"
                    value={bankForm.overdraftRateMonthly}
                    onChange={(e) => setBankForm({ ...bankForm, overdraftRateMonthly: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Dias Grátis sem Juros Concedidos pelo Banco</span>
                  <span className="text-emerald-400 font-bold">{bankForm.overdraftFreeDays} dias</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  placeholder="Ex: 10 (Santander dá 10 dias grátis)"
                  value={bankForm.overdraftFreeDays}
                  onChange={(e) => setBankForm({ ...bankForm, overdraftFreeDays: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-zinc-400">
                  Dica: Se o seu banco for Santander com 10 dias sem juros, coloque 10. Se for Itaú ou Nubank que não tem dias grátis, coloque 0.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Cor de Identificação</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bankForm.color}
                    onChange={(e) => setBankForm({ ...bankForm, color: e.target.value })}
                    className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700 cursor-pointer"
                  />
                  <span className="text-xs text-zinc-400 font-mono">{bankForm.color}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setBankModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition"
                >
                  Salvar Banco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRAR / EDITAR CARTÃO */}
      {cardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <CreditCardIcon className="w-4 h-4 text-indigo-400" />
                {editingCard ? 'Editar Cartão de Crédito' : 'Cadastrar Novo Cartão'}
              </h3>
              <button onClick={() => setCardModalOpen(false)} className="text-zinc-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Nome do Cartão</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Santander Unique, Nubank Ultravioleta..."
                  value={cardForm.name}
                  onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Banco Emissor</label>
                  <input
                    type="text"
                    required
                    placeholder="Santander, Nubank, Itaú..."
                    value={cardForm.bank}
                    onChange={(e) => setCardForm({ ...cardForm, bank: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Titularidade</label>
                  <select
                    value={cardForm.scope}
                    onChange={(e) => setCardForm({ ...cardForm, scope: e.target.value as 'PF' | 'PJ' })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="PF">Pessoa Física (PF)</option>
                    <option value="PJ">Pessoa Jurídica (PJ)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Dia de Vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={cardForm.dueDay}
                    onChange={(e) => setCardForm({ ...cardForm, dueDay: parseInt(e.target.value, 10) || 10 })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Dia de Fechamento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={cardForm.closingDay}
                    onChange={(e) => setCardForm({ ...cardForm, closingDay: parseInt(e.target.value, 10) || 3 })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Taxa Rotativo (% a.m.)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="14.5"
                    value={cardForm.rotativoRateMonthly}
                    onChange={(e) => setCardForm({ ...cardForm, rotativoRateMonthly: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Taxa Parcelamento (% a.m.)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="4.2"
                    value={cardForm.parcelamentoRateMonthly}
                    onChange={(e) => setCardForm({ ...cardForm, parcelamentoRateMonthly: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Limite Total do Cartão (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cardForm.limit}
                  onChange={(e) => setCardForm({ ...cardForm, limit: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCardModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-bold bg-indigo-500 hover:bg-indigo-400 text-white transition"
                >
                  Salvar Cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRAR / EDITAR ENVELOPE */}
      {envelopeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                {editingEnvelope ? 'Editar Envelope' : 'Nova Categoria de Gasto'}
              </h3>
              <button onClick={() => setEnvelopeModalOpen(false)} className="text-zinc-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEnvelope} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Nome da Categoria / Envelope</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Supermercado, Pet Shop, Combustível..."
                  value={envelopeForm.name}
                  onChange={(e) => setEnvelopeForm({ ...envelopeForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Teto Orçado Mensal (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={envelopeForm.targetAmount}
                  onChange={(e) => setEnvelopeForm({ ...envelopeForm, targetAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono-numbers outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEnvelopeModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition"
                >
                  Salvar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO (SEM USAR WINDOW.CONFIRM) */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">{deleteConfirm.title}</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{deleteConfirm.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-lg font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-2 rounded-lg font-bold bg-rose-500 hover:bg-rose-400 text-white transition text-xs shadow-md shadow-rose-500/20"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
