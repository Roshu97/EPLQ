/**
 * Firebase Admin SDK Configuration
 * Used for server-side operations with elevated privileges
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from environment variables
 */
let adminApp;
let adminAuth;
let adminDb;

try {
    // Check if admin is already initialized
    if (admin.apps.length === 0) {
        const serviceAccount = {
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
        };

        // Validate service account
        if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
            console.warn('Firebase Admin credentials not fully configured. Using limited functionality.');
            // Initialize with project ID only for development
            if (serviceAccount.projectId) {
                adminApp = admin.initializeApp({
                    projectId: serviceAccount.projectId
                });
            }
        } else {
            adminApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    } else {
        adminApp = admin.apps[0];
    }

    if (adminApp) {
        adminAuth = admin.auth();
        adminDb = admin.firestore();
    }
} catch (error) {
    console.error('Firebase Admin initialization error:', error);
    adminApp = null;
    adminAuth = null;
    adminDb = null;
}

export { adminApp, adminAuth, adminDb };
export default admin;

