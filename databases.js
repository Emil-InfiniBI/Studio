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
            'aws-rds': 'fas fa-aws',
            'excel': 'fas fa-file-excel',
            'dataverse': 'fas fa-table',
            'sharepoint': 'fas fa-share-alt',
            'access': 'fas fa-key',
            'csv': 'fas fa-file-csv',
            'json': 'fas fa-file-code',
            'xml': 'fas fa-file-code',
            'power-bi': 'fas fa-chart-bar',
            'tableau': 'fas fa-chart-area',
            'salesforce': 'fas fa-cloud-rain',
            'dynamics-365': 'fas fa-cog',
            'sap': 'fas fa-industry',
            'web-service': 'fas fa-globe',
            'rest-api': 'fas fa-plug',
            'odata': 'fas fa-link',
            'azure-synapse': 'fas fa-cloud',
            'azure-data-lake': 'fas fa-water',
            'aws-s3': 'fas fa-cube',
            'hdfs': 'fas fa-hdd',
            'teradata': 'fas fa-server',
            'db2': 'fas fa-database',
            'sybase': 'fas fa-database',
            'mariadb': 'fas fa-leaf',
            'sqlite': 'fas fa-file-archive',
            'duckdb': 'fas fa-feather',
            'clickhouse': 'fas fa-mouse-pointer',
            'elasticsearch': 'fas fa-search',
            'cosmos-db': 'fas fa-globe',
            'dynamodb': 'fas fa-bolt',
            'firebase': 'fas fa-fire',
            'neo4j': 'fas fa-project-diagram',
            'influxdb': 'fas fa-chart-line',
            'other': 'fas fa-question'
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
            'aws-rds': '#ff9900',
            'excel': '#217346',
            'dataverse': '#742774',
            'sharepoint': '#0078d4',
            'access': '#a4373a',
            'csv': '#28a745',
            'json': '#f39c12',
            'xml': '#e74c3c',
            'power-bi': '#f2c811',
            'tableau': '#e97627',
            'salesforce': '#00a1e0',
            'dynamics-365': '#0078d4',
            'sap': '#0f7dc7',
            'web-service': '#17a2b8',
            'rest-api': '#6c757d',
            'odata': '#0066cc',
            'azure-synapse': '#0078d4',
            'azure-data-lake': '#0078d4',
            'aws-s3': '#ff9900',
            'hdfs': '#ffa500',
            'teradata': '#f37440',
            'db2': '#054ada',
            'sybase': '#0066cc',
            'mariadb': '#003545',
            'sqlite': '#003b57',
            'duckdb': '#fff200',
            'clickhouse': '#ffcc01',
            'elasticsearch': '#005571',
            'cosmos-db': '#0078d4',
            'dynamodb': '#ff9900',
            'firebase': '#ff6f00',
            'neo4j': '#008cc1',
            'influxdb': '#22adf6',
            'other': '#6b7280'
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

    getTypeDisplayName(type) {
        const displayNames = {
            'sql-server': 'SQL SERVER',
            'oracle': 'ORACLE',
            'mysql': 'MYSQL',
            'postgresql': 'POSTGRESQL',
            'mongodb': 'MONGODB',
            'redis': 'REDIS',
            'cassandra': 'CASSANDRA',
            'snowflake': 'SNOWFLAKE',
            'bigquery': 'BIGQUERY',
            'azure-sql': 'AZURE SQL',
            'aws-rds': 'AWS RDS',
            'excel': 'EXCEL',
            'dataverse': 'DATAVERSE',
            'sharepoint': 'SHAREPOINT',
            'access': 'ACCESS',
            'csv': 'CSV FILES',
            'json': 'JSON FILES',
            'xml': 'XML FILES',
            'power-bi': 'POWER BI',
            'tableau': 'TABLEAU',
            'salesforce': 'SALESFORCE',
            'dynamics-365': 'DYNAMICS 365',
            'sap': 'SAP',
            'web-service': 'WEB SERVICE',
            'rest-api': 'REST API',
            'odata': 'ODATA',
            'azure-synapse': 'AZURE SYNAPSE',
            'azure-data-lake': 'AZURE DATA LAKE',
            'aws-s3': 'AWS S3',
            'hdfs': 'HDFS',
            'teradata': 'TERADATA',
            'db2': 'IBM DB2',
            'sybase': 'SYBASE',
            'mariadb': 'MARIADB',
            'sqlite': 'SQLITE',
            'duckdb': 'DUCKDB',
            'clickhouse': 'CLICKHOUSE',
            'elasticsearch': 'ELASTICSEARCH',
            'cosmos-db': 'COSMOS DB',
            'dynamodb': 'DYNAMODB',
            'firebase': 'FIREBASE',
            'neo4j': 'NEO4J',
            'influxdb': 'INFLUXDB',
            'other': 'OTHER'
        };
        return displayNames[type] || type.replace('-', ' ').toUpperCase();
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
                    <span class="badge" style="background: ${typeColor}">${this.getTypeDisplayName(db.type)}</span>
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
                        ${this.getTypeDisplayName(db.type)}
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
        const groupFilter = document.getElementById('group-filter').value;
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

            const dbGroup = db.group || 'Ungrouped';
            const matchesGroup = !groupFilter || dbGroup === groupFilter;
            const matchesType = !typeFilter || db.type === typeFilter;
            const matchesEnvironment = !environmentFilter || db.environment === environmentFilter;
            const matchesStatus = !statusFilter || db.status === statusFilter;

            return matchesSearch && matchesGroup && matchesType && matchesEnvironment && matchesStatus;
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
        // Group is managed separately in the group management interface
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
    // Group is managed separately in the group management interface

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
        notes: document.getElementById('db-notes').value,
        group: document.getElementById('db-group').value
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

// Excel Template Export Function
function exportDatabaseTemplate() {
    // Define the template structure with predefined columns and sample data
    const templateData = [
        // Header row with column names
        [
            'Database Name*',
            'Server Name*', 
            'Database Type*',
            'Environment*',
            'Status',
            'Version',
            'Purpose/Description',
            'Data Owner/Team',
            'Contact Person',
            'Approximate Size',
            'Typical Users',
            'Additional Notes'
        ],
        // Sample row to guide customer
        [
            'CustomerDB',
            'SQL-PROD-01',
            'sql-server',
            'production',
            'active',
            '2019',
            'Customer relationship management and sales data',
            'Sales Team',
            'sales.admin@company.com',
            '2.5TB',
            '150-200 concurrent users',
            'Mission critical - 24/7 availability required'
        ],
        // Empty row for customer to fill
        ['', '', '', '', '', '', '', '', '', '', '', '']
    ];

    // Create worksheet with validation data
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // Set column widths for better readability
    ws['!cols'] = [
        { width: 20 }, // Database Name
        { width: 15 }, // Server Name
        { width: 15 }, // Database Type
        { width: 12 }, // Environment
        { width: 10 }, // Status
        { width: 10 }, // Version
        { width: 30 }, // Purpose
        { width: 15 }, // Owner
        { width: 25 }, // Contact
        { width: 12 }, // Size
        { width: 20 }, // Users
        { width: 30 }  // Notes
    ];

    // Add instructions sheet
    const instructionsData = [
        ['Database Information Collection Template'],
        [''],
        ['Instructions:'],
        ['1. Fill out one row per database system in your organization'],
        ['2. Required fields are marked with *'],
        ['3. Use the provided sample row as a guide'],
        ['4. Save the file and send it back for import'],
        [''],
        ['Database Type Options:'],
        ['sql-server, oracle, mysql, postgresql, mongodb, redis, cassandra,'],
        ['snowflake, bigquery, azure-sql, aws-rds, excel, dataverse,'],
        ['sharepoint, access, csv, json, xml, power-bi, tableau,'],
        ['salesforce, dynamics-365, sap, web-service, rest-api, odata,'],
        ['azure-synapse, azure-data-lake, aws-s3, hdfs, teradata,'],
        ['db2, sybase, mariadb, sqlite, duckdb, clickhouse,'],
        ['elasticsearch, cosmos-db, dynamodb, firebase, neo4j, influxdb'],
        [''],
        ['Environment Options:'],
        ['production, staging, development, testing'],
        [''],
        ['Status Options:'],
        ['active, deprecated, planned, maintenance']
    ];

    const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsWs['!cols'] = [{ width: 60 }];

    // Create workbook and add sheets
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Database Inventory');
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `Database_Inventory_Template_${timestamp}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, filename);
    
    showNotification('Excel template exported successfully! Send this to your customer to fill out.', 'success');
}

// Excel Import Function
function importDatabasesFromExcel() {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.style.display = 'none';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Get the first sheet (Database Inventory)
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                    header: 1,
                    defval: '' 
                });
                
                if (jsonData.length < 2) {
                    throw new Error('Excel file appears to be empty or missing data');
                }

                // Parse the data (skip header row)
                const headers = jsonData[0];
                const importedDatabases = [];
                let importCount = 0;
                let errorCount = 0;
                const errors = [];

                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    
                    // Skip empty rows
                    if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
                        continue;
                    }

                    try {
                        // Map row data to database object
                        const dbData = {
                            name: row[0]?.toString().trim(),
                            server: row[1]?.toString().trim(),
                            type: row[2]?.toString().trim().toLowerCase(),
                            environment: row[3]?.toString().trim().toLowerCase(),
                            status: row[4]?.toString().trim().toLowerCase() || 'active',
                            version: row[5]?.toString().trim(),
                            purpose: row[6]?.toString().trim(),
                            owner: row[7]?.toString().trim(),
                            contact: row[8]?.toString().trim(),
                            size: row[9]?.toString().trim(),
                            users: row[10]?.toString().trim(),
                            notes: row[11]?.toString().trim()
                        };

                        // Validate required fields
                        if (!dbData.name || !dbData.server || !dbData.type || !dbData.environment) {
                            errors.push(`Row ${i + 1}: Missing required fields (Name, Server, Type, Environment)`);
                            errorCount++;
                            continue;
                        }

                        // Add to database manager
                        databaseManager.addDatabase(dbData);
                        importedDatabases.push(dbData);
                        importCount++;

                    } catch (error) {
                        errors.push(`Row ${i + 1}: ${error.message}`);
                        errorCount++;
                    }
                }

                // Show results
                let message = `Import completed: ${importCount} databases imported successfully`;
                if (errorCount > 0) {
                    message += `, ${errorCount} errors`;
                    console.warn('Import errors:', errors);
                }

                showNotification(message, errorCount > 0 ? 'warning' : 'success');

                // Refresh the display
                databaseManager.renderDatabases();

            } catch (error) {
                console.error('Import error:', error);
                showNotification(`Error importing Excel file: ${error.message}`, 'error');
            }
        };

        reader.readAsArrayBuffer(file);
    };

    // Trigger file selection
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('playground-theme', newTheme);
    
    const themeIcon = document.getElementById('theme-icon');
    themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Initialize theme from localStorage on page load
function initializeTheme() {
    const savedTheme = localStorage.getItem('playground-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Call initializeTheme immediately
initializeTheme();

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
    const addDbModal = document.getElementById('add-database-modal');
    const manageGroupsModal = document.getElementById('manage-groups-modal');
    
    if (e.target === addDbModal) {
        closeAddDatabaseModal();
    }
    if (e.target === manageGroupsModal) {
        closeManageGroupsModal();
    }
});

// ============================================
// DATABASE GROUP MANAGEMENT
// ============================================

// Get all groups from localStorage
function getDatabaseGroups() {
    const groups = localStorage.getItem('database-groups');
    return groups ? JSON.parse(groups) : [];
}

// Save groups to localStorage
function saveDatabaseGroups(groups) {
    localStorage.setItem('database-groups', JSON.stringify(groups));
}

// Get count of databases in each group
function getGroupDatabaseCounts() {
    const databases = databaseManager.databases;
    const counts = {};
    
    databases.forEach(db => {
        const groupName = db.group || 'Ungrouped';
        counts[groupName] = (counts[groupName] || 0) + 1;
    });
    
    return counts;
}

// Populate group dropdowns
function populateGroupDropdowns() {
    const groups = getDatabaseGroups();
    
    // Populate group filter in toolbar
    const groupFilter = document.getElementById('group-filter');
    if (groupFilter) {
        const currentValue = groupFilter.value;
        groupFilter.innerHTML = '<option value="">All Groups</option>';
        
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            groupFilter.appendChild(option);
        });
        
        // Add Ungrouped option
        const ungroupedOption = document.createElement('option');
        ungroupedOption.value = 'Ungrouped';
        ungroupedOption.textContent = 'Ungrouped';
        groupFilter.appendChild(ungroupedOption);
        
        groupFilter.value = currentValue;
    }
    
    // Populate group select in database form
    const groupSelect = document.getElementById('db-group');
    if (groupSelect) {
        const currentValue = groupSelect.value;
        groupSelect.innerHTML = '<option value="">Ungrouped</option>';
        
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            groupSelect.appendChild(option);
        });
        
        groupSelect.value = currentValue;
    }
}

// Open manage groups modal
function manageGroups() {
    document.getElementById('manage-groups-modal').style.display = 'flex';
    renderGroupsList();
    renderDatabaseAssignList();
    populateBulkAssignDropdown();
}

// Close manage groups modal
function closeManageGroupsModal() {
    document.getElementById('manage-groups-modal').style.display = 'none';
}

// Get group colors array
function getGroupColors() {
    return [
        '#6366F1', // Indigo
        '#8B5CF6', // Purple
        '#EC4899', // Pink
        '#F59E0B', // Amber
        '#10B981', // Green
        '#3B82F6', // Blue
        '#EF4444', // Red
        '#14B8A6', // Teal
        '#F97316', // Orange
        '#06B6D4', // Cyan
        '#84CC16', // Lime
        '#A855F7', // Violet
    ];
}

// Render groups list in manage modal
function renderGroupsList() {
    const groups = getDatabaseGroups();
    const counts = getGroupDatabaseCounts();
    const groupsList = document.getElementById('groups-list');
    const colors = getGroupColors();
    
    if (groups.length === 0) {
        groupsList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: var(--spacing-lg);">No groups created yet. Add a group above.</p>';
        return;
    }
    
    groupsList.innerHTML = '';
    
    groups.forEach((groupName, index) => {
        const count = counts[groupName] || 0;
        const color = colors[index % colors.length];
        
        const groupItem = document.createElement('div');
        groupItem.className = 'group-item';
        groupItem.style.setProperty('--group-item-color', color);
        groupItem.innerHTML = `
            <div class="group-item-info">
                <i class="fas fa-folder group-item-icon"></i>
                <div class="group-item-details">
                    <div class="group-item-name">${groupName}</div>
                    <div class="group-item-count">${count} database${count !== 1 ? 's' : ''}</div>
                </div>
            </div>
            <div class="group-item-actions">
                <button class="btn btn-icon" onclick="renameGroup('${groupName.replace(/'/g, "\\'")}');" title="Rename group">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-icon delete-btn" onclick="deleteGroup('${groupName.replace(/'/g, "\\'")}');" title="Delete group">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        groupsList.appendChild(groupItem);
    });
}

// Add new group
function addNewGroup() {
    const input = document.getElementById('new-group-name');
    const groupName = input.value.trim();
    
    if (!groupName) {
        showNotification('Please enter a group name', 'error');
        return;
    }
    
    const groups = getDatabaseGroups();
    
    if (groups.includes(groupName)) {
        showNotification('Group already exists', 'error');
        return;
    }
    
    groups.push(groupName);
    groups.sort();
    saveDatabaseGroups(groups);
    
    input.value = '';
    renderGroupsList();
    populateGroupDropdowns();
    renderDatabaseAssignList();
    populateBulkAssignDropdown();
    
    showNotification(`Group "${groupName}" created successfully`, 'success');
}

// Add new group from database form
function addNewGroupFromForm() {
    const groupName = prompt('Enter new group name:');
    
    if (!groupName || !groupName.trim()) {
        return;
    }
    
    const trimmedName = groupName.trim();
    const groups = getDatabaseGroups();
    
    if (groups.includes(trimmedName)) {
        showNotification('Group already exists', 'error');
        return;
    }
    
    groups.push(trimmedName);
    groups.sort();
    saveDatabaseGroups(groups);
    
    populateGroupDropdowns();
    
    // Select the newly created group
    document.getElementById('db-group').value = trimmedName;
    
    showNotification(`Group "${trimmedName}" created successfully`, 'success');
}

// Rename group
function renameGroup(oldName) {
    const newName = prompt('Enter new group name:', oldName);
    
    if (!newName || !newName.trim() || newName.trim() === oldName) {
        return;
    }
    
    const trimmedName = newName.trim();
    const groups = getDatabaseGroups();
    
    if (groups.includes(trimmedName)) {
        showNotification('Group already exists', 'error');
        return;
    }
    
    // Update group name in groups list
    const index = groups.indexOf(oldName);
    if (index !== -1) {
        groups[index] = trimmedName;
        groups.sort();
        saveDatabaseGroups(groups);
    }
    
    // Update all databases with this group
    databaseManager.databases.forEach(db => {
        if (db.group === oldName) {
            db.group = trimmedName;
        }
    });
    databaseManager.saveDatabases();
    
    renderGroupsList();
    populateGroupDropdowns();
    renderDatabaseAssignList();
    populateBulkAssignDropdown();
    databaseManager.renderDatabases();
    
    showNotification(`Group renamed to "${trimmedName}"`, 'success');
}

// Delete group
function deleteGroup(groupName) {
    const counts = getGroupDatabaseCounts();
    const count = counts[groupName] || 0;
    
    let message = `Are you sure you want to delete the group "${groupName}"?`;
    if (count > 0) {
        message += `\n\n${count} database${count !== 1 ? 's' : ''} will be moved to "Ungrouped".`;
    }
    
    if (!confirm(message)) {
        return;
    }
    
    const groups = getDatabaseGroups();
    const index = groups.indexOf(groupName);
    
    if (index !== -1) {
        groups.splice(index, 1);
        saveDatabaseGroups(groups);
    }
    
    // Move databases to Ungrouped
    databaseManager.databases.forEach(db => {
        if (db.group === groupName) {
            db.group = '';
        }
    });
    databaseManager.saveDatabases();
    
    renderGroupsList();
    populateGroupDropdowns();
    renderDatabaseAssignList();
    populateBulkAssignDropdown();
    databaseManager.renderDatabases();
    
    showNotification(`Group "${groupName}" deleted`, 'success');
}

// Helper function to check if any filters are active
function hasActiveFilters() {
    const searchTerm = document.getElementById('database-search')?.value || '';
    const groupFilter = document.getElementById('group-filter')?.value || '';
    const typeFilter = document.getElementById('type-filter')?.value || '';
    const environmentFilter = document.getElementById('environment-filter')?.value || '';
    const statusFilter = document.getElementById('status-filter')?.value || '';
    
    return searchTerm !== '' || groupFilter !== '' || typeFilter !== '' || 
           environmentFilter !== '' || statusFilter !== '';
}

// Render database assignment list
function renderDatabaseAssignList() {
    // Use filtered databases if filters are active, otherwise use all databases
    const databases = databaseManager.filteredDatabases.length > 0 || hasActiveFilters() 
        ? databaseManager.filteredDatabases 
        : databaseManager.databases;
    const groups = getDatabaseGroups();
    const assignList = document.getElementById('databases-assign-list');
    
    if (!assignList) return;
    
    if (databases.length === 0) {
        assignList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: var(--spacing-lg);">No databases match current filters.</p>';
        return;
    }
    
    assignList.innerHTML = '';
    
    // Add filter indicator if filters are active
    if (hasActiveFilters()) {
        const filterInfo = document.createElement('div');
        filterInfo.className = 'filter-info-banner';
        filterInfo.innerHTML = `
            <i class="fas fa-filter"></i>
            <span>Showing ${databases.length} of ${databaseManager.databases.length} databases (filters active)</span>
        `;
        assignList.appendChild(filterInfo);
    }
    
    databases.forEach((db, index) => {
        const item = document.createElement('div');
        item.className = 'database-assign-item';
        item.dataset.dbId = db.id;
        
        // Create select element with unique ID
        const selectId = `db-select-${index}`;
        const select = document.createElement('select');
        select.id = selectId;
        select.className = 'database-group-select';
        
        // Debug: Log the database group
        console.log(`Rendering dropdown for ${db.name}, group: "${db.group}", type: ${typeof db.group}`);
        
        // Add Ungrouped option
        const ungroupedOption = document.createElement('option');
        ungroupedOption.value = '';
        ungroupedOption.textContent = 'Ungrouped';
        if (!db.group || db.group === '' || db.group === 'Ungrouped') {
            ungroupedOption.selected = true;
            console.log(`  -> Selected: Ungrouped`);
        }
        select.appendChild(ungroupedOption);
        
        // Add group options
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            if (db.group === group) {
                option.selected = true;
                console.log(`  -> Selected: ${group}`);
            }
            select.appendChild(option);
        });
        
        // Use IIFE to capture the correct database ID
        (function(currentDb) {
            select.addEventListener('change', function(event) {
                const selectedValue = this.value;
                console.log('Select changed for database:', currentDb.name, 'ID:', currentDb.id, 'New value:', selectedValue);
                assignDatabaseToGroup(currentDb.id, selectedValue);
            });
        })(db);
        
        // Create the info section
        const infoDiv = document.createElement('div');
        infoDiv.className = 'database-assign-info';
        infoDiv.innerHTML = `
            <input type="checkbox" class="database-assign-checkbox" data-db-id="${db.id}">
            <i class="fas fa-database database-assign-icon"></i>
            <div class="database-assign-details">
                <div class="database-assign-name">${db.name}</div>
                <div class="database-assign-meta">${db.server} • ${db.type}</div>
            </div>
        `;
        
        // Create the group section
        const groupDiv = document.createElement('div');
        groupDiv.className = 'database-assign-group';
        groupDiv.appendChild(select);
        
        // Add both sections to item
        item.appendChild(infoDiv);
        item.appendChild(groupDiv);
        
        assignList.appendChild(item);
    });
}

// Populate bulk assign dropdown
function populateBulkAssignDropdown() {
    const groups = getDatabaseGroups();
    const dropdown = document.getElementById('bulk-assign-group');
    
    if (!dropdown) return;
    
    dropdown.innerHTML = '<option value="">Select group...</option>';
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        dropdown.appendChild(option);
    });
    
    // Add Ungrouped option
    const ungroupedOption = document.createElement('option');
    ungroupedOption.value = 'Ungrouped';
    ungroupedOption.textContent = 'Ungrouped';
    dropdown.appendChild(ungroupedOption);
}

// Assign single database to group
function assignDatabaseToGroup(dbId, groupName) {
    console.log('=== assignDatabaseToGroup called ===');
    console.log('Database ID:', dbId);
    console.log('Group Name:', groupName);
    
    const database = databaseManager.databases.find(db => db.id === dbId);
    if (!database) {
        console.error('Database not found:', dbId);
        console.log('Available databases:', databaseManager.databases.map(db => ({ id: db.id, name: db.name })));
        showNotification('Database not found', 'error');
        return;
    }
    
    console.log('Database found:', database.name);
    console.log('Current group:', database.group);
    
    // Set the group (empty string for Ungrouped)
    const oldGroup = database.group;
    database.group = (groupName === '' || groupName === 'Ungrouped') ? '' : groupName;
    
    console.log('New group:', database.group);
    
    // Save to localStorage
    databaseManager.saveDatabases();
    console.log('Saved to localStorage');
    
    // Re-apply filters to update filteredDatabases array
    databaseManager.filterDatabases();
    console.log('Filters re-applied');
    
    // Update ONLY the group list counts, NOT the assignment list
    // This prevents the dropdown recreation issue
    renderGroupsList();
    databaseManager.renderDatabases();
    
    const displayName = groupName === '' ? 'Ungrouped' : groupName;
    showNotification(`"${database.name}" assigned to ${displayName}`, 'success');
    console.log('=== Assignment complete ===');
}

// Bulk assign selected databases to group
function bulkAssignToGroup() {
    console.log('=== bulkAssignToGroup called ===');
    const groupName = document.getElementById('bulk-assign-group').value;
    console.log('Selected group from dropdown:', groupName);
    
    if (!groupName) {
        showNotification('Please select a group', 'error');
        return;
    }
    
    const checkboxes = document.querySelectorAll('.database-assign-checkbox:checked');
    console.log('Number of checked boxes:', checkboxes.length);
    
    if (checkboxes.length === 0) {
        showNotification('Please select at least one database', 'error');
        return;
    }
    
    let assignedCount = 0;
    checkboxes.forEach((checkbox, index) => {
        // Try both camelCase and kebab-case for data attribute
        const dbId = checkbox.dataset.dbId || checkbox.getAttribute('data-db-id');
        console.log(`Checkbox ${index + 1}: dbId = ${dbId}, dataset:`, checkbox.dataset);
        const database = databaseManager.databases.find(db => db.id === dbId);
        
        if (database) {
            const oldGroup = database.group;
            database.group = groupName === 'Ungrouped' ? '' : groupName;
            console.log(`  - ${database.name}: "${oldGroup}" -> "${database.group}"`);
            assignedCount++;
        } else {
            console.error(`  - Database not found for ID: ${dbId}`);
        }
    });
    
    console.log(`Total assigned: ${assignedCount}`);
    
    databaseManager.saveDatabases();
    console.log('Databases saved to localStorage');
    
    // Re-apply filters to update filteredDatabases array
    databaseManager.filterDatabases();
    console.log('Filters re-applied to update filteredDatabases');
    
    // Update UI
    renderGroupsList();
    console.log('Groups list updated');
    renderDatabaseAssignList();
    console.log('Assignment list re-rendered (databases may disappear if filters are active)');
    databaseManager.renderDatabases();
    console.log('Main database view updated');
    
    // Clear selections
    document.querySelectorAll('.database-assign-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('bulk-assign-group').value = '';
    
    // Check if filters are active
    const filtersActive = hasActiveFilters();
    const message = `${assignedCount} database${assignedCount !== 1 ? 's' : ''} assigned to ${groupName}` +
                   (filtersActive ? ' (databases may have moved due to active filters)' : '');
    
    showNotification(message, 'success');
    console.log('=== bulkAssignToGroup complete ===');
}

// Initialize groups on page load
document.addEventListener('DOMContentLoaded', () => {
    populateGroupDropdowns();
});
