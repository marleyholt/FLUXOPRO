import React from 'react';
import {
  TrendingUp,
  CreditCard,
  Cloud,
  FileSpreadsheet,
  PlusCircle,
  Upload,
  Calendar,
  Layers,
  Building2,
  User,
  ShieldAlert,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { ScopeType } from '../types/finance';
import { formatBRL, getMonthLabel, findRecoveryMilestone } from '../utils/calculations';

interface HeaderProps {
  onOpenNewTransaction: () => void;
  onOpenCsvImport: () => void;
  onOpenBackupModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewTransaction,
  onOpenCsvImport,
  onOpenBackupModal,
}) => {
  const {
    data,
    selectedMonth,
    setSelectedMonth,
    scopeFilter,
    setScopeFilter,
    activeTab,
    setActiveTab,
    summaries,
    currentMonthSummary,
    isUsingFirebase,
  } = useFinance();

  // Milestone indicator
  const milestone = findRecoveryMilestone(summaries);

  // Month navigation
  const currentIndex = summaries.findIndex((s) => s.month === selectedMonth);
  const handlePrevMonth = () => {
    if (currentIndex > 0) {
      setSelectedMonth(summaries[currentIndex - 1].month);
    }
  };
  const handleNextMonth = () => {
    if (currentIndex < summaries.length - 1) {
      setSelectedMonth(summaries[currentIndex + 1].month);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard & Recuperação', icon: TrendingUp },
    { id: 'matrix', label: 'Matriz Anual (Super Planilha)', icon: FileSpreadsheet },
    { id: 'monthly', label: 'Controle do Mês & Envelopes', icon: Calendar },
    { id: 'cards', label: 'Central de Cartões & Faturas', icon: CreditCard },
    { id: 'variables', label: 'Receitas Variáveis', icon: Layers },
  ] as const;

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Fiscal Recovery Tag */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-zinc-950 font-extrabold shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">FluxoCaixa</span>
                <span className="text-xs uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  PRO 12M
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Motor de Projeção & Recuperação Fiscal
              </p>
            </div>

            {/* Recovery Badge */}
            {milestone.achieved && (
              <div className="hidden lg:flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Recuperação em <strong className="text-emerald-300 font-semibold">{milestone.label}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Month Selector & Scope Filter */}
          <div className="flex items-center gap-3">
            {/* Month Navigation */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs">
              <button
                onClick={handlePrevMonth}
                disabled={currentIndex <= 0}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white font-medium px-2 py-0.5 outline-none cursor-pointer text-xs"
              >
                {summaries.map((s) => (
                  <option key={s.month} value={s.month} className="bg-zinc-900 text-white">
                    {s.label} ({formatBRL(s.finalBalance)})
                  </option>
                ))}
              </select>

              <button
                onClick={handleNextMonth}
                disabled={currentIndex >= summaries.length - 1}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Scope Toggle (Todos / PF / PJ) */}
            <div className="hidden md:flex items-center bg-zinc-900/90 border border-zinc-800 rounded-lg p-1 text-xs font-medium">
              <button
                onClick={() => setScopeFilter('ALL')}
                className={`px-2.5 py-1 rounded-md transition ${
                  scopeFilter === 'ALL'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Geral
              </button>
              <button
                onClick={() => setScopeFilter('PF')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition ${
                  scopeFilter === 'PF'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <User className="w-3 h-3" />
                PF
              </button>
              <button
                onClick={() => setScopeFilter('PJ')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition ${
                  scopeFilter === 'PJ'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Building2 className="w-3 h-3" />
                PJ
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* CSV Import */}
            <button
              onClick={onOpenCsvImport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 transition shadow-sm"
              title="Importar Fatura CSV do Cartão"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Importar CSV</span>
            </button>

            {/* Firebase & Backup Config */}
            <button
              onClick={onOpenBackupModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition"
              title="Configurações de Nuvem & Backup"
            >
              <Database className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden md:inline">
                {isUsingFirebase ? 'Firebase Conectado' : 'Backup & Nuvem'}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isUsingFirebase ? 'bg-emerald-400' : 'bg-zinc-500'
                }`}
              />
            </button>

            {/* New Transaction Button */}
            <button
              onClick={onOpenNewTransaction}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-md shadow-emerald-500/20"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Novo Lançamento</span>
            </button>
          </div>

        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-zinc-900 pt-1 pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  isActive
                    ? 'bg-zinc-800 text-white font-semibold border border-zinc-700/60 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
