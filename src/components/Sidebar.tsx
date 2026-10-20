import React from 'react';
import {
  TrendingUp,
  FileSpreadsheet,
  Calendar,
  CreditCard,
  Layers,
  PieChart,
  CheckSquare,
  Upload,
  PlusCircle,
  Database,
  Menu,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  GitBranch,
  CalendarCheck,
  Building2,
  User,
  Sparkles,
  Calculator,
  Settings,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { ScopeType } from '../types/finance';
import { formatBRL, getMonthLabel, findRecoveryMilestone } from '../utils/calculations';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenNewTransaction: () => void;
  onOpenCsvImport: () => void;
  onOpenBackupModal: () => void;
  onOpenChecklistModal: () => void;
  onOpenGitHubModal?: () => void;
}


export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  onOpenNewTransaction,
  onOpenCsvImport,
  onOpenBackupModal,
  onOpenChecklistModal,
  onOpenGitHubModal,
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
    isUsingFirebase,
  } = useFinance();

  const milestone = findRecoveryMilestone(summaries);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard & Dívidas', icon: TrendingUp },
    { id: 'matrix', label: 'Matriz Anual (12 Meses)', icon: FileSpreadsheet },
    { id: 'monthly', label: 'Previsão & Controle', icon: Calendar },
    { id: 'closing', label: 'Fechamento Mensal (30/31)', icon: CalendarCheck },
    { id: 'cards', label: 'Central de Cartões', icon: CreditCard },
    { id: 'variables', label: 'Receitas', icon: Layers },
    { id: 'raiox', label: 'Raio-X Previsto vs Real', icon: PieChart },
    { id: 'simulation', label: 'Simulação & Juros', icon: Calculator },
    { id: 'config', label: 'Configurações', icon: Settings },
  ] as const;

  // Format activity
  const formatTimeAgo = (iso?: string) => {
    if (!iso) return 'Primeiro acesso';
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 2) return 'Agora mesmo';
    if (diffMin < 60) return `${diffMin} min atrás`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${Math.floor(diffHours / 24)}d atrás`;
  };

  const lastVisitText = formatTimeAgo(data.settings.lastVisitTimestamp);
  const lastExp = data.settings.lastExpenseLogged;

  // Count checklist completed
  const checklistTotal = 12;
  const checklistDone = Object.values(data.settings.checklistState || {}).filter(Boolean).length;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 bg-zinc-950 border-r border-zinc-800/80 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Sidebar Header */}
      <div className="h-16 px-4 border-b border-zinc-800/80 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-zinc-950 font-extrabold shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-white tracking-tight">FluxoPro</span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  12M
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 truncate">Recuperação & Planejamento</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-zinc-950 font-extrabold shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
        )}

        {/* Subtle collapse button only when expanded, never showing a duplicate hamburger menu */}
        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition"
            title="Recolher menu lateral"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>


      {/* Month & Scope Controls (When expanded) */}
      {!isCollapsed && (
        <div className="p-3 border-b border-zinc-800/60 bg-zinc-900/30 space-y-2 text-xs">
          {/* Month Selector */}
          <div className="flex items-center justify-between gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1.5">
            <span className="text-[11px] text-zinc-400 font-medium pl-1">Mês Ativo:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer text-xs"
            >
              {summaries.map((s) => (
                <option key={s.month} value={s.month} className="bg-zinc-900 text-white">
                  {s.label} ({formatBRL(s.finalBalance)})
                </option>
              ))}
            </select>
          </div>

          {/* Scope Filter */}
          <div className="grid grid-cols-3 gap-1 bg-zinc-900/80 border border-zinc-800/80 p-0.5 rounded-lg text-center text-[11px] font-medium">
            <button
              onClick={() => setScopeFilter('ALL')}
              className={`py-1 rounded transition ${
                scopeFilter === 'ALL'
                  ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Geral
            </button>
            <button
              onClick={() => setScopeFilter('PF')}
              className={`py-1 rounded transition flex items-center justify-center gap-1 ${
                scopeFilter === 'PF'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <User className="w-3 h-3" /> PF
            </button>
            <button
              onClick={() => setScopeFilter('PJ')}
              className={`py-1 rounded transition flex items-center justify-center gap-1 ${
                scopeFilter === 'PJ'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Building2 className="w-3 h-3" /> PJ
            </button>
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-zinc-900 text-white border border-zinc-700/80 shadow-md text-emerald-400'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={tab.label}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
              {!isCollapsed && <span>{tab.label}</span>}
            </button>
          );
        })}

        {/* Guided Routine Trigger */}
        <div className="pt-2">
          <button
            onClick={onOpenChecklistModal}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold bg-emerald-950/20 hover:bg-emerald-950/30 text-emerald-300 border border-emerald-500/30 transition ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Roteiro & Rotina Financeira (Checklist)"
          >
            <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
            {!isCollapsed && (
              <div className="flex items-center justify-between w-full">
                <span>Roteiro Guiado</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  {checklistDone}/{checklistTotal}
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-zinc-900 space-y-1.5">
          {/* New Transaction */}
          <button
            onClick={onOpenNewTransaction}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-md shadow-emerald-500/20 ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Novo Lançamento"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5] shrink-0" />
            {!isCollapsed && <span>Novo Lançamento</span>}
          </button>

          {/* Import CSV */}
          <button
            onClick={onOpenCsvImport}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-850 text-emerald-400 border border-emerald-500/30 transition shadow-sm ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Upload de faturas de cartão e extratos em CSV a qualquer momento para consolidar compras do dia"
          >
            <Upload className="w-4 h-4 shrink-0" />
            {!isCollapsed && (
              <div className="flex items-center justify-between w-full">
                <span>Importar CSV</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  Faturas & Extratos
                </span>
              </div>
            )}
          </button>

          {/* Cloud & Backup */}

          <button
            onClick={onOpenBackupModal}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Firebase & Backup"
          >
            <Database className="w-4 h-4 text-zinc-400 shrink-0" />
            {!isCollapsed && (
              <div className="flex items-center justify-between w-full">
                <span>{isUsingFirebase ? 'Firebase Ativo' : 'Backup & Nuvem'}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isUsingFirebase ? 'bg-emerald-400' : 'bg-zinc-500'
                  }`}
                />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Activity Tracker Footer (When expanded) */}
      {!isCollapsed && (
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/40 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-zinc-400" /> Visita:
            </span>
            <span className="text-zinc-200 font-medium">{lastVisitText}</span>
          </div>

          {lastExp ? (
            <div className="text-[10px] text-zinc-400 truncate">
              Último lançamento:{' '}
              <strong className="text-zinc-200">{lastExp.description}</strong> ({formatBRL(lastExp.amount)})
            </div>
          ) : (
            <div className="text-[10px] text-zinc-400">Nenhuma despesa recente registrada</div>
          )}
        </div>
      )}
    </aside>
  );
};
