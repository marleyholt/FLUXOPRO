/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import { LoginScreen } from './components/LoginScreen';
import { getAuthInstance, logoutUser } from './services/authService';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
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
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { formatBRL } from './utils/calculations';

interface MainAppProps {
  currentUser: User;
}

function MainApp({ currentUser }: MainAppProps) {
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
  const [newTxDefaultTab, setNewTxDefaultTab] = useState<'expense' | 'income' | 'cardTx' | undefined>();
  const [newTxDefaultCardId, setNewTxDefaultCardId] = useState<string | undefined>();
  const [newTxDefaultCategory, setNewTxDefaultCategory] = useState<string | undefined>();
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [quickExpenseEnvelopeId, setQuickExpenseEnvelopeId] = useState<string | undefined>();
  const [quickExpenseSubItemId, setQuickExpenseSubItemId] = useState<string | undefined>();
  const [quickExpenseExpenseId, setQuickExpenseExpenseId] = useState<string | undefined>();
  const [isRealInvoiceModalOpen, setIsRealInvoiceModalOpen] = useState(false);
  const [realInvoiceCardId, setRealInvoiceCardId] = useState<string>('');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);

  const handleOpenNewTransaction = (cardId?: string, tab?: 'expense' | 'income' | 'cardTx', category?: string) => {
    setNewTxDefaultCardId(cardId);
    setNewTxDefaultTab(tab || (cardId ? 'cardTx' : undefined));
    setNewTxDefaultCategory(category);
    setIsNewTxModalOpen(true);
  };

  const handleOpenQuickExpense = (envelopeId?: string, subItemId?: string, expenseId?: string) => {
    setQuickExpenseEnvelopeId(envelopeId);
    setQuickExpenseSubItemId(subItemId);
    setQuickExpenseExpenseId(expenseId);
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
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenNewTransaction={() => handleOpenNewTransaction()}
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

          {/* Quick Action Buttons & User Profile */}
          <div className="flex items-center gap-2.5">
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

            <div className="h-5 w-px bg-zinc-800 mx-1" />

            <div className="flex items-center gap-2 pl-1">
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate max-w-[140px]">{currentUser.email}</span>
              </div>
              <button
                onClick={() => logoutUser()}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/30 transition"
                title="Sair da Conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
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
              onOpenNewTransaction={() => handleOpenNewTransaction()}
              onOpenCsvImport={() => setIsCsvModalOpen(true)}
            />
          )}
          {activeTab === 'matrix' && (
            <MatrixTab
              onOpenNewTransaction={() => handleOpenNewTransaction()}
              onOpenCsvImport={() => setIsCsvModalOpen(true)}
            />
          )}
          {activeTab === 'monthly' && (
            <MonthlyControlTab
              onOpenQuickExpense={handleOpenQuickExpense}
              onOpenNewTransaction={() => handleOpenNewTransaction()}
            />
          )}
          {activeTab === 'cards' && (
            <CardsTab
              onOpenNewTransaction={(cardId) => handleOpenNewTransaction(cardId, 'cardTx')}
              onOpenCsvImport={() => setIsCsvModalOpen(true)}
              onOpenRealInvoiceModal={handleOpenRealInvoice}
            />
          )}
          {activeTab === 'variables' && (
            <VariableIncomesTab
              onOpenNewTransaction={() => handleOpenNewTransaction()}
            />
          )}
          {activeTab === 'raiox' && <RaioXTab />}
          {activeTab === 'closing' && <MonthlyClosingTab />}
          {(activeTab === 'config' || activeTab === 'settings') && <ConfigTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </main>
      </div>

      {/* Modals */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
      />

      <NewTransactionModal
        isOpen={isNewTxModalOpen}
        onClose={() => setIsNewTxModalOpen(false)}
        defaultCardId={newTxDefaultCardId}
        defaultTab={newTxDefaultTab}
        defaultCategory={newTxDefaultCategory}
      />

      <QuickExpenseModal
        isOpen={isQuickExpenseOpen}
        onClose={() => setIsQuickExpenseOpen(false)}
        defaultEnvelopeId={quickExpenseEnvelopeId}
        defaultSubItemId={quickExpenseSubItemId}
        defaultExpenseId={quickExpenseExpenseId}
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

function AppContent() {
  const { data, updateSettings, loading } = useFinance();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const auth = getAuthInstance();
    if (!auth) {
      setAuthChecking(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u && u.email) {
        const emailLower = u.email.toLowerCase().trim();
        const allowed = data.settings.allowedEmails || [];
        if (allowed.length === 0 || allowed.some((e) => e.toLowerCase().trim() === emailLower)) {
          setCurrentUser(u);
        } else {
          signOut(auth);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, [data.settings.allowedEmails]);

  if (loading || authChecking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-300">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
          Carregando FluxoPro...
        </span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen
        allowedEmails={data.settings.allowedEmails}
        onLoginSuccess={(u) => setCurrentUser(u)}
        onAutoAddEmail={(email) => {
          const current = data.settings.allowedEmails || [];
          if (!current.includes(email)) {
            updateSettings({ allowedEmails: [email, ...current] });
          }
        }}
      />
    );
  }

  return <MainApp currentUser={currentUser} />;
}

export default function App() {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  );
}
