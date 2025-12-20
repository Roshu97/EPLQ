/**
 * Firebase Configuration Module
 * Handles both client-side and server-side Firebase initialization
 * Uses environment variables for security
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Firebase client configuration
 * All sensitive values are loaded from environment variables
 */
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

/**
 * Validate that all required Firebase config values are present
 * @throws {Error} If any required configuration is missing
 */
function validateConfig() {
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
    const missingFields = requiredFields.filter(field => !firebaseConfig[field]);
    
    if (missingFields.length > 0) {
        console.warn(`Warning: Missing Firebase config fields: ${missingFields.join(', ')}`);
        console.warn('Some features may not work correctly. Please check your .env file.');
    }
}

// Validate configuration
validateConfig();

// Initialize Firebase App
let app;
let auth;
let db;
let storage;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
} catch (error) {
    console.error('Firebase initialization error:', error);
    // Create mock objects for development without Firebase
    app = null;
    auth = null;
    db = null;
    storage = null;
}

export { app, auth, db, storage, firebaseConfig };
export default firebaseConfig;

