import React, { useState, useRef } from 'react';
import {
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  DollarSign,
  ShieldAlert,
  Calendar,
  Sparkles,
  ChevronRight,
  Info,
  Check,
  AlertCircle,
  Plus,
  Lock,
  Unlock,
  Upload,
  FileText,
  Building2,
  History,
  ShieldCheck,
  Percent,
  Calculator,
  RotateCcw,
  X,
  Trash2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  formatBRL,
  getMonthDiff,
  getInstallmentInfo,
  addMonths,
  getMonthLabel,
} from '../../utils/calculations';
import { Expense, BankStatementUploadRecord } from '../../types/finance';
import {
  parseBankStatementFile,
  calculateOverdraftProjections,
} from '../../utils/bankStatementParser';

export const MonthlyClosingTab: React.FC = () => {
  const {
    data,
    selectedMonth,
    setSelectedMonth,
    summaries,
    currentMonthSummary,
    toggleExpensePaid,
    saveMonthlyClosing,
    scheduleBillPayment,
    pushBillDebt,
    resolveScheduledReminder,
    resolvePushedDebt,
    isMonthClosed,
    closeMonth,
    reopenMonth,
    saveBankStatementResult,
  } = useFinance();

  const isClosed = isMonthClosed(selectedMonth);

  const current = currentMonthSummary || summaries[0];
  const nextMonth = addMonths(selectedMonth, 1);
  const nextMonthLabel = getMonthLabel(nextMonth);
  const monthIdx = parseInt(selectedMonth.split('-')[1], 10);

  // Existing closing record for this month
  const existingClosing = data.monthlyClosings?.[selectedMonth];

  // Local state for closing bank balance input (defines the STARTING balance for selectedMonth)
  const [realBankBalance, setRealBankBalance] = useState<string>(
    existingClosing !== undefined
      ? String(existingClosing.closingRealBalance)
      : String(current.previousBalance.toFixed(2))
  );

  const [closingNotes, setClosingNotes] = useState<string>(existingClosing?.notes || '');
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Sync input when selectedMonth or existingClosing changes
  React.useEffect(() => {
    if (existingClosing !== undefined) {
      setRealBankBalance(String(existingClosing.closingRealBalance));
      setClosingNotes(existingClosing.notes || '');
    } else {
      setRealBankBalance(String(current.previousBalance.toFixed(2)));
      setClosingNotes('');
    }
  }, [selectedMonth, existingClosing, current.previousBalance]);

  // Reopen Modal State (Replaces blocked window.confirm)
  const [isReopenModalOpen, setIsReopenModalOpen] = useState<boolean>(false);
  const [reopenReasonInput, setReopenReasonInput] = useState<string>('');

  // Bank Statement Upload State
  const [isUploadingStatement, setIsUploadingStatement] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedBankIdForUpload, setSelectedBankIdForUpload] = useState<string>(
    data.bankAccounts?.[0]?.id || ''
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal / Inline scheduling inputs
  const [schedulingExpenseId, setSchedulingExpenseId] = useState<string | null>(null);
  const [scheduledDateInput, setScheduledDateInput] = useState<string>('');

  const [pushingExpenseId, setPushingExpenseId] = useState<string | null>(null);
  const [pushReasonInput, setPushReasonInput] = useState<string>('');

  // Collect all active expenses for this month that are NOT paid
  interface PendingBillItem {
    id: string;
    title: string;
    amount: number;
    category: string;
    scope: 'PF' | 'PJ';
    installmentText?: string;
    isScheduled?: boolean;
    scheduledDate?: string;
    isPushed?: boolean;
    pushedReason?: string;
  }

  const scheduledMap = new Map(
    (existingClosing?.scheduledReminders || []).map((r) => [r.expenseId, r])
  );
  const pushedMap = new Map(
    (existingClosing?.pushedDebts || []).map((p) => [p.expenseId, p])
  );

  const pendingBills: PendingBillItem[] = [];
  const paidBills: Expense[] = [];

  data.expenses.forEach((exp) => {
    let isActive = false;
    let instText = '';

    if (exp.frequency === 'fixed') {
      if (getMonthDiff(exp.startMonth, selectedMonth) >= 0) isActive = true;
    } else if (exp.frequency === 'installment' && exp.installmentsCount) {
      const inst = getInstallmentInfo(exp.startMonth, exp.installmentsCount, selectedMonth);
      if (inst.isActive) {
        isActive = true;
        instText = `Parcela ${inst.current}/${inst.total}`;
      }
    } else if (exp.frequency === 'periodic' && exp.periodicMonths) {
      if (
        getMonthDiff(exp.startMonth, selectedMonth) >= 0 &&
        exp.periodicMonths.includes(monthIdx)
      ) {
        isActive = true;
      }
    } else if (exp.frequency === 'single') {
      if (exp.singleMonth === selectedMonth || exp.startMonth === selectedMonth) {
        isActive = true;
      }
    }

    if (isActive) {
      const isPaid = !!exp.paidMonths?.[selectedMonth];
      if (isPaid) {
        paidBills.push(exp);
      } else {
        const sched = scheduledMap.get(exp.id);
        const push = pushedMap.get(exp.id);
        pendingBills.push({
          id: exp.id,
          title: exp.title,
          amount: exp.amount,
          category: exp.category,
          scope: exp.scope,
          installmentText: instText,
          isScheduled: sched && sched.status === 'scheduled',
          scheduledDate: sched?.scheduledDate,
          isPushed: push && push.status === 'pushed',
          pushedReason: push?.reason,
        });
      }
    }
  });

  const parsedBankBalance = parseFloat(realBankBalance) || 0;
  const isOverdraft = parsedBankBalance < 0;
  const overdraftAmount = isOverdraft ? Math.abs(parsedBankBalance) : 0;
  const projectedBalance = current.finalBalance;
  const difference = parsedBankBalance - projectedBalance;

  // Encontra a taxa de cheque especial e dias grátis para projeção
  const selectedBankConfig = (data.bankAccounts || []).find((b) => b.id === selectedBankIdForUpload);
  const overdraftRate = selectedBankConfig?.overdraftRateMonthly || 8.0;
  const overdraftFreeDays = selectedBankConfig?.overdraftFreeDays || 0;

  // Cálculo da Projeção de Dívida, Juros e IOF para o próximo mês
  const projection = calculateOverdraftProjections(
    parsedBankBalance,
    overdraftRate,
    overdraftFreeDays,
    30
  );

  // Upload & Processamento do Extrato Bancário
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingStatement(true);
    setUploadError(null);

    try {
      const parsed = await parseBankStatementFile(file);
      const bankName =
        selectedBankConfig?.name || parsed.bankName || 'Conta Corrente';

      const uploadRecord: BankStatementUploadRecord = {
        id: `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        bankName,
        fileName: file.name,
        initialBalance: parsed.initialBalance,
        finalBalance: parsed.finalBalance,
        credits: parsed.credits,
        debits: parsed.debits,
        interestPaid: parsed.interestPaid,
        iofPaid: parsed.iofPaid,
        uploadedAt: new Date().toISOString(),
      };

      // Salva no registro de fechamento
      saveBankStatementResult(selectedMonth, uploadRecord, false);

      // Calcula a soma de todas as contas enviadas (incluindo a que acabou de subir)
      const allStatements = [
        ...(existingClosing?.bankStatementsUploaded || []),
        uploadRecord,
      ];

      // Se houver múltiplas contas, soma os saldos finais
      const consolidatedBalance = allStatements.reduce(
        (sum, item) => sum + item.finalBalance,
        0
      );

      // Preenche automaticamente o saldo real bancário
      setRealBankBalance(String(consolidatedBalance.toFixed(2)));

      setSavedSuccessMsg(
        `Extrato de "${bankName}" processado com sucesso! Saldo final detectado: ${formatBRL(
          parsed.finalBalance
        )}. Saldo consolidado atualizado.`
      );
      setTimeout(() => setSavedSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Erro ao ler extrato bancário:', err);
      setUploadError(
        err.message || 'Erro ao processar arquivo de extrato. Envie em formato .OFX ou .CSV.'
      );
    } finally {
      setIsUploadingStatement(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save bank closing
  const handleSaveBankClosing = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveMonthlyClosing({
      month: selectedMonth,
      closingRealBalance: parsedBankBalance,
      projectedBalance,
      adjustmentDifference: difference,
      isOverdraft,
      scheduledReminders: existingClosing?.scheduledReminders || [],
      pushedDebts: existingClosing?.pushedDebts || [],
      notes: closingNotes.trim() || undefined,
      bankStatementsUploaded: existingClosing?.bankStatementsUploaded || [],
      reopenHistory: existingClosing?.reopenHistory || [],
    });
    setSavedSuccessMsg('Saldo bancário e fechamento do mês gravados com sucesso!');
    setTimeout(() => setSavedSuccessMsg(null), 4000);
  };

  // Reopen Confirmation Handler
  const handleConfirmReopen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReasonInput.trim()) return;

    reopenMonth(selectedMonth, reopenReasonInput.trim());
    setIsReopenModalOpen(false);
    setReopenReasonInput('');
    setSavedSuccessMsg(`Mês de ${current.label} reaberto com sucesso para edição!`);
    setTimeout(() => setSavedSuccessMsg(null), 4000);
  };

  // Bill Actions
  const handleMarkPaid = (id: string) => {
    if (isClosed) return;
    toggleExpensePaid(id, selectedMonth);
  };

  const handleStartSchedule = (id: string) => {
    if (isClosed) return;
    setSchedulingExpenseId(id);
    const day = '05';
    setScheduledDateInput(`${nextMonth}-${day}`);
  };

  const handleConfirmSchedule = (item: PendingBillItem) => {
    if (!scheduledDateInput) return;
    scheduleBillPayment(item.id, item.title, item.amount, selectedMonth, scheduledDateInput);
    setSchedulingExpenseId(null);
  };

  const handleStartPush = (id: string) => {
    if (isClosed) return;
    setPushingExpenseId(id);
    setPushReasonInput('');
  };

  const handleConfirmPush = (item: PendingBillItem) => {
    pushBillDebt(item.id, item.title, item.amount, selectedMonth, pushReasonInput);
    setPushingExpenseId(null);
  };

  // Stats
  const activeReminders = (existingClosing?.scheduledReminders || []).filter(
    (r) => r.status === 'scheduled'
  );
  const activePushed = (existingClosing?.pushedDebts || []).filter(
    (p) => p.status === 'pushed'
  );
  const uploadedStatements = existingClosing?.bankStatementsUploaded || [];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Month Selector & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-400" />
            Fechamento Mensal & Conciliação das Contas (30/31)
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Faça upload do extrato dos últimos 30 dias de todas as contas, concilie com o sistema e feche o mês com proteção contra alterações indevidas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400 font-medium">Mês em Fechamento:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-bold text-white outline-none focus:border-emerald-500"
          >
            {summaries.map((s) => (
              <option key={s.month} value={s.month}>
                {s.label} ({s.month}) {data.monthlyClosings?.[s.month]?.isClosed ? '🔒' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Month Closed Status Banner */}
      {isClosed ? (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-white text-sm block">Status: Mês Fechado e Bloqueado 🔒</strong>
              <p className="text-amber-300/90 mt-0.5">
                O fechamento de <strong>{current.label}</strong> está consolidado. Nada neste mês pode ser alterado ou excluído acidentalmente.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setReopenReasonInput('');
              setIsReopenModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-amber-300 border border-amber-500/40 font-bold transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-md"
          >
            <Unlock className="w-4 h-4" />
            <span>Reabrir Mês para Ajustes</span>
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-white text-sm block">Fechamento em Aberto ({current.label})</strong>
              <p className="text-zinc-400 mt-0.5">
                Envie o extrato bancário das suas contas para calcular o saldo final e bloqueie o mês para garantir segurança aos dados.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleSaveBankClosing();
              closeMonth(selectedMonth);
            }}
            className="px-4 py-2 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 transition shadow-md shadow-emerald-500/20 flex items-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <Lock className="w-4 h-4 stroke-[2.5]" />
            <span>Fechar e Bloquear Mês</span>
          </button>
        </div>
      )}

      {/* Success Notification */}
      {savedSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {uploadError && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* GRID: 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA: UPLOAD DE EXTRATOS, SALDO CONSOLIDADO & PROJEÇÃO (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          {/* CARD 1: UPLOAD DE EXTRATO DOS ÚLTIMOS 30 DIAS */}
          <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Upload do Extrato Bancário (Últimos 30 Dias)
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                OFX / CSV / TXT
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Faça o upload do extrato de <strong>todas as suas contas bancárias</strong> (Santander, Itaú, Nubank, etc.). O sistema extrai o saldo real final, soma todas as contas e projeta os juros e IOF para o próximo mês.
            </p>

            {/* Seletor de Banco para o Arquivo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  Conta a Enviar:
                </label>
                <select
                  value={selectedBankIdForUpload}
                  onChange={(e) => setSelectedBankIdForUpload(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white outline-none focus:border-emerald-500 transition"
                  disabled={isClosed}
                >
                  {(data.bankAccounts || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.overdraftFreeDays > 0 ? `${b.overdraftFreeDays} dias grátis` : '0 dias grátis'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-300 block">Arquivo de Extrato:</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".ofx,.csv,.txt"
                  onChange={handleFileUpload}
                  disabled={isClosed || isUploadingStatement}
                  className="block w-full text-xs text-zinc-400 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-500 file:text-zinc-950 hover:file:bg-emerald-400 cursor-pointer disabled:opacity-50"
                />
              </div>
            </div>

            {/* Lista de Extratos já Enviados no Mês */}
            {uploadedStatements.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-semibold text-zinc-400 block uppercase">
                  Contas Bancárias Importadas neste Fechamento:
                </span>
                <div className="space-y-2">
                  {uploadedStatements.map((stmt) => (
                    <div
                      key={stmt.id}
                      className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-white block">{stmt.bankName}</strong>
                          <span className="text-[11px] text-zinc-400 font-mono-numbers">
                            {stmt.fileName} • {new Date(stmt.uploadedAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono-numbers">
                        <span className="text-[10px] text-zinc-400 block">Saldo Final</span>
                        <strong
                          className={`text-sm ${
                            stmt.finalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {formatBRL(stmt.finalBalance)}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CARD 2: SALDO BANCÁRIO INICIAL DO MÊS */}
          <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">
                Saldo Inicial do Mês ({current.label})
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">Projetado Anteriormente</span>
                <span
                  className={`block font-mono-numbers font-bold text-sm ${
                    current.previousBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatBRL(current.previousBalance)}
                </span>
                <span className="text-[10px] text-zinc-400">Projeção automática</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">Ajuste do Saldo Inicial</span>
                <span
                  className={`block font-mono-numbers font-bold text-sm ${
                    parsedBankBalance - current.previousBalance >= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {parsedBankBalance - current.previousBalance > 0
                    ? `+${formatBRL(parsedBankBalance - current.previousBalance)}`
                    : formatBRL(parsedBankBalance - current.previousBalance)}
                </span>
                <span className="text-[10px] text-zinc-400">Ajuste real informado</span>
              </div>
            </div>

            {/* Input Form de Saldo Inicial */}
            <form onSubmit={handleSaveBankClosing} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-200 flex items-center justify-between">
                  <span>Saldo com que {current.label} Inicia (R$):</span>
                  {uploadedStatements.length > 0 && (
                    <span className="text-emerald-400 text-[10px] font-bold">
                      Extraído dos Extratos ({uploadedStatements.length} contas)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={isClosed}
                    value={realBankBalance}
                    onChange={(e) => setRealBankBalance(e.target.value)}
                    placeholder="Ex: -2000.00 ou 450.00"
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-mono-numbers text-sm font-bold outline-none focus:border-emerald-500 disabled:opacity-60"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-zinc-400 font-semibold">
                    {isOverdraft ? 'Negativo (Cheque Especial)' : 'Positivo'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 pt-0.5">
                  💡 Este valor define o saldo com que <strong>{current.label}</strong> inicia. Se for negativo (ex: -2000,00), entrará diretamente na linha de <strong>Cobertura Cheque Especial / Saldo Negativo Anterior</strong> do mês de {current.label}.
                </p>
              </div>

              {/* Anotações */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400 block">
                  Anotações do Fechamento (opcional):
                </label>
                <input
                  type="text"
                  disabled={isClosed}
                  placeholder="Ex: Extrato Santander + Nubank conciliados sem divergências"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 outline-none disabled:opacity-60"
                />
              </div>

              {!isClosed && (
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <CalendarCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>Salvar Saldo de Fechamento</span>
                </button>
              )}
            </form>
          </div>

          {/* CARD 3: PROJEÇÃO DE DÍVIDA, JUROS E IOF PRO PRÓXIMO MÊS */}
          <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
              <Calculator className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Projeção de Dívida, Juros e IOF para o Próximo Mês ({nextMonthLabel})
              </h3>
            </div>

            {isOverdraft ? (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      Dívida Prevista no Cheque Especial:
                    </span>
                    <strong className="text-rose-400 font-mono-numbers text-base">
                      {formatBRL(projection.debtAmount)}
                    </strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-rose-500/20 text-[11px]">
                    <div>
                      <span className="text-zinc-400 block">Juros Projetados ({overdraftRate}% a.m.):</span>
                      <strong className="text-rose-400 font-mono-numbers">
                        +{formatBRL(projection.projectedInterest)}
                      </strong>
                    </div>

                    <div>
                      <span className="text-zinc-400 block">IOF Projetado (Fixo + Diário):</span>
                      <strong className="text-rose-400 font-mono-numbers">
                        +{formatBRL(projection.totalProjectedIof)}
                      </strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-semibold">Custo Financeiro Total da Dívida:</span>
                    <strong className="text-rose-400 font-mono-numbers text-sm">
                      +{formatBRL(projection.totalProjectedCost)}
                    </strong>
                  </div>
                </div>

                {/* Estratégia de Dias Grátis do Banco */}
                {overdraftFreeDays > 0 ? (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1 text-emerald-300 text-xs">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Benefício Detectado: {overdraftFreeDays} Dias Grátis ({selectedBankConfig?.name || 'Banco'})</span>
                    </div>
                    <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                      Se você cobrir esta conta em até <strong>{overdraftFreeDays} dias</strong> com receitas de {nextMonthLabel}, você <strong>economizará {formatBRL(projection.projectedInterest)}</strong> e não pagará juros de cheque especial!
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Atenção: Banco sem Dias Grátis</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      Esta conta não possui dias sem juros. Cada dia no negativo gera cobrança proporcional de juros ({overdraftRate}% a.m.) e IOF. Priorize cobrir com os primeiros recebimentos.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 space-y-1 text-xs">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Contas Consolidadas no Azul!</span>
                </div>
                <p className="text-xs text-emerald-300/80">
                  Suas contas fecham com superávit de <strong>{formatBRL(parsedBankBalance)}</strong>. Não há cobrança de juros de cheque especial ou IOF projetados para {nextMonthLabel}.
                </p>
              </div>
            )}
          </div>

          {/* CARD 4: AUDITORIA & HISTÓRICO DE REABERTURAS DO MÊS */}
          {(existingClosing?.reopenHistory?.length || 0) > 0 && (
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3 text-xs">
              <h4 className="font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                Histórico de Reaberturas Deste Mês
              </h4>
              <p className="text-[11px] text-zinc-400">
                Registro seguro de auditoria com os motivos informados ao reabrir o mês.
              </p>
              <div className="space-y-2">
                {existingClosing?.reopenHistory?.map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-850 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="font-semibold text-amber-400">Reabertura #{idx + 1}</span>
                      <span className="font-mono-numbers">
                        {new Date(entry.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200 font-medium">{entry.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: CHECKLIST DE CONTAS PENDENTES & DÍVIDAS EMPURRADAS (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Contas em Aberto de {current.label} ({pendingBills.length})
                </h3>
              </div>
              <span className="text-xs font-mono-numbers text-zinc-400">
                Total:{' '}
                <strong className="text-white">
                  {formatBRL(pendingBills.reduce((acc, curr) => acc + curr.amount, 0))}
                </strong>
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Antes de bloquear o mês, saneie as contas pendentes: marque como pagas, agende para {nextMonthLabel} ou empurre como dívida controlada.
            </p>

            {pendingBills.length === 0 ? (
              <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h4 className="text-sm font-bold text-white">Tudo em Dia! Nenhuma Conta Pendente</h4>
                <p className="text-xs text-zinc-400">
                  Todas as despesas previstas para este mês foram liquidadas ou tratadas.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBills.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5 text-xs hover:border-zinc-700 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-white text-xs">{item.title}</strong>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-400">
                            {item.scope}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400 font-mono-numbers">
                          {item.category} {item.installmentText ? `• ${item.installmentText}` : ''}
                        </span>
                      </div>

                      <strong className="text-rose-400 font-mono-numbers text-sm shrink-0">
                        {formatBRL(item.amount)}
                      </strong>
                    </div>

                    {/* Ações da Conta */}
                    {!isClosed && (
                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-850">
                        <button
                          onClick={() => handleMarkPaid(item.id)}
                          className="flex-1 py-1.5 px-2.5 rounded-lg font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition flex items-center justify-center gap-1 text-[11px]"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Pagar Agora</span>
                        </button>

                        <button
                          onClick={() => handleStartSchedule(item.id)}
                          className="flex-1 py-1.5 px-2.5 rounded-lg font-semibold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition flex items-center justify-center gap-1 text-[11px]"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Programar</span>
                        </button>

                        <button
                          onClick={() => handleStartPush(item.id)}
                          className="flex-1 py-1.5 px-2.5 rounded-lg font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition flex items-center justify-center gap-1 text-[11px]"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Empurrar Dívida</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: REABRIR O MÊS COM JUSTIFICATIVA OBRIGATÓRIA */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Unlock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Reabrir Mês de {current.label}
                  </h3>
                  <span className="text-[11px] text-zinc-400">Auditoria & Segurança</span>
                </div>
              </div>
              <button
                onClick={() => setIsReopenModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReopen} className="space-y-4 text-xs">
              <p className="text-zinc-300 leading-relaxed">
                Ao reabrir este mês, as travas de segurança serão temporariamente liberadas para você fazer ajustes, correções de extrato ou lançamentos retroativos.
              </p>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-200 block">
                  Por que você está reabrindo este mês? (Obrigatório para consulta futura):
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReasonInput}
                  onChange={(e) => setReopenReasonInput(e.target.value)}
                  placeholder="Ex: Preciso lançar uma nota fiscal atrasada do dia 28 e conciliar o extrato do Santander."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-amber-500 text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsReopenModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Confirmar Reabertura</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROGRAMAR PAGAMENTO */}
      {schedulingExpenseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Programar Pagamento com Lembrete
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Data Prevista para Pagamento:</label>
                <input
                  type="date"
                  value={scheduledDateInput}
                  onChange={(e) => setScheduledDateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSchedulingExpenseId(null)}
                  className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const item = pendingBills.find((b) => b.id === schedulingExpenseId);
                    if (item) handleConfirmSchedule(item);
                  }}
                  className="px-3.5 py-1.5 rounded-lg font-bold bg-indigo-500 hover:bg-indigo-400 text-white transition"
                >
                  Salvar Lembrete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EMPURRAR DÍVIDA */}
      {pushingExpenseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Empurrar Dívida para o Futuro
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Motivo / Negociação:</label>
                <input
                  type="text"
                  placeholder="Ex: Vou aguardar receber do cliente dia 15"
                  value={pushReasonInput}
                  onChange={(e) => setPushReasonInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPushingExpenseId(null)}
                  className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const item = pendingBills.find((b) => b.id === pushingExpenseId);
                    if (item) handleConfirmPush(item);
                  }}
                  className="px-3.5 py-1.5 rounded-lg font-bold bg-rose-500 hover:bg-rose-400 text-white transition"
                >
                  Confirmar Dívida
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
