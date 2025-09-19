// Company Databases Management System

class DatabaseManager {
    constructor() {
        this.databases = [];
        this.filteredDatabases = [];
        this.init();
    }

    init() {
        this.loadDatabases();
        this.renderDatabases();
        this.initializeTheme();
        
        // Sample data if none exists
        if (this.databases.length === 0) {
            this.loadSampleData();
        }
    }

    loadSampleData() {
        const sampleDatabases = [
            {
                id: 'db-001',
                name: 'CustomerDB',
                server: 'SQL-PROD-01',
                type: 'sql-server',
                environment: 'production',
                status: 'active',
                version: '2019',
                purpose: 'Customer relationship management and sales data',
                owner: 'Sales Team',
                contact: 'sales.admin@company.com',
                size: '2.5TB',
                users: '150-200 concurrent users',
                notes: 'Mission critical - 24/7 availability required',
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'db-002',
                name: 'FinanceDB',
                server: 'SQL-PROD-02',
                type: 'sql-server',
                environment: 'production',
                status: 'active',
                version: '2019',
                purpose: 'Financial reporting and accounting data',
                owner: 'Finance Team',
                contact: 'finance.it@company.com',
                size: '800GB',
                users: '50-75 concurrent users',
                notes: 'Encrypted database with strict access controls',
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'db-003',
                name: 'InventoryDB',
                server: 'SQL-PROD-03',
                type: 'sql-server',
                environment: 'production',
                status: 'active',
                version: '2017',
                purpose: 'Inventory management and supply chain tracking',
                owner: 'Operations Team',
                contact: 'ops.manager@company.com',
                size: '1.2TB',
                users: '100-150 concurrent users',
                notes: 'Scheduled for migration to SQL Server 2019',
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'db-004',
                name: 'DataWarehouse',
                server: 'DW-PROD-01',
                type: 'azure-sql',
                environment: 'production',
                status: 'active',
                version: 'Gen2',
                purpose: 'Enterprise data warehouse for BI and analytics',
                owner: 'BI Team',
                contact: 'bi.team@company.com',
                size: '15TB',
                users: '25-50 concurrent users',
                notes: 'Primary source for Power BI reports',
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'db-005',
                name: 'DevTestDB',
                server: 'SQL-DEV-01',
                type: 'sql-server',
                environment: 'development',
                status: 'active',
                version: '2019',
                purpose: 'Development and testing environment',
                owner: 'IT Development',
                contact: 'dev.team@company.com',
                size: '500GB',
                users: '10-20 concurrent users',
                notes: 'Refreshed weekly from production sanitized data',
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'db-006',
                name: 'LegacyOracle',
                server: 'ORA-PROD-01',
                type: 'oracle',
                environment: 'production',
                status: 'deprecated',
                version: '11g',
                purpose: 'Legacy ERP system database',
                owner: 'IT Operations',
                contact: 'it.ops@company.com',
                size: '3TB',
                users: '20-30 concurrent users',
                notes: 'Scheduled for decommission Q2 2026',
                lastUpdated: new Date().toISOString()
            }
        ];

        this.databases = sampleDatabases;
        this.saveDatabases();
        this.renderDatabases();
    }

    loadDatabases() {
        try {
            const stored = localStorage.getItem('company-databases');
            this.databases = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading databases:', error);
            this.databases = [];
        }
    }

    saveDatabases() {
        try {
            localStorage.setItem('company-databases', JSON.stringify(this.databases));
        } catch (error) {
            console.error('Error saving databases:', error);
        }
    }

    addDatabase(databaseData) {
        const database = {
            id: 'db-' + Date.now(),
            ...databaseData,
            lastUpdated: new Date().toISOString()
        };
        this.databases.push(database);
        this.saveDatabases();
        this.renderDatabases();
        return database;
    }

    updateDatabase(id, updates) {
        const index = this.databases.findIndex(db => db.id === id);
        if (index !== -1) {
            this.databases[index] = {
                ...this.databases[index],
                ...updates,
                lastUpdated: new Date().toISOString()
            };
            this.saveDatabases();
            this.renderDatabases();
        }
    }

    deleteDatabase(id) {
        this.databases = this.databases.filter(db => db.id !== id);
        this.saveDatabases();
        this.renderDatabases();
    }

    getTypeIcon(type) {
        const icons = {
            'sql-server': 'fas fa-server',
            'oracle': 'fas fa-database',
            'mysql': 'fas fa-leaf',
            'postgresql': 'fas fa-elephant',
            'mongodb': 'fas fa-seedling',
            'redis': 'fas fa-bolt',
            'cassandra': 'fas fa-network-wired',
            'snowflake': 'fas fa-snowflake',
            'bigquery': 'fas fa-chart-line',
            'azure-sql': 'fas fa-cloud',
            'aws-rds': 'fas fa-aws'
        };
        return icons[type] || 'fas fa-database';
    }

    getTypeColor(type) {
        const colors = {
            'sql-server': '#0078d4',
            'oracle': '#f80000',
            'mysql': '#00758f',
            'postgresql': '#336791',
            'mongodb': '#4db33d',
            'redis': '#dc382d',
            'cassandra': '#1287b1',
            'snowflake': '#56b3d9',
            'bigquery': '#4285f4',
            'azure-sql': '#0078d4',
            'aws-rds': '#ff9900'
        };
        return colors[type] || '#6b7280';
    }

    getStatusColor(status) {
        const colors = {
            'active': '#10b981',
            'deprecated': '#f59e0b',
            'planned': '#6366f1',
            'maintenance': '#ef4444'
        };
        return colors[status] || '#6b7280';
    }

    getEnvironmentColor(environment) {
        const colors = {
            'production': '#ef4444',
            'staging': '#f59e0b',
            'development': '#10b981',
            'testing': '#6366f1'
        };
        return colors[environment] || '#6b7280';
    }

    renderDatabases() {
        const tableContainer = document.querySelector('.databases-table-container');
        const databasesToShow = this.filteredDatabases.length > 0 ? this.filteredDatabases : this.databases;
        
        if (databasesToShow.length === 0) {
            tableContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <h3>No Databases Found</h3>
                    <p>Start by adding your company's databases to track and manage your data infrastructure.</p>
                    <button class="btn btn-primary" onclick="addDatabase()">
                        <i class="fas fa-plus"></i> Add First Database
                    </button>
                </div>
            `;
            return;
        }

        // Restore table if it was replaced by empty state
        if (!document.getElementById('databases-table')) {
            tableContainer.innerHTML = `
                <table class="databases-table" id="databases-table">
                    <thead>
                        <tr>
                            <th>Database</th>
                            <th>Type</th>
                            <th>Server</th>
                            <th>Environment</th>
                            <th>Status</th>
                            <th>Purpose</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="databases-tbody"></tbody>
                </table>
            `;
        }

        const tbody = document.getElementById('databases-tbody');
        tbody.innerHTML = databasesToShow.map(db => this.createDatabaseRow(db)).join('');
    }

    createDatabaseCard(db) {
        const typeColor = this.getTypeColor(db.type);
        const statusColor = this.getStatusColor(db.status);
        const envColor = this.getEnvironmentColor(db.environment);
        const icon = this.getTypeIcon(db.type);

        return `
            <div class="database-card" data-id="${db.id}">
                <div class="database-header">
                    <div class="database-icon" style="background: ${typeColor}">
                        <i class="${icon}"></i>
                    </div>
                    <div class="database-title">
                        <h3>${db.name}</h3>
                        <p>${db.server}</p>
                    </div>
                    <div class="database-actions">
                        <button class="btn btn-icon" onclick="editDatabase('${db.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-icon" onclick="deleteDatabase('${db.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="database-badges">
                    <span class="badge" style="background: ${typeColor}">${db.type.replace('-', ' ').toUpperCase()}</span>
                    <span class="badge" style="background: ${envColor}">${db.environment.toUpperCase()}</span>
                    <span class="badge" style="background: ${statusColor}">${db.status.toUpperCase()}</span>
                </div>
                
                <div class="database-details">
                    <div class="detail-row">
                        <strong>Purpose:</strong>
                        <span>${db.purpose || 'No description'}</span>
                    </div>
                    ${db.version ? `
                    <div class="detail-row">
                        <strong>Version:</strong>
                        <span>${db.version}</span>
                    </div>
                    ` : ''}
                    ${db.owner ? `
                    <div class="detail-row">
                        <strong>Owner:</strong>
                        <span>${db.owner}</span>
                    </div>
                    ` : ''}
                    ${db.size ? `
                    <div class="detail-row">
                        <strong>Size:</strong>
                        <span>${db.size}</span>
                    </div>
                    ` : ''}
                    ${db.users ? `
                    <div class="detail-row">
                        <strong>Users:</strong>
                        <span>${db.users}</span>
                    </div>
                    ` : ''}
                    ${db.contact ? `
                    <div class="detail-row">
                        <strong>Contact:</strong>
                        <span>${db.contact}</span>
                    </div>
                    ` : ''}
                    ${db.notes ? `
                    <div class="detail-row notes">
                        <strong>Notes:</strong>
                        <span>${db.notes}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="database-footer">
                    <small>Last updated: ${new Date(db.lastUpdated).toLocaleDateString()}</small>
                </div>
            </div>
        `;
    }

    createDatabaseRow(db) {
        const typeColor = this.getTypeColor(db.type);
        const statusColor = this.getStatusColor(db.status);
        const envColor = this.getEnvironmentColor(db.environment);
        const icon = this.getTypeIcon(db.type);

        return `
            <tr class="database-row" data-id="${db.id}">
                <td>
                    <div class="db-name-cell">
                        <div class="database-icon" style="background: ${typeColor}">
                            <i class="${icon}"></i>
                        </div>
                        <div class="database-info">
                            <div class="db-name">${db.name}</div>
                            <div class="db-id">#${db.id}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="type-badge" style="background: ${typeColor}">
                        ${db.type.replace('-', ' ').toUpperCase()}
                    </span>
                </td>
                <td class="db-server">${db.server}</td>
                <td>
                    <span class="env-badge" style="background: ${envColor}">
                        ${db.environment.toUpperCase()}
                    </span>
                </td>
                <td>
                    <span class="status-badge" style="background: ${statusColor}">
                        ${db.status.toUpperCase()}
                    </span>
                </td>
                <td class="db-purpose">${db.purpose || 'No description'}</td>
                <td class="db-actions">
                    <button class="btn btn-sm btn-icon" onclick="editDatabase('${db.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-icon" onclick="deleteDatabase('${db.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    filterDatabases() {
        const searchTerm = document.getElementById('database-search').value.toLowerCase();
        const typeFilter = document.getElementById('type-filter').value;
        const environmentFilter = document.getElementById('environment-filter').value;
        const statusFilter = document.getElementById('status-filter').value;

        this.filteredDatabases = this.databases.filter(db => {
            const matchesSearch = !searchTerm || 
                db.name.toLowerCase().includes(searchTerm) ||
                db.server.toLowerCase().includes(searchTerm) ||
                db.type.toLowerCase().includes(searchTerm) ||
                db.purpose.toLowerCase().includes(searchTerm) ||
                db.owner.toLowerCase().includes(searchTerm);

            const matchesType = !typeFilter || db.type === typeFilter;
            const matchesEnvironment = !environmentFilter || db.environment === environmentFilter;
            const matchesStatus = !statusFilter || db.status === statusFilter;

            return matchesSearch && matchesType && matchesEnvironment && matchesStatus;
        });

        this.renderDatabases();
    }

    exportDatabases() {
        const dataStr = JSON.stringify(this.databases, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `company-databases-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    initializeTheme() {
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
}

// Global instance
let databaseManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    databaseManager = new DatabaseManager();
});

// Global functions for UI interactions
function addDatabase() {
    document.getElementById('add-database-modal').style.display = 'flex';
    document.getElementById('database-form').reset();
}

function closeAddDatabaseModal() {
    document.getElementById('add-database-modal').style.display = 'none';
}

function saveDatabaseForm() {
    const form = document.getElementById('database-form');
    const formData = new FormData(form);
    
    const databaseData = {
        name: document.getElementById('db-name').value,
        server: document.getElementById('db-server').value,
        type: document.getElementById('db-type').value,
        environment: document.getElementById('db-environment').value,
        status: document.getElementById('db-status').value,
        version: document.getElementById('db-version').value,
        purpose: document.getElementById('db-purpose').value,
        owner: document.getElementById('db-owner').value,
        contact: document.getElementById('db-contact').value,
        size: document.getElementById('db-size').value,
        users: document.getElementById('db-users').value,
        notes: document.getElementById('db-notes').value
    };

    // Validate required fields
    if (!databaseData.name || !databaseData.server || !databaseData.type || !databaseData.environment) {
        alert('Please fill in all required fields (marked with *)');
        return;
    }

    databaseManager.addDatabase(databaseData);
    closeAddDatabaseModal();
    
    // Show success message
    showNotification('Database added successfully!', 'success');
}

function editDatabase(id) {
    const database = databaseManager.databases.find(db => db.id === id);
    if (!database) return;

    // Populate form with existing data
    document.getElementById('db-name').value = database.name || '';
    document.getElementById('db-server').value = database.server || '';
    document.getElementById('db-type').value = database.type || '';
    document.getElementById('db-environment').value = database.environment || '';
    document.getElementById('db-status').value = database.status || '';
    document.getElementById('db-version').value = database.version || '';
    document.getElementById('db-purpose').value = database.purpose || '';
    document.getElementById('db-owner').value = database.owner || '';
    document.getElementById('db-contact').value = database.contact || '';
    document.getElementById('db-size').value = database.size || '';
    document.getElementById('db-users').value = database.users || '';
    document.getElementById('db-notes').value = database.notes || '';

    // Change modal title and save button
    document.querySelector('#add-database-modal .modal-header h3').innerHTML = '<i class="fas fa-edit"></i> Edit Database';
    
    // Update save function to edit instead of add
    const saveButton = document.querySelector('#add-database-modal .btn-primary');
    saveButton.onclick = () => saveEditedDatabase(id);
    
    document.getElementById('add-database-modal').style.display = 'flex';
}

function saveEditedDatabase(id) {
    const databaseData = {
        name: document.getElementById('db-name').value,
        server: document.getElementById('db-server').value,
        type: document.getElementById('db-type').value,
        environment: document.getElementById('db-environment').value,
        status: document.getElementById('db-status').value,
        version: document.getElementById('db-version').value,
        purpose: document.getElementById('db-purpose').value,
        owner: document.getElementById('db-owner').value,
        contact: document.getElementById('db-contact').value,
        size: document.getElementById('db-size').value,
        users: document.getElementById('db-users').value,
        notes: document.getElementById('db-notes').value
    };

    // Validate required fields
    if (!databaseData.name || !databaseData.server || !databaseData.type || !databaseData.environment) {
        alert('Please fill in all required fields (marked with *)');
        return;
    }

    databaseManager.updateDatabase(id, databaseData);
    closeAddDatabaseModal();
    
    // Reset modal for next use
    document.querySelector('#add-database-modal .modal-header h3').innerHTML = '<i class="fas fa-database"></i> Add Database';
    document.querySelector('#add-database-modal .btn-primary').onclick = saveDatabaseForm;
    
    showNotification('Database updated successfully!', 'success');
}

function deleteDatabase(id) {
    const database = databaseManager.databases.find(db => db.id === id);
    if (!database) return;

    if (confirm(`Are you sure you want to delete "${database.name}"? This action cannot be undone.`)) {
        databaseManager.deleteDatabase(id);
        showNotification('Database deleted successfully!', 'success');
    }
}

function filterDatabases() {
    databaseManager.filterDatabases();
}

function exportDatabases() {
    databaseManager.exportDatabases();
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const themeIcon = document.getElementById('theme-icon');
    themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('add-database-modal');
    if (e.target === modal) {
        closeAddDatabaseModal();
    }
});
