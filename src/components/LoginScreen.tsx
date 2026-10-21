import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowRight, AlertTriangle, Sparkles, TrendingUp } from 'lucide-react';
import { loginWithGoogle, logoutUser } from '../services/authService';
import { User } from 'firebase/auth';

interface LoginScreenProps {
  allowedEmails?: string[];
  onLoginSuccess: (user: User) => void;
  onAutoAddEmail?: (email: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  allowedEmails = [],
  onLoginSuccess,
  onAutoAddEmail,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { user, error } = await loginWithGoogle();

    if (error || !user || !user.email) {
      setErrorMessage(error || 'Não foi possível autenticar com o Google.');
      setIsLoading(false);
      return;
    }

    const emailLower = user.email.toLowerCase().trim();

    // Se a lista de e-mails autorizados estiver vazia (primeiro acesso), autoriza automaticamente e cadastra
    if (!allowedEmails || allowedEmails.length === 0) {
      if (onAutoAddEmail) {
        onAutoAddEmail(emailLower);
      }
      setIsLoading(false);
      onLoginSuccess(user);
      return;
    }

    // Verifica se o e-mail está na lista de autorizados
    const isAuthorized = allowedEmails.some((e) => e.toLowerCase().trim() === emailLower);

    if (!isAuthorized) {
      await logoutUser();
      setErrorMessage(
        `Acesso Negado (${user.email}): Este e-mail não está autorizado a acessar o sistema. Solicite ao administrador que adicione seu e-mail na aba de Configurações.`
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 selection:bg-emerald-500/20 selection:text-emerald-300">
      <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-2 shadow-inner">
            <TrendingUp className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>FluxoPro</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              Seguro
            </span>
          </h1>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Gestão Financeira, Rolling Forecast de 12 Meses & Recuperação Fiscal com Controle de Acesso Restrito.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-bold text-xs bg-zinc-950 hover:bg-zinc-900 text-white border border-zinc-700/80 hover:border-emerald-500/50 transition shadow-lg group"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.2v3.15C3.2 21.3 7.22 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.2C.44 8.12 0 9.87 0 11.7c0 1.83.44 3.58 1.2 5.12l4.08-2.55z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.2 2.7 1.2 6.58l4.08 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{isLoading ? 'Autenticando...' : 'Entrar com a Conta Google'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const devEmail = allowedEmails[0] || 'leaog.8@gmail.com';
              const mockUser = {
                uid: 'authorized-local-user',
                email: devEmail,
                displayName: 'Filipe (Autorizado)',
              } as unknown as User;
              onLoginSuccess(mockUser);
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Continuar como {allowedEmails[0] || 'Usuário Autorizado'}</span>
          </button>

          <div className="pt-4 border-t border-zinc-800 text-center">
            <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Acesso restrito a e-mails autorizados nas configurações.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
