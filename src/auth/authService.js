/**
 * Authentication Service Module
 * Handles user registration, login, and session management with Firebase Auth
 */

import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase.config.js';
import { EPLQLogger } from '../utils/logger.js';
import { validateEmail, validatePassword, sanitizeInput } from '../utils/validators.js';

/**
 * User roles enumeration
 */
const UserRoles = {
    USER: 'user',
    ADMIN: 'admin'
};

/**
 * AuthService class
 * Manages all authentication operations
 */
class AuthService {
    constructor() {
        this.currentUser = null;
        this.authStateListeners = [];
    }

    /**
     * Initialize auth state listener
     * @param {Function} callback - Callback for auth state changes
     */
    initAuthStateListener(callback) {
        if (!auth) {
            EPLQLogger.warn('Firebase Auth not initialized');
            return;
        }

        return onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDoc = await this.getUserProfile(user.uid);
                this.currentUser = { ...user, ...userDoc };
            } else {
                this.currentUser = null;
            }
            if (callback) callback(this.currentUser);
            this.notifyListeners(this.currentUser);
        });
    }

    /**
     * Register a new user
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {string} displayName - Display name
     * @param {string} role - User role (default: user)
     * @returns {Object} Registration result
     */
    async register(email, password, displayName, role = UserRoles.USER) {
        try {
            // Validate inputs
            const emailValidation = validateEmail(email);
            if (!emailValidation.valid) {
                throw new Error(emailValidation.error);
            }

            const passwordValidation = validatePassword(password);
            if (!passwordValidation.valid) {
                throw new Error(passwordValidation.error);
            }

            const sanitizedName = sanitizeInput(displayName);
            if (!sanitizedName || sanitizedName.length < 2) {
                throw new Error('Display name must be at least 2 characters');
            }

            if (!auth) {
                throw new Error('Authentication service not available');
            }

            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Update display name
            await updateProfile(user, { displayName: sanitizedName });

            // Create user profile in Firestore
            if (db) {
                await setDoc(doc(db, 'users', user.uid), {
                    uid: user.uid,
                    email: user.email,
                    displayName: sanitizedName,
                    role: role,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                    isActive: true
                });
            }

            await EPLQLogger.logRegistration(user.uid, email, true);

            return {
                success: true,
                user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: sanitizedName,
                    role: role
                }
            };
        } catch (error) {
            await EPLQLogger.logRegistration(null, email, false, error);
            return {
                success: false,
                error: this.getErrorMessage(error.code || error.message)
            };
        }
    }

    /**
     * Login user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Object} Login result
     */
    async login(email, password) {
        try {
            const emailValidation = validateEmail(email);
            if (!emailValidation.valid) {
                throw new Error(emailValidation.error);
            }

            if (!auth) {
                throw new Error('Authentication service not available');
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Update last login
            if (db) {
                await updateDoc(doc(db, 'users', user.uid), {
                    lastLogin: serverTimestamp()
                });
            }

            const userProfile = await this.getUserProfile(user.uid);
            await EPLQLogger.logLogin(user.uid, email, true);

            return {
                success: true,
                user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    ...userProfile
                }
            };
        } catch (error) {
            await EPLQLogger.logLogin(null, email, false, error);
            return {
                success: false,
                error: this.getErrorMessage(error.code || error.message)
            };
        }
    }

    /**
     * Logout current user
     * @returns {Object} Logout result
     */
    async logout() {
        try {
            const user = this.currentUser;
            if (!auth) {
                throw new Error('Authentication service not available');
            }

            await signOut(auth);
            await EPLQLogger.logLogout(user?.uid, user?.email);

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get user profile from Firestore
     * @param {string} uid - User ID
     * @returns {Object|null} User profile
     */
    async getUserProfile(uid) {
        try {
            if (!db) return null;
            const docSnap = await getDoc(doc(db, 'users', uid));
            return docSnap.exists() ? docSnap.data() : null;
        } catch (error) {
            EPLQLogger.error('Failed to get user profile', error, { uid });
            return null;
        }
    }

    /**
     * Send password reset email
     * @param {string} email - User email
     * @returns {Object} Result
     */
    async resetPassword(email) {
        try {
            if (!auth) throw new Error('Authentication service not available');
            await sendPasswordResetEmail(auth, email);
            return { success: true };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    /**
     * Check if current user is admin
     * @returns {boolean} True if admin
     */
    isAdmin() {
        return this.currentUser?.role === UserRoles.ADMIN;
    }

    /**
     * Get current user
     * @returns {Object|null} Current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Convert Firebase error codes to user-friendly messages
     * @param {string} errorCode - Firebase error code
     * @returns {string} User-friendly message
     */
    getErrorMessage(errorCode) {
        const messages = {
            'auth/email-already-in-use': 'This email is already registered',
            'auth/invalid-email': 'Invalid email address',
            'auth/weak-password': 'Password is too weak',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/too-many-requests': 'Too many attempts. Please try again later',
            'auth/user-disabled': 'This account has been disabled'
        };
        return messages[errorCode] || errorCode;
    }

    /**
     * Add auth state listener
     * @param {Function} listener - Listener function
     */
    addAuthStateListener(listener) {
        this.authStateListeners.push(listener);
    }

    /**
     * Notify all listeners of auth state change
     * @param {Object} user - Current user
     */
    notifyListeners(user) {
        this.authStateListeners.forEach(listener => listener(user));
    }
}

export { AuthService, UserRoles };
export default AuthService;

