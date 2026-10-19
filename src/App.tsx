/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Header } from './components/Header';
import { DashboardTab } from './components/tabs/DashboardTab';
import { MatrixTab } from './components/tabs/MatrixTab';
import { MonthlyControlTab } from './components/tabs/MonthlyControlTab';
import { CardsTab } from './components/tabs/CardsTab';
import { VariableIncomesTab } from './components/tabs/VariableIncomesTab';
import { CsvImportModal } from './components/modals/CsvImportModal';
import { NewTransactionModal } from './components/modals/NewTransactionModal';
import { QuickExpenseModal } from './components/modals/QuickExpenseModal';
import { RealInvoiceModal } from './components/modals/RealInvoiceModal';
import { FirebaseBackupModal } from './components/modals/FirebaseBackupModal';

function MainApp() {
  const { activeTab, loading } = useFinance();

  // Modals state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [quickExpenseEnvelopeId, setQuickExpenseEnvelopeId] = useState<string | undefined>();
  const [isRealInvoiceModalOpen, setIsRealInvoiceModalOpen] = useState(false);
  const [realInvoiceCardId, setRealInvoiceCardId] = useState<string>('');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const handleOpenQuickExpense = (envelopeId?: string) => {
    setQuickExpenseEnvelopeId(envelopeId);
    setIsQuickExpenseOpen(true);
  };

  const handleOpenRealInvoice = (cardId: string) => {
    setRealInvoiceCardId(cardId);
    setIsRealInvoiceModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-300">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
          Carregando Fluxo de Caixa...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* App Header */}
      <Header
        onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
        onOpenCsvImport={() => setIsCsvModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
      />

      {/* Main Content Area */}
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
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 text-center text-xs text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            FluxoCaixa Pro • Gestão Financeira Pessoal & Familiar • Rolling Forecast 12 Meses
          </span>
          <span className="text-[11px] text-zinc-400">
            Arquitetura Híbrida: LocalStorage & Firebase Firestore
          </span>
        </div>
      </footer>

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
