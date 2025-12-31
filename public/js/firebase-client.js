/**
 * Firebase Client Configuration
 * Browser-side Firebase initialization
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyAf7qB0O7N-AUMOk0F2x046SKYaRFaDYGo",
    authDomain: "eplq-abfa5.firebaseapp.com",
    projectId: "eplq-abfa5",
    storageBucket: "eplq-abfa5.firebasestorage.app",
    messagingSenderId: "684157525937",
    appId: "1:684157525937:web:b2f5d9fab8fdb40742e790",
    measurementId: "G-LMZ0J3K7HX"
};

// Initialize Firebase
let app = null;
let auth = null;
let db = null;

/**
 * Validate Firebase configuration
 */
function validateConfig(config) {
    const isPlaceholder = config.apiKey.includes('YOUR_') || 
                         config.apiKey === "AIzaSyAf7qB0O7N-AUMOk0F2x046SKYaRFaDYGo";
    
    if (isPlaceholder) {
        console.warn('⚠️ Firebase API Key appears to be a placeholder. Authentication will likely fail with 400 errors.');
        console.warn('Please update the firebaseConfig in public/js/firebase-client.js with your actual project credentials from the Firebase Console.');
    }
}

try {
    validateConfig(firebaseConfig);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.warn('Firebase initialization failed:', error.message);
    console.log('Running in demo mode without Firebase');
}

/**
 * Firebase Auth Service for browser
 */
class FirebaseAuthClient {
    constructor() {
        this.currentUser = null;
        this.listeners = [];
    }

    /**
     * Initialize auth state listener
     */
    init() {
        if (!auth) return;

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const profile = await this.getUserProfile(user.uid);
                this.currentUser = { ...user, ...profile };
            } else {
                this.currentUser = null;
            }
            this.notifyListeners(this.currentUser);
        });
    }

    /**
     * Register new user
     */
    async register(email, password, displayName) {
        if (!auth) {
            return { success: false, error: 'Firebase not configured' };
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, { displayName });

            if (db) {
                await setDoc(doc(db, 'users', user.uid), {
                    uid: user.uid,
                    email: user.email,
                    displayName: displayName,
                    role: 'user',
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                    isActive: true
                });
            }

            return {
                success: true,
                user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: displayName,
                    role: 'user'
                }
            };
        } catch (error) {
            console.error('Firebase registration error:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    /**
     * Login user
     */
    async login(email, password) {
        if (!auth) {
            return { success: false, error: 'Firebase not configured' };
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const profile = await this.getUserProfile(user.uid);

            return {
                success: true,
                user: { uid: user.uid, email: user.email, ...profile }
            };
        } catch (error) {
            console.error('Firebase login error:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    /**
     * Logout user
     */
    async logout() {
        if (!auth) return;
        try {
            await signOut(auth);
            this.currentUser = null;
            this.notifyListeners(null);
        } catch (error) {
            console.error('Firebase logout error:', error);
        }
    }

    /**
     * Get user profile from Firestore
     */
    async getUserProfile(uid) {
        if (!db) return { role: 'user' };

        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                return userDoc.data();
            }
            return { role: 'user' };
        } catch (error) {
            console.error('Failed to get user profile:', error);
            return { role: 'user' };
        }
    }

    /**
     * Convert Firebase error codes to messages
     */
    getErrorMessage(code) {
        const messages = {
            'auth/email-already-in-use': 'Email already registered',
            'auth/invalid-email': 'Invalid email address',
            'auth/weak-password': 'Password is too weak',
            'auth/user-not-found': 'No account found',
            'auth/wrong-password': 'Incorrect password',
            'auth/too-many-requests': 'Too many attempts. Try later',
            'auth/operation-not-allowed': 'Email/Password sign-in is not enabled in Firebase Console',
            'auth/invalid-api-key': 'Invalid Firebase API Key. Please check your configuration.',
            'auth/network-request-failed': 'Network error. Please check your connection.'
        };
        return messages[code] || `Authentication error: ${code}`;
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners(user) {
        this.listeners.forEach(cb => cb(user));
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAdmin() {
        return this.currentUser?.role === 'admin';
    }
}

// Export singleton instance
const firebaseAuth = new FirebaseAuthClient();
firebaseAuth.init();

export { firebaseAuth, app, auth, db };
export default firebaseAuth;
