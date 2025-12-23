import { firebaseAuth } from './firebase-client.js';

const API_BASE = '/api';

const state = {
    currentPage: 'home',
    currentUser: null,
    categories: []
};

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
        const contentType = response.headers.get('content-type') || '';
        let data;

        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            data = {
                success: response.ok,
                error: text || `Request failed with status ${response.status}`
            };
        }

        if (!response.ok && data && data.success === undefined) {
            return {
                success: false,
                error: data.error || `Request failed with status ${response.status}`
            };
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: error.message };
    }
}

function validateLoginForm(email, password) {
    if (!email || !password) {
        return 'Email and password are required';
    }
    if (!email.includes('@')) {
        return 'Enter a valid email address';
    }
    if (password.length < 8) {
        return 'Password must be at least 8 characters';
    }
    return null;
}

function validateRegisterForm(name, email, password) {
    if (!name || name.trim().length < 2) {
        return 'Display name must be at least 2 characters';
    }
    if (!email || !email.includes('@')) {
        return 'Enter a valid email address';
    }
    if (password.length < 8) {
        return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return 'Password must include upper, lower case and a number';
    }
    return null;
}

function validateSearchInputs(lat, lng, radius) {
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return 'Please enter valid coordinates';
    }
    if (lat < -90 || lat > 90) {
        return 'Latitude must be between -90 and 90';
    }
    if (lng < -180 || lng > 180) {
        return 'Longitude must be between -180 and 180';
    }
    if (Number.isNaN(radius) || radius <= 0) {
        return 'Radius must be a positive number';
    }
    if (radius > 50) {
        return 'Radius cannot exceed 50 km';
    }
    return null;
}

function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    document.getElementById(`${page}Page`).classList.add('active');
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

    state.currentPage = page;

    if (page === 'search') loadCategories();
    if (page === 'admin') loadAdminDashboard();
}

function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function hideAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

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

async function loadCategories() {
    if (state.categories.length > 0) {
        const select = document.getElementById('category');
        select.innerHTML = '<option value="">All Categories</option>';
        state.categories.forEach(categoryItem => {
            select.innerHTML += `<option value="${categoryItem.name}">${categoryItem.name} (${categoryItem.count})</option>`;
        });
        return;
    }

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

async function handleSearch(e) {
    e.preventDefault();

    const lat = parseFloat(document.getElementById('latitude').value);
    const lng = parseFloat(document.getElementById('longitude').value);
    const radius = parseFloat(document.getElementById('radius').value);
    const category = document.getElementById('category').value;

    const validationError = validateSearchInputs(lat, lng, radius);
    if (validationError) {
        Toast.error(validationError);
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

function displaySearchResults(result) {
    const container = document.getElementById('searchResults');
    const list = document.getElementById('resultsList');
    const count = document.getElementById('resultCount');
    const metrics = document.getElementById('searchMetrics');

    container.classList.remove('hidden');

    if (!result.success) {
        Toast.error(result.error || 'Search failed');
        list.innerHTML = `<div class="result-item"><p>Error: ${result.error}</p></div>`;
        metrics.innerHTML = '';
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

function useMyLocation() {
    if (!navigator.geolocation) {
        Toast.error('Geolocation not supported');
        return;
    }

    const button = document.getElementById('useLocationBtn');
    button.disabled = true;

    navigator.geolocation.getCurrentPosition(
        position => {
            document.getElementById('latitude').value = position.coords.latitude.toFixed(6);
            document.getElementById('longitude').value = position.coords.longitude.toFixed(6);
            Toast.success('Location detected');
            button.disabled = false;
        },
        error => {
            Toast.error('Could not get location: ' + error.message);
            button.disabled = false;
        }
    );
}

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
            <button class="btn btn-primary" data-action="show-upload-form">+ Add POI</button>
            <button class="btn btn-secondary" data-action="show-batch-upload">Batch Upload</button>
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
                            <button class="btn btn-small btn-danger" data-action="delete-poi" data-id="${poi.id}">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

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
                            <button 
                                class="btn btn-small" 
                                data-action="toggle-role" 
                                data-uid="${user.uid}" 
                                data-role="${user.role}"
                            >
                                ${user.role === 'admin' ? 'Demote' : 'Promote'}
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

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

function init() {
    firebaseAuth.addListener(updateAuthUI);

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.dataset.page;
            if (page === 'admin' && (!state.currentUser || state.currentUser.role !== 'admin')) {
                Toast.error('Admin access required');
                return;
            }
            navigateTo(page);
        });
    });

    document.getElementById('loginBtn').addEventListener('click', () => showModal('loginModal'));
    document.getElementById('registerBtn').addEventListener('click', () => showModal('registerModal'));
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await firebaseAuth.logout();
        Toast.success('Logged out');
        navigateTo('home');
    });

    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', hideAllModals);
    });

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

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        const errorMessage = validateLoginForm(email, password);
        if (errorMessage) {
            Toast.error(errorMessage);
            return;
        }

        const submitButton = e.target.querySelector('[type="submit"]');
        submitButton.disabled = true;
        const originalText = submitButton.textContent;
        submitButton.innerHTML = '<span class="loading"></span> Logging in...';

        const result = await firebaseAuth.login(email, password);

        submitButton.disabled = false;
        submitButton.textContent = originalText;

        if (result.success) {
            hideAllModals();
            Toast.success('Welcome back!');
        } else {
            Toast.error(result.error);
        }
    });

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        const errorMessage = validateRegisterForm(name, email, password);
        if (errorMessage) {
            Toast.error(errorMessage);
            return;
        }

        const submitButton = e.target.querySelector('[type="submit"]');
        submitButton.disabled = true;
        const originalText = submitButton.textContent;
        submitButton.innerHTML = '<span class="loading"></span> Creating...';

        const result = await firebaseAuth.register(email, password, name);

        submitButton.disabled = false;
        submitButton.textContent = originalText;

        if (result.success) {
            hideAllModals();
            Toast.success('Account created!');
        } else {
            Toast.error(result.error);
        }
    });

    document.getElementById('searchForm').addEventListener('submit', handleSearch);
    document.getElementById('useLocationBtn').addEventListener('click', useMyLocation);

    document.getElementById('getStartedBtn').addEventListener('click', () => navigateTo('search'));

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

    const adminContent = document.getElementById('adminContent');
    adminContent.addEventListener('click', async (event) => {
        const target = event.target.closest('button');
        if (!target || !adminContent.contains(target)) return;

        const action = target.dataset.action;
        if (action === 'show-upload-form') {
            const uploadForm = document.getElementById('uploadForm');
            uploadForm.classList.toggle('hidden');
        } else if (action === 'show-batch-upload') {
            Toast.info('Batch upload coming soon');
        } else if (action === 'delete-poi') {
            const poiId = target.dataset.id;
            if (!poiId) return;
            if (!confirm('Delete this POI?')) return;
            const result = await apiCall(`/admin/pois/${poiId}`, { method: 'DELETE' });
            if (result.success) {
                Toast.success('POI deleted');
                loadPOIsManagement();
            } else {
                Toast.error(result.error || 'Failed to delete POI');
            }
        } else if (action === 'toggle-role') {
            const userId = target.dataset.uid;
            const currentRole = target.dataset.role;
            if (!userId || !currentRole) return;
            const newRole = currentRole === 'admin' ? 'user' : 'admin';
            const result = await apiCall(`/admin/users/${userId}/role`, {
                method: 'PUT',
                body: JSON.stringify({ role: newRole })
            });
            if (result.success) {
                Toast.success('Role updated');
                loadUsersManagement();
            } else {
                Toast.error(result.error || 'Failed to update role');
            }
        }
    });

    adminContent.addEventListener('submit', async (event) => {
        if (event.target.id !== 'poiForm') return;
        event.preventDefault();

        const nameInput = document.getElementById('poiName');
        const latInput = document.getElementById('poiLat');
        const lngInput = document.getElementById('poiLng');
        const categoryInput = document.getElementById('poiCategory');
        const addressInput = document.getElementById('poiAddress');
        const descInput = document.getElementById('poiDesc');

        const name = nameInput.value.trim();
        const latitude = parseFloat(latInput.value);
        const longitude = parseFloat(lngInput.value);
        const category = categoryInput.value.trim();
        const address = addressInput.value.trim();
        const description = descInput.value.trim();

        if (!name || name.length < 2) {
            Toast.error('POI name must be at least 2 characters');
            return;
        }
        if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
            Toast.error('Latitude must be between -90 and 90');
            return;
        }
        if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
            Toast.error('Longitude must be between -180 and 180');
            return;
        }
        if (!category) {
            Toast.error('Category is required');
            return;
        }

        const submitButton = event.target.querySelector('[type="submit"]');
        submitButton.disabled = true;
        const originalText = submitButton.textContent;
        submitButton.innerHTML = '<span class="loading"></span> Saving...';

        const result = await apiCall('/admin/pois', {
            method: 'POST',
            body: JSON.stringify({
                name,
                latitude,
                longitude,
                category,
                address,
                description
            })
        });

        submitButton.disabled = false;
        submitButton.textContent = originalText;

        if (result.success) {
            Toast.success('POI saved');
            event.target.reset();
            const uploadForm = document.getElementById('uploadForm');
            uploadForm.classList.add('hidden');
            loadPOIsManagement();
        } else {
            const errorMessage = Array.isArray(result.errors) ? result.errors.join(', ') : result.error;
            Toast.error(errorMessage || 'Failed to save POI');
        }
    });

    console.log('EPLQ Application initialized');
}

document.addEventListener('DOMContentLoaded', init);
