/**
 * API Routes Module
 * Defines all API endpoints for the EPLQ system
 */

import express from 'express';
import { AuthService } from '../auth/authService.js';
import { AdminService } from '../admin/adminService.js';
import { UserService } from '../user/userService.js';
import { EPLQLogger } from '../utils/logger.js';

const router = express.Router();

// Initialize services
const authService = new AuthService();
const adminService = new AdminService();
const userService = new UserService();

// Initialize services on startup
(async () => {
    await adminService.initialize();
    await userService.initialize();
    EPLQLogger.info('API services initialized');
})();

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Auth routes
router.post('/auth/register', async (req, res) => {
    const { email, password, displayName, role } = req.body;
    const result = await authService.register(email, password, displayName, role);
    res.status(result.success ? 201 : 400).json(result);
});

router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(result.success ? 200 : 401).json(result);
});

router.post('/auth/logout', async (req, res) => {
    const result = await authService.logout();
    res.json(result);
});

router.post('/auth/reset-password', async (req, res) => {
    const { email } = req.body;
    const result = await authService.resetPassword(email);
    res.json(result);
});

// User search routes
router.post('/search', async (req, res) => {
    const { latitude, longitude, radius, category, limit } = req.body;
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    const result = await userService.searchPOIs({
        latitude,
        longitude,
        radius,
        category,
        limit
    }, userId);
    
    res.json(result);
});

router.get('/categories', async (req, res) => {
    const result = await userService.getCategories();
    res.json(result);
});

router.get('/user/preferences/:userId', async (req, res) => {
    const result = await userService.getUserPreferences(req.params.userId);
    res.json(result);
});

router.put('/user/preferences/:userId', async (req, res) => {
    const result = await userService.updatePreferences(req.params.userId, req.body);
    res.json(result);
});

router.get('/user/history/:userId', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const result = await userService.getSearchHistory(req.params.userId, limit);
    res.json(result);
});

// Admin routes
router.get('/admin/dashboard', async (req, res) => {
    const result = await adminService.getDashboardStats();
    res.json(result);
});

router.get('/admin/pois', async (req, res) => {
    const result = await adminService.poiManager.getAllPOIs();
    res.json(result);
});

router.post('/admin/pois', async (req, res) => {
    const adminId = req.headers['x-user-id'];
    const result = await adminService.poiManager.uploadPOI(req.body, adminId);
    res.status(result.success ? 201 : 400).json(result);
});

router.post('/admin/pois/batch', async (req, res) => {
    const adminId = req.headers['x-user-id'];
    const { pois } = req.body;
    const result = await adminService.poiManager.uploadBatch(pois, adminId);
    res.json(result);
});

router.delete('/admin/pois/:poiId', async (req, res) => {
    const adminId = req.headers['x-user-id'];
    const result = await adminService.poiManager.deletePOI(req.params.poiId, adminId);
    res.json(result);
});

router.get('/admin/users', async (req, res) => {
    const result = await adminService.getAllUsers();
    res.json(result);
});

router.put('/admin/users/:uid/role', async (req, res) => {
    const adminId = req.headers['x-user-id'];
    const { role } = req.body;
    const result = await adminService.updateUserRole(req.params.uid, role, adminId);
    res.json(result);
});

router.put('/admin/users/:uid/status', async (req, res) => {
    const adminId = req.headers['x-user-id'];
    const { isActive } = req.body;
    const result = await adminService.toggleUserStatus(req.params.uid, isActive, adminId);
    res.json(result);
});

router.get('/admin/logs', async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const result = await adminService.getRecentLogs(limit);
    res.json(result);
});

router.post('/admin/rebuild-index', async (req, res) => {
    const result = await adminService.rebuildIndex();
    res.json(result);
});

// Stats endpoint
router.get('/stats', (req, res) => {
    res.json({
        success: true,
        stats: {
            user: userService.getStats(),
            initialized: true
        }
    });
});

export default router;

