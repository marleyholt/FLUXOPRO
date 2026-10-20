import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { getSavedFirebaseConfig } from './dataService';
import { initializeApp, getApps, getApp } from 'firebase/app';

export function getAuthInstance() {
  const config = getSavedFirebaseConfig();
  if (!config || !config.projectId) return null;
  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  return getAuth(app);
}

export async function loginWithGoogle(): Promise<{ user?: User; error?: string }> {
  try {
    const auth = getAuthInstance();
    if (!auth) {
      return { error: 'Firebase não está configurado neste projeto.' };
    }
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return { user: result.user };
  } catch (err: any) {
    console.error('Google login error:', err);
    return { error: err?.message || 'Erro ao autenticar com o Google.' };
  }
}

export async function logoutUser(): Promise<void> {
  try {
    const auth = getAuthInstance();
    if (auth) {
      await signOut(auth);
    }
  } catch (err) {
    console.error('Logout error:', err);
  }
}
