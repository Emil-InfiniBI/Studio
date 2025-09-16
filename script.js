// BI Data Source Mapping Tool - Application Logic

class BIDataMapper {
    constructor() {
        this.currentProject = {
            customer: {
                name: '',
                industry: '',
                size: '',
                description: '',
                stakeholders: []
            },
            datasources: [],
            connections: [],
            security: {},
            requirements: {},
            proposal: null,
            processingMethod: 'pipeline', // Default to pipeline
            connectedSources: [] // Track manually connected sources
        };
        
        this.currentTutorialStep = 1;
        this.connections = []; // Array to store connection lines
        this.connectionMode = false; // Toggle for connection mode
        this.selectedSource = null; // Currently selected data source
        this.selectedItem = null; // Currently selected canvas item
        this.dragUpdateTimeout = null; // Add timeout management for smooth dragging
        this.boundariesFixed = false; // Prevent multiple boundary fixes
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupFabricDragAndDrop();
        this.loadProject();
        this.updateOverview();
        this.initializeTheme();
        this.initializeProcessingMethod();
        this.initializeConnectionLayer();
        
        // Fix any existing canvas items on initialization (only once)
        if (!this.boundariesFixed) {
            setTimeout(() => {
                this.applySmartBoundariesToAllItems();
                this.boundariesFixed = true;
            }, 1000);
        }
    }

    initializeTheme() {
        // Load saved theme or default to light
        const savedTheme = localStorage.getItem('bi-mapping-theme') || 'light';
        this.setTheme(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update theme icon
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        // Save theme preference
        localStorage.setItem('bi-mapping-theme', theme);
        
        // Update notification
        const themeLabel = theme === 'dark' ? 'Dark' : 'Light';
        this.showNotification(`Switched to ${themeLabel} mode`, 'success');
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.goToSection(section);
            });
        });
    }

    setupEventListeners() {
        // Customer form listeners
        const customerName = document.getElementById('customer-name');
        const customerIndustry = document.getElementById('customer-industry');
        const customerSize = document.getElementById('customer-size');
        const projectDescription = document.getElementById('project-description');

        [customerName, customerIndustry, customerSize, projectDescription].forEach(element => {
            if (element) {
                element.addEventListener('change', () => this.saveCustomerInfo());
            }
        });

        // Auto-save functionality
        setInterval(() => this.saveProject(), 30000); // Auto-save every 30 seconds
    }

    initializeProcessingMethod() {
        // Set default processing method
        const method = this.currentProject.processingMethod || 'pipeline';
        this.selectProcessingMethod(method);
    }

    selectProcessingMethod(method) {
        this.currentProject.processingMethod = method;
        
        // Update UI - new button structure
        document.querySelectorAll('.method-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const selectedBtn = document.getElementById(`${method}-btn`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
        }
        
        // Re-render transform items with selected method
        this.renderTransformItems();
        
        // Show notification
        const methodLabel = method === 'pipeline' ? 'Pipeline' : 'Notebook';
        this.showNotification(`Processing method set to ${methodLabel}`, 'success');
        
        // Save project
        this.saveProject();
    }

    renderTransformItems() {
        const container = document.getElementById('transform-items');
        if (!container) return;

        const processingMethod = this.currentProject.processingMethod || 'pipeline';
        const connectedSources = this.currentProject.connectedSources || [];
        const datasources = this.currentProject.datasources || [];
        
        // Show processing items for connected sources or all sources if none manually connected
        const sourcesToShow = connectedSources.length > 0 
            ? datasources.filter(ds => connectedSources.includes(ds.id))
            : datasources;
        
        if (sourcesToShow.length === 0) {
            container.innerHTML = '<p style="font-size: 12px; color: var(--text-secondary); text-align: center; margin: 0;">No data sources to transform</p>';
            return;
        }

        const methodIcon = processingMethod === 'pipeline' ? 'fas fa-sitemap' : 'fas fa-code';
        const methodLabel = processingMethod === 'pipeline' ? 'Pipeline' : 'Notebook';

        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px;">
                <i class="${methodIcon}" style="color: #00BCF2; font-size: 18px;"></i>
                <div>
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${methodLabel}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${sourcesToShow.length} source(s) connected</div>
                </div>
            </div>
        `;
    }

    setupDragAndDrop() {
        // Set up drop zone - updated ID
        const dropArea = document.getElementById('main-drop-zone');
        if (!dropArea) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => this.highlight(dropArea), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => this.unhighlight(dropArea), false);
        });

        dropArea.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    highlight(element) {
        element.style.borderColor = '#00BCF2';
        element.style.background = 'rgba(0, 188, 242, 0.1)';
    }

    unhighlight(element) {
        element.style.borderColor = '';
        element.style.background = '';
    }

    updateDropArea() {
        const dropArea = document.getElementById('main-drop-zone');
        
        if (!dropArea) return;

        const connectedCount = this.currentProject.connectedSources.length;
        
        if (connectedCount > 0) {
            dropArea.innerHTML = `
                <i class="fas fa-check-circle" style="font-size: 24px; color: #00BCF2; margin-bottom: 8px;"></i>
                <p style="font-size: 14px; color: var(--text-primary); margin: 0; font-weight: 600;">${connectedCount} source(s) connected</p>
            `;
        } else {
            dropArea.innerHTML = `
                <i class="fas fa-plus-circle"></i>
                <p>Drop data sources here</p>
            `;
        }
    }

    updateSourceCount() {
        const countElement = document.getElementById('source-count');
        if (countElement) {
            countElement.textContent = this.currentProject.datasources.length;
        }
    }

    resetConnections() {
        this.currentProject.connectedSources = [];
        this.renderPlaygroundDataSources();
        this.updateDropArea();
        this.renderTransformItems();
        this.showNotification('All connections reset', 'info');
        this.saveProject();
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const dataSourceId = e.dataTransfer.getData('text/plain');
        if (dataSourceId) {
            this.connectDataSource(dataSourceId);
        }
    }

    connectDataSource(sourceId) {
        const datasource = this.currentProject.datasources.find(ds => ds.id === sourceId);
        if (!datasource) return;

        // Add to connected sources if not already connected
        if (!this.currentProject.connectedSources.includes(sourceId)) {
            this.currentProject.connectedSources.push(sourceId);
            
            // Update UI
            this.updateDropArea();
            this.renderPlaygroundDataSources();
            this.renderTransformItems();
            
            this.showNotification(`Connected ${datasource.name} to Fabric`, 'success');
            this.saveProject();
        }
    }

    renderArchitectureInsights() {
        const container = document.getElementById('architecture-insights');
        if (!container) return;

        const datasources = this.currentProject.datasources || [];
        const connectedSources = this.currentProject.connectedSources || [];
        
        if (datasources.length === 0) {
            container.innerHTML = '<p style="font-size: 14px; color: var(--text-secondary); text-align: center;">Add data sources to see architecture insights</p>';
            return;
        }

        const insights = [
            {
                title: 'Data Source Diversity',
                value: `${new Set(datasources.map(ds => ds.type)).size} different types`,
                icon: 'fas fa-puzzle-piece',
                color: '#00BCF2'
            },
            {
                title: 'Connection Status',
                value: `${connectedSources.length}/${datasources.length} connected`,
                icon: 'fas fa-link',
                color: '#217346'
            },
            {
                title: 'Processing Method',
                value: this.currentProject.processingMethod || 'Pipeline',
                icon: this.currentProject.processingMethod === 'notebook' ? 'fas fa-code' : 'fas fa-sitemap',
                color: '#6A5ACD'
            }
        ];

        container.innerHTML = insights.map(insight => `
            <div style="padding: 16px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary);">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <i class="${insight.icon}" style="color: ${insight.color}; font-size: 18px;"></i>
                    <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">${insight.title}</h4>
                </div>
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${insight.color};">${insight.value}</p>
            </div>
        `).join('');
    }

    goToSection(sectionName) {
        console.log(`Navigating to section: ${sectionName}`);
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const navItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (navItem) {
            navItem.classList.add('active');
        } else {
            console.error(`Navigation item not found for section: ${sectionName}`);
        }

        // Show section
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            console.log(`Section ${sectionName}-section is now active`);
        } else {
            console.error(`Section not found: ${sectionName}-section`);
        }

        // Update overview if returning to overview
        if (sectionName === 'overview') {
            this.updateOverview();
        }
        
        // Render connections when navigating to connections section
        if (sectionName === 'connections') {
            this.renderConnections();
        }
        
        // Render playground when navigating to playground section
        if (sectionName === 'playground') {
            console.log('Initializing playground...');
            this.renderPlayground();
        }
    }

    // Customer Management
    saveCustomerInfo() {
        this.currentProject.customer = {
            name: document.getElementById('customer-name')?.value || '',
            industry: document.getElementById('customer-industry')?.value || '',
            size: document.getElementById('customer-size')?.value || '',
            description: document.getElementById('project-description')?.value || '',
            stakeholders: this.currentProject.customer.stakeholders
        };
        this.updateOverview();
    }

    addStakeholder() {
        const modal = this.createStakeholderModal();
        document.body.appendChild(modal);
        modal.classList.add('active');
    }

    createStakeholderModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Stakeholder</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="stakeholder-name">Name</label>
                        <input type="text" id="stakeholder-name" placeholder="Enter stakeholder name">
                    </div>
                    <div class="form-group">
                        <label for="stakeholder-role">Role</label>
                        <input type="text" id="stakeholder-role" placeholder="Enter role/title">
                    </div>
                    <div class="form-group">
                        <label for="stakeholder-department">Department</label>
                        <select id="stakeholder-department">
                            <option value="">Select department</option>
                            <option value="IT">IT</option>
                            <option value="Finance">Finance</option>
                            <option value="Operations">Operations</option>
                            <option value="Sales">Sales</option>
                            <option value="Marketing">Marketing</option>
                            <option value="HR">Human Resources</option>
                            <option value="Executive">Executive</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="stakeholder-influence">Influence Level</label>
                        <select id="stakeholder-influence">
                            <option value="">Select influence level</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button class="btn btn-primary" onclick="app.saveStakeholder(this.closest('.modal'))">Add Stakeholder</button>
                    </div>
                </div>
            </div>
        `;
        return modal;
    }

    saveStakeholder(modal) {
        const name = modal.querySelector('#stakeholder-name').value;
        const role = modal.querySelector('#stakeholder-role').value;
        const department = modal.querySelector('#stakeholder-department').value;
        const influence = modal.querySelector('#stakeholder-influence').value;

        if (!name || !role) {
            alert('Please fill in required fields (Name and Role)');
            return;
        }

        const stakeholder = {
            id: Date.now(),
            name,
            role,
            department,
            influence
        };

        this.currentProject.customer.stakeholders.push(stakeholder);
        this.renderStakeholders();
        modal.remove();
    }

    renderStakeholders() {
        const container = document.getElementById('stakeholders-list');
        if (!container) return;

        container.innerHTML = '';
        
        this.currentProject.customer.stakeholders.forEach(stakeholder => {
            const stakeholderDiv = document.createElement('div');
            stakeholderDiv.className = 'stakeholder-item';
            stakeholderDiv.innerHTML = `
                <div class="stakeholder-info">
                    <h4>${stakeholder.name}</h4>
                    <p>${stakeholder.role} - ${stakeholder.department} (${stakeholder.influence} influence)</p>
                </div>
                <button class="btn btn-danger" onclick="app.removeStakeholder(${stakeholder.id})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            container.appendChild(stakeholderDiv);
        });
    }

    removeStakeholder(id) {
        this.currentProject.customer.stakeholders = this.currentProject.customer.stakeholders.filter(s => s.id !== id);
        this.renderStakeholders();
    }

    // Data Source Management
    addDataSource() {
        const modal = this.createDataSourceModal();
        document.body.appendChild(modal);
        modal.classList.add('active');
    }

    createDataSourceModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Data Source</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="ds-name">Data Source Name *</label>
                        <input type="text" id="ds-name" placeholder="Enter data source name">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="ds-type">Type *</label>
                            <select id="ds-type">
                                <option value="">Select type</option>
                                <option value="SQL Server">SQL Server</option>
                                <option value="Oracle">Oracle Database</option>
                                <option value="MySQL">MySQL</option>
                                <option value="PostgreSQL">PostgreSQL</option>
                                <option value="Azure SQL">Azure SQL Database</option>
                                <option value="Excel">Excel Files</option>
                                <option value="CSV">CSV Files</option>
                                <option value="SharePoint">SharePoint</option>
                                <option value="Dynamics 365">Dynamics 365</option>
                                <option value="Salesforce">Salesforce</option>
                                <option value="SAP">SAP</option>
                                <option value="API">REST API</option>
                                <option value="Azure Blob">Azure Blob Storage</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="ds-location">Location</label>
                            <select id="ds-location">
                                <option value="">Select location</option>
                                <option value="On-Premises">On-Premises</option>
                                <option value="Cloud">Cloud</option>
                                <option value="Hybrid">Hybrid</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="ds-description">Description</label>
                        <textarea id="ds-description" rows="3" placeholder="Describe the data source purpose and content"></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="ds-size">Data Volume</label>
                            <select id="ds-size">
                                <option value="">Select size</option>
                                <option value="Small (< 1GB)">Small (< 1GB)</option>
                                <option value="Medium (1-100GB)">Medium (1-100GB)</option>
                                <option value="Large (100GB-1TB)">Large (100GB-1TB)</option>
                                <option value="Very Large (> 1TB)">Very Large (> 1TB)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="ds-frequency">Update Frequency</label>
                            <select id="ds-frequency">
                                <option value="">Select frequency</option>
                                <option value="Real-time">Real-time</option>
                                <option value="Hourly">Hourly</option>
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Monthly">Monthly</option>
                                <option value="On-demand">On-demand</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="ds-criticality">Business Criticality</label>
                            <select id="ds-criticality">
                                <option value="">Select criticality</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="ds-owner">Data Owner</label>
                            <input type="text" id="ds-owner" placeholder="Enter data owner/contact">
                        </div>
                    </div>
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button class="btn btn-primary" onclick="app.saveDataSource(this.closest('.modal'))">Add Data Source</button>
                    </div>
                </div>
            </div>
        `;
        return modal;
    }

    saveDataSource(modal) {
        const name = modal.querySelector('#ds-name').value;
        const type = modal.querySelector('#ds-type').value;
        const location = modal.querySelector('#ds-location').value;
        const description = modal.querySelector('#ds-description').value;
        const size = modal.querySelector('#ds-size').value;
        const frequency = modal.querySelector('#ds-frequency').value;
        const criticality = modal.querySelector('#ds-criticality').value;
        const owner = modal.querySelector('#ds-owner').value;

        if (!name || !type) {
            alert('Please fill in required fields (Name and Type)');
            return;
        }

        const dataSource = {
            id: Date.now(),
            name,
            type,
            location,
            description,
            size,
            frequency,
            criticality,
            owner,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        this.currentProject.datasources.push(dataSource);
        this.renderDataSources();
        this.updateOverview();
        
        // Refresh playground if it's currently active
        if (document.getElementById('playground-section').classList.contains('active')) {
            this.renderPlayground();
        }
        
        modal.remove();
    }

    renderDataSources() {
        const container = document.getElementById('data-sources-grid');
        if (!container) return;

        container.innerHTML = '';
        
        this.currentProject.datasources.forEach(dataSource => {
            const card = document.createElement('div');
            card.className = 'data-source-card fade-in';
            card.innerHTML = `
                <div class="data-source-header">
                    <div class="data-source-icon">
                        <i class="${this.getDataSourceIcon(dataSource.type)}"></i>
                    </div>
                    <div class="data-source-title">
                        <h3>${dataSource.name}</h3>
                        <p>${dataSource.type} - ${dataSource.location || 'Unknown'}</p>
                    </div>
                    <div class="data-source-actions">
                        <button class="btn btn-secondary" onclick="app.editDataSource(${dataSource.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="app.removeDataSource(${dataSource.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="data-source-details">
                    <div class="detail-row">
                        <span class="detail-label">Size:</span>
                        <span class="detail-value">${dataSource.size || 'Unknown'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Update Frequency:</span>
                        <span class="detail-value">${dataSource.frequency || 'Unknown'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Criticality:</span>
                        <span class="detail-value">${dataSource.criticality || 'Unknown'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Owner:</span>
                        <span class="detail-value">${dataSource.owner || 'Unknown'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Status:</span>
                        <span class="status-badge ${dataSource.status}">${dataSource.status}</span>
                    </div>
                </div>
                ${dataSource.description ? `<p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.875rem;">${dataSource.description}</p>` : ''}
            `;
            container.appendChild(card);
        });
    }

    getDataSourceIcon(type) {
        const icons = {
            'SQL Server': 'fas fa-database',
            'Oracle': 'fas fa-database',
            'MySQL': 'fas fa-database',
            'PostgreSQL': 'fas fa-database',
            'Azure SQL': 'fas fa-cloud',
            'Excel': 'fas fa-file-excel',
            'CSV': 'fas fa-file-csv',
            'SharePoint': 'fas fa-sharepoint',
            'Dynamics 365': 'fas fa-chart-line',
            'Salesforce': 'fas fa-cloud',
            'SAP': 'fas fa-industry',
            'API': 'fas fa-plug',
            'Azure Blob': 'fas fa-cloud'
        };
        return icons[type] || 'fas fa-database';
    }

    removeDataSource(id) {
        if (confirm('Are you sure you want to remove this data source?')) {
            this.currentProject.datasources = this.currentProject.datasources.filter(ds => ds.id !== id);
            this.renderDataSources();
            this.updateOverview();
            
            // Refresh playground if it's currently active
            if (document.getElementById('playground-section').classList.contains('active')) {
                this.renderPlayground();
            }
        }
    }

    editDataSource(id) {
        const dataSource = this.currentProject.datasources.find(ds => ds.id === id);
        if (!dataSource) return;

        const modal = this.createDataSourceModal();
        document.body.appendChild(modal);
        modal.classList.add('active');

        // Populate form with existing data
        modal.querySelector('#ds-name').value = dataSource.name;
        modal.querySelector('#ds-type').value = dataSource.type;
        modal.querySelector('#ds-location').value = dataSource.location;
        modal.querySelector('#ds-description').value = dataSource.description;
        modal.querySelector('#ds-size').value = dataSource.size;
        modal.querySelector('#ds-frequency').value = dataSource.frequency;
        modal.querySelector('#ds-criticality').value = dataSource.criticality;
        modal.querySelector('#ds-owner').value = dataSource.owner;

        // Change save button to update
        const saveBtn = modal.querySelector('.btn-primary');
        saveBtn.textContent = 'Update Data Source';
        saveBtn.onclick = () => this.updateDataSource(modal, id);
    }

    updateDataSource(modal, id) {
        const index = this.currentProject.datasources.findIndex(ds => ds.id === id);
        if (index === -1) return;

        const name = modal.querySelector('#ds-name').value;
        const type = modal.querySelector('#ds-type').value;

        if (!name || !type) {
            alert('Please fill in required fields (Name and Type)');
            return;
        }

        this.currentProject.datasources[index] = {
            ...this.currentProject.datasources[index],
            name,
            type,
            location: modal.querySelector('#ds-location').value,
            description: modal.querySelector('#ds-description').value,
            size: modal.querySelector('#ds-size').value,
            frequency: modal.querySelector('#ds-frequency').value,
            criticality: modal.querySelector('#ds-criticality').value,
            owner: modal.querySelector('#ds-owner').value,
            updatedAt: new Date().toISOString()
        };

        this.renderDataSources();
        this.updateOverview();
        modal.remove();
    }

    // Overview Updates
    updateOverview() {
        // Update customer status
        const customerStatus = document.getElementById('customer-status');
        if (customerStatus) {
            const hasCustomerInfo = this.currentProject.customer.name && this.currentProject.customer.industry;
            customerStatus.textContent = hasCustomerInfo ? 'Completed' : 'Not Started';
            customerStatus.className = `card-status ${hasCustomerInfo ? 'connected' : ''}`;
        }

        // Update data sources status
        const dataSourcesStatus = document.getElementById('datasources-status');
        if (dataSourcesStatus) {
            const count = this.currentProject.datasources.length;
            dataSourcesStatus.textContent = `${count} Source${count !== 1 ? 's' : ''}`;
        }

        // Update connections status
        const connectionsStatus = document.getElementById('connections-status');
        if (connectionsStatus) {
            const hasConnections = this.currentProject.connections.length > 0;
            connectionsStatus.textContent = hasConnections ? 'Mapped' : 'Not Mapped';
        }

        // Update security status
        const securityStatus = document.getElementById('security-status');
        if (securityStatus) {
            const hasSecurityInfo = Object.keys(this.currentProject.security).length > 0;
            securityStatus.textContent = hasSecurityInfo ? 'Assessed' : 'Not Assessed';
        }
    }

    // Proposal Generation
    generateProposal() {
        const proposal = this.createProposal();
        this.currentProject.proposal = proposal;
        this.renderProposal(proposal);
        this.goToSection('proposal');
    }

    createProposal() {
        const customer = this.currentProject.customer;
        const dataSources = this.currentProject.datasources;
        
        const proposal = {
            generatedAt: new Date().toISOString(),
            customer: customer.name,
            summary: this.generateSummary(),
            dataSourcesOverview: this.generateDataSourcesOverview(),
            technicalRequirements: this.generateTechnicalRequirements(),
            implementationPlan: this.generateImplementationPlan(),
            timeline: this.generateTimeline(),
            costEstimate: this.generateCostEstimate(),
            recommendations: this.generateRecommendations()
        };

        return proposal;
    }

    generateSummary() {
        const customer = this.currentProject.customer;
        const sourceCount = this.currentProject.dataSources.length;
        
        return `This proposal outlines a comprehensive Business Intelligence implementation for ${customer.name}, a ${customer.size || 'mid-sized'} organization in the ${customer.industry || 'business'} sector. The solution will integrate ${sourceCount} data source${sourceCount !== 1 ? 's' : ''} into a unified BI platform using Microsoft Power BI and related technologies.`;
    }

    generateDataSourcesOverview() {
        return this.currentProject.dataSources.map(ds => ({
            name: ds.name,
            type: ds.type,
            complexity: this.assessComplexity(ds),
            integrationApproach: this.suggestIntegrationApproach(ds)
        }));
    }

    assessComplexity(dataSource) {
        const factors = [];
        if (dataSource.size && dataSource.size.includes('Large')) factors.push('Large volume');
        if (dataSource.frequency === 'Real-time') factors.push('Real-time requirements');
        if (dataSource.location === 'On-Premises') factors.push('On-premises connectivity');
        if (dataSource.type === 'API') factors.push('Custom API integration');
        
        return factors.length > 2 ? 'High' : factors.length > 0 ? 'Medium' : 'Low';
    }

    suggestIntegrationApproach(dataSource) {
        const approaches = {
            'SQL Server': 'Direct connection via Power BI Gateway',
            'Azure SQL': 'Direct cloud connection',
            'Excel': 'File-based import with scheduled refresh',
            'SharePoint': 'SharePoint connector with incremental refresh',
            'API': 'Custom connector or Power Query integration',
            'Oracle': 'On-premises gateway with ODBC connection'
        };
        return approaches[dataSource.type] || 'Standard connector integration';
    }

    generateTechnicalRequirements() {
        const requirements = {
            powerBI: 'Power BI Premium Per User or Premium capacity',
            gateway: this.requiresGateway() ? 'On-premises data gateway required' : 'Cloud-only deployment',
            security: 'Row-level security and Azure AD integration',
            storage: 'Azure Data Lake for data staging (if needed)',
            additional: []
        };

        if (this.hasRealTimeRequirements()) {
            requirements.additional.push('DirectQuery or composite model configuration');
        }
        
        if (this.hasLargeDataVolumes()) {
            requirements.additional.push('Premium capacity for large dataset support');
        }

        return requirements;
    }

    requiresGateway() {
        return this.currentProject.dataSources.some(ds => ds.location === 'On-Premises');
    }

    hasRealTimeRequirements() {
        return this.currentProject.dataSources.some(ds => ds.frequency === 'Real-time');
    }

    hasLargeDataVolumes() {
        return this.currentProject.dataSources.some(ds => ds.size && ds.size.includes('Large'));
    }

    generateImplementationPlan() {
        return [
            {
                phase: 'Phase 1: Foundation',
                duration: '2-3 weeks',
                tasks: [
                    'Power BI environment setup',
                    'Security configuration',
                    'Gateway installation (if required)',
                    'Initial data source connections'
                ]
            },
            {
                phase: 'Phase 2: Data Integration',
                duration: '3-4 weeks',
                tasks: [
                    'Data model development',
                    'ETL process implementation',
                    'Data quality validation',
                    'Performance optimization'
                ]
            },
            {
                phase: 'Phase 3: Reporting & Analytics',
                duration: '2-3 weeks',
                tasks: [
                    'Dashboard development',
                    'Report creation',
                    'User acceptance testing',
                    'Performance tuning'
                ]
            },
            {
                phase: 'Phase 4: Deployment & Training',
                duration: '1-2 weeks',
                tasks: [
                    'Production deployment',
                    'User training sessions',
                    'Documentation delivery',
                    'Go-live support'
                ]
            }
        ];
    }

    generateTimeline() {
        const totalWeeks = 8 + Math.floor(this.currentProject.dataSources.length / 3);
        return `Estimated total duration: ${totalWeeks} weeks from project kickoff to go-live`;
    }

    generateCostEstimate() {
        const baselineCost = 15000; // Base implementation cost
        const dataSourceCost = this.currentProject.dataSources.length * 2000;
        const complexityCost = this.calculateComplexityCost();
        
        const totalCost = baselineCost + dataSourceCost + complexityCost;
        
        return {
            implementation: `$${baselineCost.toLocaleString()} - $${(baselineCost * 1.3).toLocaleString()}`,
            licensing: 'Power BI licensing costs (separate)',
            dataIntegration: `$${dataSourceCost.toLocaleString()}`,
            total: `$${totalCost.toLocaleString()} - $${(totalCost * 1.3).toLocaleString()}`,
            note: 'Costs are estimates and may vary based on specific requirements'
        };
    }

    calculateComplexityCost() {
        let complexityCost = 0;
        this.currentProject.dataSources.forEach(ds => {
            if (this.assessComplexity(ds) === 'High') complexityCost += 5000;
            else if (this.assessComplexity(ds) === 'Medium') complexityCost += 2000;
        });
        return complexityCost;
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.hasLargeDataVolumes()) {
            recommendations.push('Consider Power BI Premium capacity for optimal performance with large datasets');
        }
        
        if (this.requiresGateway()) {
            recommendations.push('Implement clustered gateway configuration for high availability');
        }
        
        if (this.hasRealTimeRequirements()) {
            recommendations.push('Evaluate DirectQuery vs Import mode based on performance requirements');
        }
        
        recommendations.push('Implement incremental refresh for large historical datasets');
        recommendations.push('Plan for regular model optimization and maintenance');
        recommendations.push('Consider implementing automated deployment pipelines for scaling');
        
        return recommendations;
    }

    renderProposal(proposal) {
        const container = document.getElementById('proposal-preview');
        if (!container) return;

        container.innerHTML = `
            <div class="proposal-document">
                <div class="proposal-header">
                    <h1>Business Intelligence Implementation Proposal</h1>
                    <div class="proposal-meta">
                        <p><strong>Client:</strong> ${proposal.customer}</p>
                        <p><strong>Generated:</strong> ${new Date(proposal.generatedAt).toLocaleDateString()}</p>
                        <p><strong>Consultant:</strong> DataInsight Pro</p>
                    </div>
                </div>

                <div class="proposal-section">
                    <h2>Executive Summary</h2>
                    <p>${proposal.summary}</p>
                </div>

                <div class="proposal-section">
                    <h2>Data Sources Overview</h2>
                    <div class="data-sources-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Data Source</th>
                                    <th>Type</th>
                                    <th>Complexity</th>
                                    <th>Integration Approach</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${proposal.dataSourcesOverview.map(ds => `
                                    <tr>
                                        <td>${ds.name}</td>
                                        <td>${ds.type}</td>
                                        <td><span class="complexity-badge ${ds.complexity.toLowerCase()}">${ds.complexity}</span></td>
                                        <td>${ds.integrationApproach}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="proposal-section">
                    <h2>Technical Requirements</h2>
                    <ul>
                        <li><strong>Power BI Platform:</strong> ${proposal.technicalRequirements.powerBI}</li>
                        <li><strong>Connectivity:</strong> ${proposal.technicalRequirements.gateway}</li>
                        <li><strong>Security:</strong> ${proposal.technicalRequirements.security}</li>
                        <li><strong>Data Storage:</strong> ${proposal.technicalRequirements.storage}</li>
                        ${proposal.technicalRequirements.additional.map(req => `<li>${req}</li>`).join('')}
                    </ul>
                </div>

                <div class="proposal-section">
                    <h2>Implementation Plan</h2>
                    <div class="implementation-phases">
                        ${proposal.implementationPlan.map(phase => `
                            <div class="phase">
                                <h3>${phase.phase}</h3>
                                <p class="phase-duration">Duration: ${phase.duration}</p>
                                <ul>
                                    ${phase.tasks.map(task => `<li>${task}</li>`).join('')}
                                </ul>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="proposal-section">
                    <h2>Timeline</h2>
                    <p>${proposal.timeline}</p>
                </div>

                <div class="proposal-section">
                    <h2>Investment Overview</h2>
                    <div class="cost-breakdown">
                        <div class="cost-item">
                            <span class="cost-label">Implementation Services:</span>
                            <span class="cost-value">${proposal.costEstimate.implementation}</span>
                        </div>
                        <div class="cost-item">
                            <span class="cost-label">Data Integration:</span>
                            <span class="cost-value">${proposal.costEstimate.dataIntegration}</span>
                        </div>
                        <div class="cost-item">
                            <span class="cost-label">Software Licensing:</span>
                            <span class="cost-value">${proposal.costEstimate.licensing}</span>
                        </div>
                        <div class="cost-item total">
                            <span class="cost-label">Total Implementation:</span>
                            <span class="cost-value">${proposal.costEstimate.total}</span>
                        </div>
                    </div>
                    <p class="cost-note">${proposal.costEstimate.note}</p>
                </div>

                <div class="proposal-section">
                    <h2>Recommendations</h2>
                    <ul>
                        ${proposal.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>

                <div class="proposal-actions">
                    <button class="btn btn-primary" onclick="app.exportProposal()">
                        <i class="fas fa-download"></i> Export as PDF
                    </button>
                    <button class="btn btn-secondary" onclick="app.emailProposal()">
                        <i class="fas fa-envelope"></i> Email Proposal
                    </button>
                </div>
            </div>
        `;
    }

    // Project Management
    newProject() {
        if (confirm('Are you sure you want to start a new project? Any unsaved changes will be lost.')) {
            this.currentProject = {
                customer: { name: '', industry: '', size: '', description: '', stakeholders: [] },
                datasources: [],
                connections: [],
                security: {},
                requirements: {},
                proposal: null
            };
            this.loadProject();
            this.goToSection('overview');
        }
    }

    saveProject() {
        try {
            const projectData = {
                ...this.currentProject,
                savedAt: new Date().toISOString(),
                version: '1.0'
            };
            localStorage.setItem('bi-mapping-project', JSON.stringify(projectData));
            this.showNotification('Project saved successfully', 'success');
        } catch (error) {
            this.showNotification('Error saving project', 'error');
            console.error('Save error:', error);
        }
    }

    loadProject() {
        try {
            const savedProject = localStorage.getItem('bi-mapping-project');
            if (savedProject) {
                const projectData = JSON.parse(savedProject);
                // Ensure new properties exist with defaults
                this.currentProject = { 
                    ...this.currentProject, 
                    ...projectData,
                    processingMethod: projectData.processingMethod || 'pipeline',
                    connectedSources: projectData.connectedSources || []
                };
                this.populateFormFields();
                this.renderStakeholders();
                this.renderDataSources();
                this.updateOverview();
                this.initializeProcessingMethod();
            }
        } catch (error) {
            console.error('Load error:', error);
            this.showNotification('Error loading project', 'error');
        }
    }

    populateFormFields() {
        const customer = this.currentProject.customer;
        
        const fields = {
            'customer-name': customer.name,
            'customer-industry': customer.industry,
            'customer-size': customer.size,
            'project-description': customer.description
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element && value) {
                element.value = value;
            }
        });
    }

    exportProposal() {
        // This would typically integrate with a PDF generation library
        this.showNotification('PDF export functionality would be implemented here', 'info');
        
        // For now, we'll open the print dialog
        window.print();
    }

    emailProposal() {
        // This would typically integrate with an email service
        const customer = this.currentProject.customer;
        const subject = `BI Implementation Proposal for ${customer.name}`;
        const body = `Please find attached the Business Intelligence implementation proposal for your review.`;
        
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.remove());
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Connections Management
    analyzeConnections() {
        if (!this.currentProject || !this.currentProject.datasources || this.currentProject.datasources.length === 0) {
            this.showNotification('Please add data sources first before analyzing connections', 'warning');
            return;
        }
        
        this.renderConnections();
        this.showNotification('Connection analysis completed successfully', 'success');
    }

    renderConnections() {
        if (!this.currentProject) return;

        const datasources = this.currentProject.datasources || [];
        
        // Render architecture diagram
        this.renderArchitectureDiagram(datasources);
        
        // Render connection details
        this.renderConnectionDetails(datasources);
        
        // Render infrastructure requirements
        this.renderInfrastructureRequirements(datasources);
        
        // Render connection summary
        this.renderConnectionSummary(datasources);
    }

    renderArchitectureDiagram(datasources) {
        const sourcesContainer = document.getElementById('architecture-sources');
        if (!sourcesContainer) return;

        sourcesContainer.innerHTML = '';
        
        if (datasources.length === 0) {
            sourcesContainer.innerHTML = `
                <div class="source-item">
                    <i class="fas fa-exclamation-triangle"></i>
                    No data sources added yet
                </div>
            `;
        } else {
            datasources.forEach(source => {
                const sourceItem = document.createElement('div');
                sourceItem.className = 'source-item';
                sourceItem.innerHTML = `
                    <i class="fas fa-${this.getDataSourceIcon(source.type)}"></i>
                    ${source.name}
                `;
                sourcesContainer.appendChild(sourceItem);
            });
        }
    }

    renderConnectionDetails(datasources) {
        const container = document.getElementById('connection-grid');
        if (!container) return;

        container.innerHTML = '';
        
        if (datasources.length === 0) {
            container.innerHTML = `
                <div class="connection-item">
                    <h4><i class="fas fa-info-circle"></i>Add data sources to view connection details</h4>
                    <p>Start by adding data sources in the Data Sources tab to see detailed connection information.</p>
                </div>
            `;
            return;
        }

        datasources.forEach(source => {
            const connectionItem = document.createElement('div');
            connectionItem.className = 'connection-item';
            
            const connectionMethod = this.getConnectionMethod(source.type);
            const connectionPort = this.getDefaultPort(source.type);
            const authMethod = this.getAuthMethod(source.type);
            
            connectionItem.innerHTML = `
                <h4>
                    <i class="fas fa-${this.getDataSourceIcon(source.type)}"></i>
                    ${source.name}
                </h4>
                <div class="connection-detail">
                    <span class="connection-detail-label">Connection Method</span>
                    <span class="connection-method ${connectionMethod.type}">${connectionMethod.name}</span>
                </div>
                <div class="connection-detail">
                    <span class="connection-detail-label">Default Port</span>
                    <span class="connection-detail-value">${connectionPort}</span>
                </div>
                <div class="connection-detail">
                    <span class="connection-detail-label">Authentication</span>
                    <span class="connection-detail-value">${authMethod}</span>
                </div>
            `;
            
            container.appendChild(connectionItem);
        });
    }

    renderInfrastructureRequirements(datasources) {
        const container = document.getElementById('requirements-grid');
        if (!container) return;

        const requirements = this.analyzeInfrastructureRequirements(datasources);
        
        container.innerHTML = '';
        
        requirements.forEach(req => {
            const card = document.createElement('div');
            card.className = 'requirement-card';
            card.innerHTML = `
                <div class="requirement-icon">
                    <i class="fas fa-${req.icon}"></i>
                </div>
                <div class="requirement-content">
                    <h4>${req.title}</h4>
                    <div class="requirement-details">
                        ${req.items.map(item => `
                            <div class="requirement-item ${item.type || ''}">
                                <i class="fas fa-${item.icon}"></i>
                                ${item.text}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    renderConnectionSummary(datasources) {
        const container = document.getElementById('summary-stats');
        if (!container) return;

        const stats = this.calculateConnectionStats(datasources);
        
        container.innerHTML = `
            <div class="stat-item">
                <div class="stat-number">${stats.totalSources}</div>
                <div class="stat-label">Data Sources</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.onPremSources}</div>
                <div class="stat-label">On-Premises</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.cloudSources}</div>
                <div class="stat-label">Cloud Sources</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.gatewayRequired}</div>
                <div class="stat-label">Gateway Required</div>
            </div>
        `;
    }

    getConnectionMethod(sourceType) {
        const methods = {
            'SQL Server': { name: 'Direct Connect', type: 'direct' },
            'Azure SQL': { name: 'Direct Connect', type: 'direct' },
            'Azure SQL Database': { name: 'Direct Connect', type: 'direct' },
            'Oracle': { name: 'Direct Connect', type: 'direct' },
            'Oracle Database': { name: 'Direct Connect', type: 'direct' },
            'MySQL': { name: 'Direct Connect', type: 'direct' },
            'PostgreSQL': { name: 'Direct Connect', type: 'direct' },
            'SharePoint': { name: 'API', type: 'api' },
            'Excel': { name: 'Gateway', type: 'gateway' },
            'Excel Files': { name: 'Gateway', type: 'gateway' },
            'CSV': { name: 'Gateway', type: 'gateway' },
            'CSV Files': { name: 'Gateway', type: 'gateway' },
            'API': { name: 'API', type: 'api' },
            'REST API': { name: 'API', type: 'api' },
            'Azure Blob': { name: 'Direct Connect', type: 'direct' },
            'Azure Blob Storage': { name: 'Direct Connect', type: 'direct' },
            'Dynamics 365': { name: 'API', type: 'api' },
            'Salesforce': { name: 'API', type: 'api' },
            'SAP': { name: 'Gateway', type: 'gateway' }
        };
        return methods[sourceType] || { name: 'Direct Connect', type: 'direct' };
    }

    getDefaultPort(sourceType) {
        const ports = {
            'SQL Server': '1433',
            'Azure SQL': '1433',
            'Azure SQL Database': '1433',
            'Oracle': '1521',
            'Oracle Database': '1521',
            'MySQL': '3306',
            'PostgreSQL': '5432',
            'SharePoint': '443 (HTTPS)',
            'Excel': 'File System',
            'Excel Files': 'File System',
            'CSV': 'File System',
            'CSV Files': 'File System',
            'API': '443 (HTTPS)',
            'REST API': '443 (HTTPS)',
            'Azure Blob': '443 (HTTPS)',
            'Azure Blob Storage': '443 (HTTPS)',
            'Dynamics 365': '443 (HTTPS)',
            'Salesforce': '443 (HTTPS)',
            'SAP': '3300'
        };
        return ports[sourceType] || '443';
    }

    getAuthMethod(sourceType) {
        const auth = {
            'SQL Server': 'Windows/SQL Auth',
            'Azure SQL': 'Azure AD/SQL Auth',
            'Azure SQL Database': 'Azure AD/SQL Auth',
            'Oracle': 'Database Auth',
            'Oracle Database': 'Database Auth',
            'MySQL': 'Database Auth',
            'PostgreSQL': 'Database Auth',
            'SharePoint': 'Azure AD/OAuth',
            'Excel': 'File Access',
            'Excel Files': 'File Access',
            'CSV': 'File Access',
            'CSV Files': 'File Access',
            'API': 'API Key/OAuth',
            'REST API': 'API Key/OAuth',
            'Azure Blob': 'Azure AD/Key',
            'Azure Blob Storage': 'Azure AD/Key',
            'Dynamics 365': 'Azure AD/OAuth',
            'Salesforce': 'OAuth 2.0',
            'SAP': 'SAP Auth'
        };
        return auth[sourceType] || 'API Key';
    }

    analyzeInfrastructureRequirements(datasources) {
        const hasOnPrem = datasources.some(ds => this.isOnPremiseSource(ds.type));
        const hasGatewayReq = datasources.some(ds => this.requiresGateway(ds.type));
        const hasCloudAuth = datasources.some(ds => this.requiresCloudAuth(ds.type));
        
        const requirements = [];

        // Network Requirements
        requirements.push({
            icon: 'network-wired',
            title: 'Network & Connectivity',
            items: [
                { icon: 'globe', text: 'Internet connectivity required' },
                hasOnPrem ? { icon: 'shield-alt', text: 'Firewall configuration needed', type: 'warning' } : null,
                { icon: 'lock', text: 'SSL/TLS encryption recommended' }
            ].filter(Boolean)
        });

        // Gateway Requirements
        if (hasGatewayReq) {
            requirements.push({
                icon: 'server',
                title: 'On-Premises Gateway',
                items: [
                    { icon: 'download', text: 'Install Power BI Gateway', type: 'warning' },
                    { icon: 'cog', text: 'Configure data source connections' },
                    { icon: 'user-shield', text: 'Service account permissions' }
                ]
            });
        }

        // Authentication & Security
        if (hasCloudAuth) {
            requirements.push({
                icon: 'user-shield',
                title: 'Authentication & Security',
                items: [
                    { icon: 'key', text: 'Azure AD setup required' },
                    { icon: 'users-cog', text: 'Service principal creation' },
                    { icon: 'certificate', text: 'API credentials & certificates' }
                ]
            });
        }

        // Licensing
        requirements.push({
            icon: 'id-card',
            title: 'Licensing & Permissions',
            items: [
                { icon: 'crown', text: 'Power BI Pro licenses' },
                datasources.length > 5 ? { icon: 'building', text: 'Premium capacity recommended', type: 'warning' } : null,
                { icon: 'database', text: 'Source system permissions' }
            ].filter(Boolean)
        });

        return requirements;
    }

    calculateConnectionStats(datasources) {
        return {
            totalSources: datasources.length,
            onPremSources: datasources.filter(ds => this.isOnPremiseSource(ds.type)).length,
            cloudSources: datasources.filter(ds => !this.isOnPremiseSource(ds.type)).length,
            gatewayRequired: datasources.filter(ds => this.requiresGateway(ds.type)).length
        };
    }

    isOnPremiseSource(sourceType) {
        const onPremTypes = ['SQL Server', 'Oracle', 'Oracle Database', 'MySQL', 'PostgreSQL', 'Excel', 'Excel Files', 'CSV', 'CSV Files', 'SAP'];
        return onPremTypes.includes(sourceType);
    }

    requiresGateway(sourceType) {
        const gatewayTypes = ['SQL Server', 'Oracle', 'Oracle Database', 'MySQL', 'PostgreSQL', 'Excel', 'Excel Files', 'CSV', 'CSV Files', 'SAP'];
        return gatewayTypes.includes(sourceType);
    }

    requiresCloudAuth(sourceType) {
        const cloudAuthTypes = ['Azure SQL', 'Azure SQL Database', 'SharePoint', 'Dynamics 365', 'Salesforce', 'Azure Blob', 'Azure Blob Storage'];
        return cloudAuthTypes.includes(sourceType);
    }

    // Playground rendering methods
    renderPlayground() {
        // Clear any existing canvas items first
        const canvas = document.querySelector('.fabric-canvas');
        if (canvas) {
            const existingItems = canvas.querySelectorAll('.canvas-item');
            existingItems.forEach(item => item.remove());
        }
        
        // Initialize the Fabric workspace
        this.initializeFabricWorkspace();
        this.setupFabricDragAndDrop();
        this.updateFabricCounts();
        this.renderDataSourcesList();
        
        // Initialize connection layer after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.initializeConnectionLayer();
        }, 100);
    }

    initializeFabricWorkspace() {
        // Ensure the workspace is properly initialized
        const workspace = document.querySelector('.fabric-workspace');
        if (!workspace) {
            console.error('Fabric workspace not found');
            return;
        }

        // Set up any initial data or state
        console.log('Fabric workspace initialized');
    }

    renderDataSourcesList() {
        const container = document.getElementById('fabric-data-sources-list');
        if (!container) return;

        const datasources = this.currentProject.datasources || [];
        
        if (datasources.length === 0) {
            container.innerHTML = `
                <div class="no-data-sources">
                    <p style="color: #605e5c; font-size: 12px; text-align: center; padding: 16px;">
                        No data sources added yet
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = datasources.map(source => `
            <div class="data-source-item" draggable="true" data-source-id="${source.id || source.name}">
                <div class="source-icon">
                    <i class="${this.getDataSourceIcon(source.type)}"></i>
                </div>
                <div class="source-info">
                    <div class="source-name">${source.name}</div>
                    <div class="source-type">${source.type}</div>
                </div>
            </div>
        `).join('');

        // Add drag event listeners to data source items
        this.setupDataSourceDrag();
    }

    getDataSourceIcon(type) {
        const icons = {
            'SQL Server': 'fas fa-database',
            'Oracle': 'fas fa-database',
            'MySQL': 'fas fa-database', 
            'PostgreSQL': 'fas fa-database',
            'Excel': 'fas fa-file-excel',
            'SharePoint': 'fas fa-share-alt',
            'Azure Blob': 'fas fa-cloud',
            'Power BI': 'fas fa-chart-bar',
            'Salesforce': 'fas fa-cloud',
            'API': 'fas fa-plug',
            'File System': 'fas fa-folder',
            'Web Service': 'fas fa-globe',
            'Azure SQL': 'fas fa-cloud',
            'Cosmos DB': 'fas fa-database'
        };
        return icons[type] || 'fas fa-database';
    }

    setupDataSourceDrag() {
        const sourceItems = document.querySelectorAll('.data-source-item');
        sourceItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                if (this.connectionMode) {
                    e.preventDefault();
                    return;
                }
                e.dataTransfer.setData('text/plain', `datasource:${e.target.dataset.sourceId}`);
                e.target.style.opacity = '0.7';
            });

            item.addEventListener('dragend', (e) => {
                e.target.style.opacity = '1';
            });
            
            // Add click handler for connection mode
            item.addEventListener('click', (e) => {
                if (this.connectionMode) {
                    e.preventDefault();
                    this.handleSourceClick(item.dataset.sourceId);
                }
            });
        });
    }

    handleItemTypeSelection() {
        const selector = document.getElementById('item-type-selector');
        const addBtn = document.querySelector('.add-to-canvas-btn');
        
        if (selector.value) {
            addBtn.disabled = false;
        } else {
            addBtn.disabled = true;
        }
    }

    getCanvasBoundaries() {
        const canvas = document.querySelector('.fabric-canvas');
        if (!canvas) return null;
        
        const itemWidth = 140; // Canvas item width from CSS
        const itemHeight = 140; // Canvas item height from CSS
        
        return {
            minX: 0, // Allow items to touch the left edge
            minY: 0, // Allow items to touch the top edge
            maxX: canvas.offsetWidth - itemWidth,
            maxY: canvas.offsetHeight - itemHeight,
            itemWidth,
            itemHeight
        };
    }

    addSelectedItemToCanvas() {
        const selector = document.getElementById('item-type-selector');
        const itemType = selector.value;
        
        if (!itemType) return;

        const itemName = prompt(`Enter name for new ${itemType}:`);
        if (!itemName) return;

        this.createCanvasItem(itemType, itemName);
        
        // Reset selector
        selector.value = '';
        this.handleItemTypeSelection();
    }

    createCanvasItem(type, name, x = null, y = null) {
        const canvas = document.querySelector('.fabric-canvas');
        if (!canvas) return;

        // Get consistent boundaries
        const boundaries = this.getCanvasBoundaries();
        if (!boundaries) return;

        // Generate position - place in predictable location if not specified, allow overlapping
        const existingItems = canvas.querySelectorAll('.canvas-item').length;
        
        // Create a small grid pattern instead of diagonal - easier to separate items
        const gridSize = 160; // Space between grid positions (item width + small gap)
        const itemsPerRow = Math.floor((boundaries.maxX - 50) / gridSize) || 1;
        const row = Math.floor(existingItems / itemsPerRow);
        const col = existingItems % itemsPerRow;
        
        const posX = x !== null ? Math.max(boundaries.minX, Math.min(boundaries.maxX, x)) : 
                     Math.min(50 + (col * gridSize), boundaries.maxX);
        const posY = y !== null ? Math.max(boundaries.minY, Math.min(boundaries.maxY, y)) : 
                     Math.min(50 + (row * gridSize), boundaries.maxY);

        const item = document.createElement('div');
        item.className = `canvas-item ${type}`;
        item.style.left = `${posX}px`;
        item.style.top = `${posY}px`;
        item.draggable = false; // Disable HTML5 drag to prevent conflicts
        item.dataset.itemType = type;
        item.dataset.itemName = name;

        item.innerHTML = `
            <div class="item-actions">
                <button class="item-action-btn" onclick="app.editCanvasItem('${name}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="item-action-btn" onclick="app.deleteCanvasItem('${name}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="item-icon-large">
                <div class="icon-symbol">${this.getItemTypeSymbol(type)}</div>
            </div>
            <div class="item-info">
                <h4 class="item-title">${name}</h4>
                <span class="item-type">${this.getItemTypeLabel(type)}</span>
            </div>
            <div class="item-footer">
                <div class="item-status">
                    <span class="status-indicator"></span>
                    <span class="status-text">Ready</span>
                </div>
            </div>
        `;

        // Add drag functionality
        this.setupCanvasItemDrag(item);
        
        canvas.appendChild(item);
        
        // Clean up any existing drag conflicts
        if (!this.boundariesFixed) {
            this.applySmartBoundariesToAllItems();
        }
        
        this.showNotification(`${type} "${name}" added to canvas`, 'success');
    }

    fixExistingCanvasItems() {
        if (this.boundariesFixed) return; // Prevent multiple fixes
        
        const canvas = document.querySelector('.fabric-canvas');
        if (!canvas) return;
        
        const items = canvas.querySelectorAll('.canvas-item');
        items.forEach(item => {
            // Remove old drag handlers
            item.replaceWith(item.cloneNode(true));
        });
        
        // Re-setup all items with new drag handlers
        const newItems = canvas.querySelectorAll('.canvas-item');
        newItems.forEach(item => {
            item.draggable = false; // Ensure no HTML5 drag conflicts
            this.setupCanvasItemDrag(item); // Re-setup with new boundaries
        });
        
        console.log(`Fixed ${newItems.length} existing canvas items`);
    }

    resetAllCanvasItemBoundaries() {
        const canvas = document.querySelector('.fabric-canvas');
        if (!canvas) return;
        
        const items = canvas.querySelectorAll('.canvas-item');
        if (items.length === 0) {
            console.log('No canvas items found to reset');
            return;
        }
        
        items.forEach(item => {
            // Remove all existing event listeners by cloning
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            // Disable HTML5 drag
            newItem.draggable = false;
            
            // Re-setup drag functionality with new boundaries
            this.setupCanvasItemDrag(newItem);
        });
        
        this.showNotification(`Reset boundaries for ${items.length} items`, 'success');
        console.log(`Reset boundaries for ${items.length} canvas items - can now drag to all edges`);
    }

    applySmartBoundariesToAllItems() {
        const canvas = document.querySelector('.fabric-canvas');
        if (!canvas) return;
        
        const items = canvas.querySelectorAll('.canvas-item');
        if (items.length === 0) {
            console.log('No canvas items found to apply smart boundaries');
            return;
        }
        
        items.forEach(item => {
            // Remove all existing event listeners by cloning
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            // Disable HTML5 drag
            newItem.draggable = false;
            
            // Re-setup drag functionality with smart boundaries
            this.setupCanvasItemDrag(newItem);
            
            // Ensure current position is within bounds
            const currentLeft = parseInt(newItem.style.left) || 0;
            const currentTop = parseInt(newItem.style.top) || 0;
            const maxX = canvas.offsetWidth - 140;
            const maxY = canvas.offsetHeight - 140;
            
            const constrainedLeft = Math.max(0, Math.min(maxX, currentLeft));
            const constrainedTop = Math.max(0, Math.min(maxY, currentTop));
            
            newItem.style.left = `${constrainedLeft}px`;
            newItem.style.top = `${constrainedTop}px`;
        });
        
        console.log(`Applied smart boundaries to ${items.length} canvas items - free movement within canvas!`);
    }

    getItemTypeLabel(type) {
        const labels = {
            'notebook': 'Notebook',
            'pipeline': 'Data Pipeline',
            'dataset': 'Dataset',
            'dataflow': 'Dataflow',
            'report': 'Report',
            'dashboard': 'Dashboard',
            'semantic-model': 'Semantic Model',
            'warehouse': 'Warehouse',
            'lakehouse': 'Lakehouse'
        };
        return labels[type] || type;
    }

    getItemTypeIcon(type) {
        const icons = {
            'notebook': 'fas fa-code',
            'pipeline': 'fas fa-sitemap',
            'dataset': 'fas fa-database',
            'dataflow': 'fas fa-project-diagram',
            'report': 'fas fa-chart-bar',
            'dashboard': 'fas fa-tachometer-alt',
            'semantic-model': 'fas fa-brain',
            'warehouse': 'fas fa-warehouse',
            'lakehouse': 'fas fa-water'
        };
        return icons[type] || 'fas fa-cube';
    }

    getItemTypeSymbol(type) {
        const symbols = {
            'notebook': '</>', 
            'pipeline': '⚡',
            'dataset': '📊',
            'dataflow': '🌊',
            'report': '📈',
            'dashboard': '📋',
            'semantic-model': '🧠',
            'warehouse': '🏬',
            'lakehouse': '🏞️'
        };
        return symbols[type] || '📦';
    }

    setupCanvasItemDrag(item) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        // Disable HTML5 drag API to prevent conflicts
        item.draggable = false;

        // Mouse drag support for more precise positioning
        item.addEventListener('mousedown', (e) => {
            if (e.target.closest('.item-action-btn')) return; // Don't drag when clicking buttons
            
            // Handle connection mode clicks
            if (this.connectionMode && !isDragging) {
                this.handleItemClick(item.dataset.itemName);
                return;
            }
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(item.style.left) || 0;
            startTop = parseInt(item.style.top) || 0;
            
            item.style.cursor = 'grabbing';
            item.style.zIndex = '1000'; // Bring to front while dragging
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging || !item.parentNode) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newLeft = startLeft + deltaX;
            const newTop = startTop + deltaY;
            
            // Smart boundaries - keep items visible within canvas
            const canvas = document.querySelector('.fabric-canvas');
            if (canvas) {
                const maxX = canvas.offsetWidth - item.offsetWidth;
                const maxY = canvas.offsetHeight - item.offsetHeight;
                
                // Constrain to keep item fully visible within canvas
                const constrainedLeft = Math.max(0, Math.min(maxX, newLeft));
                const constrainedTop = Math.max(0, Math.min(maxY, newTop));
                
                item.style.left = `${constrainedLeft}px`;
                item.style.top = `${constrainedTop}px`;
            } else {
                // Fallback if canvas not found
                item.style.left = `${newLeft}px`;
                item.style.top = `${newTop}px`;
            }
            
            // Update connections while dragging (throttled)
            if (!this.dragUpdateTimeout) {
                this.dragUpdateTimeout = setTimeout(() => {
                    this.updateAllConnections();
                    this.dragUpdateTimeout = null;
                }, 16); // ~60fps
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (isDragging) {
                isDragging = false;
                item.style.cursor = 'move';
                item.style.zIndex = '10'; // Reset z-index
                this.updateAllConnections(); // Final update after drag
                e.stopPropagation();
            }
        });
    }

    editCanvasItem(itemName) {
        const newName = prompt(`Enter new name for ${itemName}:`, itemName);
        if (!newName || newName === itemName) return;

        const item = document.querySelector(`[data-item-name="${itemName}"]`);
        if (item) {
            item.dataset.itemName = newName;
            item.querySelector('.item-title').textContent = newName;
            this.showNotification(`Item renamed to "${newName}"`, 'success');
        }
    }

    deleteCanvasItem(itemName) {
        if (!confirm(`Delete "${itemName}"?`)) return;

        const item = document.querySelector(`[data-item-name="${itemName}"]`);
        if (item) {
            // Delete any connections to this item
            this.deleteConnectionsForItem(itemName);
            item.remove();
            this.showNotification(`"${itemName}" deleted`, 'success');
        }
    }

    clearAllCanvasItems() {
        const canvas = document.querySelector('.fabric-canvas');
        if (!canvas) return;

        const items = canvas.querySelectorAll('.canvas-item');
        if (items.length === 0) {
            this.showNotification('Canvas is already empty', 'info');
            return;
        }

        if (confirm(`Clear all ${items.length} items from canvas?`)) {
            items.forEach(item => item.remove());
            this.showNotification('Canvas cleared', 'success');
        }
    }

    updateFabricCounts() {
        // Update item counts in the stages based on current project data
        const datasources = this.currentProject.datasources || [];
        
        // Update stage item counts
        const stages = document.querySelectorAll('.processing-stage, .data-visualization-stage, .ml-serving-stage');
        stages.forEach(stage => {
            const countElement = stage.querySelector('.item-count');
            if (countElement) {
                // You can customize this logic based on your data
                countElement.textContent = `${Math.floor(Math.random() * 5) + 1} items`;
            }
        });

        // Update medallion layer counts
        const layers = document.querySelectorAll('.medallion-layer');
        layers.forEach((layer, index) => {
            const countElement = layer.querySelector('.item-count');
            if (countElement) {
                const count = Math.max(1, datasources.length - index);
                countElement.textContent = count > 0 ? `${count} items` : 'No items';
            }
        });
    }

    updateLayerCounts() {
        const datasources = this.currentProject.datasources || [];
        const bronzeCount = datasources.length;
        const silverCount = Math.max(1, Math.floor(datasources.length * 0.8));
        const goldCount = Math.max(1, Math.floor(datasources.length * 0.6));

        // Update counts in the medallion tiers if they exist
        const bronzeElement = document.querySelector('.bronze-tier .layer-count');
        const silverElement = document.querySelector('.silver-tier .layer-count');
        const goldElement = document.querySelector('.gold-tier .layer-count');

        if (bronzeElement) bronzeElement.textContent = bronzeCount;
        if (silverElement) silverElement.textContent = silverCount;
        if (goldElement) goldElement.textContent = goldCount;
    }

    showTutorial() {
        const tutorial = document.getElementById('playground-tutorial');
        if (tutorial && this.currentProject.datasources.length === 0) {
            tutorial.classList.add('active');
            this.currentTutorialStep = 1;
            this.updateTutorialStep();
        }
    }

    hideTutorial() {
        const tutorial = document.getElementById('playground-tutorial');
        if (tutorial) {
            tutorial.classList.remove('active');
        }
    }

    nextTutorialStep() {
        if (this.currentTutorialStep < 5) {
            this.currentTutorialStep++;
            this.updateTutorialStep();
        }
    }

    previousTutorialStep() {
        if (this.currentTutorialStep > 1) {
            this.currentTutorialStep--;
            this.updateTutorialStep();
        }
    }

    updateTutorialStep() {
        // Update step display
        document.querySelectorAll('.tutorial-step').forEach(step => {
            step.classList.remove('active');
        });
        document.querySelector(`[data-step="${this.currentTutorialStep}"]`).classList.add('active');

        // Update navigation
        document.getElementById('tutorial-current').textContent = this.currentTutorialStep;
        document.getElementById('tutorial-prev').style.display = this.currentTutorialStep === 1 ? 'none' : 'inline-block';
        document.getElementById('tutorial-next').textContent = this.currentTutorialStep === 5 ? 'Finish' : 'Next';

        if (this.currentTutorialStep === 5) {
            document.getElementById('tutorial-next').onclick = () => this.hideTutorial();
        } else {
            document.getElementById('tutorial-next').onclick = () => this.nextTutorialStep();
        }
    }

    simulateDataFlow() {
        const datasources = document.querySelectorAll('.playground-datasource');
        const arrows = document.querySelectorAll('.flow-arrow');
        const stages = document.querySelectorAll('.processing-stage');

        // Reset any existing animations
        datasources.forEach(ds => ds.style.animation = '');
        arrows.forEach(arrow => arrow.style.animation = '');
        stages.forEach(stage => stage.style.animation = '');

        // Animate data flow
        let delay = 0;
        
        // Highlight data sources
        datasources.forEach((ds, index) => {
            setTimeout(() => {
                ds.style.animation = 'highlight 1s ease-in-out';
                setTimeout(() => ds.style.animation = '', 1000);
            }, delay);
            delay += 200;
        });

        // Animate arrows and stages
        setTimeout(() => {
            arrows.forEach((arrow, index) => {
                setTimeout(() => {
                    arrow.style.animation = 'flowPulse 1.5s ease-in-out';
                    setTimeout(() => arrow.style.animation = '', 1500);
                }, index * 500);
            });
        }, delay);

        setTimeout(() => {
            stages.forEach((stage, index) => {
                setTimeout(() => {
                    stage.style.animation = 'stageHighlight 1s ease-in-out';
                    setTimeout(() => stage.style.animation = '', 1000);
                }, index * 300);
            });
        }, delay + 1000);

        this.showNotification('Data flow simulation complete!', 'info');
    }

    renderPlaygroundDataSources() {
        const container = document.getElementById('fabric-datasources');
        if (!container) return;

        const datasources = this.currentProject.datasources || [];
        
        if (datasources.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                    <i class="fas fa-database" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                    <p style="margin: 0 0 16px 0; font-size: 14px;">No data sources added yet</p>
                    <button class="btn btn-outline btn-sm" onclick="app.goToSection('datasources')" style="font-size: 12px; padding: 6px 12px;">
                        Add Data Sources
                    </button>
                </div>
            `;
            this.updateDropArea();
            this.updateSourceCount();
            return;
        }

        container.innerHTML = datasources.map(ds => {
            const isConnected = this.currentProject.connectedSources.includes(ds.id);
            return `
                <div class="fabric-datasource-card draggable ${isConnected ? 'connected' : ''}" 
                     data-source-id="${ds.id}" 
                     draggable="true"
                     data-tooltip="Drag to Processing area or double-click to connect: ${ds.description || 'No description provided'}">
                    <div class="fabric-datasource-logo">
                        <i class="${this.getDataSourceIcon(ds.type)}" style="color: ${this.getDataSourceColor(ds.type)}"></i>
                    </div>
                    <div class="fabric-datasource-info">
                        <h4>${ds.name}</h4>
                        <p>${ds.type}</p>
                    </div>
                    <div class="fabric-datasource-status ${isConnected ? 'connected' : ''}"></div>
                </div>
            `;
        }).join('');

        // Set up drag listeners for each data source
        container.querySelectorAll('.draggable').forEach(element => {
            element.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', element.dataset.sourceId);
                element.classList.add('dragging');
            });

            element.addEventListener('dragend', (e) => {
                element.classList.remove('dragging');
            });

            // Double-click to connect/disconnect
            element.addEventListener('dblclick', (e) => {
                const sourceId = element.dataset.sourceId;
                if (this.currentProject.connectedSources.includes(sourceId)) {
                    this.disconnectDataSource(sourceId);
                } else {
                    this.connectDataSource(sourceId);
                }
            });
        });

        this.updateDropArea();
        this.updateSourceCount();
    }

    disconnectDataSource(sourceId) {
        const datasource = this.currentProject.datasources.find(ds => ds.id === sourceId);
        if (!datasource) return;

        // Remove from connected sources
        this.currentProject.connectedSources = this.currentProject.connectedSources.filter(id => id !== sourceId);
        
        // Update UI
        this.updateDropArea();
        this.renderPlaygroundDataSources();
        this.renderPlaygroundPipelines();
        
        this.showNotification(`Disconnected ${datasource.name} from Fabric`, 'info');
        this.saveProject();
    }

    getDataSourceColor(type) {
        const colors = {
            'SQL Server': '#CC2927',
            'Azure SQL': '#0078D4',
            'Excel': '#217346',
            'SharePoint': '#0078D4',
            'Dynamics 365': '#002050',
            'Salesforce': '#00A1E0',
            'API': '#FF6B35',
            'CSV': '#217346',
            'Oracle': '#F80000',
            'MySQL': '#00758F',
            'PostgreSQL': '#336791'
        };
        return colors[type] || '#00D4FF';
    }

    renderPlaygroundPipelines() {
        const container = document.getElementById('fabric-pipelines');
        if (!container) return;

        const datasources = this.currentProject.datasources || [];
        const connectedSources = this.currentProject.connectedSources || [];
        const processingMethod = this.currentProject.processingMethod || 'pipeline';
        
        // Show processing items for connected sources or all sources if none manually connected
        const sourcesToShow = connectedSources.length > 0 
            ? datasources.filter(ds => connectedSources.includes(ds.id))
            : datasources;
        
        if (sourcesToShow.length === 0) {
            container.innerHTML = '<p class="text-secondary">Processing items will appear when data sources are connected</p>';
            return;
        }

        const methodIcon = processingMethod === 'pipeline' ? 'fas fa-sitemap' : 'fas fa-code';
        const methodLabel = processingMethod === 'pipeline' ? 'Pipeline' : 'Notebook';

        container.innerHTML = sourcesToShow.map((ds, index) => `
            <div class="fabric-pipeline-item ${processingMethod}" data-tooltip="${methodLabel} for ${ds.name} - handles extraction and initial processing">
                <i class="${methodIcon}"></i>
                <span>${methodLabel}</span>
                <div class="processing-source">${ds.name}</div>
            </div>
        `).join('');
    }

    renderPlaygroundOutputs() {
        const container = document.getElementById('fabric-outputs');
        if (!container) return;

        const datasources = this.currentProject.datasources || [];
        
        // Generate output items based on data sources
        const outputs = [
            { icon: 'fas fa-chart-line', title: 'D365FO Quality', subtitle: 'Quality Insight', type: 'insight' },
            { icon: 'fas fa-industry', title: 'D365FO Manufacturing', subtitle: 'Manufacturing Cost Insight', type: 'insight' },
            { icon: 'fas fa-chart-bar', title: 'D365FO & AX Sales', subtitle: 'Sales Report', type: 'report' },
            { icon: 'fas fa-trophy', title: 'QDA (SPC, NC, PFAP, FMEA) D365 and AX', subtitle: 'Quality KPI', type: 'kpi' }
        ];

        if (datasources.length === 0) {
            container.innerHTML = '<p class="text-secondary">Outputs will be generated based on your data sources</p>';
            return;
        }

        container.innerHTML = outputs.slice(0, Math.min(4, datasources.length + 1)).map(output => `
            <div class="fabric-output-item" data-tooltip="Generated ${output.type} based on your ${datasources.length} data source(s)">
                <i class="${output.icon}"></i>
                <span class="output-title">${output.title}</span>
                <span class="output-subtitle">${output.subtitle}</span>
            </div>
        `).join('');
    }

    renderPlaygroundConsumption() {
        const container = document.getElementById('fabric-consume');
        if (!container) return;

        const datasources = this.currentProject.datasources || [];
        
        const consumptionOptions = [
            { icon: 'fas fa-chart-bar', label: 'Power BI Reports' },
            { icon: 'fas fa-file-excel', label: 'Excel Analytics' },
            { icon: 'fas fa-mobile-alt', label: 'Mobile Dashboards' },
            { icon: 'fas fa-tv', label: 'Digital Displays' }
        ];

        if (datasources.length === 0) {
            container.innerHTML = '<p class="text-secondary">Consumption options will appear when data sources are added</p>';
            return;
        }

        container.innerHTML = consumptionOptions.slice(0, Math.min(4, datasources.length + 1)).map(option => `
            <div class="fabric-consume-item" data-tooltip="Access your data through ${option.label} - perfect for ${option.label.includes('Mobile') ? 'on-the-go' : 'desktop'} users">
                <i class="${option.icon}"></i>
                <span>${option.label}</span>
            </div>
        `).join('');
    }

    refreshPlayground() {
        this.renderPlayground();
        this.showNotification('Playground refreshed with latest data sources', 'success');
    }

    exportPlayground() {
        // Create a simple text export of the playground
        const datasources = this.currentProject.datasources || [];
        
    let exportData = `InfiniBI Studio Export\n`;
        exportData += `Generated: ${new Date().toLocaleString()}\n`;
        exportData += `Customer: ${this.currentProject.customer.name || 'Not specified'}\n\n`;
        
        exportData += `Data Sources (${datasources.length}):\n`;
        datasources.forEach((ds, i) => {
            exportData += `${i + 1}. ${ds.name} (${ds.type})\n`;
        });
        
        exportData += `\nArchitecture Flow:\n`;
        exportData += `Data Sources → Fabric Link → Prepare (Transform/Normalize) → Store (Bronze → Silver → Gold) → Serve → Consume\n`;
        
        // Create and download file
        const blob = new Blob([exportData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bi-playground-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Playground diagram exported', 'success');
    }

    // Microsoft Fabric Workspace Functions
    createDeploymentPipeline() {
        this.showNotification('Deployment pipeline creation started', 'info');
        // Add logic for deployment pipeline creation
    }

    createApp() {
        this.showNotification('App creation started', 'info');
        // Add logic for app creation
    }

    addNewItem() {
        const itemTypes = [
            { type: 'notebook', name: 'Notebook', icon: 'fas fa-code' },
            { type: 'pipeline', name: 'Data Pipeline', icon: 'fas fa-sitemap' },
            { type: 'dataset', name: 'Dataset', icon: 'fas fa-database' },
            { type: 'report', name: 'Report', icon: 'fas fa-chart-bar' },
            { type: 'dataflow', name: 'Dataflow', icon: 'fas fa-stream' }
        ];

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal fabric-modal">
                <div class="modal-header">
                    <h3>Add New Item</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="item-types-grid">
                        ${itemTypes.map(item => `
                            <div class="item-type-card" onclick="app.createNewItem('${item.type}')">
                                <i class="${item.icon}"></i>
                                <span>${item.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    createNewItem(type) {
        // Close modal
        document.querySelector('.modal-overlay').remove();
        
        const itemName = prompt(`Enter name for new ${type}:`);
        if (!itemName) return;

        this.showNotification(`${type} "${itemName}" created successfully`, 'success');
        // Add logic to create the item and add to workspace
    }

    addNewFolder() {
        const folderName = prompt('Enter folder name:');
        if (!folderName) return;
        
        this.showNotification(`Folder "${folderName}" created`, 'success');
    }

    importData() {
        this.showNotification('Data import dialog opened', 'info');
        // Add logic for data import
    }

    migrateData() {
        this.showNotification('Data migration wizard opened', 'info');
        // Add logic for data migration
    }

    addItemToStage(stageName) {
        const itemName = prompt(`Add new item to ${stageName} stage:`);
        if (!itemName) return;

        this.showNotification(`Item "${itemName}" added to ${stageName} stage`, 'success');
        // Add logic to add item to specific stage
    }

    addItemToLayer(layerName) {
        const itemName = prompt(`Add new item to ${layerName} layer:`);
        if (!itemName) return;

        this.showNotification(`Item "${itemName}" added to ${layerName} layer`, 'success');
        // Add logic to add item to medallion layer
    }

    // Enhanced Drag and Drop for Fabric Workspace
    setupFabricDragAndDrop() {
        const canvas = document.querySelector('.fabric-canvas');
        if (!canvas) {
            console.error('Fabric canvas not found');
            return;
        }

        // Set up drop zone for canvas
        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            canvas.classList.add('drag-over');
        });

        canvas.addEventListener('dragleave', (e) => {
            if (!canvas.contains(e.relatedTarget)) {
                canvas.classList.remove('drag-over');
            }
        });

        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            canvas.classList.remove('drag-over');
            
            const data = e.dataTransfer.getData('text/plain');
            
            if (data.startsWith('datasource:')) {
                const sourceId = data.replace('datasource:', '');
                this.handleDataSourceDrop(sourceId, e.offsetX, e.offsetY);
            } else if (data.startsWith('canvasitem:')) {
                // Handle canvas item repositioning
                const itemName = data.replace('canvasitem:', '');
                this.handleCanvasItemDrop(itemName, e.offsetX, e.offsetY);
            }
        });

        console.log('Fabric drag and drop initialized');
    }

    handleDataSourceDrop(sourceId, x, y) {
        const datasources = this.currentProject.datasources || [];
        const source = datasources.find(ds => (ds.id || ds.name) === sourceId);
        
        if (!source) {
            console.error('Data source not found:', sourceId);
            return;
        }

        // Create a dataset item from the data source
        const itemName = `${source.name} Dataset`;
        this.createCanvasItem('dataset', itemName, x, y);
        
        this.showNotification(`Created dataset from ${source.name}`, 'success');
    }

    handleCanvasItemDrop(itemName, x, y) {
        const canvas = document.querySelector('.fabric-canvas');
        if (!canvas) return;
        
        // Smart boundaries - keep dropped items within canvas
        const itemWidth = 140;
        const itemHeight = 140;
        const maxX = canvas.offsetWidth - itemWidth;
        const maxY = canvas.offsetHeight - itemHeight;
        
        // Constrain drop position to keep item fully visible
        const constrainedX = Math.max(0, Math.min(maxX, x - itemWidth/2));
        const constrainedY = Math.max(0, Math.min(maxY, y - itemHeight/2));
        
        const item = document.querySelector(`[data-item-name="${itemName}"]`);
        if (item) {
            item.style.left = `${constrainedX}px`;
            item.style.top = `${constrainedY}px`;
            this.updateAllConnections();
        }
    }

    // ===== CONNECTION MANAGEMENT =====
    
    initializeConnectionLayer() {
        const canvas = document.querySelector('.fabric-canvas');
        if (!canvas) return;
        
        // Create SVG layer for connections
        let svg = canvas.querySelector('.connection-layer');
        if (!svg) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.classList.add('connection-layer');
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.pointerEvents = 'none';
            svg.style.zIndex = '1';
            svg.setAttribute('preserveAspectRatio', 'none');
            canvas.appendChild(svg);
        }
        
        // Add connection toggle button
        this.addConnectionToggleButton();
    }
    
    addConnectionToggleButton() {
        const button = document.getElementById('connection-toggle-btn');
        if (!button) return;
        
        // Add click event listener to existing button
        button.addEventListener('click', () => this.toggleConnectionMode());
    }
    
    toggleConnectionMode() {
        this.connectionMode = !this.connectionMode;
        const button = document.getElementById('connection-toggle-btn');
        
        if (this.connectionMode) {
            button.style.background = '#d83b01';
            button.innerHTML = `
                <i class="fas fa-times"></i>
                <span>Exit Connect</span>
            `;
            this.showConnectionInstructions();
        } else {
            button.style.background = '#0078d4';
            button.innerHTML = `
                <i class="fas fa-project-diagram"></i>
                <span>Connect Mode</span>
            `;
            this.selectedSource = null;
            this.selectedItem = null;
            this.hideConnectionInstructions();
        }
        
        this.updateConnectionStyles();
    }
    
    showConnectionInstructions() {
        let instructions = document.querySelector('.connection-instructions');
        if (!instructions) {
            instructions = document.createElement('div');
            instructions.className = 'connection-instructions';
            instructions.innerHTML = `
                <p><strong>Connection Mode:</strong></p>
                <p>• Click a data source, then click a canvas item</p>
                <p>• OR click a canvas item, then another canvas item</p>
                <p>• Create visual data flow connections</p>
            `;
            instructions.style.cssText = `
                position: absolute;
                top: 100px;
                right: 20px;
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                padding: 12px;
                font-size: 12px;
                z-index: 1000;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                line-height: 1.4;
                max-width: 250px;
            `;
            document.querySelector('.fabric-canvas').appendChild(instructions);
        }
    }
    
    hideConnectionInstructions() {
        const instructions = document.querySelector('.connection-instructions');
        if (instructions) {
            instructions.remove();
        }
    }
    
    updateConnectionStyles() {
        const sources = document.querySelectorAll('.data-source-item');
        const items = document.querySelectorAll('.canvas-item');
        
        if (this.connectionMode) {
            sources.forEach(source => {
                source.style.cursor = 'pointer';
                source.style.border = '2px dashed #0078d4';
            });
            items.forEach(item => {
                item.style.cursor = 'pointer';
                item.style.border = '2px dashed #0078d4';
            });
        } else {
            sources.forEach(source => {
                source.style.cursor = 'grab';
                source.style.border = '1px solid #e1e5e9';
            });
            items.forEach(item => {
                item.style.cursor = 'move';
                item.style.border = 'none';
            });
        }
    }
    
    handleSourceClick(sourceId) {
        if (!this.connectionMode) return;
        
        // Clear any selected item
        this.selectedItem = null;
        this.selectedSource = sourceId;
        
        this.highlightSelectedSource(sourceId);
    }
    
    highlightSelectedSource(sourceId) {
        // Highlight selected source
        document.querySelectorAll('.data-source-item').forEach(item => {
            if (item.dataset.sourceId === sourceId) {
                item.style.background = '#e8f3ff';
                item.style.borderColor = '#0078d4';
                item.style.borderWidth = '3px';
            } else {
                item.style.background = '#f8f9fa';
                item.style.borderColor = '#0078d4';
                item.style.borderWidth = '2px';
            }
        });
        
        // Clear item highlights
        document.querySelectorAll('.canvas-item').forEach(item => {
            item.style.background = '';
            item.style.borderWidth = '2px';
        });
    }
    
    highlightSelectedItem(itemName) {
        // Highlight selected item
        document.querySelectorAll('.canvas-item').forEach(item => {
            if (item.dataset.itemName === itemName) {
                item.style.background = '#e8f3ff';
                item.style.borderColor = '#0078d4';
                item.style.borderWidth = '3px';
            } else {
                item.style.background = '';
                item.style.borderColor = '#0078d4';
                item.style.borderWidth = '2px';
            }
        });
        
        // Clear source highlights
        document.querySelectorAll('.data-source-item').forEach(item => {
            item.style.background = '#f8f9fa';
            item.style.borderWidth = '2px';
        });
    }
    
    clearHighlights() {
        // Reset all highlighting
        document.querySelectorAll('.data-source-item').forEach(item => {
            item.style.background = '#f8f9fa';
            item.style.borderWidth = '2px';
        });
        
        document.querySelectorAll('.canvas-item').forEach(item => {
            item.style.background = '';
            item.style.borderWidth = '2px';
        });
    }
    
    handleItemClick(itemName) {
        if (!this.connectionMode) return;
        
        // If we have a selected source, connect source to item
        if (this.selectedSource) {
            this.createConnection(this.selectedSource, itemName, 'source-to-item');
            this.selectedSource = null;
            this.clearHighlights();
            return;
        }
        
        // If we have a selected item, connect item to item
        if (this.selectedItem) {
            if (this.selectedItem === itemName) {
                // Clicking the same item - deselect it
                this.selectedItem = null;
                this.clearHighlights();
                return;
            }
            this.createConnection(this.selectedItem, itemName, 'item-to-item');
            this.selectedItem = null;
            this.clearHighlights();
            return;
        }
        
        // No selection - select this item
        this.selectedItem = itemName;
        this.highlightSelectedItem(itemName);
    }
    
    createConnection(fromId, toId, connectionType = 'source-to-item') {
        // Check if connection already exists
        const existingConnection = this.connections.find(
            conn => (conn.fromId === fromId && conn.toId === toId) ||
                   (conn.fromId === toId && conn.toId === fromId) // Check both directions
        );
        
        if (existingConnection) {
            this.showNotification('Connection already exists!', 'warning');
            return;
        }
        
        // Add connection to array
        const connection = {
            id: Date.now(),
            fromId: fromId,
            toId: toId,
            type: connectionType
        };
        
        this.connections.push(connection);
        this.drawConnection(connection);
        
        // Show appropriate success message
        if (connectionType === 'source-to-item') {
            this.showNotification(`Connected data source "${fromId}" to "${toId}"`, 'success');
        } else {
            this.showNotification(`Connected "${fromId}" to "${toId}"`, 'success');
        }
    }
    
    drawConnection(connection) {
        const svg = document.querySelector('.connection-layer');
        if (!svg) return;
        
        let fromElement, toElement;
        
        if (connection.type === 'source-to-item') {
            fromElement = document.querySelector(`[data-source-id="${connection.fromId}"]`);
            toElement = document.querySelector(`[data-item-name="${connection.toId}"]`);
        } else {
            fromElement = document.querySelector(`[data-item-name="${connection.fromId}"]`);
            toElement = document.querySelector(`[data-item-name="${connection.toId}"]`);
        }
        
        if (!fromElement || !toElement) return;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('data-connection-id', connection.id);
        
        // Different styles for different connection types
        if (connection.type === 'source-to-item') {
            line.setAttribute('stroke', '#0078d4'); // Blue for data source connections
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-dasharray', '5,5');
        } else {
            line.setAttribute('stroke', '#107c10'); // Green for item-to-item connections
            line.setAttribute('stroke-width', '3');
            line.setAttribute('stroke-dasharray', '10,5');
        }
        
        // Add arrow marker for direction
        this.createArrowMarker(svg, connection.id, connection.type);
        line.setAttribute('marker-end', `url(#arrow-${connection.id})`);
        
        this.updateConnectionPosition(line, fromElement, toElement);
        svg.appendChild(line);
    }
    
    createArrowMarker(svg, connectionId, connectionType) {
        // Check if defs element exists, create if not
        let defs = svg.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svg.appendChild(defs);
        }
        
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', `arrow-${connectionId}`);
        marker.setAttribute('viewBox', '0 0 10 10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3');
        marker.setAttribute('markerWidth', '6');
        marker.setAttribute('markerHeight', '6');
        marker.setAttribute('orient', 'auto');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M0,0 L0,6 L9,3 z');
        
        if (connectionType === 'source-to-item') {
            path.setAttribute('fill', '#0078d4');
        } else {
            path.setAttribute('fill', '#107c10');
        }
        
        marker.appendChild(path);
        defs.appendChild(marker);
    }
    
    updateConnectionPosition(line, sourceElement, itemElement) {
        const svg = document.querySelector('.connection-layer');
        if (!svg) return;
        
        const sourceRect = sourceElement.getBoundingClientRect();
        const itemRect = itemElement.getBoundingClientRect();
        
        // Map viewport coordinates to SVG user space to avoid layout/scroll offsets
        const toSvgPoint = (clientX, clientY) => {
            const pt = svg.createSVGPoint();
            pt.x = clientX; pt.y = clientY;
            const ctm = svg.getScreenCTM();
            if (!ctm) return { x: clientX, y: clientY };
            const inv = ctm.inverse();
            const sp = pt.matrixTransform(inv);
            return { x: sp.x, y: sp.y };
        };
        
        const p1 = toSvgPoint(sourceRect.right, sourceRect.top + sourceRect.height / 2);
        const p2 = toSvgPoint(itemRect.left, itemRect.top + itemRect.height / 2);
        
        line.setAttribute('x1', p1.x);
        line.setAttribute('y1', p1.y);
        line.setAttribute('x2', p2.x);
        line.setAttribute('y2', p2.y);
    }
    
    updateAllConnections() {
        this.connections.forEach(connection => {
            const line = document.querySelector(`[data-connection-id="${connection.id}"]`);
            let fromElement, toElement;
            
            if (connection.type === 'source-to-item') {
                fromElement = document.querySelector(`[data-source-id="${connection.fromId}"]`);
                toElement = document.querySelector(`[data-item-name="${connection.toId}"]`);
            } else {
                fromElement = document.querySelector(`[data-item-name="${connection.fromId}"]`);
                toElement = document.querySelector(`[data-item-name="${connection.toId}"]`);
            }
            
            if (line && fromElement && toElement) {
                this.updateConnectionPosition(line, fromElement, toElement);
            }
        });
    }
    
    deleteConnection(connectionId) {
        this.connections = this.connections.filter(conn => conn.id !== connectionId);
        const line = document.querySelector(`[data-connection-id="${connectionId}"]`);
        if (line) {
            line.remove();
        }
    }
    
    deleteConnectionsForItem(itemName) {
        const itemConnections = this.connections.filter(
            conn => conn.toId === itemName || conn.fromId === itemName
        );
        itemConnections.forEach(conn => this.deleteConnection(conn.id));
    }
}

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', function() {
    app = new BIDataMapper();
    // Make app globally available for onclick handlers
    window.app = app;
});

// Global function to fix existing canvas item boundaries (can be called from console)
window.fixCanvasBoundaries = function() {
    if (app && app.resetAllCanvasItemBoundaries) {
        app.resetAllCanvasItemBoundaries();
        console.log('Canvas boundaries have been reset. Try dragging your items now.');
    }
};

// Global function to immediately fix boundaries without notification
window.quickFixBoundaries = function() {
    const canvas = document.querySelector('.fabric-canvas');
    if (!canvas) {
        console.log('❌ Canvas not found');
        return;
    }
    
    const items = canvas.querySelectorAll('.canvas-item');
    if (items.length === 0) {
        console.log('❌ No canvas items found');
        return;
    }
    
    items.forEach(item => {
        // Remove all existing event listeners by cloning
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        // Disable HTML5 drag
        newItem.draggable = false;
        
        // Re-setup drag functionality with new boundaries
        app.setupCanvasItemDrag(newItem);
    });
    
    console.log(`✅ Fixed ${items.length} items - you can now drag them to the very edges!`);
    console.log('📍 New boundaries: Top=0, Left=0, Right=canvas-140px, Bottom=canvas-140px');
};

// Global function to create items at the same position for easy overlapping
window.createItemAtSamePosition = function(itemType, itemName, x = 100, y = 100) {
    if (app && app.createCanvasItem) {
        app.createCanvasItem(itemType, itemName, x, y);
        console.log(`✅ Created "${itemName}" at position (${x}, ${y})`);
    } else {
        console.log('❌ App not available');
    }
};

// Global function to enable smart boundaries (freedom within canvas)
window.enableSmartBoundaries = function() {
    const canvas = document.querySelector('.fabric-canvas');
    if (!canvas) {
        console.log('❌ Canvas not found');
        return;
    }
    
    const items = canvas.querySelectorAll('.canvas-item');
    if (items.length === 0) {
        console.log('❌ No canvas items found');
        return;
    }
    
    items.forEach(item => {
        // Remove all existing event listeners by cloning
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        // Disable HTML5 drag
        newItem.draggable = false;
        
        // Re-setup drag functionality WITH smart boundaries
        app.setupCanvasItemDrag(newItem);
        
        // Ensure current position is within bounds
        const currentLeft = parseInt(newItem.style.left) || 0;
        const currentTop = parseInt(newItem.style.top) || 0;
        const maxX = canvas.offsetWidth - 140;
        const maxY = canvas.offsetHeight - 140;
        
        const constrainedLeft = Math.max(0, Math.min(maxX, currentLeft));
        const constrainedTop = Math.max(0, Math.min(maxY, currentTop));
        
        newItem.style.left = `${constrainedLeft}px`;
        newItem.style.top = `${constrainedTop}px`;
    });
    
    console.log(`✅ Applied smart boundaries to ${items.length} items`);
    console.log('� Items can move freely within canvas but won\'t disappear!');
};

// Global function to immediately fix ALL items for free movement within canvas
window.fixAllItemsNow = function() {
    if (!app) {
        console.log('❌ App not ready');
        return;
    }
    
    app.applySmartBoundariesToAllItems();
    console.log('✅ ALL items now have free movement within canvas boundaries!');
    console.log('🎯 Try dragging any item - they should move freely within the canvas area.');
};
window.app = app;
