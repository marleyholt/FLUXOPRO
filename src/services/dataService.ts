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
    return getFirestore(app, config.firestoreDatabaseId);
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
          ...remoteData,
          settings: {
            ...remoteData.settings,
            lastVisitTimestamp: new Date().toISOString(),
          },
        };
        saveToLocalStorage(withVisit);
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
        await setDoc(docRef, initialClean, { merge: true });
        saveToLocalStorage(initialClean);
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
  saveToLocalStorage(cleanData);
  return { data: cleanData, isUsingFirebase: false };
}

// Save data: Updates localStorage and asynchronously syncs to Firestore
export async function saveAppData(data: AppData): Promise<boolean> {
  const updatedData: AppData = {
    ...data,
    settings: {
      ...data.settings,
      lastBackupDate: new Date().toISOString(),
    },
  };

  saveToLocalStorage(updatedData);

  const config = getSavedFirebaseConfig();
  if (config && config.projectId) {
    try {
      const db = getFirestoreInstance(config);
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
