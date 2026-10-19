import React, { useState } from 'react';
import {
  X,
  Database,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  getSavedFirebaseConfig,
  exportDataAsJson,
  parseAndValidateJsonData,
} from '../../services/dataService';

interface FirebaseBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseBackupModal: React.FC<FirebaseBackupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    data,
    isUsingFirebase,
    saveFirebaseSettings,
    restoreSeedData,
    importBackupData,
  } = useFinance();

  const [firebaseConfigText, setFirebaseConfigText] = useState<string>(
    getSavedFirebaseConfig() || ''
  );
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSaveFirebase = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      if (firebaseConfigText.trim() === '') {
        await saveFirebaseSettings(null);
        setStatusMessage({
          type: 'info',
          text: 'Configuração removida. Operando em modo LocalStorage.',
        });
      } else {
        // validate JSON
        JSON.parse(firebaseConfigText);
        await saveFirebaseSettings(firebaseConfigText);
        setStatusMessage({
          type: 'success',
          text: 'Conexão com Firebase Firestore configurada com sucesso!',
        });
      }
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: 'JSON de configuração inválido. Verifique as chaves fornecidas pelo Firebase Console.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportJson = () => {
    exportDataAsJson(data);
    setStatusMessage({
      type: 'success',
      text: 'Backup exportado com sucesso em arquivo JSON!',
    });
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const content = evt.target?.result as string;
          const parsed = parseAndValidateJsonData(content);
          importBackupData(parsed);
          setStatusMessage({
            type: 'success',
            text: 'Dados importados e sincronizados com sucesso!',
          });
        } catch (err: any) {
          setStatusMessage({
            type: 'error',
            text: 'Falha ao importar backup: ' + (err.message || 'Arquivo corrompido'),
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleRestoreSeed = () => {
    if (
      window.confirm(
        'Tem certeza que deseja restaurar os dados de demonstração (Seed 12M)? Dados personalizados serão substituídos.'
      )
    ) {
      restoreSeedData();
      setStatusMessage({
        type: 'success',
        text: 'Dados de demonstração restaurados com sucesso!',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Nuvem (Firebase) & Backup de Dados
              </h3>
              <p className="text-xs text-zinc-400">
                Arquitetura híbrida com sincronização em nuvem e exportação local
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

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Current Mode Status Card */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isUsingFirebase
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {isUsingFirebase ? <Cloud className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
              </div>
              <div>
                <span className="font-bold text-zinc-200 block text-sm">
                  {isUsingFirebase ? 'Conectado ao Firebase Firestore' : 'Modo Híbrido Local (LocalStorage)'}
                </span>
                <span className="text-zinc-400 text-[11px]">
                  {isUsingFirebase
                    ? 'Os dados são salvos em tempo real no banco Firestore e em cache local'
                    : 'Os dados persistem no navegador. Conecte ao Firebase para sincronizar entre dispositivos'}
                </span>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                isUsingFirebase
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {isUsingFirebase ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Firebase Config Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                Configuração do Firebase (Cole o JSON do seu Console):
              </label>
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
              >
                Abrir Console Firebase <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <textarea
              rows={4}
              placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "seu-app.firebaseapp.com",\n  "projectId": "seu-app",\n  "storageBucket": "seu-app.appspot.com",\n  "messagingSenderId": "...",\n  "appId": "..."\n}`}
              value={firebaseConfigText}
              onChange={(e) => setFirebaseConfigText(e.target.value)}
              className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[11px] outline-none focus:border-emerald-500 transition resize-none"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleSaveFirebase}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-sm disabled:opacity-50"
              >
                {isSaving ? 'Conectando...' : 'Salvar & Conectar Firestore'}
              </button>
            </div>
          </div>

          {/* Local Backup & Restore Section */}
          <div className="pt-3 border-t border-zinc-800 space-y-3">
            <h4 className="font-bold text-zinc-200 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-zinc-400" />
              Backup & Restauração Rápida
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Export JSON */}
              <button
                type="button"
                onClick={handleExportJson}
                className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-left transition flex flex-col justify-between gap-2"
              >
                <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Exportar JSON</span>
                </div>
                <span className="text-[10px] text-zinc-400">
                  Baixe arquivo de backup com todas as faturas e projeções.
                </span>
              </button>

              {/* Import JSON */}
              <label className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-left transition flex flex-col justify-between gap-2 cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJsonFile}
                  className="hidden"
                />
                <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <span>Importar JSON</span>
                </div>
                <span className="text-[10px] text-zinc-400">
                  Carregue um arquivo JSON exportado anteriormente.
                </span>
              </label>

              {/* Restore Seed */}
              <button
                type="button"
                onClick={handleRestoreSeed}
                className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-left transition flex flex-col justify-between gap-2"
              >
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <RefreshCw className="w-4 h-4" />
                  <span>Restaurar Seed</span>
                </div>
                <span className="text-[10px] text-zinc-400">
                  Volte aos dados de demonstração (12 meses com recuperação fiscal).
                </span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
