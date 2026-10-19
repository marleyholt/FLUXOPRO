import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { AppData } from '../types/finance';
import { INITIAL_SEED_DATA } from '../data/seedData';

const LOCAL_STORAGE_KEY = 'fluxo_caixa_pro_data_v1';
const FIREBASE_CONFIG_KEY = 'fluxo_caixa_pro_firebase_config';

export function getSavedFirebaseConfig(): string | null {
  try {
    return localStorage.getItem(FIREBASE_CONFIG_KEY);
  } catch {
    return null;
  }
}

export function saveFirebaseConfig(configJson: string | null): void {
  try {
    if (configJson) {
      localStorage.setItem(FIREBASE_CONFIG_KEY, configJson);
    } else {
      localStorage.removeItem(FIREBASE_CONFIG_KEY);
    }
  } catch (e) {
    console.error('Error saving Firebase config', e);
  }
}

// Load data: Try Firestore if configured, else fallback to localStorage, else seed data
export async function loadAppData(): Promise<{ data: AppData; isUsingFirebase: boolean }> {
  const firebaseJson = getSavedFirebaseConfig();

  if (firebaseJson) {
    try {
      const config = JSON.parse(firebaseJson);
      const app = getApps().length === 0 ? initializeApp(config) : getApp();
      const db = getFirestore(app);
      const docRef = doc(db, 'fluxo_caixa', 'main_workspace');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const remoteData = docSnap.data() as AppData;
        saveToLocalStorage(remoteData);
        return { data: remoteData, isUsingFirebase: true };
      }
    } catch (err) {
      console.warn('Firebase connection failed, falling back to localStorage:', err);
    }
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      return { data: parsed, isUsingFirebase: false };
    }
  } catch (err) {
    console.error('Error reading localStorage:', err);
  }

  // Default seed data
  saveToLocalStorage(INITIAL_SEED_DATA);
  return { data: INITIAL_SEED_DATA, isUsingFirebase: false };
}

// Save data: Updates localStorage and asynchronously syncs to Firestore if configured
export async function saveAppData(data: AppData): Promise<boolean> {
  const updatedData: AppData = {
    ...data,
    settings: {
      ...data.settings,
      lastBackupDate: new Date().toISOString(),
    },
  };

  saveToLocalStorage(updatedData);

  const firebaseJson = getSavedFirebaseConfig();
  if (firebaseJson) {
    try {
      const config = JSON.parse(firebaseJson);
      const app = getApps().length === 0 ? initializeApp(config) : getApp();
      const db = getFirestore(app);
      const docRef = doc(db, 'fluxo_caixa', 'main_workspace');
      await setDoc(docRef, updatedData, { merge: true });
      return true;
    } catch (err) {
      console.warn('Could not sync to Firebase:', err);
      return false;
    }
  }

  return true;
}

function saveToLocalStorage(data: AppData): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error writing to localStorage:', e);
  }
}

// Export data as JSON file download
export function exportDataAsJson(data: AppData): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `fluxocaixa_pro_backup_${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import data from JSON string
export function parseAndValidateJsonData(jsonString: string): AppData {
  const parsed = JSON.parse(jsonString);
  if (!parsed.settings || !Array.isArray(parsed.incomes) || !Array.isArray(parsed.expenses)) {
    throw new Error('Arquivo JSON inválido. Estrutura não compatível com o FluxoCaixa Pro.');
  }
  return parsed as AppData;
}
