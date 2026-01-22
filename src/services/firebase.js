import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { firebaseConfig } from '../config'; 

const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// ✅ FIX: Use initializeFirestore with experimentalForceLongPolling to prevent connection drops
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    }),
    experimentalForceLongPolling: true, // <--- This fixes the "ERR_CONNECTION_CLOSED"
});

export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');