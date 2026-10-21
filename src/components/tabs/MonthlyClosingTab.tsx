import React, { useState, useEffect } from 'react';
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
  Building2,
  History,
  ShieldCheck,
  Calculator,
  RotateCcw,
  X,
  Trash2,
  CheckSquare,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  formatBRL,
  getMonthDiff,
  getInstallmentInfo,
  addMonths,
  getMonthLabel,
} from '../../utils/calculations';
import { calculateOverdraftProjections } from '../../utils/bankStatementParser';
import { Expense } from '../../types/finance';

export const MonthlyClosingTab: React.FC = () => {
  const {
    data,
    selectedMonth,
    setSelectedMonth,
    vigenteMonth,
    setVigenteMonth,
    summaries,
    currentMonthSummary,
    toggleExpensePaid,
    saveMonthlyClosing,
    isMonthClosed,
    closeMonth,
    reopenMonth,
  } = useFinance();

  const isClosed = isMonthClosed(selectedMonth);
  const isVigente = vigenteMonth === selectedMonth;

  const current = currentMonthSummary || summaries[0];
  const nextMonth = addMonths(selectedMonth, 1);
  const nextMonthLabel = getMonthLabel(nextMonth);
  const monthIdx = parseInt(selectedMonth.split('-')[1], 10);

  // Existing closing record for this month
  const existingClosing = data.monthlyClosings?.[selectedMonth];

  // Local state for bank balance & bank account
  const [realBankBalance, setRealBankBalance] = useState<string>(
    existingClosing !== undefined
      ? String(existingClosing.closingRealBalance)
      : String(current.previousBalance.toFixed(2))
  );

  const [selectedBankId, setSelectedBankId] = useState<string>(
    existingClosing?.bankAccountId || data.bankAccounts?.[0]?.id || 'custom'
  );
  const [customBankName, setCustomBankName] = useState<string>(
    existingClosing?.bankAccountName || ''
  );
  const [negativeSinceDate, setNegativeSinceDate] = useState<string>(
    existingClosing?.negativeSinceDate || `${selectedMonth}-01`
  );
  const [closingNotes, setClosingNotes] = useState<string>(
    existingClosing?.notes || ''
  );
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Reopen Modal State
  const [isReopenModalOpen, setIsReopenModalOpen] = useState<boolean>(false);
  const [reopenReasonInput, setReopenReasonInput] = useState<string>('');

  // Sync inputs when selectedMonth or existingClosing changes
  useEffect(() => {
    if (existingClosing !== undefined) {
      setRealBankBalance(String(existingClosing.closingRealBalance));
      setSelectedBankId(existingClosing.bankAccountId || data.bankAccounts?.[0]?.id || 'custom');
      setCustomBankName(existingClosing.bankAccountName || '');
      setNegativeSinceDate(existingClosing.negativeSinceDate || `${selectedMonth}-01`);
      setClosingNotes(existingClosing.notes || '');
    } else {
      setRealBankBalance(String(current.previousBalance.toFixed(2)));
      setSelectedBankId(data.bankAccounts?.[0]?.id || 'custom');
      setCustomBankName('');
      setNegativeSinceDate(`${selectedMonth}-01`);
      setClosingNotes('');
    }
  }, [selectedMonth, existingClosing, current.previousBalance, data.bankAccounts]);

  // Collect all unpaid expenses from PAST months (months strictly prior to selectedMonth)
  interface PastUnpaidBill {
    id: string;
    expenseId: string;
    title: string;
    amount: number;
    category: string;
    scope: 'PF' | 'PJ';
    month: string;
    monthLabel: string;
    installmentText?: string;
  }

  const pastUnpaidBills: PastUnpaidBill[] = [];

  // Filter summaries for past months
  const pastMonths = summaries
    .map((s) => s.month)
    .filter((m) => m < selectedMonth);

  data.expenses.forEach((exp) => {
    pastMonths.forEach((pastM) => {
      const pastMIdx = parseInt(pastM.split('-')[1], 10);
      let isActive = false;
      let instText = '';

      if (exp.frequency === 'fixed') {
        if (getMonthDiff(exp.startMonth, pastM) >= 0) isActive = true;
      } else if (exp.frequency === 'installment' && exp.installmentsCount) {
        const inst = getInstallmentInfo(exp.startMonth, exp.installmentsCount, pastM);
        if (inst.isActive) {
          isActive = true;
          instText = `Parcela ${inst.current}/${inst.total}`;
        }
      } else if (exp.frequency === 'periodic' && exp.periodicMonths) {
        if (
          getMonthDiff(exp.startMonth, pastM) >= 0 &&
          exp.periodicMonths.includes(pastMIdx)
        ) {
          isActive = true;
        }
      } else if (exp.frequency === 'single') {
        if (exp.singleMonth === pastM || exp.startMonth === pastM) {
          isActive = true;
        }
      }

      if (isActive && !exp.paidMonths?.[pastM]) {
        pastUnpaidBills.push({
          id: `${exp.id}-${pastM}`,
          expenseId: exp.id,
          title: exp.title,
          amount: exp.amount,
          category: exp.category,
          scope: exp.scope,
          month: pastM,
          monthLabel: getMonthLabel(pastM),
          installmentText: instText,
        });
      }
    });
  });

  const parsedBankBalance = parseFloat(realBankBalance) || 0;
  const isOverdraft = parsedBankBalance < 0;
  const projectedBalance = current.finalBalance;
  const difference = parsedBankBalance - projectedBalance;

  // Selected Bank Details
  const selectedBankConfig = (data.bankAccounts || []).find((b) => b.id === selectedBankId);
  const bankDisplayName =
    selectedBankConfig?.name || customBankName.trim() || 'Conta Principal';
  const overdraftRate = selectedBankConfig?.overdraftRateMonthly || 8.0;
  const overdraftFreeDays = selectedBankConfig?.overdraftFreeDays || 0;

  // Projeções do Cheque Especial se for negativo
  const projection = calculateOverdraftProjections(
    parsedBankBalance,
    overdraftRate,
    overdraftFreeDays,
    30
  );

  // Save Abertura do Mês & Define Mês Vigente
  const handleSaveAberturaMonth = (e: React.FormEvent) => {
    e.preventDefault();
    saveMonthlyClosing({
      month: selectedMonth,
      closingRealBalance: parsedBankBalance,
      projectedBalance,
      adjustmentDifference: difference,
      isOverdraft,
      bankAccountId: selectedBankId,
      bankAccountName: bankDisplayName,
      negativeSinceDate: isOverdraft ? negativeSinceDate : undefined,
      scheduledReminders: existingClosing?.scheduledReminders || [],
      pushedDebts: existingClosing?.pushedDebts || [],
      notes: closingNotes.trim() || undefined,
      reopenHistory: existingClosing?.reopenHistory || [],
      isClosed: true,
    });

    setVigenteMonth(selectedMonth);

    setSavedSuccessMsg(
      `O mês de ${current.label} foi gravado e definido como MÊS VIGENTE!`
    );
    setTimeout(() => setSavedSuccessMsg(null), 5000);
  };

  // Reopen Confirmation
  const handleConfirmReopen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReasonInput.trim()) return;

    reopenMonth(selectedMonth, reopenReasonInput.trim());
    setIsReopenModalOpen(false);
    setReopenReasonInput('');
    setSavedSuccessMsg(`Mês de ${current.label} reaberto com sucesso para edições!`);
    setTimeout(() => setSavedSuccessMsg(null), 4000);
  };

  const totalPastUnpaidAmount = pastUnpaidBills.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <CalendarCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Abertura de Mês</span>
              {isVigente && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                  ⭐ Mês Vigente
                </span>
              )}
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Configure o saldo de abertura do mês, defina a conta bancária e mapeie as pendências em aberto dos meses anteriores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400 font-medium">Mês em Abertura:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-bold text-white outline-none focus:border-emerald-500 transition"
          >
            {summaries.map((s) => (
              <option key={s.month} value={s.month}>
                {s.label} ({s.month}) {s.month === vigenteMonth ? '⭐ Vigente' : ''} {data.monthlyClosings?.[s.month]?.isClosed ? '🔒' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Month Closed Banner */}
      {isClosed ? (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-white text-sm block">Status: Abertura Consolidada / Mês Fechado 🔒</strong>
              <p className="text-amber-300/90 mt-0.5">
                Os dados de abertura de <strong>{current.label}</strong> estão consolidados e protegidos contra edições acidentais.
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
              <strong className="text-white text-sm block">Abertura do Mês Pendente ({current.label})</strong>
              <p className="text-zinc-400 mt-0.5">
                Preencha o saldo inicial da conta bancária e confirme a abertura para definir este mês como o <strong>Mês Vigente</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {savedSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {/* MAIN 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COLUNA ESQUERDA: FORMULARIO DE ABERTURA DO MÊS (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Formulário de Abertura do Mês ({current.label})
                </h3>
              </div>
              {isVigente && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  Mês Vigente Ativo
                </span>
              )}
            </div>

            <form onSubmit={handleSaveAberturaMonth} className="space-y-4 text-xs">
              
              {/* 1. SALDO INICIAL */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-200 block">
                  Saldo com que {current.label} Inicia (R$):
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
                    {isOverdraft ? '⚠️ Negativo' : '✅ Positivo'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  💡 Este valor define o saldo inicial de <strong>{current.label}</strong>. Se for negativo (ex: -2000,00), ele entrará na linha de <strong>Cobertura Cheque Especial / Saldo Negativo Anterior</strong> do mês.
                </p>
              </div>

              {/* 2. CONTA BANCÁRIA */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-200 block">
                  Conta Bancária de Origem / Destino:
                </label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  disabled={isClosed}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white outline-none focus:border-emerald-500 disabled:opacity-60 font-medium"
                >
                  {(data.bankAccounts || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.agency ? `Ag. ${b.agency}` : ''} - Cheque Esp: {formatBRL(b.overdraftLimit)})
                    </option>
                  ))}
                  <option value="custom">+ Digitar Nome de Outra Conta...</option>
                </select>

                {selectedBankId === 'custom' && (
                  <input
                    type="text"
                    required
                    disabled={isClosed}
                    placeholder="Digite o nome da conta (ex: Itaú Empresa, Bradesco PF...)"
                    value={customBankName}
                    onChange={(e) => setCustomBankName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white outline-none focus:border-emerald-500 text-xs mt-1"
                  />
                )}
              </div>

              {/* 3. DESDE QUAL DIA ESTÁ NEGATIVO (condicional) */}
              {isOverdraft && (
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-2 animate-in fade-in">
                  <label className="font-bold text-rose-300 flex items-center gap-1.5 text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Saldo Negativo Detectado: Desde qual dia está negativo?</span>
                  </label>
                  <input
                    type="date"
                    required
                    disabled={isClosed}
                    value={negativeSinceDate}
                    onChange={(e) => setNegativeSinceDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-rose-500/50 text-white outline-none focus:border-rose-400 font-mono-numbers text-xs"
                  />
                  <p className="text-[10px] text-rose-300/80 leading-relaxed">
                    Esta data é usada para calcular os dias corridos de cheque especial e projetar o custo exato de juros e IOF cobrados pelo banco.
                  </p>
                </div>
              )}

              {/* 4. ANOTAÇÕES */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400 block">
                  Anotações da Abertura (opcional):
                </label>
                <input
                  type="text"
                  disabled={isClosed}
                  placeholder="Ex: Mês iniciado com saldo conferido no app Itaú"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 outline-none disabled:opacity-60"
                />
              </div>

              {/* BOTÃO DE CONFIRMAÇÃO */}
              {!isClosed && (
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 stroke-[2.5]" />
                    <span>Definir {current.label} como Mês Vigente & Salvar Abertura</span>
                  </button>
                </div>
              )}

            </form>
          </div>

          {/* PROJEÇÃO DE JUROS E IOF */}
          <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
              <Calculator className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Projeção de Dívida, Juros e IOF para o Mês ({current.label})
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

                {overdraftFreeDays > 0 ? (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1 text-emerald-300 text-xs">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Benefício Detectado: {overdraftFreeDays} Dias Grátis ({bankDisplayName})</span>
                    </div>
                    <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                      Se você cobrir esta conta em até <strong>{overdraftFreeDays} dias</strong> com as receitas de {current.label}, você economizará {formatBRL(projection.projectedInterest)} em juros!
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Atenção: Banco sem Dias Grátis</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      Esta conta não possui isenção de dias grátis. Cada dia no negativo gera juros e IOF proporcionais.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 space-y-1 text-xs">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Conta Iniciando no Azul!</span>
                </div>
                <p className="text-xs text-emerald-300/80">
                  O mês de {current.label} inicia com saldo positivo de <strong>{formatBRL(parsedBankBalance)}</strong>. Não há cobrança de juros de cheque especial.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: JANELA DE CONTAS EM ABERTO DE MESES ANTERIORES (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Contas em Aberto de Meses Anteriores ({pastUnpaidBills.length})
                </h3>
              </div>
              <span className="text-xs font-mono-numbers text-zinc-400">
                Total Acumulado:{' '}
                <strong className="text-amber-400 font-bold">
                  {formatBRL(totalPastUnpaidAmount)}
                </strong>
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Abaixo estão listadas todas as despesas e obrigações de <strong>meses passados</strong> que ainda não foram marcadas como pagas. Mapeie e liquide estas contas para manter seu fluxo de caixa saneado.
            </p>

            {pastUnpaidBills.length === 0 ? (
              <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h4 className="text-sm font-bold text-white">Nenhuma Pendência Retroativa!</h4>
                <p className="text-xs text-zinc-400">
                  Todas as contas dos meses anteriores foram marcadas como pagas e quitadas.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {pastUnpaidBills.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5 text-xs hover:border-zinc-700 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {item.monthLabel}
                          </span>
                          <strong className="text-white text-xs">{item.title}</strong>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-400">
                            {item.scope}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400 font-mono-numbers block mt-1">
                          {item.category} {item.installmentText ? `• ${item.installmentText}` : ''}
                        </span>
                      </div>

                      <strong className="text-rose-400 font-mono-numbers text-sm shrink-0">
                        {formatBRL(item.amount)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-850 text-[11px]">
                      <span className="text-zinc-500">Mapeado manualmente</span>
                      <button
                        onClick={() => toggleExpensePaid(item.expenseId, item.month)}
                        className="py-1 px-3 rounded-lg font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Marcar como Pago em {item.monthLabel}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HISTÓRICO DE AUDITORIA */}
          {(existingClosing?.reopenHistory?.length || 0) > 0 && (
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3 text-xs">
              <h4 className="font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                Histórico de Reaberturas
              </h4>
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

      </div>

      {/* MODAL: REABRIR MÊS */}
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
                    Reabrir Abertura de {current.label}
                  </h3>
                  <span className="text-[11px] text-zinc-400">Auditoria & Ajustes</span>
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
                Ao reabrir a abertura deste mês, as travas serão liberadas para você alterar o saldo inicial ou a conta bancária.
              </p>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-200 block">
                  Motivo da Reabertura (Obrigatório):
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReasonInput}
                  onChange={(e) => setReopenReasonInput(e.target.value)}
                  placeholder="Ex: Ajustar o saldo inicial da conta corrente referente ao mês anterior."
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

    </div>
  );
};
