import React, { useState } from 'react';
import {
  X,
  CheckSquare,
  Square,
  Clock,
  Sparkles,
  Calendar,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

interface RoutineChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RoutineCadence = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export const RoutineChecklistModal: React.FC<RoutineChecklistModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data, toggleChecklistStep, updateSettings } = useFinance();
  const [cadence, setCadence] = useState<RoutineCadence>('daily');

  if (!isOpen) return null;

  const checklistItems = {
    daily: [
      {
        id: 'daily-1',
        title: 'Checar saldo bancário no aplicativo do banco',
        desc: 'Conferir se o saldo em conta confere com o previsto no fluxo.',
        time: '1 min',
      },
      {
        id: 'daily-2',
        title: 'Lançar pequenos gastos do dia nos envelopes',
        desc: 'Padaria, combustível, almoço ou farmácia. Lançar na hora evita esquecimentos.',
        time: '2 min',
      },
      {
        id: 'daily-3',
        title: 'Marcar contas que venceram hoje como PAGAS',
        desc: 'Acesse o checklist de contas do mês e dê 1 clique nas quitadas.',
        time: '1 min',
      },
    ],
    weekly: [
      {
        id: 'weekly-1',
        title: 'Auditar termômetro de Mercado e iFood (Segunda-feira)',
        desc: 'Se o gasto já atingiu 70% antes da metade do mês, combine o freio na casa.',
        time: '3 min',
      },
      {
        id: 'weekly-2',
        title: 'Revisar e resolver alertas de ⚠️ Verificar',
        desc: 'Checar compras atípicas ou comprovantes pendentes antes de virar a fatura.',
        time: '4 min',
      },
      {
        id: 'weekly-3',
        title: 'Verificar previsão de contas da próxima semana',
        desc: 'Garantir que haverá saldo em conta para os boletos e débitos automáticos.',
        time: '3 min',
      },
    ],
    biweekly: [
      {
        id: 'biweekly-1',
        title: 'Conferir crédito de adiantamento, salário ou vale',
        desc: 'Checar se as entradas previstas do período caíram com exatidão.',
        time: '3 min',
      },
      {
        id: 'biweekly-2',
        title: 'Visualizar prévia das faturas parciais de cartão',
        desc: 'Olhar o aplicativo dos cartões para antecipar o tamanho do fechamento.',
        time: '5 min',
      },
      {
        id: 'biweekly-3',
        title: 'Calibrar despesas periódicas ou trimestrais',
        desc: 'Confirmar se há pagamentos como capina, seguro ou manutenções agendadas.',
        time: '4 min',
      },
    ],
    monthly: [
      {
        id: 'monthly-1',
        title: 'Importar ou lançar faturas fechadas (PDF ou CSV)',
        desc: 'Use o importador inteligente de IA para subir as faturas e validar cada item.',
        time: '5 min',
      },
      {
        id: 'monthly-2',
        title: 'Informar o Total Real da Fatura de cada cartão',
        desc: 'Garante que a "Diferença Não Mapeada" feche 100% com o extrato do banco.',
        time: '3 min',
      },
      {
        id: 'monthly-3',
        title: 'Revisar a Curva de Recuperação e Descompressão 12M',
        desc: 'Acompanhe a queda das faturas com o fim dos parcelamentos e a evolução do saldo.',
        time: '5 min',
      },
      {
        id: 'monthly-4',
        title: 'Fazer Backup dos dados (JSON ou Nuvem Firebase)',
        desc: 'Clique em Backup & Nuvem para garantir a segurança histórica dos seus dados.',
        time: '2 min',
      },
    ],
  };

  const currentList = checklistItems[cadence];
  const totalInCurrent = currentList.length;
  const completedInCurrent = currentList.filter(
    (item) => !!data.settings.checklistState?.[item.id]
  ).length;

  const handleResetCadence = () => {
    const updated = { ...(data.settings.checklistState || {}) };
    currentList.forEach((item) => delete updated[item.id]);
    updateSettings({ checklistState: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Roteiro & Rotina Financeira Guiada
              </h3>
              <p className="text-xs text-zinc-400">
                Siga este passo a passo sempre que abrir o app para manter o controle absoluto
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

        {/* Cadence Pills */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/40 p-2 gap-2 text-xs">
          <button
            onClick={() => setCadence('daily')}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              cadence === 'daily'
                ? 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Diário (2 min)
          </button>
          <button
            onClick={() => setCadence('weekly')}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              cadence === 'weekly'
                ? 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Semanal (10 min)
          </button>
          <button
            onClick={() => setCadence('biweekly')}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              cadence === 'biweekly'
                ? 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Quinzenal (15 min)
          </button>
          <button
            onClick={() => setCadence('monthly')}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              cadence === 'monthly'
                ? 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Mensal (20 min)
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Progress Header */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-zinc-100 text-sm block">
                Progresso da Rotina ({completedInCurrent}/{totalInCurrent})
              </span>
              <span className="text-zinc-400 text-[11px]">
                {completedInCurrent === totalInCurrent
                  ? '🎉 Parabéns! Todos os passos deste ciclo foram concluídos com sucesso.'
                  : 'Marque cada etapa após executar.'}
              </span>
            </div>

            <button
              onClick={handleResetCadence}
              className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition"
              title="Reiniciar etapas para um novo ciclo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar ciclo</span>
            </button>
          </div>

          {/* Steps List */}
          <div className="space-y-2.5">
            {currentList.map((item) => {
              const isChecked = !!data.settings.checklistState?.[item.id];
              return (
                <div
                  key={item.id}
                  onClick={() => toggleChecklistStep(item.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 select-none ${
                    isChecked
                      ? 'bg-zinc-950/40 border-emerald-500/30 opacity-70'
                      : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <button className="pt-0.5 text-zinc-400 hover:text-emerald-400 transition">
                    {isChecked ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-zinc-500" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-semibold text-xs ${
                          isChecked ? 'line-through text-zinc-400' : 'text-zinc-100'
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" /> {item.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition font-bold"
          >
            Continuar no Aplicativo
          </button>
        </div>

      </div>
    </div>
  );
};
