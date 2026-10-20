import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, Firestore } from 'firebase/firestore';
import { AppData } from '../types/finance';
import { INITIAL_SEED_DATA, DEMO_SAMPLE_DATA } from '../data/seedData';
import bundledFirebaseConfig from '../../firebase-applet-config.json';

const LOCAL_STORAGE_KEY = 'fluxo_caixa_pro_data_v2';
const FIREBASE_CONFIG_KEY = 'fluxo_caixa_pro_firebase_config';

export function getSavedFirebaseConfig(): any {
  try {
    const custom = localStorage.getItem(FIREBASE_CONFIG_KEY);
    if (custom) return JSON.parse(custom);
  } catch (e) {
    console.error('Error reading saved Firebase config', e);
  }
  // Return the provisioned firebase-applet-config.json if valid
  if (bundledFirebaseConfig && bundledFirebaseConfig.projectId) {
    return bundledFirebaseConfig;
  }
  return null;
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

function getFirestoreInstance(config: any): Firestore {
  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
    try {
      return getFirestore(app, config.firestoreDatabaseId);
    } catch (e) {
      console.warn('Named Firestore database failed, falling back to default:', e);
      return getFirestore(app);
    }
  }
  return getFirestore(app);
}

// Load data: Try Firestore if configured, else fallback to localStorage, else clean initial data
export async function loadAppData(): Promise<{ data: AppData; isUsingFirebase: boolean }> {
  const config = getSavedFirebaseConfig();

  if (config && config.projectId) {
    try {
      const db = getFirestoreInstance(config);
      const docRef = doc(db, 'fluxo_caixa', 'main_workspace');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const remoteData = docSnap.data() as AppData;
        const withVisit: AppData = {
          ...INITIAL_SEED_DATA,
          ...remoteData,
          creditCards:
            remoteData.creditCards && remoteData.creditCards.length > 0
              ? remoteData.creditCards
              : INITIAL_SEED_DATA.creditCards,
          bankAccounts:
            remoteData.bankAccounts && remoteData.bankAccounts.length > 0
              ? remoteData.bankAccounts
              : INITIAL_SEED_DATA.bankAccounts,
          settings: {
            ...INITIAL_SEED_DATA.settings,
            ...(remoteData.settings || {}),
            lastVisitTimestamp: new Date().toISOString(),
          },
        };
        saveAppDataToLocalStorage(withVisit);
        return { data: withVisit, isUsingFirebase: true };
      } else {
        // Document doesn't exist yet, seed clean initial data to Firestore!
        const initialClean = {
          ...INITIAL_SEED_DATA,
          settings: {
            ...INITIAL_SEED_DATA.settings,
            lastVisitTimestamp: new Date().toISOString(),
          },
        };
        await setDoc(docRef, sanitizeForFirestore(initialClean), { merge: true });
        saveAppDataToLocalStorage(initialClean);
        return { data: initialClean, isUsingFirebase: true };
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
      parsed.settings.lastVisitTimestamp = new Date().toISOString();
      return { data: parsed, isUsingFirebase: false };
    }
  } catch (err) {
    console.error('Error reading localStorage:', err);
  }

  // Default clean initial data
  const cleanData = {
    ...INITIAL_SEED_DATA,
    settings: {
      ...INITIAL_SEED_DATA.settings,
      lastVisitTimestamp: new Date().toISOString(),
    },
  };
  saveAppDataToLocalStorage(cleanData);

  return { data: cleanData, isUsingFirebase: false };
}

// Save data only to localStorage (browser cache)
export function saveAppDataToLocalStorage(data: AppData): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error writing to localStorage:', e);
  }
}

// Save data: Updates localStorage cache immediately
export async function saveAppData(data: AppData): Promise<boolean> {
  const updatedData: AppData = {
    ...data,
    settings: {
      ...data.settings,
      lastBackupDate: new Date().toISOString(),
    },
  };
  saveAppDataToLocalStorage(updatedData);
  return true;
}

// Recursively strips any undefined fields that cause Firestore setDoc() to fail
export function sanitizeForFirestore<T>(data: T): any {
  function clean(val: any): any {
    if (val === undefined) return null;
    if (val === null) return null;
    if (Array.isArray(val)) {
      return val.map((item) => (item === undefined ? null : clean(item)));
    }
    if (typeof val === 'object') {
      const res: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        if (v !== undefined) {
          res[k] = clean(v);
        }
      }
      return res;
    }
    return val;
  }
  return JSON.parse(JSON.stringify(clean(data)));
}

// Explicit sync to Firebase Firestore triggered only by the user's action
export async function saveAppDataToFirebase(data: AppData): Promise<{ success: boolean; error?: string }> {
  const config = getSavedFirebaseConfig();
  if (!config || !config.projectId) {
    return { success: false, error: 'Firebase não está configurado neste projeto.' };
  }

  const updatedData: AppData = {
    ...data,
    settings: {
      ...data.settings,
      lastSyncedFirebaseAt: new Date().toISOString(),
      lastBackupDate: new Date().toISOString(),
    },
  };

  try {
    const db = getFirestoreInstance(config);
    const docRef = doc(db, 'fluxo_caixa', 'main_workspace');
    const sanitized = sanitizeForFirestore(updatedData);
    await setDoc(docRef, sanitized, { merge: true });
    // Also update local cache with the new sync timestamp
    saveAppDataToLocalStorage(updatedData);
    return { success: true };
  } catch (err: any) {
    console.error('Error saving to Firebase:', err);
    return { success: false, error: err?.message || 'Erro ao sincronizar com o Firebase' };
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
  a.download = `fluxopro_backup_${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import data from JSON string
export function parseAndValidateJsonData(jsonString: string): AppData {
  const parsed = JSON.parse(jsonString);
  if (!parsed.settings || !Array.isArray(parsed.incomes) || !Array.isArray(parsed.expenses)) {
    throw new Error('Arquivo JSON inválido. Estrutura não compatível com o FluxoPro.');
  }
  return parsed as AppData;
}
