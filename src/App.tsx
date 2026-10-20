/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Sidebar } from './components/Sidebar';
import { DashboardTab } from './components/tabs/DashboardTab';
import { MatrixTab } from './components/tabs/MatrixTab';
import { MonthlyControlTab } from './components/tabs/MonthlyControlTab';
import { CardsTab } from './components/tabs/CardsTab';
import { VariableIncomesTab } from './components/tabs/VariableIncomesTab';
import { RaioXTab } from './components/tabs/RaioXTab';
import { MonthlyClosingTab } from './components/tabs/MonthlyClosingTab';
import { ConfigTab } from './components/tabs/ConfigTab';
import { SimulationTab } from './components/tabs/SimulationTab';
import { CsvImportModal } from './components/modals/CsvImportModal';
import { NewTransactionModal } from './components/modals/NewTransactionModal';
import { QuickExpenseModal } from './components/modals/QuickExpenseModal';
import { RealInvoiceModal } from './components/modals/RealInvoiceModal';
import { FirebaseBackupModal } from './components/modals/FirebaseBackupModal';
import { RoutineChecklistModal } from './components/modals/RoutineChecklistModal';
import {
  Menu,
  PlusCircle,
  Upload,
  CheckSquare,
  Calendar,
  CloudUpload,
  Cloud,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { formatBRL } from './utils/calculations';


function MainApp() {
  const {
    activeTab,
    loading,
    selectedMonth,
    setSelectedMonth,
    summaries,
    currentMonthSummary,
    hasUnsavedChanges,
    isSavingToFirebase,
    saveToFirebase,
  } = useFinance();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [quickExpenseEnvelopeId, setQuickExpenseEnvelopeId] = useState<string | undefined>();
  const [isRealInvoiceModalOpen, setIsRealInvoiceModalOpen] = useState(false);
  const [realInvoiceCardId, setRealInvoiceCardId] = useState<string>('');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);

  const handleOpenQuickExpense = (envelopeId?: string) => {
    setQuickExpenseEnvelopeId(envelopeId);
    setIsQuickExpenseOpen(true);
  };

  const handleOpenRealInvoice = (cardId: string) => {
    setRealInvoiceCardId(cardId);
    setIsRealInvoiceModalOpen(true);
  };

  const handleSyncToFirebase = async () => {
    const res = await saveToFirebase();
    if (res.success) {
      setSyncFeedback({ text: 'Alterações gravadas no Firebase com sucesso!', type: 'success' });
      setTimeout(() => setSyncFeedback(null), 3500);
    } else {
      setSyncFeedback({ text: res.error || 'Erro ao sincronizar com o Firebase', type: 'error' });
      setTimeout(() => setSyncFeedback(null), 4500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-300">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
          Carregando FluxoPro...
        </span>
      </div>
    );
  }

  const current = currentMonthSummary || summaries[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
        onOpenCsvImport={() => setIsCsvModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenChecklistModal={() => setIsChecklistModalOpen(true)}
      />

      {/* Main Layout Area offset by Sidebar */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'pl-20' : 'pl-72'
        }`}
      >
        {/* Top Navbar */}
        <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition"
              title="Menu Sanduíche (Recolher / Expandir)"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>FluxoPro</span>
                <span className="text-zinc-500">•</span>
                <span className="text-emerald-400 font-semibold">{current.label}</span>
              </h1>
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
                Saldo Projetado:{' '}
                <strong
                  className={
                    current.finalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }
                >
                  {formatBRL(current.finalBalance)}
                </strong>
              </span>
            </div>
          </div>

          {/* Quick Action Buttons (Only Salvar no Firebase and Novo Lançamento) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncToFirebase}
              disabled={isSavingToFirebase}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                hasUnsavedChanges
                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20 ring-1 ring-amber-400 animate-pulse'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-emerald-500/30'
              }`}
              title="Gravar dados no Firebase Firestore"
            >
              <CloudUpload className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isSavingToFirebase ? 'Gravando...' : hasUnsavedChanges ? 'Salvar no Firebase' : 'Salvo no Firebase'}</span>
            </button>

            <button
              onClick={() => setIsNewTxModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-md shadow-emerald-500/20"
            >
              <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Novo Lançamento</span>
            </button>
          </div>
        </header>

        {/* Feedback Alert Banner */}
        {syncFeedback && (
          <div
            className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{syncFeedback.text}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {activeTab === 'dashboard' && (
            <DashboardTab
              onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
              onOpenCsvImport={() => setIsCsvModalOpen(true)}
            />
          )}

          {activeTab === 'matrix' && (
            <MatrixTab
              onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
              onOpenCsvImport={() => setIsCsvModalOpen(true)}
            />
          )}

          {activeTab === 'monthly' && (
            <MonthlyControlTab
              onOpenQuickExpense={handleOpenQuickExpense}
              onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
            />
          )}

          {activeTab === 'closing' && <MonthlyClosingTab />}

          {activeTab === 'cards' && (
            <CardsTab
              onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
              onOpenCsvImport={() => setIsCsvModalOpen(true)}
              onOpenRealInvoiceModal={handleOpenRealInvoice}
            />
          )}

          {activeTab === 'variables' && (
            <VariableIncomesTab
              onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
            />
          )}

          {activeTab === 'raiox' && <RaioXTab />}

          {activeTab === 'simulation' && <SimulationTab />}

          {activeTab === 'config' && <ConfigTab />}
        </main>


        {/* Footer */}
        <footer className="border-t border-zinc-900 bg-zinc-950 py-4 text-center text-xs text-zinc-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              FluxoPro • Gestão Financeira & Recuperação Fiscal 12M • Firebase Firestore
            </span>
            <span className="text-[11px] text-zinc-400">
              Conectado ao Projeto: gen-lang-client-0435174156
            </span>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
      />

      <NewTransactionModal
        isOpen={isNewTxModalOpen}
        onClose={() => setIsNewTxModalOpen(false)}
      />

      <QuickExpenseModal
        isOpen={isQuickExpenseOpen}
        onClose={() => setIsQuickExpenseOpen(false)}
        defaultEnvelopeId={quickExpenseEnvelopeId}
      />

      <RealInvoiceModal
        isOpen={isRealInvoiceModalOpen}
        onClose={() => setIsRealInvoiceModalOpen(false)}
        cardId={realInvoiceCardId}
      />

      <FirebaseBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      <RoutineChecklistModal
        isOpen={isChecklistModalOpen}
        onClose={() => setIsChecklistModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <MainApp />
    </FinanceProvider>
  );
}
