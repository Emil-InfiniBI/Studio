/**
 * Microsoft Fabric Integration Module
 * Connects to Power BI/Fabric APIs to discover and visualize architecture
 */

class FabricIntegration {
    constructor() {
        this.baseUrl = AZURE_CONFIG.POWER_BI_API.BASE_URL;
        this.workspaceName = AZURE_CONFIG.WORKSPACE.NAME;
        this.workspaceId = null;
        this.accessToken = null;
        this.msalInstance = null;
        this.items = new Map();
        this.isAuthenticated = false;
        
        this.initializeMSAL();
    }

    /**
     * Initialize Microsoft Authentication Library (MSAL)
     */
    initializeMSAL() {
        // Check if MSAL library is loaded
        if (typeof msal === 'undefined') {
            console.error('❌ MSAL library not loaded');
            return false;
        }

        // Validate Azure configuration
        const configValidation = validateAzureConfig();
        if (!configValidation.isValid) {
            console.warn('⚠️ Azure configuration incomplete. Missing:', configValidation.missingConfig.join(', '));
            this.showConfigurationHelp(configValidation.missingConfig);
            return false;
        }

        try {
            // MSAL configuration
            const msalConfig = {
                auth: {
                    clientId: AZURE_CONFIG.CLIENT_ID,
                    authority: `https://login.microsoftonline.com/${AZURE_CONFIG.TENANT_ID}`,
                    redirectUri: AZURE_CONFIG.REDIRECT_URI,
                    navigateToLoginRequestUrl: false
                },
                cache: {
                    cacheLocation: 'localStorage',
                    storeAuthStateInCookie: false
                },
                system: {
                    allowNativeBroker: false
                }
            };

            this.msalInstance = new msal.PublicClientApplication(msalConfig);
            
            // Handle redirect promise for returning from Azure login
            this.msalInstance.handleRedirectPromise()
                .then(response => {
                    if (response) {
                        console.log('✅ Authentication successful:', response);
                        this.handleAuthSuccess(response);
                    }
                })
                .catch(error => {
                    console.error('❌ Authentication error:', error);
                    this.showErrorNotification('Authentication failed: ' + error.message);
                });

            console.log('🔐 MSAL initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ MSAL initialization failed:', error);
            this.showConfigurationError(error.message);
            return false;
        }
    }

    /**
     * Show configuration help to user
     */
    showConfigurationHelp(missingConfig) {
        const helpModal = document.createElement('div');
        helpModal.className = 'fabric-auth-modal';
        helpModal.innerHTML = `
            <div class="auth-modal-content">
                <div class="auth-header" style="background: #dc3545;">
                    <h3><i class="fas fa-exclamation-triangle"></i> Configuration Required</h3>
                </div>
                <div class="auth-body">
                    <p><strong>Azure App Registration setup is required before connecting to Fabric.</strong></p>
                    <p>Missing configuration:</p>
                    <ul class="missing-config">
                        ${missingConfig.map(item => `<li><code>${item}</code></li>`).join('')}
                    </ul>
                    <p>Please follow these steps:</p>
                    <ol class="setup-steps">
                        <li>Complete the Azure App Registration setup</li>
                        <li>Update <code>azure-config.js</code> with your Client ID and Tenant ID</li>
                        <li>Refresh the page and try connecting again</li>
                    </ol>
                </div>
                <div class="auth-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.fabric-auth-modal').remove()">
                        Close
                    </button>
                    <button class="btn btn-primary" onclick="fabricIntegration.openSetupGuide()">
                        <i class="fas fa-external-link-alt"></i> View Setup Guide
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(helpModal);
    }

    /**
     * Open setup guide
     */
    openSetupGuide() {
        const setupGuideUrl = './SETUP_AZURE_APP.md';
        window.open(setupGuideUrl, '_blank');
        
        // Also show instructions in console
        console.log(`
🚀 SETUP INSTRUCTIONS:

1. Follow the guide in SETUP_AZURE_APP.md
2. Update azure-config.js with:
   - CLIENT_ID: Your Azure App Registration Client ID
   - TENANT_ID: Your Azure App Registration Tenant ID
3. Refresh the page

Current configuration status:
${JSON.stringify(validateAzureConfig(), null, 2)}
        `);
    }

    /**
     * Authenticate user with Microsoft
     */
    async authenticate() {
        if (!this.msalInstance) {
            this.showConfigurationHelp(['CLIENT_ID', 'TENANT_ID']);
            return false;
        }

        try {
            // Check if user is already signed in
            const accounts = this.msalInstance.getAllAccounts();
            
            if (accounts.length > 0) {
                console.log('� User already signed in:', accounts[0]);
                await this.acquireTokenSilent();
                return true;
            }

            // Show authentication modal first
            this.showAuthenticationUI();
            
            return true;
        } catch (error) {
            console.error('❌ Authentication error:', error);
            this.showErrorNotification('Authentication failed: ' + error.message);
            return false;
        }
    }

    /**
     * Perform the actual login with popup
     */
    async performLogin() {
        const authModal = document.querySelector('.fabric-auth-modal');
        if (authModal) authModal.remove();

        this.showConnectingState();

        try {
            const loginRequest = {
                scopes: AZURE_CONFIG.POWER_BI_API.SCOPES,
                prompt: 'select_account'
            };

            console.log('🔐 Starting login with scopes:', loginRequest.scopes);
            
            // Use popup login
            const response = await this.msalInstance.loginPopup(loginRequest);
            
            console.log('✅ Login successful:', response);
            await this.handleAuthSuccess(response);
            
        } catch (error) {
            console.error('❌ Login failed:', error);
            this.showErrorNotification('Login failed: ' + error.message);
            
            const connectingNotif = document.getElementById('fabric-connecting');
            if (connectingNotif) connectingNotif.remove();
        }
    }

    /**
     * Acquire token silently for existing session
     */
    async acquireTokenSilent() {
        try {
            const accounts = this.msalInstance.getAllAccounts();
            
            const silentRequest = {
                scopes: AZURE_CONFIG.POWER_BI_API.SCOPES,
                account: accounts[0]
            };

            const response = await this.msalInstance.acquireTokenSilent(silentRequest);
            console.log('🔑 Token acquired silently:', response);
            
            await this.handleAuthSuccess(response);
            
        } catch (error) {
            console.error('❌ Silent token acquisition failed:', error);
            
            // Fall back to interactive login
            await this.performLogin();
        }
    }

    /**
     * Handle successful authentication
     */
    async handleAuthSuccess(response) {
        this.accessToken = response.accessToken;
        this.isAuthenticated = true;
        
        console.log('🎉 Authentication successful!');
        console.log('Token expires at:', new Date(response.expiresOn));
        
        try {
            await this.discoverWorkspace();
            await this.loadWorkspaceItems();
            this.showSuccessNotification();
        } catch (error) {
            console.error('❌ Workspace discovery failed:', error);
            this.showErrorNotification('Failed to discover workspace: ' + error.message);
        }
        
        const connectingNotif = document.getElementById('fabric-connecting');
        if (connectingNotif) connectingNotif.remove();
    }

    /**
     * Show authentication UI to user
     */
    showAuthenticationUI() {
        const authModal = document.createElement('div');
        authModal.className = 'fabric-auth-modal';
        authModal.innerHTML = `
            <div class="auth-modal-content">
                <div class="auth-header">
                    <h3><i class="fab fa-microsoft"></i> Connect to Microsoft Fabric</h3>
                </div>
                <div class="auth-body">
                    <p>To automatically discover your Fabric architecture, we need to connect to:</p>
                    <div class="workspace-info">
                        <i class="fas fa-database"></i>
                        <strong>${this.workspaceName}</strong> workspace
                    </div>
                    <p class="auth-note">This will allow the tool to:</p>
                    <ul class="auth-permissions">
                        <li><i class="fas fa-check"></i> Discover data sources and warehouses</li>
                        <li><i class="fas fa-check"></i> Find notebooks and pipelines</li>
                        <li><i class="fas fa-check"></i> Map semantic models and reports</li>
                        <li><i class="fas fa-check"></i> Visualize data lineage</li>
                    </ul>
                </div>
                <div class="auth-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.fabric-auth-modal').remove()">
                        Cancel
                    </button>
                    <button class="btn btn-primary" onclick="fabricIntegration.performLogin()">
                        <i class="fab fa-microsoft"></i> Sign in with Microsoft
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(authModal);
    }

    /**
     * Show connecting state UI
     */
    showConnectingState() {
        const notification = document.createElement('div');
        notification.id = 'fabric-connecting';
        notification.className = 'fabric-notification connecting';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Connecting to Microsoft Fabric...</span>
            </div>
        `;
        document.body.appendChild(notification);
    }

    /**
     * Discover workspace details using real API
     */
    async discoverWorkspace() {
        console.log('🔍 Discovering workspace:', this.workspaceName);
        
        try {
            const response = await fetch(`${this.baseUrl}/groups?$filter=name eq '${this.workspaceName}'`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('🎯 Workspace API response:', data);

            if (data.value && data.value.length > 0) {
                this.workspaceId = data.value[0].id;
                console.log('✅ Workspace found:', this.workspaceId);
            } else {
                throw new Error(`Workspace '${this.workspaceName}' not found or no access`);
            }
        } catch (error) {
            console.error('❌ Workspace discovery failed:', error);
            throw error;
        }
    }

    /**
     * Load all items from the workspace using real API calls
     */
    async loadWorkspaceItems() {
        if (!this.workspaceId) {
            throw new Error('Workspace ID not available');
        }

        console.log('📊 Loading workspace items...');
        
        try {
            // Load different types of items in parallel
            const [datasets, reports, dashboards] = await Promise.all([
                this.loadDatasets(),
                this.loadReports(),
                this.loadDashboards()
            ]);

            console.log('✅ Loaded items:', {
                datasets: datasets.length,
                reports: reports.length,
                dashboards: dashboards.length
            });

            // Try to load Fabric-specific items if available
            try {
                const fabricItems = await this.loadFabricItems();
                console.log('✅ Loaded Fabric items:', fabricItems.length);
            } catch (fabricError) {
                console.warn('⚠️ Fabric API not available, using Power BI items only:', fabricError.message);
            }

            // Auto-populate canvas
            await this.populateCanvas();
        } catch (error) {
            console.error('❌ Failed to load workspace items:', error);
            throw error;
        }
    }

    /**
     * Load datasets from workspace
     */
    async loadDatasets() {
        try {
            const response = await fetch(`${this.baseUrl}/groups/${this.workspaceId}/datasets`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            data.value?.forEach(dataset => {
                this.items.set(dataset.id, {
                    id: dataset.id,
                    name: dataset.name,
                    type: 'Dataset',
                    description: `Dataset: ${dataset.name}`
                });
            });

            return data.value || [];
        } catch (error) {
            console.error('❌ Failed to load datasets:', error);
            return [];
        }
    }

    /**
     * Load reports from workspace
     */
    async loadReports() {
        try {
            const response = await fetch(`${this.baseUrl}/groups/${this.workspaceId}/reports`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            data.value?.forEach(report => {
                this.items.set(report.id, {
                    id: report.id,
                    name: report.name,
                    type: 'Report',
                    description: `Report: ${report.name}`
                });
            });

            return data.value || [];
        } catch (error) {
            console.error('❌ Failed to load reports:', error);
            return [];
        }
    }

    /**
     * Load dashboards from workspace
     */
    async loadDashboards() {
        try {
            const response = await fetch(`${this.baseUrl}/groups/${this.workspaceId}/dashboards`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            data.value?.forEach(dashboard => {
                this.items.set(dashboard.id, {
                    id: dashboard.id,
                    name: dashboard.name,
                    type: 'Dashboard',
                    description: `Dashboard: ${dashboard.name}`
                });
            });

            return data.value || [];
        } catch (error) {
            console.error('❌ Failed to load dashboards:', error);
            return [];
        }
    }

    /**
     * Load Fabric-specific items (Lakehouses, Warehouses, etc.)
     */
    async loadFabricItems() {
        try {
            const fabricUrl = `${AZURE_CONFIG.FABRIC_API.BASE_URL}/workspaces/${this.workspaceId}/items`;
            
            const response = await fetch(fabricUrl, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Fabric API not available: HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            data.value?.forEach(item => {
                this.items.set(item.id, {
                    id: item.id,
                    name: item.displayName || item.name,
                    type: item.type,
                    description: `${item.type}: ${item.displayName || item.name}`
                });
            });

            return data.value || [];
        } catch (error) {
            // Fabric API might not be available yet, this is expected
            throw error;
        }
    }

    /**
     * Populate the canvas with discovered items
     */
    async populateCanvas() {
        console.log('🎨 Populating canvas with Fabric items...');
        
        if (!window.playground) {
            console.warn('⚠️ Playground not available, items stored for later');
            return;
        }

        // Clear existing auto-generated items
        this.clearAutoGeneratedItems();

        // Convert Fabric items to canvas items
        const itemPositions = this.calculateItemPositions();
        
        for (const [id, item] of this.items.entries()) {
            const canvasType = this.getCanvasTypeForFabricItem(item.type);
            const position = itemPositions[id];
            
            // Add item to canvas
            const canvasItem = playground.addCanvasItem(canvasType, position.x, position.y);
            
            // Update item name and metadata
            if (canvasItem) {
                const titleElement = canvasItem.querySelector('.canvas-item-title');
                if (titleElement) {
                    titleElement.textContent = item.name;
                }
                
                // Add Fabric metadata
                canvasItem.dataset.fabricId = item.id;
                canvasItem.dataset.fabricType = item.type;
                canvasItem.classList.add('fabric-generated');
            }
        }

        console.log('✅ Canvas populated with Fabric items');
    }

    /**
     * Map Fabric item types to canvas item types
     */
    getCanvasTypeForFabricItem(fabricType) {
        const typeMapping = {
            'Lakehouse': 'data-source',
            'Warehouse': 'warehouse', 
            'Notebook': 'notebook',
            'SemanticModel': 'semantic-model',
            'Report': 'report',
            'Dashboard': 'dashboard',
            'DataflowGen2': 'dataflow',
            'Pipeline': 'pipeline'
        };
        
        return typeMapping[fabricType] || 'data-source';
    }

    /**
     * Calculate optimal positions for items
     */
    calculateItemPositions() {
        const positions = {};
        let x = 100, y = 100;
        const spacing = 180;
        
        for (const [id, item] of this.items.entries()) {
            positions[id] = { x, y };
            
            y += spacing;
            if (y > 600) {
                y = 100;
                x += 200;
            }
        }
        
        return positions;
    }

    /**
     * Clear auto-generated items from previous sync
     */
    clearAutoGeneratedItems() {
        const fabricItems = document.querySelectorAll('.fabric-generated');
        fabricItems.forEach(item => item.remove());
    }

    /**
     * Show success notification
     */
    showSuccessNotification() {
        const connectingNotif = document.getElementById('fabric-connecting');
        if (connectingNotif) connectingNotif.remove();

        const notification = document.createElement('div');
        notification.className = 'fabric-notification success';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-check-circle"></i>
                <span>Successfully connected to Microsoft Fabric!</span>
                <div class="notification-details">
                    Found ${this.items.size} items in DataEngineeringProd workspace
                </div>
            </div>
        `;
        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => notification.remove(), 5000);
    }

    /**
     * Show error notification
     */
    showErrorNotification(message) {
        const connectingNotif = document.getElementById('fabric-connecting');
        if (connectingNotif) connectingNotif.remove();

        const notification = document.createElement('div');
        notification.className = 'fabric-notification error';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-exclamation-circle"></i>
                <span>Connection failed: ${message}</span>
                <button class="retry-btn" onclick="fabricIntegration.connectToFabric()">
                    Retry
                </button>
            </div>
        `;
        document.body.appendChild(notification);
    }
}

// Initialize Fabric integration
window.fabricIntegration = new FabricIntegration();

// Add connect button to header when page loads
document.addEventListener('DOMContentLoaded', () => {
    addFabricConnectButton();
});

/**
 * Add Fabric connect button to the header
 */
function addFabricConnectButton() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    const connectBtn = document.createElement('button');
    connectBtn.className = 'btn btn-primary fabric-connect-btn';
    connectBtn.innerHTML = `
        <i class="fab fa-microsoft"></i> Connect to Fabric
    `;
    connectBtn.onclick = () => fabricIntegration.authenticate();

    // Insert before the export button
    const exportBtn = headerActions.querySelector('.btn.btn-primary');
    if (exportBtn) {
        headerActions.insertBefore(connectBtn, exportBtn);
    } else {
        headerActions.appendChild(connectBtn);
    }
}