/**
 * User Service Module
 * Provides user-specific operations and preferences
 */

import { doc, getDoc, updateDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase.config.js';
import { SearchService } from './searchService.js';
import { EPLQLogger } from '../utils/logger.js';

/**
 * UserService class
 * Manages user preferences, history, and search operations
 */
class UserService {
    constructor(masterKey = null) {
        this.searchService = new SearchService(masterKey);
    }

    /**
     * Initialize user service
     */
    async initialize() {
        return await this.searchService.initialize();
    }

    /**
     * Perform POI search
     * @param {Object} searchParams - Search parameters
     * @param {string} userId - User ID
     * @returns {Object} Search results
     */
    async searchPOIs(searchParams, userId) {
        const result = await this.searchService.search(searchParams, userId);
        
        // Save search to history if successful
        if (result.success && userId) {
            await this.saveSearchHistory(userId, searchParams, result.results.length);
        }
        
        return result;
    }

    /**
     * Save search to user history
     * @param {string} userId - User ID
     * @param {Object} searchParams - Search parameters
     * @param {number} resultCount - Number of results
     */
    async saveSearchHistory(userId, searchParams, resultCount) {
        try {
            if (!db) return;

            await addDoc(collection(db, 'queryLogs'), {
                userId,
                searchParams: {
                    latitude: searchParams.latitude,
                    longitude: searchParams.longitude,
                    radius: searchParams.radius,
                    category: searchParams.category || null
                },
                resultCount,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            EPLQLogger.error('Failed to save search history', error, { userId });
        }
    }

    /**
     * Get user preferences
     * @param {string} userId - User ID
     * @returns {Object} User preferences
     */
    async getUserPreferences(userId) {
        try {
            if (!db) return { success: false, error: 'Database not available' };

            const docRef = doc(db, 'users', userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    success: true,
                    preferences: data.preferences || {
                        defaultRadius: 5,
                        preferredCategories: [],
                        mapType: 'standard',
                        unitSystem: 'metric'
                    }
                };
            }

            return { success: false, error: 'User not found' };
        } catch (error) {
            EPLQLogger.error('Failed to get user preferences', error, { userId });
            return { success: false, error: error.message };
        }
    }

    /**
     * Update user preferences
     * @param {string} userId - User ID
     * @param {Object} preferences - New preferences
     * @returns {Object} Result
     */
    async updatePreferences(userId, preferences) {
        try {
            if (!db) throw new Error('Database not available');

            await updateDoc(doc(db, 'users', userId), {
                preferences,
                updatedAt: serverTimestamp()
            });

            EPLQLogger.info('User preferences updated', { userId });
            return { success: true };
        } catch (error) {
            EPLQLogger.error('Failed to update preferences', error, { userId });
            return { success: false, error: error.message };
        }
    }

    /**
     * Get user search history
     * @param {string} userId - User ID
     * @param {number} limit - Number of records to retrieve
     * @returns {Object} Search history
     */
    async getSearchHistory(userId, limit = 10) {
        try {
            if (!db) return { success: false, error: 'Database not available' };

            const { getDocs, query, where, orderBy, limit: fbLimit } = await import('firebase/firestore');
            
            const q = query(
                collection(db, 'queryLogs'),
                where('userId', '==', userId),
                orderBy('timestamp', 'desc'),
                fbLimit(limit)
            );

            const snapshot = await getDocs(q);
            const history = [];

            snapshot.forEach(doc => {
                history.push({ id: doc.id, ...doc.data() });
            });

            return { success: true, history };
        } catch (error) {
            EPLQLogger.error('Failed to get search history', error, { userId });
            return { success: false, error: error.message };
        }
    }

    /**
     * Get available categories for search filtering
     * @returns {Object} Categories
     */
    async getCategories() {
        return await this.searchService.getCategories();
    }

    /**
     * Get service statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return this.searchService.getStats();
    }

    /**
     * Refresh search index
     */
    async refresh() {
        return await this.searchService.refresh();
    }
}

export { UserService };
export default UserService;

