/**
 * EPLQ Main Application
 * Handles UI interactions and API calls
 */

import { firebaseAuth } from './firebase-client.js';

// API base URL
const API_BASE = '/api';

// State
const state = {
    currentPage: 'home',
    currentUser: null,
    categories: []
};

/**
 * Toast notification system
 */
const Toast = {
    show(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },
    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error'); },
    info(msg) { this.show(msg, 'info'); }
};

/**
 * API helper
 */
async function apiCall(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'X-User-Id': state.currentUser?.uid || 'anonymous'
        }
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...defaultOptions,
            ...options,
            headers: { ...defaultOptions.headers, ...options.headers }
        });
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Navigation
 */
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    document.getElementById(`${page}Page`).classList.add('active');
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

    state.currentPage = page;

    if (page === 'search') loadCategories();
    if (page === 'admin') loadAdminDashboard();
}

/**
 * Modal management
 */
function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function hideAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

/**
 * Update UI based on auth state
 */
function updateAuthUI(user) {
    state.currentUser = user;
    const authSection = document.getElementById('authSection');
    const userSection = document.getElementById('userSection');
    const adminLink = document.querySelector('.admin-only');

    if (user) {
        authSection.classList.add('hidden');
        userSection.classList.remove('hidden');
        document.getElementById('userName').textContent = user.displayName || user.email;

        if (user.role === 'admin') {
            adminLink.classList.remove('hidden');
        } else {
            adminLink.classList.add('hidden');
        }
    } else {
        authSection.classList.remove('hidden');
        userSection.classList.add('hidden');
        adminLink.classList.add('hidden');
    }
}

/**
 * Load categories for search
 */
async function loadCategories() {
    const result = await apiCall('/categories');
    if (result.success) {
        state.categories = result.categories;
        const select = document.getElementById('category');
        select.innerHTML = '<option value="">All Categories</option>';
        result.categories.forEach(cat => {
            select.innerHTML += `<option value="${cat.name}">${cat.name} (${cat.count})</option>`;
        });
    }
}

/**
 * Handle search form submission
 */
async function handleSearch(e) {
    e.preventDefault();

    const lat = parseFloat(document.getElementById('latitude').value);
    const lng = parseFloat(document.getElementById('longitude').value);
    const radius = parseFloat(document.getElementById('radius').value);
    const category = document.getElementById('category').value;

    if (isNaN(lat) || isNaN(lng)) {
        Toast.error('Please enter valid coordinates');
        return;
    }

    const searchBtn = e.target.querySelector('[type="submit"]');
    searchBtn.innerHTML = '<span class="loading"></span> Searching...';
    searchBtn.disabled = true;

    const result = await apiCall('/search', {
        method: 'POST',
        body: JSON.stringify({ latitude: lat, longitude: lng, radius, category })
    });

    searchBtn.innerHTML = '🔍 Search';
    searchBtn.disabled = false;

    displaySearchResults(result);
}

/**
 * Display search results
 */
function displaySearchResults(result) {
    const container = document.getElementById('searchResults');
    const list = document.getElementById('resultsList');
    const count = document.getElementById('resultCount');
    const metrics = document.getElementById('searchMetrics');

    container.classList.remove('hidden');

    if (!result.success) {
        list.innerHTML = `<div class="result-item"><p>Error: ${result.error}</p></div>`;
        return;
    }

    count.textContent = `${result.results.length} results found`;

    if (result.results.length === 0) {
        list.innerHTML = '<div class="result-item"><p>No POIs found in this area</p></div>';
    } else {
        list.innerHTML = result.results.map(poi => `
            <div class="result-item">
                <h4>${poi.name}</h4>
                <span class="category">${poi.category}</span>
                ${poi.distance ? `<span class="distance">${poi.distance.toFixed(2)} km away</span>` : ''}
                ${poi.description ? `<p>${poi.description}</p>` : ''}
                ${poi.address ? `<p>📍 ${poi.address}</p>` : ''}
            </div>
        `).join('');
    }

    if (result.metadata) {
        metrics.innerHTML = `
            Query time: ${result.metadata.timing?.total || 'N/A'}ms |
            Candidates: ${result.metadata.totalCandidates || 0} |
            Token: ${result.metadata.timing?.tokenGeneration || 'N/A'}ms
        `;
    }
}

/**
 * Use browser geolocation
 */
function useMyLocation() {
    if (!navigator.geolocation) {
        Toast.error('Geolocation not supported');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            document.getElementById('latitude').value = position.coords.latitude.toFixed(6);
            document.getElementById('longitude').value = position.coords.longitude.toFixed(6);
            Toast.success('Location detected');
        },
        (error) => {
            Toast.error('Could not get location: ' + error.message);
        }
    );
}

/**
 * Admin Dashboard
 */
async function loadAdminDashboard() {
    const content = document.getElementById('adminContent');
    content.innerHTML = '<div class="loading"></div> Loading...';

    const result = await apiCall('/admin/dashboard');

    if (!result.success) {
        content.innerHTML = `<p>Error loading dashboard: ${result.error}</p>`;
        return;
    }

    const stats = result.stats;
    content.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.totalPOIs}</div>
                <div class="stat-label">Total POIs</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.users?.total || 0}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.queries?.total || 0}</div>
                <div class="stat-label">Total Queries</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.queries?.avgResponseTime || 0}ms</div>
                <div class="stat-label">Avg Response Time</div>
            </div>
        </div>
        <h3>Category Breakdown</h3>
        <div class="stats-grid">
            ${Object.entries(stats.categoryBreakdown || {}).map(([cat, count]) => `
                <div class="stat-card">
                    <div class="stat-value">${count}</div>
                    <div class="stat-label">${cat}</div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Load POIs management
 */
async function loadPOIsManagement() {
    const content = document.getElementById('adminContent');
    content.innerHTML = '<div class="loading"></div> Loading POIs...';

    const result = await apiCall('/admin/pois');

    if (!result.success) {
        content.innerHTML = `<p>Error: ${result.error}</p>`;
        return;
    }

    content.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <button class="btn btn-primary" onclick="showUploadForm()">+ Add POI</button>
            <button class="btn btn-secondary" onclick="showBatchUpload()">Batch Upload</button>
        </div>
        <div id="uploadForm" class="hidden" style="margin-bottom: 1rem; padding: 1rem; background: var(--background); border-radius: var(--radius);">
            <h4>Add New POI</h4>
            <form id="poiForm" class="form-row">
                <input type="text" id="poiName" placeholder="Name" required>
                <input type="number" id="poiLat" placeholder="Latitude" step="any" required>
                <input type="number" id="poiLng" placeholder="Longitude" step="any" required>
                <input type="text" id="poiCategory" placeholder="Category" required>
                <input type="text" id="poiAddress" placeholder="Address">
                <textarea id="poiDesc" placeholder="Description"></textarea>
                <button type="submit" class="btn btn-primary">Save POI</button>
            </form>
        </div>
        <table class="data-table">
            <thead>
                <tr><th>Name</th><th>Category</th><th>Address</th><th>Actions</th></tr>
            </thead>
            <tbody>
                ${result.pois.map(poi => `
                    <tr>
                        <td>${poi.name}</td>
                        <td>${poi.category}</td>
                        <td>${poi.address || '-'}</td>
                        <td>
                            <button class="btn btn-small btn-danger" onclick="deletePOI('${poi.id}')">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

/**
 * Load users management
 */
async function loadUsersManagement() {
    const content = document.getElementById('adminContent');
    content.innerHTML = '<div class="loading"></div> Loading users...';

    const result = await apiCall('/admin/users');

    if (!result.success) {
        content.innerHTML = `<p>Error: ${result.error}</p>`;
        return;
    }

    content.innerHTML = `
        <table class="data-table">
            <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
                ${result.users.map(user => `
                    <tr>
                        <td>${user.displayName}</td>
                        <td>${user.email}</td>
                        <td>${user.role}</td>
                        <td>${user.isActive ? '✓ Active' : '✗ Inactive'}</td>
                        <td>
                            <button class="btn btn-small" onclick="toggleRole('${user.uid}', '${user.role}')">
                                ${user.role === 'admin' ? 'Demote' : 'Promote'}
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

/**
 * Load activity logs
 */
async function loadLogs() {
    const content = document.getElementById('adminContent');
    content.innerHTML = '<div class="loading"></div> Loading logs...';

    const result = await apiCall('/admin/logs?limit=100');

    if (!result.success) {
        content.innerHTML = `<p>Error: ${result.error}</p>`;
        return;
    }

    content.innerHTML = `
        <table class="data-table">
            <thead>
                <tr><th>Time</th><th>Action</th><th>Level</th><th>Message</th></tr>
            </thead>
            <tbody>
                ${result.logs.map(log => `
                    <tr>
                        <td>${log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : '-'}</td>
                        <td>${log.action}</td>
                        <td>${log.level}</td>
                        <td>${log.message}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Global functions for inline handlers
window.showUploadForm = () => document.getElementById('uploadForm').classList.toggle('hidden');
window.showBatchUpload = () => Toast.info('Batch upload coming soon');
window.deletePOI = async (id) => {
    if (confirm('Delete this POI?')) {
        const result = await apiCall(`/admin/pois/${id}`, { method: 'DELETE' });
        result.success ? Toast.success('POI deleted') : Toast.error(result.error);
        loadPOIsManagement();
    }
};
window.toggleRole = async (uid, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const result = await apiCall(`/admin/users/${uid}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
    });
    result.success ? Toast.success('Role updated') : Toast.error(result.error);
    loadUsersManagement();
};

/**
 * Initialize application
 */
function init() {
    // Auth state listener
    firebaseAuth.addListener(updateAuthUI);

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.dataset.page;
            if (page === 'admin' && !state.currentUser?.role === 'admin') {
                Toast.error('Admin access required');
                return;
            }
            navigateTo(page);
        });
    });

    // Auth buttons
    document.getElementById('loginBtn').addEventListener('click', () => showModal('loginModal'));
    document.getElementById('registerBtn').addEventListener('click', () => showModal('registerModal'));
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await firebaseAuth.logout();
        Toast.success('Logged out');
        navigateTo('home');
    });

    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', hideAllModals);
    });

    // Switch between modals
    document.getElementById('switchToRegister').addEventListener('click', (e) => {
        e.preventDefault();
        hideAllModals();
        showModal('registerModal');
    });
    document.getElementById('switchToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        hideAllModals();
        showModal('loginModal');
    });

    // Login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const result = await firebaseAuth.login(email, password);
        if (result.success) {
            hideAllModals();
            Toast.success('Welcome back!');
        } else {
            Toast.error(result.error);
        }
    });

    // Register form
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const result = await firebaseAuth.register(email, password, name);
        if (result.success) {
            hideAllModals();
            Toast.success('Account created!');
        } else {
            Toast.error(result.error);
        }
    });

    // Search form
    document.getElementById('searchForm').addEventListener('submit', handleSearch);
    document.getElementById('useLocationBtn').addEventListener('click', useMyLocation);

    // Get Started button
    document.getElementById('getStartedBtn').addEventListener('click', () => navigateTo('search'));

    // Admin tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const tab = e.target.dataset.tab;
            if (tab === 'dashboard') loadAdminDashboard();
            else if (tab === 'pois') loadPOIsManagement();
            else if (tab === 'users') loadUsersManagement();
            else if (tab === 'logs') loadLogs();
        });
    });

    console.log('EPLQ Application initialized');
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', init);

