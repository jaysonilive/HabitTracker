import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  memoryLocalCache,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Persistent IndexedDB cache = instant loads on return visits (phone & desktop).
// The onSnapshot handler in HabitTracker.tsx uses snapshot.metadata.fromCache
// to safely ignore cache-only "doesn't exist" responses — no data-wiping bug.
let db;
try {
  db = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager(), // safe on all browsers incl. iOS Safari
      }),
    },
    firebaseConfig.firestoreDatabaseId,
  );
} catch {
  // Fallback for browsers that don't support IndexedDB
  db = initializeFirestore(
    app,
    { localCache: memoryLocalCache() },
    firebaseConfig.firestoreDatabaseId,
  );
}

export { db };
