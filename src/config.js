// config.js

// --- Firebase Configuration ---
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// --- EMAILJS CONFIGURATION ---
export const emailjsConfig = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateIdNew: import.meta.env.VITE_EMAILJS_TEMPLATE_ID_NEW,
  templateIdResolved: import.meta.env.VITE_EMAILJS_TEMPLATE_ID_RESOLVED,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

// --- GEMINI AI CONFIGURATION ---
export const geminiConfig = {
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
};

// --- CLOUDINARY CONFIGURATION ---
export const cloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  timetableUploadPreset: import.meta.env.VITE_CLOUDINARY_TIMETABLE_PRESET,
  marketplacePreset: import.meta.env.VITE_CLOUDINARY_MARKETPLACE_PRESET,
};

// --- NEWS API CONFIGURATION ---
export const newsApiConfig = {
    apiKey: import.meta.env.VITE_GNEWS_API_KEY,
};

// --- TIMETABLE SETTINGS ---
export const timetableConfig = {
  collection: "settings",
  document: "timetable",
};
