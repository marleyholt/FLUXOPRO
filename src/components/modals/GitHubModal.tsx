import React, { useState } from 'react';
import {
  X,
  GitBranch,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubModal: React.FC<GitHubModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const steps = [
    {
      title: '1. Inicializar Git local e comitar alterações',
      command: `git add .\ngit commit -m "feat: lancamento inicial FluxoPro com Firebase, IA de faturas e workflow CI/CD"`,
    },
    {
      title: '2. Conectar ao seu repositório remoto [FluxoPro]',
      command: `git branch -M main\ngit remote add origin https://github.com/SEU_USUARIO/FluxoPro.git`,
    },
    {
      title: '3. Enviar para o GitHub (Push)',
      command: `git push -u origin main`,
    },
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Publicar no GitHub [FluxoPro]
              </h3>
              <p className="text-xs text-zinc-400">
                Workflow de CI/CD automatizado com GitHub Pages e Firebase
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-indigo-300 space-y-1">
            <span className="font-bold block text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Workflow do GitHub Actions Configurado com Sucesso!
            </span>
            <p className="text-[11px] text-zinc-300">
              O arquivo <strong>.github/workflows/deploy.yml</strong> já foi gerado na raiz do projeto. Assim que você fizer o primeiro push, o GitHub compilará e publicará o seu app gratuitamente no <strong>GitHub Pages</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1 text-zinc-300">
            <span className="font-semibold text-white block">Metadados do Projeto Vinculado:</span>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
              <span>Repositório: <strong className="text-zinc-200">FluxoPro</strong></span>
              <span>ID GCP: <strong className="text-zinc-200">gen-lang-client-0435174156</strong></span>
              <span>Nº Projeto: <strong className="text-zinc-200">177835136690</strong></span>
              <span>Região: <strong className="text-zinc-200">us-east1</strong></span>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-zinc-200 text-sm">Passos para subir o código no repositório:</h4>

            {steps.map((s, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200">{s.title}</span>
                  <button
                    onClick={() => handleCopy(s.command, idx)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition flex items-center gap-1 text-[11px]"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                  {s.command}
                </pre>
              </div>
            ))}
          </div>

          {/* Setting GitHub Pages in repo settings */}
          <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
            <span className="font-semibold text-zinc-200 block">Dica para ativação no GitHub:</span>
            <p>
              No GitHub, vá em <strong>Settings &gt; Pages</strong> do seu repositório e em <strong>Source</strong>, selecione <strong>"GitHub Actions"</strong>. O deploy ocorrerá automaticamente a cada novo commit!
            </p>
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
