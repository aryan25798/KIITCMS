import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { firebaseConfig } from '../config'; // Import the config from the separate file

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize and export each service, ensuring they are all connected to the same app instance.
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1'); // Ensure your function's region is correct
