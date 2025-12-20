/**
 * Admin Service Module
 * Provides administrative functionality for managing the EPLQ system
 */

import { 
    collection, 
    getDocs, 
    doc, 
    updateDoc, 
    query, 
    where,
    orderBy,
    limit as fbLimit,
    serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase.config.js';
import { POIManager } from './poiManager.js';
import { QueryProcessor } from '../query/queryProcessor.js';
import { EPLQLogger } from '../utils/logger.js';

/**
 * AdminService class
 * Centralizes admin operations
 */
class AdminService {
    constructor(masterKey = null) {
        this.poiManager = new POIManager(masterKey);
        this.queryProcessor = new QueryProcessor(masterKey);
    }

    /**
     * Initialize the admin service with existing data
     */
    async initialize() {
        try {
            const encryptedPOIs = await this.poiManager.getEncryptedPOIs();
            const stats = this.queryProcessor.initialize(encryptedPOIs);
            EPLQLogger.info('Admin service initialized', stats);
            return { success: true, stats };
        } catch (error) {
            EPLQLogger.error('Failed to initialize admin service', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get dashboard statistics
     * @returns {Object} Dashboard stats
     */
    async getDashboardStats() {
        try {
            const [categoryStats, userStats, queryStats] = await Promise.all([
                this.poiManager.getCategoryStats(),
                this.getUserStats(),
                this.getQueryStats()
            ]);

            const totalPOIs = Object.values(categoryStats).reduce((a, b) => a + b, 0);

            return {
                success: true,
                stats: {
                    totalPOIs,
                    categoryBreakdown: categoryStats,
                    users: userStats,
                    queries: queryStats,
                    indexStats: this.queryProcessor.getStats()
                }
            };
        } catch (error) {
            EPLQLogger.error('Failed to get dashboard stats', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get user statistics
     * @returns {Object} User stats
     */
    async getUserStats() {
        try {
            if (!db) return { total: 0, admins: 0, users: 0 };

            const usersSnapshot = await getDocs(collection(db, 'users'));
            let admins = 0;
            let users = 0;

            usersSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.role === 'admin') {
                    admins++;
                } else {
                    users++;
                }
            });

            return { total: admins + users, admins, users };
        } catch (error) {
            EPLQLogger.error('Failed to get user stats', error);
            return { total: 0, admins: 0, users: 0 };
        }
    }

    /**
     * Get query statistics
     * @returns {Object} Query stats
     */
    async getQueryStats() {
        try {
            if (!db) return { total: 0, today: 0, avgResponseTime: 0 };

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const logsSnapshot = await getDocs(collection(db, 'queryLogs'));
            let total = 0;
            let todayCount = 0;
            let totalTime = 0;

            logsSnapshot.forEach(doc => {
                const data = doc.data();
                total++;
                if (data.timestamp && data.timestamp.toDate() >= today) {
                    todayCount++;
                }
                if (data.executionTime) {
                    totalTime += parseFloat(data.executionTime);
                }
            });

            return {
                total,
                today: todayCount,
                avgResponseTime: total > 0 ? (totalTime / total).toFixed(2) : 0
            };
        } catch (error) {
            EPLQLogger.error('Failed to get query stats', error);
            return { total: 0, today: 0, avgResponseTime: 0 };
        }
    }

    /**
     * Get all users for management
     * @returns {Array<Object>} User list
     */
    async getAllUsers() {
        try {
            if (!db) return { success: false, error: 'Database not available' };

            const q = query(
                collection(db, 'users'),
                orderBy('createdAt', 'desc')
            );
            
            const snapshot = await getDocs(q);
            const users = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                users.push({
                    uid: data.uid,
                    email: data.email,
                    displayName: data.displayName,
                    role: data.role,
                    isActive: data.isActive,
                    createdAt: data.createdAt,
                    lastLogin: data.lastLogin
                });
            });

            return { success: true, users };
        } catch (error) {
            EPLQLogger.error('Failed to get all users', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update user role
     * @param {string} uid - User ID
     * @param {string} newRole - New role
     * @param {string} adminId - Admin making the change
     * @returns {Object} Result
     */
    async updateUserRole(uid, newRole, adminId) {
        try {
            if (!db) throw new Error('Database not available');
            if (!['user', 'admin'].includes(newRole)) {
                throw new Error('Invalid role');
            }

            await updateDoc(doc(db, 'users', uid), {
                role: newRole,
                updatedAt: serverTimestamp(),
                updatedBy: adminId
            });

            EPLQLogger.info('User role updated', { uid, newRole, adminId });
            return { success: true };
        } catch (error) {
            EPLQLogger.error('Failed to update user role', error, { uid });
            return { success: false, error: error.message };
        }
    }

    /**
     * Toggle user active status
     * @param {string} uid - User ID
     * @param {boolean} isActive - New active status
     * @param {string} adminId - Admin making the change
     * @returns {Object} Result
     */
    async toggleUserStatus(uid, isActive, adminId) {
        try {
            if (!db) throw new Error('Database not available');

            await updateDoc(doc(db, 'users', uid), {
                isActive,
                updatedAt: serverTimestamp(),
                updatedBy: adminId
            });

            EPLQLogger.info('User status updated', { uid, isActive, adminId });
            return { success: true };
        } catch (error) {
            EPLQLogger.error('Failed to toggle user status', error, { uid });
            return { success: false, error: error.message };
        }
    }

    /**
     * Get recent activity logs
     * @param {number} limit - Number of logs to retrieve
     * @returns {Array<Object>} Recent logs
     */
    async getRecentLogs(limitCount = 50) {
        try {
            if (!db) return { success: false, error: 'Database not available' };

            const q = query(
                collection(db, 'actionLogs'),
                orderBy('timestamp', 'desc'),
                fbLimit(limitCount)
            );
            
            const snapshot = await getDocs(q);
            const logs = [];

            snapshot.forEach(doc => {
                logs.push({ id: doc.id, ...doc.data() });
            });

            return { success: true, logs };
        } catch (error) {
            EPLQLogger.error('Failed to get recent logs', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Rebuild spatial index
     * @returns {Object} Result with stats
     */
    async rebuildIndex() {
        try {
            const encryptedPOIs = await this.poiManager.getEncryptedPOIs();
            const stats = this.queryProcessor.initialize(encryptedPOIs);
            
            EPLQLogger.info('Spatial index rebuilt', stats);
            return { success: true, stats };
        } catch (error) {
            EPLQLogger.error('Failed to rebuild index', error);
            return { success: false, error: error.message };
        }
    }
}

export { AdminService };
export default AdminService;

