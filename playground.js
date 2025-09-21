// InfiniBI Studio - Standalone Version

class ArchitecturePlayground {
    constructor() {
        this.connections = []; // Array to store connection lines
        this.connectionMode = false; // Toggle for connection mode
        this.selectedSource = null; // Currently selected data source
        this.selectedItem = null; // Currently selected canvas item
        this.dragUpdateTimeout = null; // Add timeout management for smooth dragging
        this.canvasItems = []; // Track canvas items
        this.connectionSvg = null; // SVG for connections
    this.canvasSpacer = null; // Spacer to extend scroll area
    this.canvasMargin = 200; // extra space around content
    this.sources = []; // Data sources rendered in the left panel
    this.canvasSourcesWindow = null; // Draggable in-canvas sources window
    this._isDraggingCanvasWindow = false;
    this.editMode = false; // Toggle for edit mode
    this.gridSize = 20; // Grid snap size in pixels
    
    // Undo/Redo system
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoSteps = 50;
    
    // Multi-select system
    this.selectedItems = new Set();
    this.isSelecting = false;
    this.selectionBox = null;
    this.selectionStart = { x: 0, y: 0 };
    
    // Templates system
    this.templates = this.initializeTemplates();
    
    // Manual connection control
    this.manualAnchorMode = false;
    this.anchorHighlights = new Map(); // element -> array of anchor highlight divs
    this.connectionPreview = null;
    this.pendingConnection = null; // Stores a pending connection (from element + anchor)
        
        this.init();
    }

    // Ensure an element has an ID; if missing assign deterministic prefix based id
    ensureElementId(element, prefix = 'canvas-item') {
        if (!element) return null;
        if (!element.id || element.id.trim() === '') {
            element.id = `${prefix}-${Date.now()}-${Math.floor(Math.random()*100000)}`;
        }
        return element.id;
    }

    init() {
        this.setupEventListeners();
        // Data sources panel removed - databases now available via modal
        this.setupDragAndDrop();
        this.initializeTheme();
        this.initializeConnectionLayer();
        this.setupConnectionToggle();
        this.setupEditToggle();
        this.setupDatabaseModal();
        
        // Setup layout change observer for connection updates
        this.setupLayoutObserver();
        
        // Try to restore autosaved session
            let canvas = null;
        
        this.setupMedallionTargets();
        this.ensureCanvasSourcesWindow();
        this.ensureModeDock();
        this.setupMultiSelect();
        this.setupUndoRedo();
        this.setupTemplates();
        // Alignment guides initialization
        this.initAlignmentGuides();
        this.initAlignmentGuides();
        
        // Restore autosaved session after all initialization is complete
        setTimeout(() => {
            this.restoreAutosave();
        }, 100);
    }

    // --- Alignment Guides & Snapping ---
    initAlignmentGuides() {
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;
        if (this.alignmentGuides) return; // avoid duplicates
        this.alignmentGuides = {};
        const mk = (cls) => { const d=document.createElement('div'); d.className='align-guide '+cls; d.style.cssText='position:absolute;pointer-events:none;z-index:5000;background:#4f9cf7;opacity:0.55;display:none;'; canvas.appendChild(d); return d; };
        this.alignmentGuides.v = mk('align-guide-v');
        this.alignmentGuides.h = mk('align-guide-h');
    }
    showAlignmentGuides(x=null,y=null){
        if (!this.alignmentGuides) return;
        if (this.alignmentGuides.v){ if (x==null) this.alignmentGuides.v.style.display='none'; else { this.alignmentGuides.v.style.display='block'; this.alignmentGuides.v.style.left=x+'px'; this.alignmentGuides.v.style.top='0'; this.alignmentGuides.v.style.width='1px'; this.alignmentGuides.v.style.height='100%'; } }
        if (this.alignmentGuides.h){ if (y==null) this.alignmentGuides.h.style.display='none'; else { this.alignmentGuides.h.style.display='block'; this.alignmentGuides.h.style.top=y+'px'; this.alignmentGuides.h.style.left='0'; this.alignmentGuides.h.style.height='1px'; this.alignmentGuides.h.style.width='100%'; } }
    }
    calcSnap(primaryEl, proposedX, proposedY){
        const SNAP=6;
        const others=this.canvasItems.map(ci=>ci.element).filter(el=>el!==primaryEl);
        const w=primaryEl.offsetWidth, h=primaryEl.offsetHeight;
        let snapX=proposedX, snapY=proposedY; let gX=null,gY=null;
        const pCenters=[ {type:'v', val:proposedX}, {type:'v', val:proposedX+w/2}, {type:'v', val:proposedX+w}, {type:'h', val:proposedY}, {type:'h', val:proposedY+h/2}, {type:'h', val:proposedY+h} ];
        others.forEach(o=>{
            const ox=parseInt(o.style.left)||0, oy=parseInt(o.style.top)||0, ow=o.offsetWidth, oh=o.offsetHeight;
            const centers=[ {type:'v', val:ox}, {type:'v', val:ox+ow/2}, {type:'v', val:ox+ow}, {type:'h', val:oy}, {type:'h', val:oy+oh/2}, {type:'h', val:oy+oh} ];
            centers.forEach(c=>{
                pCenters.forEach(pc=>{
                    if (c.type!==pc.type) return;
                    if (Math.abs(c.val - pc.val) <= SNAP){
                        if (c.type==='v') { const delta=c.val - pc.val; snapX += delta; gX=c.val; }
                        else { const delta=c.val - pc.val; snapY += delta; gY=c.val; }
                    }
                });
            });
        });
        this.showAlignmentGuides(gX,gY);
        return {x:snapX,y:snapY};
    }
    
    getDefaultSources() {
        return [
            { name: 'Atlas', type: 'SQL Server', icon: 'fas fa-server', dataType: 'sql-server' },
            { name: 'QAS', type: 'SQL Server', icon: 'fas fa-server', dataType: 'sql-server' },
            { name: 'Procapita', type: 'Cloud', icon: 'fas fa-cloud', dataType: 'cloud' }
        ];
    }

    // Load company databases from the databases page
    getCompanyDatabases() {
        try {
            const stored = localStorage.getItem('company-databases');
            console.log('Raw stored data:', stored);
            
            const databases = stored ? JSON.parse(stored) : [];
            console.log('Parsed databases:', databases);
            console.log('Number of company databases found:', databases.length);
            
            // Convert database format to playground source format
            const converted = databases.map(db => ({
                name: db.name,
                type: this.getDisplayType(db.type),
                icon: this.getDatabaseIcon(db.type),
                dataType: db.type,
                server: db.server,
                environment: db.environment,
                status: db.status,
                purpose: db.purpose,
                originalDb: db // Keep reference to original database object
            }));
            
            console.log('Converted databases for playground:', converted);
            return converted;
        } catch (error) {
            console.error('Error loading company databases:', error);
            return [];
        }
    }

    getDatabaseIcon(dbType) {
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
            'aws-rds': 'fas fa-cloud'
        };
        return icons[dbType] || 'fas fa-database';
    }

    getDisplayType(dbType) {
        const displayTypes = {
            'sql-server': 'SQL Server',
            'oracle': 'Oracle',
            'mysql': 'MySQL',
            'postgresql': 'PostgreSQL',
            'mongodb': 'MongoDB',
            'redis': 'Redis',
            'cassandra': 'Cassandra',
            'snowflake': 'Snowflake',
            'bigquery': 'BigQuery',
            'azure-sql': 'Azure SQL',
            'aws-rds': 'AWS RDS'
        };
        return displayTypes[dbType] || dbType.toUpperCase();
    }

    loadDataSources() {
        try {
            const raw = localStorage.getItem('playground-sources');
            this.sources = raw ? JSON.parse(raw) : this.getDefaultSources();
        } catch {
            this.sources = this.getDefaultSources();
        }
    this.renderDataSources();
    }

    saveDataSources() {
        try {
            localStorage.setItem('playground-sources', JSON.stringify(this.sources));
        } catch {}
    }

    renderDataSources() {
        // Ensure the in-canvas window exists so we can mirror the list
        this.ensureCanvasSourcesWindow();

        // Sidebar list
        const sidebarList = document.getElementById('fabric-data-sources-list');
        if (sidebarList) {
            sidebarList.innerHTML = '';
            this.sources.forEach(src => {
                sidebarList.appendChild(this._createDataSourceListItem(src));
            });
        }

        // In-canvas list (mirror)
        const canvasList = document.getElementById('canvas-data-sources-list');
        if (canvasList) {
            canvasList.innerHTML = '';
            this.sources.forEach(src => {
                canvasList.appendChild(this._createDataSourceListItem(src));
            });
        }

        // Rebind drag/click events for all data sources (sidebar + in-canvas)
        this.setupDataSourceDragAndDrop();
    }

    _createDataSourceListItem(src) {
        const item = document.createElement('div');
        item.className = 'data-source-item';
        item.draggable = true;
        item.dataset.type = src.dataType || 'source';
        item.innerHTML = `
            <i class="${src.icon}"></i>
            <div class="source-info">
                <div class="source-name">${src.name}</div>
                <div class="source-type">${src.type}</div>
            </div>
        `;
        return item;
    }

    ensureCanvasSourcesWindow() {
        if (this.canvasSourcesWindow && document.getElementById('canvas-sources-window')) {
            return; // Already exists
        }

        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;

    // Create fixed left-side data sources panel
    const win = document.createElement('div');
    win.className = 'datasources-panel';
        win.id = 'canvas-sources-window';
        win.style.position = 'absolute';
    win.style.left = '8px';
    win.style.top = '8px';
    win.style.zIndex = '2';

        // Header with title and simple collapse action
    const header = document.createElement('div');
    header.className = 'ds-tab';
    header.innerHTML = `<span>Data Sources</span>`;

        // Body with list container
    const body = document.createElement('div');
    body.className = 'window-body';
        const list = document.createElement('div');
        list.id = 'canvas-data-sources-list';
        list.className = 'data-sources-list';
        body.appendChild(list);

        win.appendChild(header);
        win.appendChild(body);
        canvas.appendChild(win);

        this.canvasSourcesWindow = win;

    // Ensure dragover is allowed over the window so drops work anywhere on canvas
    const allowDrop = (e) => { e.preventDefault(); };
    win.addEventListener('dragover', allowDrop);
    body.addEventListener('dragover', allowDrop);

        // Forward drop events to canvas placement
        const handleWindowDrop = (ev) => {
            ev.preventDefault();
            try {
                const data = JSON.parse(ev.dataTransfer.getData('text/plain'));
                const rect = canvas.getBoundingClientRect();
                const canvasPadding = 4;
                let x = ev.clientX - rect.left - canvasPadding;
                let y = ev.clientY - rect.top - canvasPadding;

                // Use same dynamic clamping as main canvas drop
                const bg = canvas.querySelector('.canvas-background');
                const cs = bg ? getComputedStyle(bg) : null;
                const n = (v, fb) => { const p = parseInt(String(v||'').replace('px','').trim(),10); return isFinite(p) ? p : fb; };
                const medH = cs ? n(cs.getPropertyValue('--medallion-height'), 170) : 170;
                const outerPad = 8;
                const itemSize = 120;
                const safeAreaWidth = canvas.clientWidth;
                const safeAreaHeight = Math.max(40, canvas.clientHeight - medH - (outerPad * 2));

                const clampedX = Math.max(20, Math.min(x, safeAreaWidth - itemSize));
                const clampedY = Math.max(20, Math.min(y, safeAreaHeight - itemSize));

                if (data.type === 'data-source') {
                    this.addDataSourceToCanvas(data, clampedX, clampedY);
                } else if (data.type === 'consumption-item') {
                    this.addConsumptionItemToCanvas(data, clampedX, clampedY);
                } else if (data.type === 'canvas-item') {
                    this.addCanvasItem(data.itemType, clampedX, clampedY);
                }
            } catch (error) {
                console.error('Error handling drop over in-canvas window:', error);
            }
        };
        win.addEventListener('drop', handleWindowDrop);
        body.addEventListener('drop', handleWindowDrop);

    // No collapse/drag for fixed panel

    // Fixed window: no dragging handlers
    }

    initializeTheme() {
        // Load saved theme or default to dark
        const savedTheme = localStorage.getItem('playground-theme') || 'dark';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update theme icon
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        // Save theme preference
        localStorage.setItem('playground-theme', theme);
    }

    setupEventListeners() {
        // Palette items (drag or click to add) - Updated for new component palette
        const palette = document.getElementById('component-palette') || document.getElementById('item-palette');
        if (palette) {
            palette.querySelectorAll('.palette-item').forEach(pi => {
                pi.addEventListener('dragstart', (e) => {
                    if (this.connectionMode) { e.preventDefault(); return; }
                    // Support canvas items, consumption items, and data sources in the palette
                    if (pi.dataset.consumptionType) {
                        e.dataTransfer.setData('text/plain', JSON.stringify({
                            type: 'consumption-item',
                            name: pi.dataset.name,
                            category: pi.dataset.category,
                            consumptionType: pi.dataset.consumptionType,
                            icon: pi.dataset.icon,
                            iconColor: pi.dataset.iconColor || '#0078D4'
                        }));
                    } else if (pi.dataset.type === 'data-source') {
                        e.dataTransfer.setData('text/plain', JSON.stringify({
                            type: 'data-source',
                            name: pi.dataset.sourceName,
                            sourceType: pi.dataset.sourceType,
                            icon: pi.dataset.icon
                        }));
                    } else {
                        e.dataTransfer.setData('text/plain', JSON.stringify({
                            type: 'canvas-item',
                            itemType: pi.dataset.type
                        }));
                    }
                });
                pi.addEventListener('click', () => {
                    if (pi.dataset.type === 'database-selector') {
                        this.showDatabaseModal();
                        return;
                    }
                    
                    const canvas = document.getElementById('fabric-canvas');
                    const rect = canvas.getBoundingClientRect();
                    let x = canvas.scrollLeft + rect.width / 2;
                    let y = canvas.scrollTop + rect.height / 2;
                    
                    // Snap center position to grid
                    const snapped = this.snapToGrid(x, y);
                    
                    if (pi.dataset.consumptionType) {
                        this.addConsumptionItemToCanvas({
                            name: pi.dataset.name,
                            category: pi.dataset.category,
                            consumptionType: pi.dataset.consumptionType,
                            icon: pi.dataset.icon,
                            iconColor: pi.dataset.iconColor || '#0078D4'
                        }, snapped.x, snapped.y);
                    } else if (pi.dataset.type === 'data-source') {
                        this.addDataSourceToCanvas({
                            name: pi.dataset.sourceName,
                            sourceType: pi.dataset.sourceType,
                            icon: pi.dataset.icon
                        }, snapped.x, snapped.y);
                    } else {
                        this.addCanvasItem(pi.dataset.type, snapped.x, snapped.y);
                    }
                });
            });
        }

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.connectionMode || this.editMode || this.manualAnchorMode) {
                    this.toggleUnifiedMode();
                }
                this.clearSelection();
                // Clear any stuck connection anchors/previews
                this.clearConnectionState();
            }
            // Undo/Redo shortcuts
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redo();
            }
            // Delete selected items
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const activeTag = document.activeElement ? document.activeElement.tagName : '';
                const isEditable = document.activeElement && (
                    document.activeElement.isContentEditable ||
                    activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement.tagName === 'SELECT'
                );
                if (!isEditable) {
                    e.preventDefault();
                    this.deleteSelectedItems();
                }
            }
            // Select all
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                this.selectAllItems();
            }
        });

        // Canvas click handler to clear connection state when clicking empty areas
        const canvas = document.getElementById('fabric-canvas');
        if (canvas) {
            canvas.addEventListener('click', (e) => {
                // Check if we clicked on empty canvas (not on an item)
                const clickedElement = e.target;
                
                // If we clicked directly on the canvas or background, clear connection state
                if (clickedElement === canvas || 
                    clickedElement.classList.contains('canvas-background') || 
                    clickedElement.classList.contains('bg-panel')) {
                    
                    // Clear any pending connections or stuck anchors
                    if (this.pendingConnection || this.connectionPreview || this.manualAnchorMode) {
                        this.clearConnectionState();
                        this.showNotification('Connection cancelled', 'info');
                    }
                    
                    // Close any open palette dropdowns
                    closeAllDropdowns();
                }
            });
        }
    }

    setupLayoutObserver() {
        // Observe layout changes that might affect connection positions
        const canvas = document.getElementById('fabric-canvas');
        const inspectorPanel = document.getElementById('inspector-panel');
        
        if (canvas && window.ResizeObserver) {
            // Create a throttled update function to avoid excessive redraws
            let updateTimeout;
            const throttledUpdate = () => {
                clearTimeout(updateTimeout);
                updateTimeout = setTimeout(() => {
                    this.updateConnections();
                }, 100);
            };
            
            // Observe canvas resize
            const canvasObserver = new ResizeObserver(() => {
                throttledUpdate();
            });
            canvasObserver.observe(canvas);
            
            // Observe inspector panel changes if it exists
            if (inspectorPanel) {
                const panelObserver = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'attributes' && 
                            mutation.attributeName === 'class') {
                            throttledUpdate();
                        }
                    });
                });
                panelObserver.observe(inspectorPanel, { 
                    attributes: true, 
                    attributeFilter: ['class'] 
                });
            }
        }
    }

    setupConnectionToggle() {
        const toggleBtn = document.getElementById('connection-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleUnifiedMode());
        }
    }

    setupEditToggle() {
        const editBtn = document.getElementById('edit-toggle-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.toggleUnifiedMode());
        }
    }

    setupDatabaseModal() {
        console.log('Setting up database modal...');
        
        // Setup database selector button
        const databaseBtn = document.querySelector('.database-selector-btn');
        console.log('Database button found:', databaseBtn);
        
        if (databaseBtn) {
            console.log('Adding click listener to database button');
            databaseBtn.addEventListener('click', (e) => {
                console.log('Database button clicked!');
                e.preventDefault();
                e.stopPropagation();
                this.showDatabaseModal();
            });
        } else {
            console.error('Database button not found!');
            // Try alternative selector
            const altBtn = document.querySelector('[data-type="database-selector"]');
            console.log('Alternative button found:', altBtn);
        }

        // Setup modal close functionality
        const modal = document.getElementById('database-modal');
        const closeBtn = document.getElementById('database-modal-close');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideDatabaseModal());
        }

        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideDatabaseModal();
                }
            });
        }
    }

    setupModalEventListeners() {
        console.log('Setting up modal event listeners...');
        
        // Remove any existing event listeners by cloning and replacing elements
        const oldAddSelectedBtn = document.getElementById('add-selected-btn');
        if (oldAddSelectedBtn) {
            const newAddSelectedBtn = oldAddSelectedBtn.cloneNode(true);
            oldAddSelectedBtn.parentNode.replaceChild(newAddSelectedBtn, oldAddSelectedBtn);
        }
        
        // Setup checkbox selection functionality
        const checkboxes = document.querySelectorAll('.db-checkbox');
        console.log('Found checkboxes:', checkboxes.length);
        
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const option = checkbox.closest('.database-row');
                if (option && checkbox.checked) {
                    option.classList.add('selected');
                } else if (option) {
                    option.classList.remove('selected');
                }
                this.updateModalButtons();
            });
        });

        // Setup database option click to toggle checkbox
        const databaseOptions = document.querySelectorAll('.database-option');
        console.log('Found database options:', databaseOptions.length);
        
        databaseOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                // Don't toggle if clicking the checkbox directly
                if (e.target.type === 'checkbox') return;
                
                const checkbox = option.querySelector('.db-checkbox');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
        });

        // Setup footer buttons
        const selectAllBtn = document.getElementById('select-all-btn');
        const clearAllBtn = document.getElementById('clear-all-btn');
        const addSelectedBtn = document.getElementById('add-selected-btn');

        console.log('Footer buttons found:');
        console.log('Select All button:', selectAllBtn);
        console.log('Clear All button:', clearAllBtn);
        console.log('Add Selected button:', addSelectedBtn);

        if (selectAllBtn) {
            console.log('Adding click listener to Select All button');
            selectAllBtn.addEventListener('click', () => this.selectAllDatabases());
        }

        if (clearAllBtn) {
            console.log('Adding click listener to Clear All button');
            clearAllBtn.addEventListener('click', () => this.clearAllDatabases());
        }

        if (addSelectedBtn) {
            console.log('Adding click listener to Add Selected button');
            addSelectedBtn.addEventListener('click', (e) => {
                console.log('Add Selected button clicked!');
                e.preventDefault();
                e.stopPropagation();
                this.addSelectedDatabases();
            });
        } else {
            console.error('Add Selected button not found!');
        }

        this.updateModalButtons();
    }

    showDatabaseModal() {
        console.log('showDatabaseModal() called');
        const modal = document.getElementById('database-modal');
        console.log('Modal element found:', modal);
        
        if (modal) {
            console.log('About to populate database modal...');
            // Update the database list with company databases
            this.populateDatabaseModal();
            
            // Re-setup event listeners after content is populated
            console.log('Re-setting up modal event listeners...');
            this.setupModalEventListeners();
            
            console.log('Setting modal display to flex...');
            modal.style.display = 'flex';
            // Add animation
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
            });
            this.updateModalButtons();
        }
    }

    populateDatabaseModal() {
        console.log('populateDatabaseModal() starting...');
        
        const databaseList = document.querySelector('.database-grid');
        console.log('Database list element found:', databaseList);
        
        if (!databaseList) {
            console.error('Database list element not found!');
            return;
        }

        try {
            // Get both default sources and company databases
            const defaultSources = this.getDefaultSources();
            const companyDatabases = this.getCompanyDatabases();
            
            console.log('Modal population - Default sources:', defaultSources.length);
            console.log('Modal population - Company databases:', companyDatabases.length);
            console.log('Company databases data:', companyDatabases);
            
            // Clear existing content
            databaseList.innerHTML = '';
            console.log('Cleared database list content');

            // If we have company databases, show only those
            if (companyDatabases.length > 0) {
                console.log('Showing company databases only');
                // Company Databases Section
                const companyHeader = document.createElement('div');
                companyHeader.className = 'database-section-header';
                companyHeader.innerHTML = '<h4><i class="fas fa-building"></i> Company Databases</h4>';
                databaseList.appendChild(companyHeader);

                // Create table structure
                const table = document.createElement('table');
                table.className = 'database-table';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th width="40"></th>
                            <th>Database</th>
                            <th>Type</th>
                            <th>Server</th>
                            <th>Status</th>
                            <th>Environment</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;
                
                const tbody = table.querySelector('tbody');
                companyDatabases.forEach(db => {
                    console.log('Creating row for company database:', db);
                    const row = this.createDatabaseTableRow(db, true);
                    tbody.appendChild(row);
                });
                
                databaseList.appendChild(table);
                console.log('Added company database table');
            } else {
                console.log('No company databases found, showing default sources');
                // No company databases - show empty state and default sources
                const emptyState = document.createElement('div');
                emptyState.className = 'database-empty-state';
                emptyState.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-database"></i>
                    <p>No company databases found</p>
                    <a href="databases.html" class="btn btn-primary btn-sm">
                        <i class="fas fa-plus"></i> Add Databases
                    </a>
                </div>
            `;
            databaseList.appendChild(emptyState);

            // Add separator
            const separator = document.createElement('div');
            separator.className = 'database-separator';
            databaseList.appendChild(separator);

            // Default Sources Section (only when no company databases)
            const defaultHeader = document.createElement('div');
            defaultHeader.className = 'database-section-header';
            defaultHeader.innerHTML = '<h4><i class="fas fa-cog"></i> Sample Databases</h4>';
            databaseList.appendChild(defaultHeader);

            // Create table for default sources
            const defaultTable = document.createElement('table');
            defaultTable.className = 'database-table';
            defaultTable.innerHTML = `
                <thead>
                    <tr>
                        <th width="40"></th>
                        <th>Database</th>
                        <th>Type</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            
            const defaultTbody = defaultTable.querySelector('tbody');
            defaultSources.forEach(source => {
                const row = this.createDatabaseTableRow(source, false);
                defaultTbody.appendChild(row);
            });
            
            databaseList.appendChild(defaultTable);
            console.log('Added default sources table');
        }
        
        console.log('populateDatabaseModal() completed successfully');
        
        } catch (error) {
            console.error('Error in populateDatabaseModal():', error);
        }
    }

    createDatabaseTableRow(db, isCompanyDb = false) {
        const row = document.createElement('tr');
        row.className = 'database-row';
        
        // Set data attributes for the add function
        row.dataset.dbName = db.name;
        row.dataset.dbType = db.dataType;
        row.dataset.icon = db.icon;
        
        const statusBadge = isCompanyDb && db.status ? 
            `<span class="status-badge status-${db.status}">${db.status.toUpperCase()}</span>` : '';
        
        const environmentBadge = isCompanyDb && db.environment ? 
            `<span class="env-badge env-${db.environment}">${db.environment.toUpperCase()}</span>` : '';
        
        const serverInfo = isCompanyDb && db.server ? db.server : 'N/A';
        const typeOrDescription = isCompanyDb ? db.type : (db.purpose || 'Sample database');

        if (isCompanyDb) {
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="db-checkbox" value="${db.name}" data-type="${db.dataType}">
                </td>
                <td>
                    <div class="db-name-cell">
                        <i class="${db.icon}" style="color: ${this.getTypeColor(db.dataType)}"></i>
                        <span class="db-name">${db.name}</span>
                    </div>
                </td>
                <td class="db-type">${typeOrDescription}</td>
                <td class="db-server">${serverInfo}</td>
                <td class="db-status">${statusBadge}</td>
                <td class="db-environment">${environmentBadge}</td>
            `;
        } else {
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="db-checkbox" value="${db.name}" data-type="${db.dataType}">
                </td>
                <td>
                    <div class="db-name-cell">
                        <i class="${db.icon}" style="color: ${this.getTypeColor(db.dataType)}"></i>
                        <span class="db-name">${db.name}</span>
                    </div>
                </td>
                <td class="db-type">${db.type}</td>
                <td class="db-description">${typeOrDescription}</td>
            `;
        }

        return row;
    }

    // Keep the old function for backward compatibility, but redirect to table row
    createDatabaseOption(db, isCompanyDb = false) {
        return this.createDatabaseTableRow(db, isCompanyDb);
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
            'cloud': '#6366f1'
        };
        return colors[type] || '#6b7280';
    }

    hideDatabaseModal() {
        const modal = document.getElementById('database-modal');
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 200);
        }
    }

    selectAllDatabases() {
        const checkboxes = document.querySelectorAll('.db-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change'));
        });
    }

    clearAllDatabases() {
        const checkboxes = document.querySelectorAll('.db-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.dispatchEvent(new Event('change'));
        });
    }

    updateModalButtons() {
        const selectedCheckboxes = document.querySelectorAll('.db-checkbox:checked');
        const addSelectedBtn = document.getElementById('add-selected-btn');
        
        if (addSelectedBtn) {
            if (selectedCheckboxes.length > 0) {
                addSelectedBtn.disabled = false;
                addSelectedBtn.textContent = `Add Selected (${selectedCheckboxes.length})`;
            } else {
                addSelectedBtn.disabled = true;
                addSelectedBtn.textContent = 'Add Selected';
            }
        }
    }

    addSelectedDatabases() {
        console.log('addSelectedDatabases() called');
        const selectedCheckboxes = document.querySelectorAll('.db-checkbox:checked');
        console.log('Selected checkboxes found:', selectedCheckboxes.length);
        
        if (selectedCheckboxes.length === 0) {
            console.log('No checkboxes selected, returning early');
            return;
        }

        selectedCheckboxes.forEach((checkbox, index) => {
            const option = checkbox.closest('.database-row');
            console.log(`Processing database ${index}:`, option);
            
            // Add small delay between each database addition for smooth animation
            setTimeout(() => {
                console.log(`Adding database ${index} to canvas`);
                this.addDatabaseToCanvas(option);
                // Uncheck after adding
                checkbox.checked = false;
                checkbox.dispatchEvent(new Event('change'));
            }, index * 100);
        });

        // Show success message
        this.showNotification(`Added ${selectedCheckboxes.length} database(s) to canvas`, 'success');
        
        // Close modal after adding
        setTimeout(() => {
            this.hideDatabaseModal();
        }, selectedCheckboxes.length * 100 + 200);
    }

    addDatabaseToCanvas(option) {
        console.log('addDatabaseToCanvas() called with option:', option);
        
        const dbName = option.dataset.dbName;
        const dbType = option.dataset.dbType;
        const dbIcon = option.dataset.icon;
        
        console.log('Database details:', { dbName, dbType, dbIcon });

        // Check if this database already exists on canvas
        const existingDatabases = document.querySelectorAll('.data-source');
        const alreadyExists = Array.from(existingDatabases).some(db => {
            const nameElement = db.querySelector('.data-source-name');
            return nameElement && nameElement.textContent.trim() === dbName;
        });
        
        if (alreadyExists) {
            console.log(`Database "${dbName}" already exists on canvas, skipping...`);
            this.showNotification(`${dbName} is already on the canvas`, 'warning');
            return;
        }

        // Find a good position for the new database
        const canvas = document.getElementById('fabric-canvas');
        console.log('Canvas element:', canvas);
        
        if (!canvas) {
            console.error('Canvas element not found!');
            return;
        }
        
        const canvasRect = canvas.getBoundingClientRect();
        
        // Place in the prepare area (left side)
        const x = 100 + (Math.random() * 200); // Random position in left area
        const y = 100 + (Math.random() * 300); // Random height
        
        console.log('Calculated position:', { x, y });
        
        const snapped = this.snapToGrid(x, y);
        console.log('Snapped position:', snapped);

        // Create database data source item
        const databaseData = {
            type: 'data-source',
            name: dbName,
            sourceType: dbType,
            icon: dbIcon
        };
        
        console.log('Database data object:', databaseData);

        try {
            this.addDataSourceToCanvas(databaseData, snapped.x, snapped.y);
            console.log('Database successfully added to canvas');
            
            // Show success notification
            this.showNotification(`${dbName} database added to canvas`, 'success');
        } catch (error) {
            console.error('Error adding database to canvas:', error);
        }
        
        // Hide modal after adding
        this.hideDatabaseModal();
    }

    toggleEditMode() {
        this.editMode = !this.editMode;
        const editBtn = document.getElementById('edit-toggle-btn');
        if (this.editMode) {
            if (editBtn) {
                editBtn.classList.add('active');
                editBtn.innerHTML = '<i class="fas fa-times"></i><span>Exit Edit Mode</span>';
            }
            document.body.classList.add('edit-mode');
            this.showItemQuickActions(true);
            // Allow clicking connections in edit mode
            if (this.connectionSvg) this.connectionSvg.style.pointerEvents = 'auto';
            this.updateConnectionInteractivity(true);
        } else {
            if (editBtn) {
                editBtn.classList.remove('active');
                editBtn.innerHTML = '<i class="fas fa-pen"></i><span>Edit Mode</span>';
            }
            document.body.classList.remove('edit-mode');
            this.showItemQuickActions(false);
            if (this.connectionSvg) this.connectionSvg.style.pointerEvents = 'none';
            this.updateConnectionInteractivity(false);
        }

        // Sync dock button state
        const dockEdit = document.getElementById('mode-edit-btn');
        if (dockEdit) {
            dockEdit.classList.toggle('active', this.editMode);
        }
    }

    toggleManualAnchorMode() {
        // This function is now handled by toggleUnifiedMode
        this.toggleUnifiedMode();
    }

    showAnchorHighlights(show) {
        if (show) {
            // Show anchor points on all connectable items
            this.highlightAnchorsForAllItems();
        } else {
            // Remove all anchor highlights
            this.anchorHighlights.forEach((highlights, element) => {
                highlights.forEach(highlight => highlight.remove());
            });
            this.anchorHighlights.clear();
        }
    }

    highlightAnchorsForAllItems() {
        // Clear existing highlights
        this.showAnchorHighlights(false);

        // Get all connectable elements
        const connectableItems = [];
        
        // Canvas items
        this.canvasItems.forEach(ci => {
            if (ci.element) connectableItems.push(ci.element);
        });
        
        // Data source items in canvas
        const canvasDataSources = document.querySelectorAll('#fabric-canvas .data-source-card');
        canvasDataSources.forEach(source => connectableItems.push(source));
        
        // Medallion targets
        const medallionTargets = document.querySelectorAll('.medallion-target');
        medallionTargets.forEach(target => connectableItems.push(target));

        // Create anchor highlights for each item
        connectableItems.forEach(item => {
            this.createAnchorHighlights(item);
        });
    }

    createAnchorHighlights(element) {
        if (!element || this.anchorHighlights.has(element)) return;

        const rect = element.getBoundingClientRect();
        const canvas = document.getElementById('fabric-canvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        const anchors = ['top', 'right', 'bottom', 'left'];
        const highlights = [];

        anchors.forEach(anchor => {
            const highlight = document.createElement('div');
            highlight.className = `anchor-highlight anchor-${anchor}`;
            highlight.dataset.anchor = anchor;
            highlight.dataset.elementId = element.id || element.className;
            
            // Position relative to canvas
            const size = 12;
            let left, top;
            
            switch (anchor) {
                case 'top':
                    left = rect.left - canvasRect.left + rect.width / 2 - size / 2;
                    top = rect.top - canvasRect.top - size / 2;
                    break;
                case 'right':
                    left = rect.right - canvasRect.left - size / 2;
                    top = rect.top - canvasRect.top + rect.height / 2 - size / 2;
                    break;
                case 'bottom':
                    left = rect.left - canvasRect.left + rect.width / 2 - size / 2;
                    top = rect.bottom - canvasRect.top - size / 2;
                    break;
                case 'left':
                    left = rect.left - canvasRect.left - size / 2;
                    top = rect.top - canvasRect.top + rect.height / 2 - size / 2;
                    break;
            }

            highlight.style.cssText = `
                position: absolute;
                left: ${left}px;
                top: ${top}px;
                width: ${size}px;
                height: ${size}px;
                background: #0078d4;
                border: 2px solid #ffffff;
                border-radius: 50%;
                cursor: pointer;
                z-index: 2000;
                opacity: 0.8;
                transition: all 0.2s ease;
            `;

            // Add hover effects
            highlight.addEventListener('mouseenter', () => {
                highlight.style.transform = 'scale(1.3)';
                highlight.style.opacity = '1';
                highlight.style.background = '#106ebe';
            });

            highlight.addEventListener('mouseleave', () => {
                highlight.style.transform = 'scale(1)';
                highlight.style.opacity = '0.8';
                highlight.style.background = '#0078d4';
            });

            // Add click handler for anchor selection
            highlight.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAnchorClick(element, anchor, highlight);
            });

            canvas.appendChild(highlight);
            highlights.push(highlight);
        });

        this.anchorHighlights.set(element, highlights);
    }

    handleAnchorClick(element, anchor, anchorElement) {
        if (!this.manualAnchorMode || !this.connectionMode) return;

        if (!this.pendingConnection) {
            // Start a new connection from this anchor
            this.pendingConnection = {
                from: element,
                fromAnchor: anchor,
                fromHighlight: anchorElement
            };
            
            // Highlight the selected anchor
            anchorElement.style.background = '#ff6b35';
            anchorElement.style.transform = 'scale(1.5)';
            
            this.showNotification(`Selected ${anchor} anchor. Click another anchor to complete connection.`, 'info');
            
            // Show connection preview
            this.showConnectionPreview(element, anchor);
            
        } else if (this.pendingConnection.from !== element) {
            // Complete the connection to this anchor
            this.completeManualConnection(element, anchor);
        } else {
            // Clicking same element - cancel or change anchor
            this.clearPendingConnection();
            this.showNotification('Connection cancelled', 'info');
        }
    }

    showConnectionPreview(fromElement, fromAnchor) {
        // Add mousemove listener to show preview line
        const canvas = document.getElementById('fabric-canvas');
        
        const mouseMoveHandler = (e) => {
            if (!this.pendingConnection) return;
            
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            this.drawPreviewLine(fromElement, fromAnchor, mouseX, mouseY);
        };

        canvas.addEventListener('mousemove', mouseMoveHandler);
        this.previewMouseHandler = mouseMoveHandler;
    }

    drawPreviewLine(fromElement, fromAnchor, toX, toY) {
        // Remove existing preview
        if (this.connectionPreview) {
            this.connectionPreview.remove();
        }

        if (!this.connectionSvg) return;

        const fromRect = fromElement.getBoundingClientRect();
        const canvas = document.getElementById('fabric-canvas');
        const canvasRect = canvas.getBoundingClientRect();

        // Get anchor position
        let fromX, fromY;
        switch (fromAnchor) {
            case 'top':
                fromX = fromRect.left - canvasRect.left + fromRect.width / 2;
                fromY = fromRect.top - canvasRect.top;
                break;
            case 'right':
                fromX = fromRect.right - canvasRect.left;
                fromY = fromRect.top - canvasRect.top + fromRect.height / 2;
                break;
            case 'bottom':
                fromX = fromRect.left - canvasRect.left + fromRect.width / 2;
                fromY = fromRect.bottom - canvasRect.top;
                break;
            case 'left':
                fromX = fromRect.left - canvasRect.left;
                fromY = fromRect.top - canvasRect.top + fromRect.height / 2;
                break;
        }

        // Create preview line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromX);
        line.setAttribute('y1', fromY);
        line.setAttribute('x2', toX);
        line.setAttribute('y2', toY);
        line.setAttribute('stroke', '#0078d4');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '5,5');
        line.style.opacity = '0.6';

        this.connectionSvg.appendChild(line);
        this.connectionPreview = line;
    }

    completeManualConnection(toElement, toAnchor) {
        if (!this.pendingConnection) return;

        const fromElement = this.pendingConnection.from;
        const fromAnchor = this.pendingConnection.fromAnchor;
        if (fromElement === toElement) {
            this.showNotification('Ignored: cannot connect an item to itself', 'warning');
            this.clearPendingConnection();
            return;
        }

        // Create the connection with specific anchors
        const fromId = this.ensureElementId(fromElement, 'node');
        const toId = this.ensureElementId(toElement, 'node');
        const connection = {
            id: 'connection-' + Date.now() + '-' + Math.floor(Math.random()*10000),
            from: fromElement,
            to: toElement,
            fromId,
            toId,
            fromAnchor: fromAnchor,
            toAnchor: toAnchor,
            type: this.getConnectionType(fromElement, toElement)
        };

        this.connections.push(connection);
        this.drawManualConnection(connection);
        
        this.showNotification(`Connected ${fromAnchor} to ${toAnchor}`, 'success');
        
        // Auto-save after creating connection
        setTimeout(() => this.autosave(), 500);
        this.saveState('manual connection');
        this.clearPendingConnection();
    }

    clearPendingConnection() {
        if (this.pendingConnection && this.pendingConnection.fromHighlight) {
            // Reset the highlight appearance
            const highlight = this.pendingConnection.fromHighlight;
            highlight.style.background = '#0078d4';
            highlight.style.transform = 'scale(1)';
        }

        this.pendingConnection = null;

        // Remove preview line
        if (this.connectionPreview) {
            this.connectionPreview.remove();
            this.connectionPreview = null;
        }

        // Remove mouse handler
        if (this.previewMouseHandler) {
            const canvas = document.getElementById('fabric-canvas');
            canvas.removeEventListener('mousemove', this.previewMouseHandler);
            this.previewMouseHandler = null;
        }
    }

    clearConnectionState() {
        // Clear any pending connections
        this.pendingConnection = null;
        
        // Remove connection preview
        if (this.connectionPreview) {
            this.connectionPreview.remove();
            this.connectionPreview = null;
        }
        
        // Remove mouse preview handler
        if (this.previewMouseHandler) {
            const canvas = document.getElementById('fabric-canvas');
            canvas.removeEventListener('mousemove', this.previewMouseHandler);
            this.previewMouseHandler = null;
        }
        
        // Clear all anchor highlights (this removes the blue markers)
        this.showAnchorHighlights(false);
        
        // Reset manual anchor mode
        this.manualAnchorMode = false;
        
        // Clear any stuck selected items
        this.selectedSource = null;
        this.selectedItem = null;
        
        // Remove any orphaned anchor highlight elements from DOM
        const orphanedAnchors = document.querySelectorAll('.anchor-highlight, .anchor-top, .anchor-bottom, .anchor-left, .anchor-right');
        orphanedAnchors.forEach(anchor => {
            if (anchor.parentNode) {
                anchor.parentNode.removeChild(anchor);
            }
        });
        
        // Clear the anchor highlights map
        if (this.anchorHighlights) {
            this.anchorHighlights.clear();
        }
    }

    getConnectionType(fromElement, toElement) {
        // Determine connection type based on element types
        if (fromElement.classList.contains('data-source-card')) {
            return 'source-to-item';
        }
        return 'item-to-item';
    }

    showItemQuickActions(show) {
        // Add or remove quick action buttons on each canvas item
        (this.canvasItems || []).forEach(ci => {
            const el = ci.element;
            if (!el) return;
            let actions = el.querySelector('.item-actions');
            if (show) {
                if (!actions) {
                    actions = document.createElement('div');
                    actions.className = 'item-actions';
                    actions.innerHTML = `
                        <button class="item-action edit" title="Edit"><i class="fas fa-pen"></i></button>
                        <button class="item-action delete" title="Delete"><i class="fas fa-trash"></i></button>
                    `;
                    el.appendChild(actions);
                    // Bind
                    const editBtn = actions.querySelector('.item-action.edit');
                    const delBtn = actions.querySelector('.item-action.delete');
                    editBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.promptEditItem(ci);
                    });
                    delBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.deleteCanvasItem(ci);
                    });
                }
                actions.style.display = 'flex';
            } else if (actions) {
                actions.style.display = 'none';
            }
        });
    }

    promptEditItem(ci) {
        // Minimal inline edit: change title text
        const titleEl = ci.element.querySelector('.canvas-item-title');
        const current = titleEl ? titleEl.textContent : (ci.data?.name || '');
        const next = prompt('Edit name', current);
        if (next && titleEl) {
            titleEl.textContent = next;
            if (ci.data) ci.data.name = next;
            this.autosave();
        }
    }

    deleteCanvasItem(ci) {
        this.saveState('delete item');
        
        // Remove connections involving this item
        const involved = this.connections.filter(c => c.from === ci.element || c.to === ci.element);
        involved.forEach(c => {
            if (c.element && this.connectionSvg) {
                try { this.connectionSvg.removeChild(c.element); } catch {}
            }
        });
        this.connections = this.connections.filter(c => !(c.from === ci.element || c.to === ci.element));

        // Remove element and list entry
        if (ci.element && ci.element.parentNode) ci.element.parentNode.removeChild(ci.element);
        this.canvasItems = this.canvasItems.filter(x => x !== ci);

        this.updateConnections();
        this.autosave();
        this.showNotification('Item deleted', 'success');
        
        // Auto-save after deletion
        setTimeout(() => this.autosave(), 500);
    }

    toggleConnectionMode() {
        this.connectionMode = !this.connectionMode;
        const toggleBtn = document.getElementById('connection-toggle-btn');
        const dockConnect = document.getElementById('mode-connect-btn');
        
        if (this.connectionMode) {
            if (toggleBtn) {
                toggleBtn.classList.add('active');
                toggleBtn.innerHTML = '<i class="fas fa-times"></i><span>Exit Connect Mode</span>';
            }
            if (dockConnect) dockConnect.classList.add('active');
            this.showNotification('Connection mode activated. Click items to connect them.', 'info');
            // Rebuild and enable medallion target interactions
            this.setupMedallionTargets();
            document.querySelectorAll('.medallion-target').forEach(t => t.style.pointerEvents = 'auto');
            document.body.classList.add('connect-mode');
            
            // Show anchor highlights if manual anchor mode is enabled
            if (this.manualAnchorMode) {
                this.showAnchorHighlights(true);
            }
        } else {
            if (toggleBtn) {
                toggleBtn.classList.remove('active');
                toggleBtn.innerHTML = '<i class="fas fa-project-diagram"></i><span>Connect Mode</span>';
            }
            if (dockConnect) dockConnect.classList.remove('active');
            this.selectedSource = null;
            this.selectedItem = null;
            this.clearSelections();
            this.showNotification('Connection mode deactivated.', 'info');
            // Disable and remove medallion target interactions
            document.querySelectorAll('.medallion-target').forEach(t => t.remove());
            document.body.classList.remove('connect-mode');
            
            // Hide anchor highlights and clear pending connections
            this.showAnchorHighlights(false);
            this.clearPendingConnection();
            
            // Turn off manual anchor mode if connection mode is disabled
            if (this.manualAnchorMode) {
                this.manualAnchorMode = false;
                const dockManualAnchor = document.getElementById('mode-manual-anchor-btn');
                if (dockManualAnchor) {
                    dockManualAnchor.classList.remove('active');
                }
            }
        }

        // Sync dock button state (ensure correct final state)
        const dockConnectSync = document.getElementById('mode-connect-btn');
        if (dockConnectSync) {
            dockConnectSync.classList.toggle('active', this.connectionMode);
        }
    }

    ensureModeDock() {
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;
        if (document.getElementById('mode-dock')) return;

        const dock = document.createElement('div');
        dock.id = 'mode-dock';
        dock.className = 'mode-dock';

        const btnUnified = document.createElement('button');
        btnUnified.id = 'mode-unified-btn';
        btnUnified.className = 'mode-btn unified-mode-btn';
        btnUnified.title = 'Connection Mode - Connect, Edit & Manual Anchors';
        btnUnified.innerHTML = '<i class="fas fa-project-diagram"></i>';
        btnUnified.addEventListener('click', () => this.toggleUnifiedMode());

        dock.appendChild(btnUnified);
        canvas.appendChild(dock);

        // Initial sync
        btnUnified.classList.toggle('active', this.connectionMode);
    }

    toggleUnifiedMode() {
        // Toggle all modes together
        const wasActive = this.connectionMode || this.editMode || this.manualAnchorMode;
        
        if (wasActive) {
            // Turn everything off
            this.connectionMode = false;
            this.editMode = false;
            this.manualAnchorMode = false;
            
            // Clear states
            this.selectedSource = null;
            this.selectedItem = null;
            this.clearSelections();
            this.showAnchorHighlights(false);
            this.clearPendingConnection();
            
            // Clear any stuck connection state (blue markers, previews, etc.)
            this.clearConnectionState();
            
            // Update UI
            document.body.classList.remove('connect-mode', 'edit-mode');
            document.querySelectorAll('.medallion-target').forEach(t => t.remove());
            this.showItemQuickActions(false);
            if (this.connectionSvg) this.connectionSvg.style.pointerEvents = 'none';
            this.updateConnectionInteractivity(false);
            
            this.showNotification('All connection features disabled', 'info');
        } else {
            // Turn everything on
            this.connectionMode = true;
            this.editMode = true;
            this.manualAnchorMode = true;
            
            // Setup states
            this.setupMedallionTargets();
            document.querySelectorAll('.medallion-target').forEach(t => t.style.pointerEvents = 'auto');
            document.body.classList.add('connect-mode', 'edit-mode');
            this.showItemQuickActions(true);
            if (this.connectionSvg) this.connectionSvg.style.pointerEvents = 'auto';
            this.updateConnectionInteractivity(true);
            this.showAnchorHighlights(true);
            
            this.showNotification('Full connection mode: Connect, Edit & Manual Anchors enabled', 'success');
        }
        
        // Update button state
        const btnUnified = document.getElementById('mode-unified-btn');
        if (btnUnified) {
            btnUnified.classList.toggle('active', !wasActive);
            if (!wasActive) {
                btnUnified.innerHTML = '<i class="fas fa-times"></i>';
                btnUnified.title = 'Exit Connection Mode';
            } else {
                btnUnified.innerHTML = '<i class="fas fa-project-diagram"></i>';
                btnUnified.title = 'Connection Mode - Connect, Edit & Manual Anchors';
            }
        }
    }

    clearSelections() {
        // Remove selection highlights
        document.querySelectorAll('.data-source-item.selected, .canvas-item.selected, .medallion-target.selected').forEach(item => {
            item.classList.remove('selected');
        });
    }

    // Create invisible clickable overlays over Bronze/Silver/Gold medallions
    setupMedallionTargets() {
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;

        const createOrUpdateTargets = () => {
            // Remove existing targets
            canvas.querySelectorAll('.medallion-target').forEach(el => el.remove());

            const canvasRect = canvas.getBoundingClientRect();
            const medCardsNow = canvas.querySelectorAll('.canvas-background .medallion-card');
            medCardsNow.forEach(card => {
                const title = (card.querySelector('.medallion-title')?.textContent || '').toLowerCase();
                const rect = card.getBoundingClientRect();
                const target = document.createElement('div');
                target.className = 'medallion-target';
                target.dataset.medallion = title || 'zone';
                target.title = (title.charAt(0).toUpperCase() + title.slice(1));
                // Stable ID so connections can serialize/restore (one per medallion type)
                if (title) {
                    target.id = `medallion-${title}`;
                } else {
                    target.id = `medallion-zone-${Date.now()}-${Math.floor(Math.random()*1000)}`;
                }
                target.style.position = 'absolute';
                // Slightly expand the hit area to avoid border gaps
                const pad = 3;
                target.style.left = (Math.round(rect.left - canvasRect.left) - pad) + 'px';
                target.style.top = (Math.round(rect.top - canvasRect.top) - pad) + 'px';
                target.style.width = (Math.round(rect.width) + pad * 2) + 'px';
                target.style.height = (Math.round(rect.height) + pad * 2) + 'px';
                target.style.borderRadius = '16px';
                target.style.zIndex = '5';
                target.style.pointerEvents = this.connectionMode ? 'auto' : 'none';
                target.style.background = 'transparent';

                if (title === 'bronze') {
                    // Bronze sits at the very bottom; ensure hit area is on top and large enough
                    target.style.zIndex = '10';
                }

                target.addEventListener('click', (e) => {
                    if (!this.connectionMode) return;
                    e.preventDefault();
                    this.handleMedallionClick(target);
                });

                canvas.appendChild(target);
            });
        };

        createOrUpdateTargets();
            window.addEventListener('resize', createOrUpdateTargets);
        const ro = new ResizeObserver(createOrUpdateTargets);
        ro.observe(canvas);
            // Observe DOM changes to the background layout too
            const bg = canvas.querySelector('.canvas-background');
            if (bg) {
                const mo = new MutationObserver(createOrUpdateTargets);
                mo.observe(bg, { attributes: true, childList: true, subtree: true });
            }
    }

    handleMedallionClick(targetEl) {
        if (!this.connectionMode) return;

        // If a source is selected, connect source -> medallion
        if (this.selectedSource && !this.selectedItem) {
            this.createConnection(this.selectedSource, targetEl, 'source-to-item');
            this.selectedSource = null;
            this.clearSelections();
            return;
        }

        // Allow connecting items -> medallion (optional)
        if (!this.selectedItem) {
            this.clearSelections();
            targetEl.classList.add('selected');
            this.selectedItem = targetEl;
            this.showNotification('Medallion selected. Click another canvas item to connect.', 'info');
        } else if (this.selectedItem !== targetEl) {
            this.createConnection(this.selectedItem, targetEl, 'item-to-item');
            this.selectedItem = null;
            this.clearSelections();
        }
    }

    initializeConnectionLayer() {
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;
        // Create an SVG overlay for connections
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${canvas.clientWidth} ${canvas.clientHeight}`);
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.right = '0';
        svg.style.bottom = '0';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '1'; // behind items, above background

        // Ensure canvas is positioned (should be already)
        canvas.style.position = canvas.style.position || 'relative';
        canvas.appendChild(svg);
        this.connectionSvg = svg;

        // Keep connections accurate on resize
        window.addEventListener('resize', () => {
            svg.setAttribute('viewBox', `0 0 ${canvas.clientWidth} ${canvas.clientHeight}`);
            this.updateConnections();
        });
    }

    // Ensure the canvas scrollable area includes all items (prevents items from going "outside")
    ensureCanvasExtents() {
        // Temporarily disabled to prevent background layout disruption
        // TODO: Implement proper canvas extent management that preserves background
        return;
        
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas || !this.canvasSpacer) return;
        let maxRight = canvas.clientWidth;
        let maxBottom = canvas.clientHeight;
        for (const ci of this.canvasItems) {
            const el = ci.element;
            if (!el) continue;
            const left = parseInt(el.style.left) || 0;
            const top = parseInt(el.style.top) || 0;
            const right = left + (el.offsetWidth || 140);
            const bottom = top + (el.offsetHeight || 140);
            if (right > maxRight) maxRight = right;
            if (bottom > maxBottom) maxBottom = bottom;
        }
        // Add a friendly margin
        maxRight += this.canvasMargin;
        maxBottom += this.canvasMargin;
        this.canvasSpacer.style.width = Math.max(maxRight, canvas.clientWidth) + 'px';
        this.canvasSpacer.style.height = Math.max(maxBottom, canvas.clientHeight) + 'px';
    }

    setupDragAndDrop() {
        this.setupDataSourceDragAndDrop();
    // Right-panel consumption removed; palette now handles consumption items
        this.setupCanvasDragAndDrop();
    }

    // Compute the usable "Prepare" area inside the canvas using CSS variables
    getPrepareBounds() {
        const canvas = document.getElementById('fabric-canvas');
        const bg = canvas ? canvas.querySelector('.canvas-background') : null;
        const cs = bg ? getComputedStyle(bg) : null;
        const n = (v, fallback = 0) => {
            const parsed = parseInt(String(v || '').replace('px', '').trim(), 10);
            return isFinite(parsed) ? parsed : fallback;
        };
        const outerPad = cs ? n(cs.paddingLeft, 8) : 8; // .canvas-background padding
        const gutter = cs ? n(cs.getPropertyValue('--gutter'), 8) : 8;
        const serveW = cs ? n(cs.getPropertyValue('--serve-width'), 200) : 200;
        const consumeW = cs ? n(cs.getPropertyValue('--consume-width'), 120) : 120;
        const medH = cs ? n(cs.getPropertyValue('--medallion-height'), 170) : 170;

        const width = canvas ? canvas.clientWidth : 0;
        const height = canvas ? canvas.clientHeight : 0;

        const minX = outerPad + gutter;
        const minY = outerPad + gutter;
        const maxX = Math.max(minX, width - (serveW + consumeW + outerPad + 3 * gutter));
        const maxY = Math.max(minY, height - (medH + outerPad + 2 * gutter));

        return { minX, minY, maxX, maxY };
    }

    setupDataSourceDragAndDrop() {
        // Handle traditional data source items (if any remain)
        const dataSourceItems = document.querySelectorAll('.data-source-item');
        dataSourceItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                if (this.connectionMode) {
                    e.preventDefault();
                    return;
                }
                
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'data-source',
                    name: item.querySelector('.source-name').textContent,
                    sourceType: item.querySelector('.source-type').textContent,
                    icon: item.querySelector('i').className
                }));
            });

            // Click handler for connection mode
            item.addEventListener('click', (e) => {
                if (this.connectionMode) {
                    e.preventDefault();
                    this.handleDataSourceClick(item);
                }
            });
        });

        // Handle new palette data source items
        const paletteDataSources = document.querySelectorAll('.palette-item[data-type="data-source"]');
        paletteDataSources.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                if (this.connectionMode) {
                    e.preventDefault();
                    return;
                }
                
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'data-source',
                    name: item.getAttribute('data-source-name'),
                    sourceType: item.getAttribute('data-source-type'),
                    icon: item.getAttribute('data-icon')
                }));
            });

            // Click handler for connection mode  
            item.addEventListener('click', (e) => {
                if (this.connectionMode) {
                    e.preventDefault();
                    this.handleDataSourceClick(item);
                }
            });
        });
    }

    // setupConsumptionDragAndDrop removed (consumption panel removed)

    setupCanvasDragAndDrop() {
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;

        console.log('setupCanvasDragAndDrop called, canvas found:', canvas);

        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        canvas.addEventListener('drop', (e) => {
            e.preventDefault();

            try {
                const dataText = e.dataTransfer.getData('text/plain');
                if (!dataText || dataText.trim() === '') {
                    console.log('No data in drop event, ignoring');
                    return;
                }
                
                const data = JSON.parse(dataText);
                const rect = canvas.getBoundingClientRect();

                // Account for canvas padding (4px) in coordinate calculation
                const canvasPadding = 4;
                let x = e.clientX - rect.left - canvasPadding;
                let y = e.clientY - rect.top - canvasPadding;

                // Dynamic clamping: full canvas width and above medallion row
                const bg = canvas.querySelector('.canvas-background');
                const cs = bg ? getComputedStyle(bg) : null;
                const n = (v, fb) => { const p = parseInt(String(v||'').replace('px','').trim(),10); return isFinite(p) ? p : fb; };
                const medH = cs ? n(cs.getPropertyValue('--medallion-height'), 170) : 170;
                const outerPad = 8; // .canvas-background padding
                const itemSize = 120; // approximate item size (fits 110x110)
                const safeAreaWidth = canvas.clientWidth;
                const safeAreaHeight = Math.max(40, canvas.clientHeight - medH - (outerPad * 2));

                // Clamp to visible build area
                const clampedX = Math.max(20, Math.min(x, safeAreaWidth - itemSize));
                const clampedY = Math.max(20, Math.min(y, safeAreaHeight - itemSize));

                // Snap to grid for consistent placement
                const snapped = this.snapToGrid(clampedX, clampedY);

                if (data.type === 'data-source') {
                    this.addDataSourceToCanvas(data, snapped.x, snapped.y);
                } else if (data.type === 'consumption-item') {
                    this.addConsumptionItemToCanvas(data, snapped.x, snapped.y);
                } else if (data.type === 'canvas-item') {
                    this.addCanvasItem(data.itemType, snapped.x, snapped.y);
                }
            } catch (error) {
                console.error('Error handling drop:', error);
            }
        });

        // Also accept drops when hovering over the in-canvas sources window
        const win = document.getElementById('canvas-sources-window');
        const winBody = win ? win.querySelector('.canvas-window-body') : null;
        const forwardDrop = (ev) => {
            ev.preventDefault();
            try {
                const data = JSON.parse(ev.dataTransfer.getData('text/plain'));
                const rect = canvas.getBoundingClientRect();

                // Account for canvas padding (4px) in coordinate calculation
                const canvasPadding = 4;
                let x = ev.clientX - rect.left - canvasPadding;
                let y = ev.clientY - rect.top - canvasPadding;

                const bg2 = canvas.querySelector('.canvas-background');
                const cs2 = bg2 ? getComputedStyle(bg2) : null;
                const n2 = (v, fb) => { const p = parseInt(String(v||'').replace('px','').trim(),10); return isFinite(p) ? p : fb; };
                const medH2 = cs2 ? n2(cs2.getPropertyValue('--medallion-height'), 170) : 170;
                const outerPad2 = 8;
                const itemSize2 = 120;
                const safeAreaWidth2 = canvas.clientWidth;
                const safeAreaHeight2 = Math.max(40, canvas.clientHeight - medH2 - (outerPad2 * 2));
                const clampedX = Math.max(20, Math.min(x, safeAreaWidth2 - itemSize2));
                const clampedY = Math.max(20, Math.min(y, safeAreaHeight2 - itemSize2));

                // Snap to grid for consistent placement
                const snapped = this.snapToGrid(clampedX, clampedY);

                if (data.type === 'data-source') {
                    this.addDataSourceToCanvas(data, snapped.x, snapped.y);
                } else if (data.type === 'consumption-item') {
                    this.addConsumptionItemToCanvas(data, snapped.x, snapped.y);
                } else if (data.type === 'canvas-item') {
                    this.addCanvasItem(data.itemType, snapped.x, snapped.y);
                }
            } catch (error) {
                console.error('Error handling drop over window:', error);
            }
        };
        if (win) {
            win.addEventListener('drop', forwardDrop);
        }
        if (winBody) {
            winBody.addEventListener('drop', forwardDrop);
        }
    }

    handleItemTypeSelection() {}

    addSelectedItemToCanvas() {}

    addConsumptionItemToCanvas(data, x, y) {
        this.saveState('add consumption item');
        
        const canvas = document.getElementById('fabric-canvas');
        const item = document.createElement('div');
        item.className = 'canvas-item consumption-canvas-item ci-consumption-' + (data.consumptionType || 'generic');
        item.draggable = true;
        
        const itemId = 'canvas-item-' + Date.now();
        item.id = itemId;
        
        item.innerHTML = `
            <div class="canvas-item-header">
                <div class="ci-icon" style="--ci-accent: ${data.iconColor || '#0078D4'}">
                    <i class="${data.icon}"></i>
                </div>
                <span class="canvas-item-title">${data.name}</span>
            </div>
            <div class="canvas-item-type">${data.category}</div>
        `;
        
        // Place at exact coordinates without additional clamping
        item.style.left = x + 'px';
        item.style.top = y + 'px';
        item.style.visibility = 'visible';
        
        this.setupCanvasItemDrag(item);
        this.setupCanvasItemClick(item);
        
    canvas.appendChild(item);
    
    // Add status indicator if metadata exists
    if (data.meta && data.meta.business && data.meta.business.status) {
        updateComponentStatusIndicator(item, data.meta.business.status);
    }
    
    // Attach quick actions if edit mode is on
    if (this.editMode) this.showItemQuickActions(true);
        this.canvasItems.push({
            id: itemId,
            element: item,
            type: 'consumption',
            data: data
        });
        
        this.ensureCanvasExtents();
        this.showNotification(`Added ${data.name} to canvas`, 'success');
    }

    addDataSourceToCanvas(data, x, y) {
        this.saveState('add data source');
        
        const canvas = document.getElementById('fabric-canvas');
        const item = document.createElement('div');
        item.className = 'canvas-item data-source-canvas-item ci-data-source';
        item.draggable = true;
        
        const itemId = 'canvas-item-' + Date.now();
        item.id = itemId;
        
        item.innerHTML = `
            <div class="canvas-item-header">
                <div class="ci-icon">
                    <i class="${data.icon}"></i>
                </div>
                <span class="canvas-item-title">${data.name}</span>
            </div>
            <div class="canvas-item-type">${data.sourceType}</div>
        `;
        
        // Place at exact coordinates without additional clamping
        item.style.left = x + 'px';
        item.style.top = y + 'px';
        item.style.visibility = 'visible';
        
        this.setupCanvasItemDrag(item);
        this.setupCanvasItemClick(item);
        
        canvas.appendChild(item);
        
        // Force reflow to ensure element is properly rendered
        item.offsetHeight;
        
        // Add status indicator if metadata exists
        if (data.meta && data.meta.business && data.meta.business.status) {
            updateComponentStatusIndicator(item, data.meta.business.status);
        }
        
        if (this.editMode) this.showItemQuickActions(true);
        this.canvasItems.push({
            id: itemId,
            element: item,
            type: 'data-source',
            data: data
        });
        
        this.ensureCanvasExtents();
        this.showNotification(`Added ${data.name} to canvas`, 'success');
    }

    addCanvasItem(itemType, x, y) {
        this.saveState('add ' + itemType);
        
        const canvas = document.getElementById('fabric-canvas');
        const item = document.createElement('div');
        const typeClass = this.getTypeClass(itemType);
        item.className = `canvas-item ${typeClass}`;
        item.draggable = true;
        
        // Ensure medallions use their specific accent colors and force styling
        if (itemType === 'bronze') {
            item.style.setProperty('--ci-accent', '#cd7f32');
            // Force medallion styling
            item.style.width = '140px';
            item.style.height = '130px';
            item.style.padding = '12px';
        } else if (itemType === 'silver') {
            item.style.setProperty('--ci-accent', '#c0c0c0');
            item.style.width = '140px';
            item.style.height = '130px';
            item.style.padding = '12px';
        } else if (itemType === 'gold') {
            item.style.setProperty('--ci-accent', '#ffd700');
            item.style.width = '140px';
            item.style.height = '130px';
            item.style.padding = '12px';
        } else if (itemType === 'platinum') {
            item.style.setProperty('--ci-accent', '#e5e4e2');
            item.style.width = '140px';
            item.style.height = '130px';
            item.style.padding = '12px';
        }
        
    const itemId = this.ensureElementId(item, 'canvas-item');
        
        const itemConfig = this.getItemConfig(itemType);
        
        item.innerHTML = `
            <div class="canvas-item-header">
                <div class="ci-icon">
                    ${this.getIconMarkup(itemType)}
                </div>
                <span class="canvas-item-title">${itemConfig.name}</span>
            </div>
            <div class="canvas-item-type">${itemConfig.type}</div>
        `;
        
        // Place at exact coordinates without additional clamping
        item.style.left = x + 'px';
        item.style.top = y + 'px';
        item.style.visibility = 'visible';
        
        this.setupCanvasItemDrag(item);
        this.setupCanvasItemClick(item);
        
    canvas.appendChild(item);
    
    // Add status indicator if metadata exists
    if (itemConfig.meta && itemConfig.meta.business && itemConfig.meta.business.status) {
        updateComponentStatusIndicator(item, itemConfig.meta.business.status);
    }
    
    if (this.editMode) this.showItemQuickActions(true);
        this.canvasItems.push({
            id: itemId,
            element: item,
            type: itemType,
            data: itemConfig
        });
        
        this.ensureCanvasExtents();
        this.showNotification(`Added ${itemConfig.name} to canvas`, 'success');
        
        // Close any open palette dropdowns after successful item addition
        closeAllDropdowns();
        
        // Auto-save after adding item
        setTimeout(() => this.autosave(), 500);
    }

    getItemConfig(itemType) {
        const configs = {
            // Analytics & Models
            'notebook': { icon: '📓', name: 'Notebook', type: 'Development' },
            'dataset': { icon: '📊', name: 'Dataset', type: 'Data' },
            'semantic-model': { icon: '🧱', name: 'Semantic Model', type: 'Data Modeling' },
            'ml-model': { icon: '🤖', name: 'ML Model', type: 'Machine Learning' },
            'experiment': { icon: '🧪', name: 'Experiment', type: 'Research' },
            
            // Storage & Processing
            'pipeline': { icon: '🔄', name: 'Data Pipeline', type: 'Data Engineering' },
            'dataflow': { icon: '🌊', name: 'Dataflow', type: 'Data Engineering' },
            'warehouse': { icon: '🏬', name: 'Warehouse', type: 'Storage' },
            'lakehouse': { icon: '🏞️', name: 'Lakehouse', type: 'Storage' },
            'data-lake': { icon: '�️', name: 'Data Lake', type: 'Raw Data Storage' },
            'etl': { icon: '⚙️', name: 'ETL Process', type: 'Data Engineering' },
            
            // Data Sources
            'api': { icon: '🔌', name: 'API', type: 'Data Source' },
            'file-source': { icon: '📁', name: 'File Source', type: 'Data Source' },
            'stream': { icon: '🌊', name: 'Data Stream', type: 'Real-time Data' },
            'web-scrape': { icon: '🕷️', name: 'Web Scraping', type: 'Data Source' },
            
            // Reporting & Visualization
            'report': { icon: '📈', name: 'Report', type: 'Analytics' },
            'dashboard': { icon: '📋', name: 'Dashboard', type: 'Analytics' },
            'tableau': { icon: '📊', name: 'Tableau', type: 'Visualization' },
            'qlik': { icon: '📈', name: 'Qlik', type: 'Visualization' },
            
            // Data Access
            'rest-api': { icon: '�', name: 'REST API', type: 'Data Access' },
            'graphql': { icon: '🔗', name: 'GraphQL', type: 'Data Access' },
            'odata': { icon: '�', name: 'OData', type: 'Data Access' },
            
            // Medallion Architecture
            'bronze': { icon: '🥉', name: 'Bronze', type: 'Raw data' },
            'silver': { icon: '🥈', name: 'Silver', type: 'Cleaned data' },
            'gold': { icon: '🥇', name: 'Gold', type: 'Modelled data' },
            'platinum': { icon: '💎', name: 'Platinum', type: 'ML ready data' },
            
            // Governance & Security
            'data-catalog': { icon: '🔍', name: 'Data Catalog', type: 'Governance' },
            'data-lineage': { icon: '🗺️', name: 'Data Lineage', type: 'Governance' },
            'purview': { icon: '👁️', name: 'Microsoft Purview', type: 'Governance' },
            'onelake-hub': { icon: '🏢', name: 'OneLake Data Hub', type: 'Governance' },
            'data-quality': { icon: '✅', name: 'Data Quality', type: 'Quality Management' },
            'dq-rules': { icon: '📋', name: 'DQ Rules', type: 'Quality Management' },
            'data-profiling': { icon: '📊', name: 'Data Profiling', type: 'Quality Management' },
            'security-policy': { icon: '🛡️', name: 'Security Policy', type: 'Security' },
            'rls': { icon: '👤', name: 'Row Level Security', type: 'Security' },
            'abac': { icon: '🔑', name: 'ABAC', type: 'Security' },
            'pii-classification': { icon: '🕵️', name: 'PII Classification', type: 'Security' },
            'data-classification': { icon: '🏷️', name: 'Data Classification', type: 'Security' }
        };
        
        return configs[itemType] || { icon: '❓', name: 'Unknown', type: 'Unknown' };
    }

    getTypeClass(itemType) {
        switch (itemType) {
            // Analytics & Models
            case 'notebook': return 'ci-notebook';
            case 'dataset': return 'ci-dataset';
            case 'semantic-model': return 'ci-semantic-model';
            case 'ml-model': return 'ci-report'; // Reuse existing styling
            case 'experiment': return 'ci-notebook'; // Reuse existing styling
            
            // Storage & Processing
            case 'pipeline': return 'ci-pipeline';
            case 'dataflow': return 'ci-dataflow';
            case 'warehouse': return 'ci-warehouse';
            case 'lakehouse': return 'ci-lakehouse';
            case 'data-lake': return 'ci-data-source';
            case 'etl': return 'ci-pipeline'; // Reuse pipeline styling
            
            // Data Sources
            case 'api': return 'ci-data-source';
            case 'file-source': return 'ci-data-source';
            case 'stream': return 'ci-data-source';
            case 'web-scrape': return 'ci-data-source';
            
            // Reporting & Visualization
            case 'report': return 'ci-report';
            case 'dashboard': return 'ci-dashboard';
            case 'tableau': return 'ci-dashboard'; // Reuse dashboard styling
            case 'qlik': return 'ci-dashboard'; // Reuse dashboard styling
            
            // Data Access
            case 'rest-api': return 'ci-data-source';
            case 'graphql': return 'ci-data-source';
            case 'odata': return 'ci-data-source';
            
            // Medallion Architecture
            case 'bronze': return 'ci-medallion ci-medallion-bronze';
            case 'silver': return 'ci-medallion ci-medallion-silver';
            case 'gold': return 'ci-medallion ci-medallion-gold';
            case 'platinum': return 'ci-medallion ci-medallion-platinum';
            
            // Governance & Security
            case 'data-catalog': return 'ci-governance ci-governance-catalog';
            case 'data-lineage': return 'ci-governance ci-governance-lineage';
            case 'purview': return 'ci-governance ci-governance-purview';
            case 'onelake-hub': return 'ci-governance ci-governance-hub';
            case 'data-quality': return 'ci-governance ci-governance-quality';
            case 'dq-rules': return 'ci-governance ci-governance-rules';
            case 'data-profiling': return 'ci-governance ci-governance-profiling';
            case 'security-policy': return 'ci-governance ci-governance-security';
            case 'rls': return 'ci-governance ci-governance-rls';
            case 'abac': return 'ci-governance ci-governance-abac';
            case 'pii-classification': return 'ci-governance ci-governance-pii';
            case 'data-classification': return 'ci-governance ci-governance-classification';
            
            default: return 'ci-dataset'; // Default fallback
        }
    }

    getIconMarkup(itemType) {
        // Prefer Font Awesome where it fits; fallback to emoji
        const fa = {
            // Analytics & Models
            'notebook': '<i class="fas fa-book"></i>',
            'dataset': '<i class="fas fa-table"></i>',
            'semantic-model': '<i class="fas fa-cubes"></i>',
            'ml-model': '<i class="fas fa-robot"></i>',
            'experiment': '<i class="fas fa-flask"></i>',
            
            // Storage & Processing
            'pipeline': '<i class="fas fa-arrows-rotate"></i>',
            'dataflow': '<i class="fas fa-diagram-project"></i>',
            'warehouse': '<i class="fas fa-warehouse"></i>',
            'lakehouse': '<i class="fas fa-water"></i>',
            'data-lake': '<i class="fas fa-lake"></i>',
            'etl': '<i class="fas fa-cogs"></i>',
            
            // Data Sources
            'api': '<i class="fas fa-plug"></i>',
            'file-source': '<i class="fas fa-file"></i>',
            'stream': '<i class="fas fa-stream"></i>',
            'web-scrape': '<i class="fas fa-spider"></i>',
            
            // Reporting & Visualization
            'report': '<i class="fas fa-chart-line"></i>',
            'dashboard': '<i class="fas fa-gauge-high"></i>',
            'tableau': '<i class="fas fa-chart-area" style="color: #e97627;"></i>',
            'qlik': '<i class="fas fa-chart-pie" style="color: #009845;"></i>',
            
            // Data Access
            'rest-api': '<i class="fas fa-globe"></i>',
            'graphql': '<i class="fas fa-project-diagram" style="color: #e10098;"></i>',
            'odata': '<i class="fas fa-link"></i>',
            
            // Medallion Architecture
            'bronze': '<i class="fas fa-award" style="color: #cd7f32;"></i>',
            'silver': '<i class="fas fa-award" style="color: #c0c0c0;"></i>',
            'gold': '<i class="fas fa-award" style="color: #ffd700;"></i>',
            'platinum': '<i class="fas fa-award" style="color: #e5e4e2;"></i>',
            
            // Governance & Security
            'data-catalog': '<i class="fas fa-search" style="color: #0078d4;"></i>',
            'data-lineage': '<i class="fas fa-route" style="color: #6c757d;"></i>',
            'purview': '<i class="fas fa-eye" style="color: #0078d4;"></i>',
            'onelake-hub': '<i class="fas fa-hub" style="color: #5c2d91;"></i>',
            'data-quality': '<i class="fas fa-check-circle" style="color: #28a745;"></i>',
            'dq-rules': '<i class="fas fa-list-check" style="color: #17a2b8;"></i>',
            'data-profiling': '<i class="fas fa-chart-pie" style="color: #ffc107;"></i>',
            'security-policy': '<i class="fas fa-shield-check" style="color: #dc3545;"></i>',
            'rls': '<i class="fas fa-user-shield" style="color: #6f42c1;"></i>',
            'abac': '<i class="fas fa-key" style="color: #e83e8c;"></i>',
            'pii-classification': '<i class="fas fa-user-secret" style="color: #fd7e14;"></i>',
            'data-classification': '<i class="fas fa-tags" style="color: #20c997;"></i>'
        };
        return fa[itemType] || `<span class="emoji">${this.getItemConfig(itemType).icon}</span>`;
    }

    // Snap coordinates to grid
    snapToGrid(x, y) {
        return {
            x: Math.round(x / this.gridSize) * this.gridSize,
            y: Math.round(y / this.gridSize) * this.gridSize
        };
    }

    // === UNDO/REDO SYSTEM ===
    saveState(actionType = 'action') {
        const state = {
            items: this.canvasItems.map(ci => ({
                id: ci.id,
                type: ci.type,
                data: ci.data,
                position: {
                    x: parseInt(ci.element.style.left) || 0,
                    y: parseInt(ci.element.style.top) || 0
                }
            })),
            connections: this.connections.map(conn => ({
                id: conn.id,
                type: conn.type,
                fromId: conn.from.id || null,
                toId: conn.to.id || null
            })),
            actionType,
            timestamp: Date.now()
        };
        
        this.undoStack.push(state);
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Clear redo stack on new action
    }

    undo() {
        if (this.undoStack.length === 0) {
            this.showNotification('Nothing to undo', 'warning');
            return;
        }
        
        // Save current state to redo stack
        const currentState = {
            items: this.canvasItems.map(ci => ({
                id: ci.id,
                type: ci.type,
                data: ci.data,
                position: {
                    x: parseInt(ci.element.style.left) || 0,
                    y: parseInt(ci.element.style.top) || 0
                }
            })),
            connections: this.connections.map(conn => ({
                id: conn.id,
                type: conn.type,
                fromId: conn.from.id || null,
                toId: conn.to.id || null
            })),
            timestamp: Date.now()
        };
        this.redoStack.push(currentState);
        
        // Restore previous state
        const prevState = this.undoStack.pop();
        this.loadFromData(prevState);
        this.showNotification(`Undone: ${prevState.actionType}`, 'info');
    }

    redo() {
        if (this.redoStack.length === 0) {
            this.showNotification('Nothing to redo', 'warning');
            return;
        }
        
        // Save current state to undo stack
        this.saveState('redo');
        
        // Restore next state
        const nextState = this.redoStack.pop();
        this.loadFromData(nextState);
        this.showNotification('Redone action', 'info');
    }

    setupUndoRedo() {
        // Save initial state
        this.saveState('initial');
    }

    // === MULTI-SELECT SYSTEM ===
    setupMultiSelect() {
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;

        canvas.addEventListener('mousedown', (e) => {
            // Allow drag selection only when NOT in edit mode and NOT in connection mode
            if (this.connectionMode) return;
            
            // Check if clicking on empty canvas (not on an item)
            if (e.target === canvas || e.target.classList.contains('canvas-background')) {
                this.startSelection(e);
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (this.isSelecting) {
                this.updateSelection(e);
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            if (this.isSelecting) {
                this.endSelection(e);
            }
        });
    }

    startSelection(e) {
        this.isSelecting = true;
        const canvas = document.getElementById('fabric-canvas');
        const rect = canvas.getBoundingClientRect();
        
        this.selectionStart = {
            x: e.clientX - rect.left + canvas.scrollLeft,
            y: e.clientY - rect.top + canvas.scrollTop
        };

        // Create selection box
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'selection-box';
        this.selectionBox.style.cssText = `
            position: absolute;
            border: 2px dashed #0078d4;
            background: rgba(0, 120, 212, 0.1);
            pointer-events: none;
            z-index: 1000;
            left: ${this.selectionStart.x}px;
            top: ${this.selectionStart.y}px;
            width: 0px;
            height: 0px;
        `;
        canvas.appendChild(this.selectionBox);

        // Clear previous selection if not holding Ctrl
        if (!e.ctrlKey) {
            this.clearSelection();
        }
    }

    updateSelection(e) {
        if (!this.selectionBox) return;
        
        const canvas = document.getElementById('fabric-canvas');
        const rect = canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left + canvas.scrollLeft;
        const currentY = e.clientY - rect.top + canvas.scrollTop;

        const left = Math.min(this.selectionStart.x, currentX);
        const top = Math.min(this.selectionStart.y, currentY);
        const width = Math.abs(currentX - this.selectionStart.x);
        const height = Math.abs(currentY - this.selectionStart.y);

        this.selectionBox.style.left = left + 'px';
        this.selectionBox.style.top = top + 'px';
        this.selectionBox.style.width = width + 'px';
        this.selectionBox.style.height = height + 'px';

        // Highlight items within selection
        this.highlightItemsInSelection(left, top, width, height);
    }

    endSelection(e) {
        if (this.selectionBox) {
            // Get final selection area
            const canvas = document.getElementById('fabric-canvas');
            const rect = canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left + canvas.scrollLeft;
            const currentY = e.clientY - rect.top + canvas.scrollTop;

            const left = Math.min(this.selectionStart.x, currentX);
            const top = Math.min(this.selectionStart.y, currentY);
            const width = Math.abs(currentX - this.selectionStart.x);
            const height = Math.abs(currentY - this.selectionStart.y);

            // Final highlight of items in selection
            this.highlightItemsInSelection(left, top, width, height);
            
            // Show notification of selected items
            if (this.selectedItems.size > 0) {
                this.showNotification(`Selected ${this.selectedItems.size} items`, 'info');
            }
            
            this.selectionBox.remove();
            this.selectionBox = null;
        }
        this.isSelecting = false;
    }

    highlightItemsInSelection(left, top, width, height) {
        // During drag selection, we temporarily highlight items
        // but only add them to selectedItems on endSelection
        this.canvasItems.forEach(ci => {
            const element = ci.element;
            if (!element) return;

            const itemLeft = parseInt(element.style.left) || 0;
            const itemTop = parseInt(element.style.top) || 0;
            const itemWidth = element.offsetWidth || 110;
            const itemHeight = element.offsetHeight || 110;

            // Check if item overlaps with selection box
            const overlaps = !(itemLeft > left + width || 
                            itemLeft + itemWidth < left || 
                            itemTop > top + height || 
                            itemTop + itemHeight < top);

            if (overlaps) {
                this.selectedItems.add(ci);
                element.classList.add('multi-selected');
            } else if (this.isSelecting) {
                // During active selection, remove items that are no longer in selection
                this.selectedItems.delete(ci);
                element.classList.remove('multi-selected');
            }
        });
    }

    clearSelection() {
        this.selectedItems.clear();
        document.querySelectorAll('.canvas-item.multi-selected').forEach(el => {
            el.classList.remove('multi-selected');
        });
    }

    selectAllItems() {
        this.clearSelection();
        this.canvasItems.forEach(ci => {
            this.selectedItems.add(ci);
            ci.element.classList.add('multi-selected');
        });
        this.showNotification(`Selected ${this.selectedItems.size} items`, 'info');
    }

    deleteSelectedItems() {
        if (this.selectedItems.size === 0) return;
        
        this.saveState('delete selected');
        
        const itemsToDelete = Array.from(this.selectedItems);
        
        itemsToDelete.forEach(ci => {
            this.deleteCanvasItem(ci);
        });
        
        this.clearSelection();
        this.showNotification(`Deleted ${itemsToDelete.length} items`, 'success');
    }

    // === TEMPLATES SYSTEM ===
    initializeTemplates() {
        return {
            medallion: {
                name: "Medallion Architecture",
                description: "Bronze → Silver → Gold data lakehouse pattern",
                items: [
                    { type: 'data-lake', x: 200, y: 250 }, // Use data-lake canvas item instead of data-source
                    { type: 'bronze', x: 450, y: 250 },
                    { type: 'silver', x: 700, y: 250 },
                    { type: 'gold', x: 950, y: 250 },
                    { type: 'semantic-model', x: 1200, y: 250 },
                    { type: 'consumption-item', name: 'Power BI', category: 'Analytics', consumptionType: 'powerbi', x: 1450, y: 250, icon: 'fas fa-chart-bar', iconColor: '#F2C811' }
                ],
                connections: [
                    { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 }
                ]
            },
            lambda: {
                name: "Lambda Architecture",
                description: "Batch + Speed layers with serving layer",
                items: [
                    { type: 'data-lake', x: 200, y: 150 }, // Event Stream
                    { type: 'data-lake', x: 200, y: 350 }, // Batch Data
                    { type: 'pipeline', x: 500, y: 150 }, // Speed layer
                    { type: 'pipeline', x: 500, y: 350 }, // Batch layer
                    { type: 'warehouse', x: 800, y: 250 }, // Serving layer
                    { type: 'semantic-model', x: 1100, y: 250 },
                    { type: 'consumption-item', name: 'Dashboard', category: 'Analytics', consumptionType: 'powerbi', x: 1400, y: 250, icon: 'fas fa-chart-bar', iconColor: '#F2C811' }
                ],
                connections: [
                    { from: 0, to: 2 }, { from: 1, to: 3 }, { from: 2, to: 4 }, { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 }
                ]
            },
            starSchema: {
                name: "Star Schema",
                description: "Central fact table with dimension tables",
                items: [
                    { type: 'data-lake', x: 200, y: 300 }, // Sales Data source
                    { type: 'dataset', x: 500, y: 120 }, // Dim Customer
                    { type: 'dataset', x: 700, y: 120 }, // Dim Product  
                    { type: 'dataset', x: 900, y: 120 }, // Dim Time
                    { type: 'warehouse', x: 700, y: 300 }, // Fact Sales (center)
                    { type: 'dataset', x: 500, y: 480 }, // Dim Store
                    { type: 'dataset', x: 900, y: 480 }, // Dim Geography
                    { type: 'semantic-model', x: 1200, y: 300 },
                    { type: 'consumption-item', name: 'Reports', category: 'Analytics', consumptionType: 'powerbi', x: 1500, y: 300, icon: 'fas fa-chart-line', iconColor: '#F2C811' }
                ],
                connections: [
                    { from: 0, to: 4 }, { from: 1, to: 4 }, { from: 2, to: 4 }, { from: 3, to: 4 }, 
                    { from: 5, to: 4 }, { from: 6, to: 4 }, { from: 4, to: 7 }, { from: 7, to: 8 }
                ]
            },
            dataVault: {
                name: "Data Vault 2.0",
                description: "Hub, Link, and Satellite pattern for data warehousing",
                items: [
                    { type: 'data-lake', x: 200, y: 150 }, // CRM System
                    { type: 'data-lake', x: 200, y: 350 }, // ERP System
                    { type: 'warehouse', x: 500, y: 150 }, // Hub Customer
                    { type: 'warehouse', x: 500, y: 350 }, // Hub Product
                    { type: 'warehouse', x: 800, y: 250 }, // Link Customer-Product
                    { type: 'dataset', x: 650, y: 100 }, // Sat Customer Details
                    { type: 'dataset', x: 650, y: 400 }, // Sat Product Details
                    { type: 'semantic-model', x: 1100, y: 250 },
                    { type: 'consumption-item', name: 'Analytics', category: 'BI', consumptionType: 'powerbi', x: 1400, y: 250, icon: 'fas fa-chart-bar', iconColor: '#F2C811' }
                ],
                connections: [
                    { from: 0, to: 2 }, { from: 1, to: 3 }, { from: 2, to: 4 }, { from: 3, to: 4 },
                    { from: 2, to: 5 }, { from: 3, to: 6 }, { from: 4, to: 7 }, { from: 7, to: 8 }
                ]
            },
            modernDataStack: {
                name: "Modern Data Stack",
                description: "ELT with cloud-native tools",
                items: [
                    { type: 'data-lake', x: 200, y: 180 }, // SaaS Apps
                    { type: 'data-lake', x: 200, y: 320 }, // Databases
                    { type: 'pipeline', x: 500, y: 250 }, // ELT Tool
                    { type: 'warehouse', x: 800, y: 250 }, // Cloud DW
                    { type: 'semantic-model', x: 1100, y: 250 }, // dbt models
                    { type: 'consumption-item', name: 'BI Tool', category: 'Analytics', consumptionType: 'powerbi', x: 1400, y: 180, icon: 'fas fa-chart-bar', iconColor: '#F2C811' },
                    { type: 'consumption-item', name: 'Notebooks', category: 'ML', consumptionType: 'notebooks', x: 1400, y: 320, icon: 'fas fa-code', iconColor: '#6A5ACD' }
                ],
                connections: [
                    { from: 0, to: 2 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 4, to: 6 }
                ]
            },
            mlOps: {
                name: "MLOps Pipeline",
                description: "Machine learning operations workflow",
                items: [
                    { type: 'data-lake', x: 200, y: 250 }, // Training Data
                    { type: 'notebook', x: 500, y: 250 }, // Feature Engineering
                    { type: 'notebook', x: 800, y: 150 }, // Model Training
                    { type: 'warehouse', x: 800, y: 350 }, // Model Registry
                    { type: 'pipeline', x: 1100, y: 250 }, // Deployment Pipeline
                    { type: 'consumption-item', name: 'API Endpoint', category: 'Serving', consumptionType: 'sql-endpoint', x: 1400, y: 250, icon: 'fas fa-globe', iconColor: '#0078D4' }
                ],
                connections: [
                    { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 }
                ]
            },
            kappa: {
                name: "Kappa Architecture",
                description: "Stream-first processing with event-driven design",
                items: [
                    { type: 'stream', x: 200, y: 250 }, // Event Stream
                    { type: 'pipeline', x: 500, y: 150 }, // Stream Processing
                    { type: 'pipeline', x: 500, y: 350 }, // Batch Reprocessing
                    { type: 'warehouse', x: 800, y: 250 }, // Serving DB
                    { type: 'consumption-item', name: 'Real-time Dashboard', category: 'Analytics', consumptionType: 'powerbi', x: 1100, y: 180, icon: 'fas fa-chart-line', iconColor: '#F2C811' },
                    { type: 'consumption-item', name: 'API', category: 'Services', consumptionType: 'sql-endpoint', x: 1100, y: 320, icon: 'fas fa-globe', iconColor: '#0078D4' }
                ],
                connections: [
                    { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 }, { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 3, to: 5 }
                ]
            },
            dataMesh: {
                name: "Data Mesh Architecture",
                description: "Domain-driven data ownership with self-serve platform",
                items: [
                    { type: 'data-catalog', x: 650, y: 100 }, // Data Catalog
                    { type: 'warehouse', x: 200, y: 250 }, // Sales Domain
                    { type: 'warehouse', x: 450, y: 250 }, // Marketing Domain  
                    { type: 'warehouse', x: 700, y: 250 }, // Customer Domain
                    { type: 'warehouse', x: 950, y: 250 }, // Product Domain
                    { type: 'data-quality', x: 650, y: 400 }, // Data Quality
                    { type: 'security-policy', x: 950, y: 100 }, // Governance
                    { type: 'consumption-item', name: 'Self-Serve Analytics', category: 'Analytics', consumptionType: 'powerbi', x: 650, y: 550, icon: 'fas fa-chart-bar', iconColor: '#F2C811' }
                ],
                connections: [
                    { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 }, { from: 0, to: 4 },
                    { from: 1, to: 5 }, { from: 2, to: 5 }, { from: 3, to: 5 }, { from: 4, to: 5 },
                    { from: 6, to: 0 }, { from: 5, to: 7 }
                ]
            },
            eventDriven: {
                name: "Event-Driven Architecture",
                description: "Event sourcing with CQRS pattern",
                items: [
                    { type: 'stream', x: 200, y: 150 }, // Event Store
                    { type: 'stream', x: 200, y: 300 }, // Command Stream
                    { type: 'stream', x: 200, y: 450 }, // Query Stream
                    { type: 'pipeline', x: 500, y: 150 }, // Event Processing
                    { type: 'warehouse', x: 800, y: 225 }, // Read Model
                    { type: 'warehouse', x: 800, y: 375 }, // Write Model
                    { type: 'consumption-item', name: 'Real-time Views', category: 'Analytics', consumptionType: 'powerbi', x: 1100, y: 225, icon: 'fas fa-eye', iconColor: '#F2C811' },
                    { type: 'consumption-item', name: 'Command API', category: 'Services', consumptionType: 'sql-endpoint', x: 1100, y: 375, icon: 'fas fa-terminal', iconColor: '#0078D4' }
                ],
                connections: [
                    { from: 0, to: 3 }, { from: 1, to: 5 }, { from: 2, to: 4 }, { from: 3, to: 4 }, { from: 4, to: 6 }, { from: 5, to: 7 }
                ]
            },
            featureStore: {
                name: "Feature Store Architecture",
                description: "Centralized feature management for ML",
                items: [
                    { type: 'data-lake', x: 200, y: 180 }, // Raw Data
                    { type: 'data-lake', x: 200, y: 320 }, // Streaming Data
                    { type: 'pipeline', x: 500, y: 250 }, // Feature Engineering
                    { type: 'warehouse', x: 800, y: 180 }, // Offline Store
                    { type: 'warehouse', x: 800, y: 320 }, // Online Store
                    { type: 'data-catalog', x: 1100, y: 100 }, // Feature Registry
                    { type: 'ml-model', x: 1100, y: 250 }, // ML Models
                    { type: 'consumption-item', name: 'Real-time Inference', category: 'ML', consumptionType: 'sql-endpoint', x: 1400, y: 250, icon: 'fas fa-bolt', iconColor: '#FFD700' }
                ],
                connections: [
                    { from: 0, to: 2 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 2, to: 4 },
                    { from: 3, to: 5 }, { from: 4, to: 5 }, { from: 5, to: 6 }, { from: 4, to: 7 }
                ]
            },
            iotPlatform: {
                name: "IoT Data Platform",
                description: "Time-series data with edge computing",
                items: [
                    { type: 'stream', x: 200, y: 180 }, // IoT Sensors
                    { type: 'stream', x: 200, y: 320 }, // Edge Gateway
                    { type: 'pipeline', x: 500, y: 250 }, // Stream Processing
                    { type: 'warehouse', x: 800, y: 180 }, // Time-series DB
                    { type: 'data-lake', x: 800, y: 320 }, // Cold Storage
                    { type: 'data-quality', x: 500, y: 400 }, // Data Validation
                    { type: 'ml-model', x: 1100, y: 250 }, // Anomaly Detection
                    { type: 'consumption-item', name: 'IoT Dashboard', category: 'Monitoring', consumptionType: 'powerbi', x: 1400, y: 180, icon: 'fas fa-chart-line', iconColor: '#F2C811' },
                    { type: 'consumption-item', name: 'Alerts', category: 'Monitoring', consumptionType: 'sql-endpoint', x: 1400, y: 320, icon: 'fas fa-bell', iconColor: '#FF4500' }
                ],
                connections: [
                    { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 2, to: 4 },
                    { from: 2, to: 5 }, { from: 3, to: 6 }, { from: 6, to: 7 }, { from: 6, to: 8 }
                ]
            },
            customer360: {
                name: "Customer 360",
                description: "Unified customer view across touchpoints",
                items: [
                    { type: 'data-lake', x: 100, y: 120 }, // CRM
                    { type: 'data-lake', x: 100, y: 240 }, // E-commerce
                    { type: 'data-lake', x: 100, y: 360 }, // Support
                    { type: 'data-lake', x: 100, y: 480 }, // Social Media
                    { type: 'pipeline', x: 400, y: 300 }, // Data Integration
                    { type: 'data-quality', x: 700, y: 200 }, // Data Quality
                    { type: 'warehouse', x: 700, y: 400 }, // Golden Record
                    { type: 'semantic-model', x: 1000, y: 300 }, // Customer Model
                    { type: 'consumption-item', name: 'Customer Portal', category: 'CX', consumptionType: 'powerbi', x: 1300, y: 220, icon: 'fas fa-user', iconColor: '#6A5ACD' },
                    { type: 'consumption-item', name: 'Marketing Campaigns', category: 'Marketing', consumptionType: 'sql-endpoint', x: 1300, y: 380, icon: 'fas fa-bullhorn', iconColor: '#FF6347' }
                ],
                connections: [
                    { from: 0, to: 4 }, { from: 1, to: 4 }, { from: 2, to: 4 }, { from: 3, to: 4 },
                    { from: 4, to: 5 }, { from: 4, to: 6 }, { from: 5, to: 7 }, { from: 6, to: 7 },
                    { from: 7, to: 8 }, { from: 7, to: 9 }
                ]
            },
            dataFabric: {
                name: "Data Fabric",
                description: "Unified data management across hybrid environments",
                items: [
                    { type: 'data-catalog', x: 650, y: 100 }, // Unified Catalog
                    { type: 'data-lake', x: 200, y: 250 }, // On-premises
                    { type: 'warehouse', x: 450, y: 250 }, // Cloud DW
                    { type: 'data-lake', x: 700, y: 250 }, // Multi-cloud
                    { type: 'warehouse', x: 950, y: 250 }, // SaaS
                    { type: 'data-lineage', x: 325, y: 400 }, // Lineage Tracking
                    { type: 'security-policy', x: 650, y: 400 }, // Unified Security
                    { type: 'data-quality', x: 975, y: 400 }, // Quality Monitoring
                    { type: 'consumption-item', name: 'Unified Analytics', category: 'Analytics', consumptionType: 'powerbi', x: 650, y: 550, icon: 'fas fa-chart-bar', iconColor: '#F2C811' }
                ],
                connections: [
                    { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 }, { from: 0, to: 4 },
                    { from: 1, to: 5 }, { from: 2, to: 6 }, { from: 3, to: 7 }, { from: 4, to: 8 },
                    { from: 5, to: 8 }, { from: 6, to: 8 }, { from: 7, to: 8 }
                ]
            }
        };
    }

    setupTemplates() {
        // Template dropdown will be added to toolbar
        this.createTemplateDropdown();
    }

    createTemplateDropdown() {
        const toolbar = document.querySelector('.toolbar-left');
        if (!toolbar) return;

        const templateContainer = document.createElement('div');
        templateContainer.className = 'template-dropdown';
        templateContainer.innerHTML = `
            <button class="toolbar-btn template-btn" id="template-btn">
                <i class="fas fa-layer-group"></i>
                <span>Templates</span>
                <i class="fas fa-chevron-down"></i>
            </button>
            <div class="template-menu" id="template-menu">
                ${Object.entries(this.templates).map(([key, template]) => `
                    <div class="template-item" data-template="${key}">
                        <div class="template-name">${template.name}</div>
                        <div class="template-desc">${template.description}</div>
                    </div>
                `).join('')}
            </div>
        `;

        toolbar.appendChild(templateContainer);

        // Toggle dropdown
        const templateBtn = templateContainer.querySelector('#template-btn');
        const templateMenu = templateContainer.querySelector('#template-menu');
        
        templateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            templateMenu.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            templateMenu.classList.remove('show');
        });

        // Handle template selection
        templateMenu.addEventListener('click', (e) => {
            const templateItem = e.target.closest('.template-item');
            if (templateItem) {
                const templateKey = templateItem.dataset.template;
                this.loadTemplate(templateKey);
                templateMenu.classList.remove('show');
            }
        });
    }

    loadTemplate(templateKey) {
        const template = this.templates[templateKey];
        if (!template) return;

        // Save state before loading template
        this.saveState('load template: ' + template.name);

        // Clear current canvas
        this.clearCanvas();

        // Create items from template
        const createdItems = [];
        template.items.forEach((itemData, index) => {
            if (itemData.type === 'consumption-item') {
                this.addConsumptionItemToCanvas({
                    name: itemData.name,
                    category: itemData.category,
                    consumptionType: itemData.consumptionType,
                    icon: itemData.icon,
                    iconColor: itemData.iconColor
                }, itemData.x, itemData.y);
            } else {
                // All other items (including data-lake) are regular canvas items
                this.addCanvasItem(itemData.type, itemData.x, itemData.y);
            }
            
            // Store reference for connections
            const lastItem = this.canvasItems[this.canvasItems.length - 1];
            createdItems[index] = lastItem;
        });

        // Create connections after all items are created and rendered
        setTimeout(() => {
            // Force a reflow to ensure all elements are properly positioned
            this.canvasItems.forEach(item => {
                if (item.element) {
                    item.element.offsetHeight; // Force reflow
                }
            });
            
            console.log('Creating template connections:', template.connections.length);
            let connectionsCreated = 0;
            
            // Suppress notifications during bulk connection creation
            this._suppressNotifications = true;
            
            template.connections.forEach((conn, connIndex) => {
                const fromItem = createdItems[conn.from];
                const toItem = createdItems[conn.to];
                
                if (fromItem && toItem && fromItem.element && toItem.element) {
                    // Verify elements are in DOM and have proper dimensions
                    const fromRect = fromItem.element.getBoundingClientRect();
                    const toRect = toItem.element.getBoundingClientRect();
                    
                    if (fromRect.width > 0 && fromRect.height > 0 && toRect.width > 0 && toRect.height > 0) {
                        this.createConnection(fromItem.element, toItem.element, 'item-to-item');
                        connectionsCreated++;
                        console.log(`Created template connection ${connIndex}: from ${fromItem.id} to ${toItem.id}`);
                    } else {
                        console.warn(`Skipping connection ${connIndex}: elements not properly sized`);
                    }
                } else {
                    console.warn(`Skipping connection ${connIndex}: missing elements`);
                }
            });
            
            // Re-enable notifications
            this._suppressNotifications = false;
            
            console.log(`Template loaded: ${connectionsCreated} connections created, total connections: ${this.connections.length}`);
            this.showNotification(`Loaded template: ${template.name} (${connectionsCreated} connections)`, 'success');
            
            // Auto-save template with connections
            setTimeout(() => this.autosave(), 1000);
        }, 800);
    }

    clearCanvas() {
        // Clear items
        this.canvasItems.forEach(ci => {
            if (ci.element && ci.element.parentNode) {
                ci.element.parentNode.removeChild(ci.element);
            }
        });
        this.canvasItems = [];

        // Clear connections
        this.connections = [];
        if (this.connectionSvg) {
            this.connectionSvg.innerHTML = '';
        }

        // Clear selection
        this.clearSelection();
    }

    setupCanvasItemDrag(item) {
        let isDragging = false;
        let startX, startY, initialPositions = new Map();
        let primaryItem = item;

        item.addEventListener('mousedown', (e) => {
            if (this.connectionMode) return;
            
            // Handle multi-select
            if (e.ctrlKey) {
                if (this.selectedItems.has(this.canvasItems.find(ci => ci.element === item))) {
                    // Remove from selection
                    this.selectedItems.delete(this.canvasItems.find(ci => ci.element === item));
                    item.classList.remove('multi-selected');
                } else {
                    // Add to selection
                    const canvasItem = this.canvasItems.find(ci => ci.element === item);
                    if (canvasItem) {
                        this.selectedItems.add(canvasItem);
                        item.classList.add('multi-selected');
                    }
                }
                return;
            }
            
            // If item is not in selection, clear selection and select just this item
            const canvasItem = this.canvasItems.find(ci => ci.element === item);
            if (canvasItem && !this.selectedItems.has(canvasItem)) {
                this.clearSelection();
                this.selectedItems.add(canvasItem);
                item.classList.add('multi-selected');
            }
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            // Store initial positions for all selected items
            this.selectedItems.forEach(ci => {
                initialPositions.set(ci.element, {
                    x: parseInt(ci.element.style.left) || 0,
                    y: parseInt(ci.element.style.top) || 0
                });
                ci.element.style.zIndex = '1000';
            });
            
            e.preventDefault();
            e.stopPropagation();
        });

    document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            // Move all selected items
            // Compute snap based on primary item only
            let snapAdjust={dx:0,dy:0};
            const primInit = initialPositions.get(primaryItem);
            if (primInit){
                const candX = primInit.x + deltaX;
                const candY = primInit.y + deltaY;
                const grid = this.snapToGrid(candX, candY);
                const snapped = this.calcSnap(primaryItem, grid.x, grid.y);
                snapAdjust.dx = snapped.x - (primInit.x + deltaX);
                snapAdjust.dy = snapped.y - (primInit.y + deltaY);
            }
            this.selectedItems.forEach(ci => {
                const init = initialPositions.get(ci.element);
                if (!init) return;
                const nx = init.x + deltaX + snapAdjust.dx;
                const ny = init.y + deltaY + snapAdjust.dy;
                const g = this.snapToGrid(nx, ny);
                ci.element.style.left = g.x + 'px';
                ci.element.style.top = g.y + 'px';
            });
            
            // Update connections immediately during drag for smooth following
            if (this.dragUpdateTimeout) {
                clearTimeout(this.dragUpdateTimeout);
            }
            // Force immediate update for responsive connection following
            requestAnimationFrame(() => {
                // Update medallion target positions when medallion items are moved
                this.setupMedallionTargets();
                this.updateConnections();
                this.ensureCanvasExtents();
            });
        });

    document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.showAlignmentGuides();
                
                // Save state for undo after moving items
                this.saveState('move items');
                
                this.selectedItems.forEach(ci => {
                    ci.element.style.zIndex = '';
                });
                initialPositions.clear();
                
                // Final connection update after drag complete
                setTimeout(() => {
                    this.setupMedallionTargets();
                    this.updateConnections();
                    this.ensureCanvasExtents();
                    this.autosave();
                }, 0);
            }
        });
    }

    // Alignment batch operations
    alignSelected(axis, mode){
        const targets=Array.from(this.selectedItems).map(ci=>ci.element);
        if (targets.length<2) return;
        const rects=targets.map(el=>({el,x:parseInt(el.style.left)||0,y:parseInt(el.style.top)||0,w:el.offsetWidth,h:el.offsetHeight}));
        if (axis==='x'){
            if (mode==='left'){const min=Math.min(...rects.map(r=>r.x));rects.forEach(r=>r.el.style.left=min+'px');}
            if (mode==='center'){const cAvg=rects.reduce((s,r)=>s+r.x+r.w/2,0)/rects.length;rects.forEach(r=>r.el.style.left=Math.round(cAvg - r.w/2)+'px');}
            if (mode==='right'){const max=Math.max(...rects.map(r=>r.x+r.w));rects.forEach(r=>r.el.style.left=(max - r.w)+'px');}
        } else {
            if (mode==='top'){const min=Math.min(...rects.map(r=>r.y));rects.forEach(r=>r.el.style.top=min+'px');}
            if (mode==='middle'){const cAvg=rects.reduce((s,r)=>s+r.y+r.h/2,0)/rects.length;rects.forEach(r=>r.el.style.top=Math.round(cAvg - r.h/2)+'px');}
            if (mode==='bottom'){const max=Math.max(...rects.map(r=>r.y+r.h));rects.forEach(r=>r.el.style.top=(max - r.h)+'px');}
        }
        targets.forEach(el=>this.updateConnectionsForElement(el));
        this.autosaveDebounced();
    }
    distributeSelected(direction){
        const targets=Array.from(this.selectedItems).map(ci=>ci.element);
        if (targets.length<3) return;
        const rects=targets.map(el=>({el,x:parseInt(el.style.left)||0,y:parseInt(el.style.top)||0,w:el.offsetWidth,h:el.offsetHeight}));
        if (direction==='horizontal'){
            rects.sort((a,b)=>a.x-b.x);
            const left=rects[0].x, right=rects[rects.length-1].x + rects[rects.length-1].w;
            const totalWidth=rects.reduce((s,r)=>s+r.w,0);
            const gap=(right - left - totalWidth)/(rects.length-1);
            let cursor=left; rects.forEach(r=>{ r.el.style.left=cursor+'px'; cursor += r.w + gap; });
        } else {
            rects.sort((a,b)=>a.y-b.y);
            const top=rects[0].y, bottom=rects[rects.length-1].y + rects[rects.length-1].h;
            const totalHeight=rects.reduce((s,r)=>s+r.h,0);
            const gap=(bottom - top - totalHeight)/(rects.length-1);
            let cursor=top; rects.forEach(r=>{ r.el.style.top=cursor+'px'; cursor += r.h + gap; });
        }
        targets.forEach(el=>this.updateConnectionsForElement(el));
        this.autosaveDebounced();
    }
    openMetadataPanelForElement(el){
        const panel=document.getElementById('inspector-panel'); if(!panel) return; 
        
        // Show the inspector panel if collapsed
        const wasCollapsed = panel.classList.contains('collapsed');
        panel.classList.remove('collapsed');
        
        // If panel was collapsed and is now open, update connections after layout change
        if (wasCollapsed) {
            setTimeout(() => {
                this.updateConnections();
            }, 300); // Small delay to let CSS transitions complete
        }
        
        const title=document.getElementById('mp-node-title'); if(title) title.textContent=this.getElementName(el);
        // Resolve canvas item object
        const ci = this.canvasItems.find(c=>c.element===el);
        if(!ci){ console.warn('No canvas item record found for metadata'); return; }
        ci.data = ci.data || {};
        ci.data.meta = ci.data.meta || { business:{}, technical:{}, notes:'' };
        const meta = ci.data.meta;

        const markDirty = ()=>{
            const d=document.getElementById('mp-dirty-indicator'); const s=document.getElementById('mp-saved-indicator');
            if(d) d.classList.remove('hidden'); if(s) s.classList.add('hidden');
            this._metaDirty = true;
            this.scheduleMetadataSave();
        };
        if(!this._metaSaveDebounce){
            this.scheduleMetadataSave = ()=>{
                clearTimeout(this._metaSaveTimer);
                this._metaSaveTimer = setTimeout(()=>{
                    if(!this._metaDirty) return;
                    this.autosave();
                    const d=document.getElementById('mp-dirty-indicator'); const s=document.getElementById('mp-saved-indicator');
                    if(d) d.classList.add('hidden'); if(s) s.classList.remove('hidden');
                    this._metaDirty=false;
                }, 600);
            };
        }
        const bind = (id, getter, setter)=>{
            const elInput=document.getElementById(id); if(!elInput) return;
            elInput.value = getter() || '';
            if(!elInput._bound){
                elInput.addEventListener('input', ()=>{ setter(elInput.value); markDirty(); if(id==='mp-name'){ const label=el.querySelector('.canvas-item-title')||el.querySelector('.data-source-name'); if(label) label.textContent=elInput.value; if(title) title.textContent=elInput.value || 'Unnamed'; }});
                elInput.addEventListener('change', ()=>{ setter(elInput.value); markDirty(); });
                elInput._bound = true;
            }
        };
        // Name and type
        bind('mp-name', ()=> ci.data.name || this.getElementName(el), v=>{ ci.data.name = v; });
        const typeInput=document.getElementById('mp-type'); if(typeInput){ typeInput.value=el.dataset.itemType||el.dataset.type||''; }
        // Business
        bind('mp-purpose', ()=> meta.business.purpose, v=> meta.business.purpose = v );
        bind('mp-owner', ()=> meta.business.owner, v=> meta.business.owner = v );
        bind('mp-criticality', ()=> meta.business.criticality, v=> meta.business.criticality = v );
        bind('mp-status', ()=> meta.business.status, v=> meta.business.status = v );
        // Technical
        bind('mp-refresh', ()=> meta.technical.refresh, v=> meta.technical.refresh = v );
        bind('mp-volume', ()=> meta.technical.volume, v=> meta.technical.volume = v );
        bind('mp-latency', ()=> meta.technical.latency, v=> meta.technical.latency = v );
        // Notes
        bind('mp-notes', ()=> meta.notes, v=> meta.notes = v );

        // Saved indicator initial state
        const d=document.getElementById('mp-dirty-indicator'); const s=document.getElementById('mp-saved-indicator');
        if(d) d.classList.add('hidden'); if(s) s.classList.remove('hidden');
    }

    setupCanvasItemClick(item) {
        item.addEventListener('click', (e) => {
            if (this.connectionMode) {
                e.preventDefault();
                this.handleCanvasItemClick(item);
            } else {
                // Just select the item, don't open metadata panel
                this.clearSelections();
                item.classList.add('selected');
                
                // Show helpful tip on first selection
                if (!localStorage.getItem('properties-tip-shown')) {
                    this.showNotification('💡 Double-click or right-click for Properties', 'info', 4000);
                    localStorage.setItem('properties-tip-shown', 'true');
                }
            }
        });
        
        // Double-click to open metadata panel
        item.addEventListener('dblclick', (e) => {
            if (!this.connectionMode) {
                e.preventDefault();
                try {
                    const id = item.id || this.canvasItems.find(ci => ci.element === item)?.id;
                    if (id && typeof metadataPanel !== 'undefined') {
                        metadataPanel.openForItem(id);
                    }
                } catch(err){ console.warn('Metadata panel open failed', err); }
            }
        });
        
        // Right-click context menu
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showItemContextMenu(e, item);
        });
    }
    
    showItemContextMenu(e, item) {
        // Remove any existing context menu
        const existing = document.querySelector('.item-context-menu');
        if (existing) existing.remove();
        
        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'item-context-menu';
        menu.style.position = 'fixed';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        menu.style.zIndex = '10000';
        
        menu.innerHTML = `
            <div class="context-menu-item" data-action="properties">
                <i class="fas fa-cog"></i> Properties
            </div>
            <div class="context-menu-item" data-action="duplicate">
                <i class="fas fa-copy"></i> Duplicate
            </div>
            <div class="context-menu-item" data-action="delete">
                <i class="fas fa-trash"></i> Delete
            </div>
        `;
        
        // Add click handlers
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (action === 'properties') {
                const id = item.id || this.canvasItems.find(ci => ci.element === item)?.id;
                if (id && typeof metadataPanel !== 'undefined') {
                    metadataPanel.openForItem(id);
                }
            } else if (action === 'duplicate') {
                this.duplicateItem(item);
            } else if (action === 'delete') {
                this.deleteItem(item);
            }
            menu.remove();
        });
        
        document.body.appendChild(menu);
        
        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }
    
    duplicateItem(item) {
        try {
            this.saveState('duplicate item');
            
            const canvasItem = this.canvasItems.find(ci => ci.element === item);
            if (!canvasItem) {
                console.warn('Canvas item not found for duplication');
                return;
            }
            
            // Get current position and offset for duplicate
            const currentLeft = parseInt(item.style.left) || 0;
            const currentTop = parseInt(item.style.top) || 0;
            const x = currentLeft + 30;
            const y = currentTop + 30;
            
            // Create a copy of the item data
            const newData = {
                ...canvasItem.data,
                name: (canvasItem.data.name || this.getElementName(item)) + ' Copy'
            };
            
            // Create the duplicate based on the type
            if (item.classList.contains('canvas-item')) {
                if (item.classList.contains('consumption-canvas-item')) {
                    this.addConsumptionItemToCanvas(newData, x, y);
                } else {
                    // For other canvas items, determine type from classes or data
                    const itemType = canvasItem.data.itemType || 'generic';
                    this.addCanvasItem(itemType, x, y);
                }
            } else {
                // Handle data sources
                this.addDataSourceToCanvas(newData, x, y);
            }
            
            this.showNotification('Item duplicated successfully', 'success');
            
        } catch (error) {
            console.error('Error duplicating item:', error);
            this.showNotification('Failed to duplicate item', 'error');
        }
    }
    
    deleteItem(item) {
        if (confirm('Are you sure you want to delete this item?')) {
            try {
                this.saveState('delete item');
                
                // Find and remove from canvasItems array
                const index = this.canvasItems.findIndex(ci => ci.element === item);
                if (index !== -1) {
                    this.canvasItems.splice(index, 1);
                }
                
                // Remove any connections involving this item
                const involved = this.connections.filter(c => c.from === item || c.to === item);
                involved.forEach(c => {
                    if (c.element && this.connectionSvg) {
                        try { this.connectionSvg.removeChild(c.element); } catch {}
                    }
                    // Also remove mid-arrows if they exist
                    if (c.midArrow && this.connectionSvg) {
                        try { this.connectionSvg.removeChild(c.midArrow); } catch {}
                    }
                });
                this.connections = this.connections.filter(c => !(c.from === item || c.to === item));
                
                // Remove from DOM
                item.remove();
                
                // Clear selection
                this.clearSelections();
                
                // Save state
                this.autosave();
                
                this.showNotification('Item deleted successfully', 'success');
                
            } catch (error) {
                console.error('Error deleting item:', error);
                this.showNotification('Failed to delete item', 'error');
            }
        }
    }

    // Find a free non-overlapping spot inside the current visible viewport of the canvas
    findFreeSpotInViewport(canvas, desiredX, desiredY, itemWidth, itemHeight) {
        const viewLeft = canvas.scrollLeft;
        const viewTop = canvas.scrollTop;
        const viewRight = viewLeft + canvas.clientWidth;
        const viewBottom = viewTop + canvas.clientHeight;
        const padding = 8;

        // Clamp initial desired position into the viewport
        let startX = Math.max(viewLeft + padding, Math.min(desiredX, viewRight - itemWidth - padding));
        let startY = Math.max(viewTop + padding, Math.min(desiredY, viewBottom - itemHeight - padding));

        const items = this.canvasItems || [];

        const overlaps = (x, y) => {
            for (let i = 0; i < items.length; i++) {
                const el = items[i].element;
                if (!el || !el.style) continue;
                const ex = parseInt(el.style.left) || 0;
                const ey = parseInt(el.style.top) || 0;
                const ew = (el.offsetWidth) || itemWidth;
                const eh = (el.offsetHeight) || itemHeight;

                if (!(x + itemWidth < ex || x > ex + ew || y + itemHeight < ey || y > ey + eh)) {
                    return true;
                }
            }
            return false;
        };

        // If start position is free, return it
        if (!overlaps(startX, startY)) {
            return { x: startX, y: startY };
        }

        // Grid scan inside visible viewport: try rows then columns
        const stepX = Math.max(itemWidth + padding, 60);
        const stepY = Math.max(itemHeight + padding, 40);

        for (let yy = viewTop + padding; yy <= viewBottom - itemHeight - padding; yy += stepY) {
            for (let xx = viewLeft + padding; xx <= viewRight - itemWidth - padding; xx += stepX) {
                if (!overlaps(xx, yy)) {
                    return { x: xx, y: yy };
                }
            }
        }

        // Fallback: return clamped start
        return { x: startX, y: startY };
    }

    handleDataSourceClick(sourceElement) {
        if (!this.connectionMode) return;
        
        this.clearSelections();
        sourceElement.classList.add('selected');
        
        if (!this.selectedSource) {
            this.selectedSource = sourceElement;
            this.showNotification('Data source selected. Click Bronze, Silver or Gold to connect.', 'info');
        }
    }

    handleConsumptionClick(consumptionElement) {
        if (!this.connectionMode) return;
        
        this.clearSelections();
        consumptionElement.classList.add('selected');
        
        if (!this.selectedSource) {
            this.selectedSource = consumptionElement;
            this.showNotification('Consumption item selected. Now click a canvas item to connect.', 'info');
        }
    }

    handleCanvasItemClick(itemElement) {
        if (!this.connectionMode) return;
        
        if (this.selectedSource && !this.selectedItem) {
            // Connect data source to canvas item
            this.createConnection(this.selectedSource, itemElement, 'source-to-item');
            this.selectedSource = null;
            this.clearSelections();
        } else if (!this.selectedItem) {
            // Select first canvas item
            this.clearSelections();
            itemElement.classList.add('selected');
            this.selectedItem = itemElement;
            this.showNotification('Canvas item selected. Click another canvas item to connect them.', 'info');
        } else if (this.selectedItem !== itemElement) {
            // Connect two canvas items
            this.createConnection(this.selectedItem, itemElement, 'item-to-item');
            this.selectedItem = null;
            this.clearSelections();
        }
    }

    createConnection(fromElement, toElement, connectionType) {
        this.saveState('create connection');
        if (fromElement === toElement) {
            this.showNotification('Ignored: cannot connect an item to itself', 'warning');
            return;
        }
        // Guarantee both elements have IDs before creating connection
        const fromId = this.ensureElementId(fromElement, 'node');
        const toId = this.ensureElementId(toElement, 'node');
        const connectionId = 'connection-' + Date.now() + '-' + Math.floor(Math.random()*10000);
        const connection = {
            id: connectionId,
            from: fromElement,
            to: toElement,
            fromId,
            toId,
            type: connectionType,
            element: null
        };
        
        this.connections.push(connection);
        this.drawConnection(connection);
        
        const fromName = this.getElementName(fromElement);
        const toName = this.getElementName(toElement);
        this.showNotification(`Connected ${fromName} to ${toName}`, 'success');
        
        // Auto-save after creating connection
        setTimeout(() => this.autosave(), 500);
    }

    getElementName(element) {
        const nameElement = element.querySelector?.('.source-name') || element.querySelector?.('.canvas-item-title');
        if (nameElement) return nameElement.textContent;
        // Medallion target
        if (element.classList && element.classList.contains('medallion-target')) {
            const label = element.dataset.medallion || 'Zone';
            return label.charAt(0).toUpperCase() + label.slice(1);
        }
        return 'Unknown';
    }

    drawConnection(connection) {
        // If this connection has manual anchors, use the manual drawing method
        if (connection.fromAnchor && connection.toAnchor) {
            return this.drawManualConnection(connection);
        }
        
        if (!this.connectionSvg) return;
        const svg = this.connectionSvg;
        const canvas = document.getElementById('fabric-canvas');
        const fromRect = connection.from.getBoundingClientRect();
        const toRect = connection.to.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();

        // Robust conversion: map client (viewport) coordinates to current SVG user space
        const toSvgPoint = (clientX, clientY) => {
            const pt = svg.createSVGPoint();
            pt.x = clientX; pt.y = clientY;
            const ctm = svg.getScreenCTM();
            if (!ctm) return { x: clientX - canvasRect.left, y: clientY - canvasRect.top };
            const inv = ctm.inverse();
            const sp = pt.matrixTransform(inv);
            return { x: sp.x, y: sp.y };
        };

        // Anchor helpers working purely in client coords, then converted to SVG
        const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        const anchorsClient = (r) => ({
            left:   { x: r.left,            y: r.top + r.height / 2 },
            right:  { x: r.right,           y: r.top + r.height / 2 },
            top:    { x: r.left + r.width / 2, y: r.top },
            bottom: { x: r.left + r.width / 2, y: r.bottom }
        });
        const Acl = anchorsClient(fromRect);
        const Bcl = anchorsClient(toRect);
        const A = {
            left: toSvgPoint(Acl.left.x, Acl.left.y),
            right: toSvgPoint(Acl.right.x, Acl.right.y),
            top: toSvgPoint(Acl.top.x, Acl.top.y),
            bottom: toSvgPoint(Acl.bottom.x, Acl.bottom.y)
        };
        const B = {
            left: toSvgPoint(Bcl.left.x, Bcl.left.y),
            right: toSvgPoint(Bcl.right.x, Bcl.right.y),
            top: toSvgPoint(Bcl.top.x, Bcl.top.y),
            bottom: toSvgPoint(Bcl.bottom.x, Bcl.bottom.y)
        };

        const Cfrom = center(fromRect);
        const Cto = center(toRect);
        const CfromSvg = toSvgPoint(Cfrom.x, Cfrom.y);
        const CtoSvg = toSvgPoint(Cto.x, Cto.y);

        // Calculate connection points (choose opposing edges based on direction)
        let fromX, fromY, toX, toY;
        if (connection.type === 'source-to-item') {
            fromX = A.right.x; fromY = A.right.y; // right edge of source
            const dx = CtoSvg.x - CfromSvg.x;
            const dy = CtoSvg.y - CfromSvg.y;
            if (Math.abs(dx) >= Math.abs(dy)) {
                // Horizontal approach
                if (dx >= 0) { toX = B.left.x; toY = B.left.y; }
                else { toX = B.right.x; toY = B.right.y; }
            } else {
                // Vertical approach
                if (dy >= 0) { toX = B.top.x; toY = B.top.y; }
                else { toX = B.bottom.x; toY = B.bottom.y; }
            }
        } else {
            const dx = CtoSvg.x - CfromSvg.x;
            const dy = CtoSvg.y - CfromSvg.y;
            if (Math.abs(dx) >= Math.abs(dy)) {
                // Mostly horizontal
                if (dx >= 0) { fromX = A.right.x; fromY = A.right.y; toX = B.left.x; toY = B.left.y; }
                else { fromX = A.left.x; fromY = A.left.y; toX = B.right.x; toY = B.right.y; }
            } else {
                // Mostly vertical
                if (dy >= 0) { fromX = A.bottom.x; fromY = A.bottom.y; toX = B.top.x; toY = B.top.y; }
                else { fromX = A.top.x; fromY = A.top.y; toX = B.bottom.x; toY = B.bottom.y; }
            }
        }

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let pts;
        const horizDominant = Math.abs(toX - fromX) >= Math.abs(toY - fromY);
        if (horizDominant) {
            const dir = toX > fromX ? 1 : -1;
            const offset = 40; // distance out from node edge before turning
            const elbowX = fromX + dir * offset;
            const preEndX = toX - dir * offset;
            if ((dir === 1 && elbowX < preEndX) || (dir === -1 && elbowX > preEndX)) {
                pts = [[fromX, fromY], [elbowX, fromY], [elbowX, toY], [toX, toY]];
            } else {
                const midX = Math.round((fromX + toX) / 2);
                pts = [[fromX, fromY], [midX, fromY], [midX, toY], [toX, toY]];
            }
        } else {
            const dir = toY > fromY ? 1 : -1;
            const offset = 40;
            const elbowY = fromY + dir * offset;
            const preEndY = toY - dir * offset;
            if ((dir === 1 && elbowY < preEndY) || (dir === -1 && elbowY > preEndY)) {
                pts = [[fromX, fromY], [fromX, elbowY], [toX, elbowY], [toX, toY]];
            } else {
                const midY = Math.round((fromY + toY) / 2);
                pts = [[fromX, fromY], [fromX, midY], [toX, midY], [toX, toY]];
            }
        }
        const adjustForObstacles = () => {
            const selector = '#fabric-canvas .data-source-card, #fabric-canvas .canvas-item, #fabric-canvas .medallion-target';
            const all = Array.from(document.querySelectorAll(selector));
            const others = all.filter(el => el !== connection.from && el !== connection.to);
            if (!others.length) return;
            const rects = others.map(r => {
                const tl = toSvgPoint(r.getBoundingClientRect().left, r.getBoundingClientRect().top);
                const br = toSvgPoint(r.getBoundingClientRect().right, r.getBoundingClientRect().bottom);
                return { left: tl.x, top: tl.y, right: br.x, bottom: br.y };
            });
            const margin = 12;
            if (horizDominant) {
                let x = pts[1][0];
                let changed = false; let safety = 0;
                while (safety < 12) {
                    const y1 = Math.min(pts[1][1], pts[2][1]);
                    const y2 = Math.max(pts[1][1], pts[2][1]);
                    const hit = rects.find(rc => x >= rc.left - 0.5 && x <= rc.right + 0.5 && y2 >= rc.top && y1 <= rc.bottom);
                    if (!hit) break;
                    if (toX > fromX) x = hit.right + margin; else x = hit.left - margin; // push outward
                    changed = true; safety++;
                }
                if (changed) { pts[1][0] = x; pts[2][0] = x; }
            } else {
                let y = pts[1][1];
                let changed = false; let safety = 0;
                while (safety < 12) {
                    const x1 = Math.min(pts[1][0], pts[2][0]);
                    const x2 = Math.max(pts[1][0], pts[2][0]);
                    const hit = rects.find(rc => y >= rc.top - 0.5 && y <= rc.bottom + 0.5 && x2 >= rc.left && x1 <= rc.right);
                    if (!hit) break;
                    if (toY > fromY) y = hit.bottom + margin; else y = hit.top - margin;
                    changed = true; safety++;
                }
                if (changed) { pts[1][1] = y; pts[2][1] = y; }
            }
        };
        adjustForObstacles();
        const toD = (p) => `M ${p[0][0]} ${p[0][1]} L ${p[1][0]} ${p[1][1]} L ${p[2][0]} ${p[2][1]} L ${p[3][0]} ${p[3][1]}`;
        const pathData = toD(pts);

        path.setAttribute('d', pathData);
        path.setAttribute('stroke', '#ffffff');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linejoin', 'miter');
        path.setAttribute('stroke-linecap', 'butt');
        path.style.opacity = '0.8';
        // Mid-line arrow (direction indicator)
        const createMidArrow = (polyPts) => {
            // Flatten into segments and compute total length
            const segs = [];
            let total = 0;
            for (let i = 0; i < polyPts.length - 1; i++) {
                const a = polyPts[i];
                const b = polyPts[i + 1];
                const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
                segs.push({ a, b, len });
                total += len;
            }
            if (!total) return null;
            const target = total / 2; // midpoint along full path
            let acc = 0; let chosen = segs[0]; let t = 0;
            for (const s of segs) {
                if (acc + s.len >= target) { chosen = s; t = (target - acc) / s.len; break; }
                acc += s.len;
            }
            const mx = chosen.a[0] + (chosen.b[0] - chosen.a[0]) * t;
            const my = chosen.a[1] + (chosen.b[1] - chosen.a[1]) * t;
            const angle = Math.atan2(chosen.b[1] - chosen.a[1], chosen.b[0] - chosen.a[0]);
            const lenBase = 10; // slightly larger than end arrow for visibility inside path
            const half = 4.5;
            // Arrow pointing in direction of flow
            const tipX = mx + lenBase * Math.cos(angle);
            const tipY = my + lenBase * Math.sin(angle);
            const leftX = mx - half * Math.cos(angle) + half * Math.sin(angle);
            const leftY = my - half * Math.sin(angle) - half * Math.cos(angle);
            const rightX = mx - half * Math.cos(angle) - half * Math.sin(angle);
            const rightY = my - half * Math.sin(angle) + half * Math.cos(angle);
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`);
            poly.setAttribute('class', 'connection-mid-arrow');
            poly.setAttribute('fill', '#ffffff');
            poly.setAttribute('stroke', 'rgba(0,0,0,0.35)');
            poly.setAttribute('stroke-width', '1');
            poly.style.pointerEvents = 'none';
            return poly;
        };
        
    // Add arrowhead at end point with correct orientation
    const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const prev = pts[pts.length - 2];
    const angle = Math.atan2(toY - prev[1], toX - prev[0]);
        const arrowLength = 8;
        const arrowWidth = 6;
        
        const arrowX1 = toX - arrowLength * Math.cos(angle - Math.PI / 6);
        const arrowY1 = toY - arrowLength * Math.sin(angle - Math.PI / 6);
        const arrowX2 = toX - arrowLength * Math.cos(angle + Math.PI / 6);
        const arrowY2 = toY - arrowLength * Math.sin(angle + Math.PI / 6);
        
        arrowHead.setAttribute('points', `${toX},${toY} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`);
    arrowHead.setAttribute('fill', '#ffffff');
        
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.appendChild(path);
    const midArrow = createMidArrow(pts);
    if (midArrow) group.appendChild(midArrow);
    group.appendChild(arrowHead);
        
        connection.element = group;
        this.connectionSvg.appendChild(group);

        // Make line clickable for deletion in edit mode
        group.dataset.connectionId = connection.id;
        // Easier hit: clicks on the stroke
        path.setAttribute('pointer-events', 'stroke');
        group.style.cursor = this.editMode ? 'pointer' : 'default';
        group.addEventListener('click', (e) => {
            if (!this.editMode) return;
            e.stopPropagation();
            this.deleteConnectionById(connection.id);
        });
    }

    drawManualConnection(connection) {
        if (!this.connectionSvg) return;
        const svg = this.connectionSvg;
        const canvas = document.getElementById('fabric-canvas');
        const fromRect = connection.from.getBoundingClientRect();
        const toRect = connection.to.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();

        // Robust conversion: map client (viewport) coordinates to current SVG user space
        const toSvgPoint = (clientX, clientY) => {
            const pt = svg.createSVGPoint();
            pt.x = clientX; pt.y = clientY;
            const ctm = svg.getScreenCTM();
            if (!ctm) return { x: clientX - canvasRect.left, y: clientY - canvasRect.top };
            const inv = ctm.inverse();
            const sp = pt.matrixTransform(inv);
            return { x: sp.x, y: sp.y };
        };

        // Get specific anchor points based on manual selection
        const getAnchorPoint = (rect, anchor) => {
            let clientX, clientY;
            switch (anchor) {
                case 'top':
                    clientX = rect.left + rect.width / 2;
                    clientY = rect.top;
                    break;
                case 'right':
                    clientX = rect.right;
                    clientY = rect.top + rect.height / 2;
                    break;
                case 'bottom':
                    clientX = rect.left + rect.width / 2;
                    clientY = rect.bottom;
                    break;
                case 'left':
                    clientX = rect.left;
                    clientY = rect.top + rect.height / 2;
                    break;
                default:
                    // Fallback to center
                    clientX = rect.left + rect.width / 2;
                    clientY = rect.top + rect.height / 2;
            }
            return toSvgPoint(clientX, clientY);
        };

        const fromPoint = getAnchorPoint(fromRect, connection.fromAnchor);
        const toPoint = getAnchorPoint(toRect, connection.toAnchor);

        // Create a simple, clean path - either direct line or orthogonal
        const createCleanPath = (from, to, fromAnchor, toAnchor) => {
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            
            // Check if we can draw a straight line (items roughly aligned)
            if (Math.abs(dx) < 20) {
                // Vertically aligned - straight vertical line
                return [[from.x, from.y], [to.x, to.y]];
            }
            if (Math.abs(dy) < 20) {
                // Horizontally aligned - straight horizontal line
                return [[from.x, from.y], [to.x, to.y]];
            }
            
            // Otherwise create clean orthogonal (L-shaped) path
            const isFromHorizontal = fromAnchor === 'left' || fromAnchor === 'right';
            const isToHorizontal = toAnchor === 'left' || toAnchor === 'right';
            
            if (isFromHorizontal && isToHorizontal) {
                // Both horizontal anchors - use midpoint
                const midX = from.x + dx / 2;
                return [
                    [from.x, from.y],
                    [midX, from.y],
                    [midX, to.y],
                    [to.x, to.y]
                ];
            } else if (!isFromHorizontal && !isToHorizontal) {
                // Both vertical anchors - use midpoint
                const midY = from.y + dy / 2;
                return [
                    [from.x, from.y],
                    [from.x, midY],
                    [to.x, midY],
                    [to.x, to.y]
                ];
            } else if (isFromHorizontal && !isToHorizontal) {
                // From horizontal to vertical - simple L shape
                return [
                    [from.x, from.y],
                    [to.x, from.y],
                    [to.x, to.y]
                ];
            } else {
                // From vertical to horizontal - simple L shape
                return [
                    [from.x, from.y],
                    [from.x, to.y],
                    [to.x, to.y]
                ];
            }
        };

        const pathPoints = createCleanPath(fromPoint, toPoint, connection.fromAnchor, connection.toAnchor);
        
        // Build SVG path data using only straight lines
        let pathData = `M ${pathPoints[0][0]} ${pathPoints[0][1]}`;
        for (let i = 1; i < pathPoints.length; i++) {
            pathData += ` L ${pathPoints[i][0]} ${pathPoints[i][1]}`;
        }

        // Create path element
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', '#ffffff');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linejoin', 'miter');
        path.setAttribute('stroke-linecap', 'butt');
        path.style.opacity = '0.8';
        
        // Mid-line arrow for manual connections
        const createMidArrow = (polyPts) => {
            const segs = [];
            let total = 0;
            for (let i = 0; i < polyPts.length - 1; i++) {
                const a = polyPts[i];
                const b = polyPts[i + 1];
                const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
                segs.push({ a, b, len });
                total += len;
            }
            if (!total) return null;
            const target = total / 2;
            let acc = 0; let chosen = segs[0]; let t = 0;
            for (const s of segs) { if (acc + s.len >= target) { chosen = s; t = (target - acc) / s.len; break; } acc += s.len; }
            const mx = chosen.a[0] + (chosen.b[0] - chosen.a[0]) * t;
            const my = chosen.a[1] + (chosen.b[1] - chosen.a[1]) * t;
            const angle = Math.atan2(chosen.b[1] - chosen.a[1], chosen.b[0] - chosen.a[0]);
            const lenBase = 10;
            const half = 4.5;
            const tipX = mx + lenBase * Math.cos(angle);
            const tipY = my + lenBase * Math.sin(angle);
            const leftX = mx - half * Math.cos(angle) + half * Math.sin(angle);
            const leftY = my - half * Math.sin(angle) - half * Math.cos(angle);
            const rightX = mx - half * Math.cos(angle) - half * Math.sin(angle);
            const rightY = my - half * Math.sin(angle) + half * Math.cos(angle);
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`);
            poly.setAttribute('class', 'connection-mid-arrow');
            poly.setAttribute('fill', '#ffffff');
            poly.setAttribute('stroke', 'rgba(0,0,0,0.35)');
            poly.setAttribute('stroke-width', '1');
            poly.style.pointerEvents = 'none';
            return poly;
        };

        // Add arrowhead at the end point
        const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const endPoint = pathPoints[pathPoints.length - 1];
        const prevPoint = pathPoints[pathPoints.length - 2] || pathPoints[0];
        
        // Calculate angle for arrow direction
        const angle = Math.atan2(endPoint[1] - prevPoint[1], endPoint[0] - prevPoint[0]);
        const arrowLength = 8;
        
        const arrowX1 = endPoint[0] - arrowLength * Math.cos(angle - Math.PI / 6);
        const arrowY1 = endPoint[1] - arrowLength * Math.sin(angle - Math.PI / 6);
        const arrowX2 = endPoint[0] - arrowLength * Math.cos(angle + Math.PI / 6);
        const arrowY2 = endPoint[1] - arrowLength * Math.sin(angle + Math.PI / 6);
        
        arrowHead.setAttribute('points', `${endPoint[0]},${endPoint[1]} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`);
        arrowHead.setAttribute('fill', '#ffffff');

        // Create group and add visual indicator for manual connection
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('data-manual', 'true'); // Mark as manual connection
    group.appendChild(path);
    const midArrow = createMidArrow(pathPoints);
    if (midArrow) group.appendChild(midArrow);
    group.appendChild(arrowHead);

        // Add small indicators at anchor points to show they're manual
        const createAnchorIndicator = (point, color = '#ffffff') => {
            const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            indicator.setAttribute('cx', point.x);
            indicator.setAttribute('cy', point.y);
            indicator.setAttribute('r', '4');
            indicator.setAttribute('fill', color);
            indicator.setAttribute('stroke', '#666666');
            indicator.setAttribute('stroke-width', '1');
            return indicator;
        };

        group.appendChild(createAnchorIndicator(fromPoint));
        group.appendChild(createAnchorIndicator(toPoint));

        connection.element = group;
        this.connectionSvg.appendChild(group);

        // Make line clickable for deletion in edit mode
        group.dataset.connectionId = connection.id;
        path.setAttribute('pointer-events', 'stroke');
        group.style.cursor = this.editMode ? 'pointer' : 'default';
        group.addEventListener('click', (e) => {
            if (!this.editMode) return;
            e.stopPropagation();
            this.deleteConnectionById(connection.id);
        });
    }

    updateConnectionInteractivity(enable) {
        if (!this.connectionSvg) return;
        const groups = Array.from(this.connectionSvg.querySelectorAll('g'));
        groups.forEach(g => {
            const p = g.querySelector('path');
            if (p) p.setAttribute('pointer-events', enable ? 'stroke' : 'none');
            g.style.cursor = enable ? 'pointer' : 'default';
        });
    }

    deleteConnectionById(id) {
        const idx = this.connections.findIndex(c => c.id === id);
        if (idx === -1) return;
        const conn = this.connections[idx];
        if (conn.element && this.connectionSvg) {
            try { this.connectionSvg.removeChild(conn.element); } catch {}
        }
        this.connections.splice(idx, 1);
        this.autosave();
        this.showNotification('Connection deleted', 'success');
    }

    updateConnections() {
        if (!this.connectionSvg) return;
        
        // Force layout recalculation to ensure accurate element positions
        const canvas = document.getElementById('fabric-canvas');
        canvas.offsetHeight;
        
        // Update SVG viewBox to ensure it covers the entire canvas area
        const canvasWidth = Math.max(canvas.scrollWidth, canvas.clientWidth);
        const canvasHeight = Math.max(canvas.scrollHeight, canvas.clientHeight);
        this.connectionSvg.setAttribute('viewBox', `0 0 ${canvasWidth} ${canvasHeight}`);
        
        // Clear all existing connection elements and redraw
        this.connectionSvg.innerHTML = '';
        
        this.connections.forEach(connection => {
            connection.element = null; // Reset element reference
            this.drawConnection(connection);
        });
    }

    showNotification(message, type = 'info') {
        if (this._suppressNotifications) return;
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        const header = document.querySelector('.playground-header, header.app-header');
        const headerHeight = header ? header.getBoundingClientRect().height : 60;
        const topOffset = headerHeight + 12; // push below header buttons
        notification.style.cssText = `position:fixed;top:${topOffset}px;right:24px;padding:12px 20px;border-radius:6px;color:#fff;font-weight:500;z-index:10000;transition:all .3s ease;box-shadow:0 4px 12px rgba(0,0,0,.2);backdrop-filter:blur(6px);background:rgba(30,32,40,.92);border:1px solid rgba(255,255,255,0.08);`;
        
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // --- Persistence ---
    serialize() {
        console.log('Serializing connections:', this.connections.length);

        // Remove self and duplicate connections before serializing
        this.sanitizeConnections();
        
        // Repair pass: ensure every canvas item tracked has an id
        this.canvasItems.forEach(ci => this.ensureElementId(ci.element, 'canvas-item'));

        const serializedConnections = this.connections.map(conn => {
            // Prefer stored fromId/toId; fallback to element ids
            let fromId = conn.fromId || conn.from?.id;
            let toId = conn.toId || conn.to?.id;
            if (!fromId && conn.from) fromId = this.ensureElementId(conn.from, 'node');
            if (!toId && conn.to) toId = this.ensureElementId(conn.to, 'node');
            conn.fromId = fromId;
            conn.toId = toId;
            console.log('Serializing connection:', conn.id, 'from', fromId, 'to', toId);
            return {
                id: conn.id || `conn-${Date.now()}-${Math.random()}`,
                type: conn.type || 'item-to-item',
                fromId,
                toId,
                fromAnchor: conn.fromAnchor || null,
                toAnchor: conn.toAnchor || null
            };
        }).filter(conn => {
            const isValid = conn.fromId && conn.toId;
            if (!isValid) {
                console.warn('Filtered out invalid connection:', conn);
            }
            return isValid;
        });
        
        console.log('Serialized connections:', serializedConnections.length);
        
        return {
            theme: document.documentElement.getAttribute('data-theme') || 'dark',
            version: '1.0', // Add version for future compatibility
            items: this.canvasItems.map(ci => {
                const rect = ci.element.getBoundingClientRect();
                const canvas = document.getElementById('fabric-canvas');
                const canvasRect = canvas.getBoundingClientRect();
                // Ensure latest visible name (user edits) is captured
                const nameEl = ci.element.querySelector('.canvas-item-title') || ci.element.querySelector('.data-source-name');
                if (nameEl) {
                    ci.data = ci.data || {};
                    const newName = nameEl.textContent.trim();
                    if (newName) ci.data.name = newName;
                }
                
                return {
                    id: ci.id,
                    type: ci.type,
                    data: ci.data || {},
                    position: {
                        x: parseInt(ci.element.style.left) || (rect.left - canvasRect.left),
                        y: parseInt(ci.element.style.top) || (rect.top - canvasRect.top)
                    },
                    width: ci.element.offsetWidth || rect.width,
                    height: ci.element.offsetHeight || rect.height,
                    className: ci.element.className,
                    innerHTML: ci.element.innerHTML
                };
            }),
            connections: serializedConnections,
            sources: this.sources || []
        };
    }

    // Remove duplicate & self connections; keep first occurrence only
    sanitizeConnections() {
        if (!Array.isArray(this.connections) || this.connections.length === 0) return;
        const seen = new Set();
        const cleaned = [];
        for (const c of this.connections) {
            const fromId = c.fromId || c.from?.id;
            const toId = c.toId || c.to?.id;
            if (!fromId || !toId) continue; // skip incomplete
            if (fromId === toId) { continue; }
            const sig = `${fromId}|${toId}|${c.fromAnchor||''}|${c.toAnchor||''}`;
            if (seen.has(sig)) continue;
            c.fromId = fromId; c.toId = toId;
            seen.add(sig);
            cleaned.push(c);
        }
        if (cleaned.length !== this.connections.length) {
            console.log(`[Sanitize] Reduced connections ${this.connections.length} -> ${cleaned.length}`);
        }
        this.connections = cleaned;
    }

    autosave() {
        // Don't autosave if there's no content or during loading
        if (this._suppressNotifications || this.canvasItems.length === 0) return;
        
        try {
            const data = this.serialize();
            
            // Only autosave if we have meaningful content
            if (data.items && data.items.length > 0) {
                localStorage.setItem('playground-autosave', JSON.stringify(data));
                console.log('Autosaved:', data.items.length, 'items');
            }
        } catch (e) {
            console.warn('Autosave failed:', e);
            // Clear corrupted autosave if it exists
            try {
                localStorage.removeItem('playground-autosave');
            } catch (clearError) {
                console.warn('Could not clear corrupted autosave:', clearError);
            }
        }
    }

    restoreAutosave() {
        try {
            const raw = localStorage.getItem('playground-autosave');
            if (!raw) return;
            
            const data = JSON.parse(raw);
            
            // Validate data structure more thoroughly
            if (!data || typeof data !== 'object') {
                console.warn('Invalid autosave data structure');
                localStorage.removeItem('playground-autosave');
                return;
            }
            
            if (data.connections && !Array.isArray(data.connections)) {
                console.warn('Invalid connections in autosave');
                localStorage.removeItem('playground-autosave');
                return;
            }
            
            if (data.items && !Array.isArray(data.items)) {
                console.warn('Invalid items in autosave');
                localStorage.removeItem('playground-autosave');
                return;
            }
            
            // Only restore if there's meaningful content
            if (data.items && data.items.length > 0) {
                this.loadFromData(data);
                this.showNotification(`Autosaved session restored (${data.items.length} items)`, 'info');
            }
            
        } catch (e) {
            console.warn('Restore failed, clearing corrupted autosave:', e);
            localStorage.removeItem('playground-autosave');
        }
    }

    clearAutosave() {
        localStorage.removeItem('playground-autosave');
        this.showNotification('Autosave data cleared', 'info');
    }

    // Place the left sidebar data sources into the canvas "Sources" lane for visual context
    seedSourcesIntoCanvas() {
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;
        const laneWidth = 160; // match --sources-width
        const padding = 12; // visual padding inside
        const itemH = 140;
        const gap = 12;

        const sources = Array.from(document.querySelectorAll('#fabric-data-sources-list .data-source-item'));
        let y = padding; // start near top of lane
        sources.forEach((src) => {
            const iconEl = src.querySelector('i');
            const data = {
                type: 'data-source',
                name: src.querySelector('.source-name')?.textContent || 'Source',
                sourceType: src.querySelector('.source-type')?.textContent || '',
                icon: iconEl ? iconEl.className : 'fas fa-database'
            };
            // x: center within sources lane
            const x = Math.max(8, Math.floor((laneWidth - 140) / 2));
            this.addDataSourceToCanvas(data, x, y);
            y += itemH + gap;
        });
    }

    loadFromData(data) {
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas || !data) {
            this.showNotification('Invalid data or canvas not found', 'error');
            return;
        }

        // Clear existing
        canvas.querySelectorAll('.canvas-item').forEach(el => el.remove());
        this.canvasItems = [];
        this.connections = [];
        if (this.connectionSvg) this.connectionSvg.innerHTML = '';

        // Suppress notifications during bulk load
        this._suppressNotifications = true;

        // Keep track of successfully loaded items
        const loadedItems = new Map();

        // Recreate items using creation helpers to preserve classes, accents and structure
        (data.items || []).forEach(item => {
            const px = item.position?.x || 0;
            const py = item.position?.y || 0;
            const savedId = item.id || ('canvas-item-' + Date.now() + '-' + Math.random());

            try {
                // Consumption items were stored as type 'consumption'
                if (item.type === 'consumption' || (item.type && String(item.type).startsWith('ci-consumption'))) {
                    const d = item.data || {};
                    const consumptionType = d.consumptionType || (String(item.type).startsWith('ci-consumption-') ? item.type.split('ci-consumption-')[1] : 'generic');
                    this.addConsumptionItemToCanvas({
                        name: d.name || 'Consumption',
                        category: d.category || d.type || '',
                        consumptionType,
                        icon: d.icon || 'fas fa-chart-bar',
                        iconColor: d.iconColor || '#0078D4'
                    }, px, py);
                    
                    // Preserve the original ID
                    const lastItem = this.canvasItems[this.canvasItems.length - 1];
                    if (lastItem && lastItem.element) {
                        lastItem.id = savedId;
                        lastItem.element.id = savedId;
                        loadedItems.set(savedId, lastItem.element);
                    }
                    return;
                }

                // Data sources
                if (item.type === 'data-source' || (item.data && item.data.sourceType)) {
                    const d = item.data || {};
                    this.addDataSourceToCanvas({
                        name: d.name || 'Source',
                        sourceType: d.sourceType || d.type || '',
                        icon: d.icon || 'fas fa-database'
                    }, px, py);
                    
                    const lastItem = this.canvasItems[this.canvasItems.length - 1];
                    if (lastItem && lastItem.element) {
                        lastItem.id = savedId;
                        lastItem.element.id = savedId;
                        loadedItems.set(savedId, lastItem.element);
                    }
                    return;
                }

                // Canvas core items including medallions
                if (item.type) {
                    this.addCanvasItem(item.type, px, py);
                    const lastItem = this.canvasItems[this.canvasItems.length - 1];
                    if (lastItem && lastItem.element) {
                        lastItem.id = savedId;
                        lastItem.element.id = savedId;
                        loadedItems.set(savedId, lastItem.element);
                    }
                    return;
                }

                // Fallback for unknown items
                this.addCanvasItem('dataset', px, py);
                const lastItem = this.canvasItems[this.canvasItems.length - 1];
                if (lastItem && lastItem.element) {
                    lastItem.id = savedId;
                    lastItem.element.id = savedId;
                    loadedItems.set(savedId, lastItem.element);
                }
            } catch (error) {
                console.warn('Failed to load item:', item, error);
            }
        });

        // Recreate connections - be more robust about finding elements
        let connectionsCreated = 0;
    (data.connections || []).forEach(conn => {
            try {
                // Try multiple methods to find the elements
        let fromEl = loadedItems.get(conn.fromId);
        let toEl = loadedItems.get(conn.toId);
                
                // Fallback: search by ID in DOM
                if (!fromEl) {
                    fromEl = document.getElementById(conn.fromId);
                }
                if (!toEl) {
                    toEl = document.getElementById(conn.toId);
                }
                
                // Fallback: search in canvasItems
                if (!fromEl) {
                    const fromItem = this.canvasItems.find(item => item.id === conn.fromId);
                    fromEl = fromItem?.element;
                }
                if (!toEl) {
                    const toItem = this.canvasItems.find(item => item.id === conn.toId);
                    toEl = toItem?.element;
                }
                
                if (fromEl && toEl) {
                    // Create the connection but don't trigger save state to avoid circular calls
                    const connectionId = conn.id || 'connection-' + Date.now() + '-' + Math.floor(Math.random()*10000);
                    const connection = {
                        id: connectionId,
                        from: fromEl,
                        to: toEl,
                        fromId: conn.fromId || fromEl.id,
                        toId: conn.toId || toEl.id,
                        type: conn.type || 'item-to-item',
                        fromAnchor: conn.fromAnchor || null,
                        toAnchor: conn.toAnchor || null,
                        element: null
                    };
                    
                    this.connections.push(connection);
                    this.drawConnection(connection);
                    connectionsCreated++;
                    console.log('Created connection:', connectionId, 'from', conn.fromId, 'to', conn.toId);
                } else {
                    console.warn('Connection elements not found:', {
                        fromId: conn.fromId,
                        toId: conn.toId,
                        fromEl: !!fromEl,
                        toEl: !!toEl
                    });
                }
            } catch (error) {
                console.warn('Failed to create connection:', conn, error);
            }
        });

        // After attempting to build all connections, log a summary
        console.log(`Rebuilt ${connectionsCreated} connections (requested: ${(data.connections||[]).length})`);

        // Restore metadata for all loaded items
        (data.items || []).forEach(savedItem => {
            if (savedItem.data && savedItem.data.meta) {
                const canvasItem = this.canvasItems.find(ci => ci.id === savedItem.id);
                if (canvasItem) {
                    // Restore the complete metadata structure
                    canvasItem.data = canvasItem.data || {};
                    canvasItem.data.meta = savedItem.data.meta;
                    
                    // Update visual status indicator if status exists
                    if (savedItem.data.meta.business && savedItem.data.meta.business.status) {
                        updateComponentStatusIndicator(canvasItem.element, savedItem.data.meta.business.status);
                    }
                    
                    console.log('Restored metadata for item:', savedItem.id, savedItem.data.meta);
                }
            }
        });

    // Final sanitize + redraw
    this.sanitizeConnections();
    this.updateConnections();

        // Post-load verification: attempt to repair any connections whose endpoints now exist by medallion name
        const requested = data.connections || [];
        const missing = requested.filter(rc => !this.connections.find(c => c.id === rc.id));
        if (missing.length) {
            console.warn('Attempting repair for missing connections:', missing.length);
            missing.forEach(rc => {
                // If fromId/toId look like medallion ids but targets not created at serialization time
                const tryFind = (id, fallbackAttr) => {
                    let el = document.getElementById(id);
                    if (el) return el;
                    // Fallback: match medallion by data attr
                    if (fallbackAttr) {
                        el = document.querySelector(`.medallion-target[data-medallion="${fallbackAttr}"]`);
                    }
                    return el;
                };
                const fromFallbackMed = rc.fromId && rc.fromId.startsWith('medallion-') ? rc.fromId.replace('medallion-','') : null;
                const toFallbackMed = rc.toId && rc.toId.startsWith('medallion-') ? rc.toId.replace('medallion-','') : null;
                const fromEl = tryFind(rc.fromId, fromFallbackMed);
                const toEl = tryFind(rc.toId, toFallbackMed);
                if (fromEl && toEl) {
                    const connectionId = rc.id || 'connection-' + Date.now() + '-' + Math.floor(Math.random()*10000);
                    const connection = {
                        id: connectionId,
                        from: fromEl,
                        to: toEl,
                        fromId: fromEl.id,
                        toId: toEl.id,
                        type: rc.type || 'item-to-item',
                        fromAnchor: rc.fromAnchor || null,
                        toAnchor: rc.toAnchor || null,
                        element: null
                    };
                    this.connections.push(connection);
                    this.drawConnection(connection);
                    console.log('Repaired connection', connectionId);
                }
            });
        }

        // Restore data sources if available
        if (data.sources && Array.isArray(data.sources)) {
            this.sources = data.sources;
            this.saveDataSources();
        }

        // Restore theme
        if (data.theme) this.setTheme(data.theme);

        // Final update with a slight delay to ensure DOM is ready
        setTimeout(() => {
            this.updateConnections();
            console.log('Connections after load:', this.connections.length);
        }, 100);

        // Re-enable notifications after load
        this._suppressNotifications = false;
        
        // Show success message
        const itemCount = data.items ? data.items.length : 0;
        this.showNotification(`Loaded ${itemCount} items and ${connectionsCreated} connections`, 'success');
    }
}

// Global functions for HTML onclick handlers
function toggleTheme() {
    playground.setTheme(
        document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    );
}

// ================= Metadata Panel Controller (MVP) =================
// Lightweight controller object attached to window for now.
const metadataPanel = (function(){
    let currentItemId = null;
    let debounceTimer = null;
    const DEBOUNCE_MS = 700;

    const el = {
        panel: null,
        title: null,
        closeBtn: null,
        name: null,
        purpose: null,
        owner: null,
        criticality: null,
        status: null,
        type: null,
        refresh: null,
        volume: null,
        latency: null,
        notes: null,
        dirty: null,
        saved: null
    };

    function init(){
        el.panel = document.getElementById('inspector-panel');
        if(!el.panel) return; // Not on this page
        el.title = document.getElementById('mp-node-title');
        // Remove closeBtn since we're using toggle instead
        el.name = document.getElementById('mp-name');
        el.purpose = document.getElementById('mp-purpose');
        el.owner = document.getElementById('mp-owner');
        el.criticality = document.getElementById('mp-criticality');
        el.status = document.getElementById('mp-status');
        el.type = document.getElementById('mp-type');
        el.refresh = document.getElementById('mp-refresh');
        el.volume = document.getElementById('mp-volume');
        el.latency = document.getElementById('mp-latency');
        el.notes = document.getElementById('mp-notes');
        el.dirty = document.getElementById('mp-dirty-indicator');
        el.saved = document.getElementById('mp-saved-indicator');

        [el.name, el.purpose, el.owner, el.criticality, el.status, el.refresh, el.volume, el.latency, el.notes].forEach(inp => {
            if(!inp) return;
            inp.addEventListener('input', handleFieldChange);
        });
        // Remove close button listener
        document.addEventListener('keydown', e => {
            if(e.key === 'Escape' && !el.panel.classList.contains('collapsed')) {
                el.panel.classList.add('collapsed');
            }
            if(e.key === 's' && (e.ctrlKey||e.metaKey) && !el.panel.classList.contains('collapsed')) { e.preventDefault(); flushChanges(); }
        });
    }

    function handleFieldChange(){
        markDirty();
        if(debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(flushChanges, DEBOUNCE_MS);
    }

    function markDirty(){
        if(el.dirty) el.dirty.classList.remove('hidden');
        if(el.saved) el.saved.classList.add('hidden');
    }
    function markSaved(){
        if(el.dirty) el.dirty.classList.add('hidden');
        if(el.saved) el.saved.classList.remove('hidden');
    }

    function openForItem(itemId){
        const entry = playground.canvasItems.find(ci => ci.id === itemId);
        if(!entry) return;
        currentItemId = itemId;
        ensureMetaStructure(entry);
        populate(entry);
        el.panel.classList.remove('collapsed');
        el.panel.setAttribute('aria-hidden','false');
    }

    function ensureMetaStructure(entry){
        if(!entry.data) entry.data = {};
        if(!entry.data.meta) entry.data.meta = { business:{}, technical:{}, notes:{} };
        entry.data.meta.business = entry.data.meta.business || {};
        entry.data.meta.technical = entry.data.meta.technical || {};
        entry.data.meta.notes = entry.data.meta.notes || {};
    }

    function populate(entry){
        const b = entry.data.meta.business;
        const t = entry.data.meta.technical;
        const n = entry.data.meta.notes;
        if(el.title) el.title.textContent = b.name || entry.data.name || 'Item';
        if(el.name) el.name.value = b.name || entry.data.name || '';
        if(el.purpose) el.purpose.value = b.purpose || '';
        if(el.owner) el.owner.value = b.owner || '';
        if(el.criticality) el.criticality.value = b.criticality || '';
        if(el.status) el.status.value = b.status || '';
        if(el.type) el.type.value = entry.type || entry.data.type || '';
        if(el.refresh) el.refresh.value = t.refresh || '';
        if(el.volume) el.volume.value = t.volume || '';
        if(el.latency) el.latency.value = t.latency || '';
        if(el.notes) el.notes.value = n.text || '';
        markSaved();
    }

    function flushChanges(){
        if(!currentItemId) return;
        const entry = playground.canvasItems.find(ci => ci.id === currentItemId);
        if(!entry) return;
        ensureMetaStructure(entry);
        const b = entry.data.meta.business;
        const t = entry.data.meta.technical;
        const n = entry.data.meta.notes;
        if(el.name){ b.name = el.name.value.trim(); if(b.name) { // also reflect on visual title
            const titleSpan = entry.element.querySelector('.canvas-item-title');
            if(titleSpan) titleSpan.textContent = b.name; }
        }
        if(el.purpose) b.purpose = el.purpose.value.trim();
        if(el.owner) b.owner = el.owner.value.trim();
        if(el.criticality) b.criticality = el.criticality.value;
        if(el.status) {
            b.status = el.status.value;
            // Update visual status indicator on the component
            updateComponentStatusIndicator(entry.element, b.status);
        }
        if(el.refresh) t.refresh = el.refresh.value;
        if(el.volume) t.volume = el.volume.value.trim();
        if(el.latency) t.latency = el.latency.value.trim();
        if(el.notes) n.text = el.notes.value.trim();
        // store last edited timestamp
        entry.data.meta.timestamps = entry.data.meta.timestamps || {};
        entry.data.meta.timestamps.lastEdited = new Date().toISOString();
        markSaved();
        playground.autosave && playground.autosave();
    }

    function close(){
        currentItemId = null;
        if(el.panel){ 
            el.panel.classList.add('collapsed'); 
            el.panel.setAttribute('aria-hidden','true'); 
        }
    }

    // Public API
    return { init, openForItem, close };
})();

// Initialize panel after DOM ready (playground init occurs earlier)
window.addEventListener('DOMContentLoaded', () => {
    metadataPanel.init();
});

function clearCanvas() {
    const canvas = document.getElementById('fabric-canvas');
    const items = canvas.querySelectorAll('.canvas-item');
    items.forEach(item => item.remove());
    
    playground.canvasItems = [];
    playground.connections = [];
    
    if (playground.connectionSvg) {
        playground.connectionSvg.innerHTML = '';
    }
    
    playground.showNotification('Canvas cleared', 'info');
}

function exportCanvas() {
    try {
        console.log('[Export] Starting export...');
        const data = playground.serialize();
        console.log('[Export] Serialized', {
            items: data.items?.length || 0,
            connections: data.connections?.length || 0
        });
        
        if (!data.items || data.items.length === 0) {
            playground.showNotification('No items to export', 'warning');
            return;
        }
        
        // Add metadata to export
        const exportData = {
            ...data,
            metadata: {
                exportDate: new Date().toISOString(),
                version: '1.0',
                itemCount: data.items.length,
                connectionCount: data.connections.length
            }
        };
        
        const jsonStr = JSON.stringify(exportData, null, 2);

        // Prompt user for filename (optional). Provide sensible default.
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const defaultName = `bi-architecture-${timestamp}`;
        let userName = (typeof window !== 'undefined') ? window.prompt('Export filename (without extension):', defaultName) : defaultName;

        if (userName === null) {
            playground.showNotification('Export cancelled', 'info');
            return;
        }

        userName = userName.trim();
        if (!userName) userName = defaultName;

        // Sanitize filename: remove illegal characters for most filesystems / browsers
        userName = userName.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-');
        const filename = userName.endsWith('.json') ? userName : userName + '.json';

        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        try {
            a.click();
        } catch (clickErr) {
            console.warn('[Export] Programmatic click failed, showing fallback link.', clickErr);
            playground.showNotification('Automatic download blocked. Opening JSON in new tab.', 'warning');
            window.open('data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr), '_blank');
        }
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2500);
        console.log('[Export] Download triggered:', filename);
        
        playground.showNotification(`Architecture exported (${data.items.length} items)`, 'success');
    } catch (e) {
        console.error('Export failed:', e);
        playground.showNotification('Export failed: ' + e.message, 'error');
    }
}

function importCanvas(input) {
    try {
        const file = input.files[0];
        if (!file) {
            playground.showNotification('No file selected', 'warning');
            return;
        }
        
        if (!file.name.endsWith('.json')) {
            playground.showNotification('Please select a JSON file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importData = JSON.parse(e.target.result);
                console.log('[Import] Loaded data:', {
                    items: importData.items?.length || 0,
                    connections: importData.connections?.length || 0,
                    metadata: importData.metadata
                });
                
                // Validate the imported data structure
                if (!importData.items || !Array.isArray(importData.items)) {
                    throw new Error('Invalid file format: missing items array');
                }
                
                // Clear current canvas
                playground.clearCanvas();
                
                // Load the imported data
                playground.deserialize(importData);
                
                const itemCount = importData.items.length;
                const connectionCount = (importData.connections || []).length;
                
                playground.showNotification(
                    `Architecture imported (${itemCount} items, ${connectionCount} connections)`, 
                    'success'
                );
                
                console.log('[Import] Successfully imported architecture');
                
            } catch (parseError) {
                console.error('[Import] Parse error:', parseError);
                playground.showNotification('Failed to parse JSON file: ' + parseError.message, 'error');
            }
        };
        
        reader.onerror = function() {
            playground.showNotification('Failed to read file', 'error');
        };
        
        reader.readAsText(file);
        
        // Reset the file input so the same file can be imported again if needed
        input.value = '';
        
    } catch (error) {
        console.error('[Import] Import error:', error);
        playground.showNotification('Import failed: ' + error.message, 'error');
    }
}

// Professional PDF Template System
const PDFTemplates = {
    // Executive Summary Template - 1-2 pages, high-level overview
    executive: {
        name: "Executive Summary",
        description: "Concise 1-2 page overview for senior stakeholders",
        pages: ["cover", "metrics", "snapshot"],
        colors: { primary: "#1f2937", secondary: "#3b82f6", accent: "#10b981" },
        style: "executive"
    },
    
    // Technical Documentation Template - Comprehensive technical report
    technical: {
        name: "Technical Documentation", 
        description: "Detailed technical analysis with full specifications",
        pages: ["cover", "metrics", "snapshot", "inventory", "details", "recommendations"],
        colors: { primary: "#374151", secondary: "#6366f1", accent: "#f59e0b" },
        style: "technical"
    },
    
    // Client Presentation Template - Visual-focused for meetings
    presentation: {
        name: "Client Presentation",
        description: "Visual presentation format for client meetings",
        pages: ["cover", "overview", "snapshot", "summary", "next-steps"],
        colors: { primary: "#0f172a", secondary: "#8b5cf6", accent: "#06b6d4" },
        style: "presentation"
    },
    
    // Architecture Review Template - Comprehensive analysis (current default)
    comprehensive: {
        name: "Architecture Review",
        description: "Complete analysis with all available details (current format)",
        pages: ["metrics", "snapshot", "inventory", "details"],
        colors: { primary: "#1f2937", secondary: "#3b82f6", accent: "#ef4444" },
        style: "comprehensive"
    }
};

// Template-specific page generators
const PDFPageGenerators = {
    cover: (doc, data, template, branding) => {
        const { colors } = template;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Background gradient effect (simulated with rectangles)
        doc.setFillColor(...hexToRgb(colors.primary));
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        doc.setFillColor(...hexToRgb(colors.secondary + '22'));
        doc.rect(0, 0, pageWidth, pageHeight * 0.4, 'F');
        
        // Company logo if provided
        if (branding.logo) {
            try {
                doc.addImage(branding.logo, 'PNG', 40, 40, 120, 60);
            } catch (e) {
                console.warn('Logo failed to embed:', e);
            }
        }
        
        // Title section
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(28);
        doc.text('BI Architecture Analysis', 40, branding.logo ? 140 : 100);
        
        doc.setFontSize(16);
        doc.text(branding.clientName || 'Client Architecture Report', 40, branding.logo ? 165 : 125);
        
        // Project metadata
        doc.setFontSize(12);
        const y = branding.logo ? 200 : 160;
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 40, y);
        doc.text(`Analyst: ${branding.analystName || 'BI Consultant'}`, 40, y + 20);
        doc.text(`Components: ${data.items.length}`, 40, y + 40);
        doc.text(`Connections: ${(data.connections || []).length}`, 40, y + 60);
        
        // Footer
        doc.setFontSize(10);
        doc.setTextColor(200, 200, 200);
        doc.text('Confidential Business Intelligence Assessment', 40, pageHeight - 40);
    },
    
    overview: (doc, data, template, branding) => {
        const { colors } = template;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(20);
        doc.text('Executive Overview', 40, 50);
        
        // Key insights section
        doc.setFontSize(14);
        doc.text('Key Findings', 40, 80);
        
        doc.setFontSize(11);
        let y = 100;
        
        // Architecture complexity analysis
        const complexity = data.items.length > 20 ? 'High' : data.items.length > 10 ? 'Medium' : 'Low';
        doc.text(`• Architecture Complexity: ${complexity} (${data.items.length} components)`, 50, y);
        y += 18;
        
        // Connection density
        const connectionRatio = (data.connections || []).length / Math.max(1, data.items.length);
        const connectivity = connectionRatio > 1.5 ? 'Highly Connected' : connectionRatio > 0.8 ? 'Well Connected' : 'Loosely Connected';
        doc.text(`• System Integration: ${connectivity} (${(data.connections || []).length} connections)`, 50, y);
        y += 18;
        
        // Data source diversity
        const types = [...new Set(data.items.map(i => i.type || 'Unknown'))];
        doc.text(`• Technology Diversity: ${types.length} different component types`, 50, y);
        y += 18;
        
        // Recommendations teaser
        y += 20;
        doc.setFontSize(14);
        doc.text('Strategic Recommendations', 40, y);
        y += 20;
        
        doc.setFontSize(11);
        doc.text('• Consolidate data sources to reduce complexity', 50, y);
        y += 15;
        doc.text('• Implement unified governance framework', 50, y);
        y += 15;
        doc.text('• Establish data quality monitoring', 50, y);
    },
    
    summary: (doc, data, template, branding) => {
        doc.setFontSize(16);
        doc.text('Implementation Summary', 40, 50);
        
        // Quick stats in boxes
        const stats = [
            { label: 'Components', value: data.items.length, color: template.colors.primary },
            { label: 'Connections', value: (data.connections || []).length, color: template.colors.secondary },
            { label: 'Types', value: [...new Set(data.items.map(i => i.type))].length, color: template.colors.accent }
        ];
        
        let x = 50;
        stats.forEach(stat => {
            // Stat box
            doc.setFillColor(...hexToRgb(stat.color + '22'));
            doc.setDrawColor(...hexToRgb(stat.color));
            doc.rect(x, 80, 120, 60, 'FD');
            
            doc.setTextColor(...hexToRgb(stat.color));
            doc.setFontSize(24);
            doc.text(String(stat.value), x + 60, 105, { align: 'center' });
            
            doc.setFontSize(12);
            doc.text(stat.label, x + 60, 125, { align: 'center' });
            
            x += 140;
        });
    },
    
    'next-steps': (doc, data, template, branding) => {
        doc.setFontSize(16);
        doc.text('Next Steps & Recommendations', 40, 50);
        
        doc.setFontSize(12);
        let y = 80;
        
        const phases = [
            {
                title: 'Phase 1: Foundation (Weeks 1-4)',
                items: ['Data inventory completion', 'Governance framework design', 'Security assessment']
            },
            {
                title: 'Phase 2: Integration (Weeks 5-8)',
                items: ['Data pipeline development', 'Quality monitoring implementation', 'Initial dashboard deployment']
            },
            {
                title: 'Phase 3: Optimization (Weeks 9-12)',
                items: ['Performance tuning', 'User training', 'Documentation finalization']
            }
        ];
        
        phases.forEach(phase => {
            doc.setFontSize(14);
            doc.text(phase.title, 40, y);
            y += 20;
            
            doc.setFontSize(11);
            phase.items.forEach(item => {
                doc.text(`• ${item}`, 50, y);
                y += 15;
            });
            y += 10;
        });
    },
    
    recommendations: (doc, data, template, branding) => {
        doc.setFontSize(16);
        doc.text('Technical Recommendations', 40, 50);
        
        doc.setFontSize(12);
        let y = 80;
        
        // Analyze architecture and provide recommendations
        const recommendations = [];
        
        // Check for orphaned components
        const orphans = data.items.filter(item => {
            const hasIncoming = (data.connections || []).some(c => c.toId === item.id);
            const hasOutgoing = (data.connections || []).some(c => c.fromId === item.id);
            return !hasIncoming && !hasOutgoing;
        });
        
        if (orphans.length > 0) {
            recommendations.push({
                title: 'Isolated Components',
                description: `${orphans.length} components are not connected to the main data flow. Consider integration or retirement.`,
                priority: 'High'
            });
        }
        
        // Check data source count
        const sources = data.items.filter(i => (i.type || '').toLowerCase().includes('source'));
        if (sources.length > 10) {
            recommendations.push({
                title: 'Data Source Consolidation',
                description: `${sources.length} data sources detected. Consider consolidating to reduce complexity.`,
                priority: 'Medium'
            });
        }
        
        // Check for medallion architecture
        const hasBronze = data.items.some(i => (i.type || '').toLowerCase().includes('bronze'));
        const hasSilver = data.items.some(i => (i.type || '').toLowerCase().includes('silver'));
        const hasGold = data.items.some(i => (i.type || '').toLowerCase().includes('gold'));
        
        if (!hasBronze || !hasSilver || !hasGold) {
            recommendations.push({
                title: 'Medallion Architecture Implementation',
                description: 'Consider implementing Bronze/Silver/Gold data layers for better data quality and governance.',
                priority: 'Medium'
            });
        }
        
        recommendations.forEach(rec => {
            doc.setFillColor(255, 248, 220);
            doc.rect(40, y - 5, 500, 35, 'F');
            
            doc.setFontSize(13);
            doc.text(`${rec.title} (${rec.priority} Priority)`, 50, y + 5);
            
            doc.setFontSize(10);
            doc.text(rec.description, 50, y + 20);
            
            y += 50;
        });
    }
};

// Helper function to convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.replace(/[^#a-f\d]/gi, ''));
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [59, 130, 246]; // fallback blue
}

// Export PDF with multi-tier fallback (normal -> sanitized -> plain -> SVG -> text-only)
async function exportPDF(options={}) {
    const quick = options.quick === true; // quick snapshot-only mode
    const template = options.template || 'comprehensive';
    const branding = options.branding || JSON.parse(localStorage.getItem('pdfBranding') || '{}');
    
    try {
        const ensureLibs = () => new Promise((resolve, reject) => {
            const needHtml2Canvas = typeof html2canvas === 'undefined';
            const needJSPDF = typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined';
            let remaining = (needHtml2Canvas ? 1 : 0) + (needJSPDF ? 1 : 0);
            if (remaining === 0) return resolve();
            const onLoad = () => { remaining--; if (remaining === 0) resolve(); };
            const onError = (src) => { reject(new Error('Failed loading lib: ' + src)); };
            if (needHtml2Canvas) {
                const s = document.createElement('script');
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                s.onload = onLoad; s.onerror = () => onError(s.src); document.head.appendChild(s);
            }
            if (needJSPDF) {
                const s2 = document.createElement('script');
                s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                s2.onload = onLoad; s2.onerror = () => onError(s2.src); document.head.appendChild(s2);
            }
        });

        const capture = async (withSanitize=false) => {
            const canvasEl = document.getElementById('fabric-canvas');
            if (!canvasEl) throw new Error('Canvas not found');
            let mutated = [];
            if (withSanitize) {
                const disallow = /(oklab|lab\(|lch|conic-gradient|repeating-conic-gradient)/i;
                const all = canvasEl.querySelectorAll('*');
                all.forEach(el => {
                    const style = window.getComputedStyle(el);
                    const bgImg = style.backgroundImage;
                    const bgCol = style.backgroundColor;
                    if (bgImg && disallow.test(bgImg)) {
                        mutated.push({el, prop:'backgroundImage', value: el.style.backgroundImage});
                        el.style.backgroundImage = 'none';
                        mutated.push({el, prop:'backgroundColor', value: el.style.backgroundColor});
                        el.style.backgroundColor = '#1e1f25';
                    } else if (bgCol && disallow.test(bgCol)) {
                        mutated.push({el, prop:'backgroundColor', value: el.style.backgroundColor});
                        el.style.backgroundColor = '#1e1f25';
                    }
                    const color = style.color;
                    if (color && disallow.test(color)) {
                        mutated.push({el, prop:'color', value: el.style.color});
                        el.style.color = '#ffffff';
                    }
                });
            }
            try {
                return await html2canvas(canvasEl, {backgroundColor:'#1e1f25', logging:false, useCORS:true});
            } finally {
                mutated.forEach(m => { m.el.style[m.prop] = m.value; });
            }
        };

        // Attempt a raw high-fidelity capture (no sanitation) specifically for quick snapshot aesthetics
        const forceRawCapture = async () => {
            const canvasEl = document.getElementById('fabric-canvas');
            if (!canvasEl) throw new Error('Canvas not found');
            const canvasIsBlank = (c) => {
                try {
                    const ctx = c.getContext('2d');
                    const w = c.width, h = c.height;
                    if(!w || !h) return true;
                    const samples = 24;
                    let ref = null, same = 0;
                    for(let i=0;i<samples;i++){
                        const x = Math.floor(Math.random()*w);
                        const y = Math.floor(Math.random()*h);
                        const d = ctx.getImageData(x,y,1,1).data;
                        const key = d[0]+','+d[1]+','+d[2];
                        if(ref===null) ref=key; if(key===ref) same++;
                    }
                    return same / samples > 0.92; // >92% identical sample pixels => likely blank/flat
                } catch(e){ return false; }
            };

            // First attempt: original element high-fidelity
            try {
                const c1 = await html2canvas(canvasEl, { backgroundColor:null, logging:false, useCORS:true, foreignObjectRendering:true, scale:2 });
                if(!canvasIsBlank(c1)) return c1;
                console.warn('forceRawCapture: first attempt looked blank, trying cloned inline-styled copy');
            } catch(e){ console.warn('forceRawCapture: direct capture failed, trying clone', e); }

            // Second attempt: cloned + inline styles
            const clone = canvasEl.cloneNode(true);
            clone.id = 'fabric-canvas-clone-capture';
            Object.assign(clone.style, { position:'fixed', left:'-10000px', top:'0', zIndex:'-1', pointerEvents:'none' });
            document.body.appendChild(clone);
            const propsToCopy = [ 'background','backgroundColor','backgroundImage','backgroundSize','backgroundPosition','backgroundRepeat','color','font','fontFamily','fontSize','fontWeight','boxShadow','border','borderRadius','borderColor','borderWidth','borderStyle','filter','textShadow','padding','margin','display','alignItems','justifyContent','gap','flex','flexDirection','flexWrap','opacity' ];
            try {
                const originalNodes = canvasEl.querySelectorAll('*');
                const cloneNodes = clone.querySelectorAll('*');
                originalNodes.forEach((orig, idx) => {
                    const cloneNode = cloneNodes[idx];
                    if(!cloneNode) return;
                    const cs = window.getComputedStyle(orig);
                    propsToCopy.forEach(p => { try { const v = cs.getPropertyValue(p); if(v) cloneNode.style[p] = v; } catch(_){} });
                    if(cs.position === 'absolute'){
                        cloneNode.style.width = cs.width;
                        cloneNode.style.height = cs.height;
                        cloneNode.style.left = cs.left;
                        cloneNode.style.top = cs.top;
                    }
                });
                const csTop = window.getComputedStyle(canvasEl);
                propsToCopy.forEach(p => { try { const v = csTop.getPropertyValue(p); if(v) clone.style[p] = v; } catch(_){} });
                const c2 = await html2canvas(clone, { backgroundColor:null, logging:false, useCORS:true, foreignObjectRendering:true, scale:2 });
                if(!canvasIsBlank(c2)) return c2;
                console.warn('forceRawCapture: cloned capture also blank, falling back to sanitized standard capture');
            } finally { clone.remove(); }

            // Final fallback: normal sanitized capture (ensures nodes appear even if styles degrade)
            return await html2canvas(canvasEl, { backgroundColor:'#1e1f25', logging:false, useCORS:true, foreignObjectRendering:false, scale:1 });
        };

        const capturePlainSafe = async () => {
            const canvasEl = document.getElementById('fabric-canvas');
            if (!canvasEl) throw new Error('Canvas not found');
            const mutated = [];
            const all = canvasEl.querySelectorAll('*');
            all.forEach(el => {
                const style = window.getComputedStyle(el);
                const bgImg = style.backgroundImage;
                const bgCol = style.backgroundColor;
                if (bgImg && bgImg !== 'none') { mutated.push({el, prop:'backgroundImage', value: el.style.backgroundImage}); el.style.backgroundImage='none'; }
                if (bgCol && /oklab|lch|lab/i.test(bgCol)) { mutated.push({el, prop:'backgroundColor', value: el.style.backgroundColor}); el.style.backgroundColor='#1e1f25'; }
            });
            try {
                return await html2canvas(canvasEl, {backgroundColor:'#1e1f25', logging:false, useCORS:true});
            } finally { mutated.forEach(m => { m.el.style[m.prop] = m.value; }); }
        };

        const buildSVGImage = () => {
            const container = document.getElementById('fabric-canvas');
            if (!container) throw new Error('Canvas not found');
            const width = container.scrollWidth;
            const height = container.scrollHeight;
            const svgNS = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(svgNS, 'svg');
            svg.setAttribute('xmlns', svgNS);
            svg.setAttribute('width', width);
            svg.setAttribute('height', height);
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
            svg.setAttribute('style','background:#1e1f25');
            const connSvg = document.getElementById('connections-svg');
            if (connSvg) {
                connSvg.querySelectorAll('line, path').forEach(line => svg.appendChild(line.cloneNode(true)));
            }
            container.querySelectorAll('.canvas-item').forEach(node => {
                const rect = document.createElementNS(svgNS, 'rect');
                const x = parseInt(node.style.left || '0',10);
                const y = parseInt(node.style.top || '0',10);
                const w = node.offsetWidth;
                const h = node.offsetHeight;
                rect.setAttribute('x', x); rect.setAttribute('y', y);
                rect.setAttribute('width', w); rect.setAttribute('height', h);
                rect.setAttribute('rx', 8); rect.setAttribute('ry', 8);
                rect.setAttribute('fill', '#ffffff'); rect.setAttribute('stroke','#222'); rect.setAttribute('stroke-width','1');
                svg.appendChild(rect);
                const titleEl = node.querySelector('.item-title');
                const label = document.createElementNS(svgNS, 'text');
                label.setAttribute('x', x+8); label.setAttribute('y', y+20);
                label.setAttribute('font-family','Inter, Arial, sans-serif');
                label.setAttribute('font-size','12'); label.setAttribute('fill','#111');
                label.textContent = titleEl ? titleEl.textContent : 'Node';
                svg.appendChild(label);
            });
            const serializer = new XMLSerializer();
            const svgStr = serializer.serializeToString(svg);
            return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
        };

        const svgToCanvas = (dataUri) => new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img,0,0); resolve(c); };
            img.onerror = reject; img.src = dataUri;
        });

        await ensureLibs();
        const jsPDF = window.jspdf.jsPDF;
        let canvas = null;
        try { canvas = await capture(false); }
        catch(e1){
            console.warn('[PDF] Normal capture failed', e1);
            try { canvas = await capture(true); }
            catch(e2){
                console.warn('[PDF] Sanitized capture failed', e2);
                try { canvas = await capturePlainSafe(); }
                catch(e3){
                    console.warn('[PDF] Plain safe capture failed', e3);
                    try { const svgData = buildSVGImage(); canvas = await svgToCanvas(svgData); }
                    catch(e4){
                        console.warn('[PDF] SVG reconstruction failed, emitting text-only PDF', e4);
                        const doc = new jsPDF({orientation:'landscape', unit:'pt', format:'a4'});
                        doc.setFontSize(14); doc.text('InfiniBI Studio Snapshot (Text Fallback)', 40,40);
                        const data = playground.serialize();
                        doc.setFontSize(10); let y=60;
                        data.items.forEach(it=>{ if(y>520){doc.addPage(); y=40;} doc.text(`- ${it.id}: ${it.data?.name||it.type||'Item'}`,40,y); y+=14; });
                        doc.save('bi-architecture-fallback.pdf');
                        playground.showNotification('PDF (text-only fallback) exported','info');
                        return;
                    }
                }
            }
        }
        if(!canvas) throw new Error('Canvas capture failed at all stages');
        const cropToContent = (baseCanvas, opts = {}) => {
            try {
                const pad = opts.pad ?? 60; // a bit more padding to avoid clipped arrows
                const items = Array.from(document.querySelectorAll('#fabric-canvas .canvas-item'))
                    .filter(el => el.offsetWidth && el.offsetHeight && window.getComputedStyle(el).visibility !== 'hidden' && window.getComputedStyle(el).opacity !== '0');
                if(!items.length) return baseCanvas;
                // Collect bounds
                const bounds = items.map(el => {
                    const x = parseInt(el.style.left||'0',10);
                    const y = parseInt(el.style.top||'0',10);
                    return { x, y, w: el.offsetWidth, h: el.offsetHeight, bottom: y + el.offsetHeight, right: x + el.offsetWidth };
                });
                // Detect vertical outlier (e.g., stray node far below causing huge blank area)
                if(bounds.length > 3){
                    const bottomsSorted = [...bounds].sort((a,b)=>a.bottom-b.bottom);
                    const last = bottomsSorted[bottomsSorted.length-1];
                    const prev = bottomsSorted[bottomsSorted.length-2];
                    if(last.bottom - prev.bottom > 400){
                        // treat last as outlier; remove from bounds for cropping but keep slight inclusion
                        const idx = bounds.indexOf(last);
                        if(idx>-1) bounds.splice(idx,1);
                    }
                }
                let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
                bounds.forEach(b=>{ minX=Math.min(minX,b.x); minY=Math.min(minY,b.y); maxX=Math.max(maxX,b.right); maxY=Math.max(maxY,b.bottom); });
                // Also include connection SVG paths/lines if present so arrows aren't chopped
                const connSvg = document.querySelector('#fabric-canvas svg, #connections svg, #connection-layer svg, #connections-layer');
                if(connSvg){
                    try {
                        const svgRect = connSvg.getBoundingClientRect();
                        // Convert viewport coords to canvas coords by comparing a reference element
                        const canvasRect = document.querySelector('#fabric-canvas').getBoundingClientRect();
                        const relX = svgRect.left - canvasRect.left;
                        const relY = svgRect.top - canvasRect.top;
                        if(isFinite(relX) && isFinite(relY)){
                            minX = Math.min(minX, relX);
                            minY = Math.min(minY, relY);
                            maxX = Math.max(maxX, relX + svgRect.width);
                            maxY = Math.max(maxY, relY + svgRect.height);
                        }
                    } catch(svgErr){ console.warn('Connection SVG bounds failed', svgErr); }
                }
                if(!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return baseCanvas;
                const cw = (maxX - minX) + pad*2; const ch = (maxY - minY) + pad*2;
                const crop = document.createElement('canvas'); crop.width = Math.max(50, cw); crop.height = Math.max(50, ch);
                const ctx = crop.getContext('2d');
                ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
                ctx.fillStyle = '#1e1f25'; ctx.fillRect(0,0,crop.width,crop.height);
                ctx.drawImage(baseCanvas, -minX + pad, -minY + pad);
                return crop;
            } catch(e){ console.warn('Crop to content failed, using full canvas', e); return baseCanvas; }
        };

        if (quick) {
            // Synthetic renderer for consistent styled snapshot (avoids html2canvas CSS loss)
            const dataQuick = playground.serialize();
            const accentMap = {
                'ci-pipeline':'#06b6d4','ci-dataset':'#10b981','ci-dataflow':'#14b8a6','ci-report':'#f59e0b','ci-dashboard':'#f97316','ci-semantic-model':'#8b5cf6','ci-warehouse':'#60a5fa','ci-lakehouse':'#38bdf8','ci-data-source':'#3b82f6','ci-notebook':'#6366f1','ci-consumption-powerbi':'#F2C811','ci-consumption-excel':'#217346','ci-consumption-sql-endpoint':'#0078D4','ci-consumption-notebooks':'#6A5ACD','ci-medallion-bronze':'#cd7f32','ci-medallion-silver':'#c0c0c0','ci-medallion-gold':'#ffd700'
            };
            const pickAccent = cls => { for(const k in accentMap){ if(cls.includes(k)) return accentMap[k]; } return '#3b82f6'; };
            const nodes = dataQuick.items || [];
            if(!nodes.length){ playground.showNotification('No nodes to snapshot','warning'); return; }
            // Compute bounds
            let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
            let distinctX = new Set(); let distinctY = new Set();
            nodes.forEach(n=>{ const w = n.width||140, h = n.height||70; if(!n.position) return; distinctX.add(n.position.x); distinctY.add(n.position.y); minX=Math.min(minX,n.position.x); minY=Math.min(minY,n.position.y); maxX=Math.max(maxX,n.position.x+w); maxY=Math.max(maxY,n.position.y+h); });
            const pad = 80; const boardW = (maxX-minX)+pad*2; const boardH = (maxY-minY)+pad*2;
            const synth = document.createElement('canvas'); synth.width = Math.max(200, boardW); synth.height = Math.max(150, boardH);
            const ctx = synth.getContext('2d');
            // Background gradient
            const bgGrad = ctx.createLinearGradient(0,0,0,synth.height);
            bgGrad.addColorStop(0,'#17191d'); bgGrad.addColorStop(1,'#121316');
            ctx.fillStyle = bgGrad; ctx.fillRect(0,0,synth.width,synth.height);
            const degenerate = !isFinite(minX) || !isFinite(minY) || boardW < 40 || boardH < 40 || distinctX.size <= 1 && distinctY.size <= 1;
            if(degenerate){
                console.warn('[PDF quick] Synthetic board deemed degenerate, falling back to raster capture');
                const priorCanvas = canvas; // from earlier capture chain
                const croppedFallback = cropToContent(priorCanvas, { pad:80 });
                const jsPDF = window.jspdf.jsPDF; const docQ = new jsPDF({orientation:'landscape', unit:'pt', format:'a4'}); docQ.setFontSize(14); docQ.text('Architecture Snapshot',40,40);
                const imgDataFB = croppedFallback.toDataURL('image/png'); const pageWidthQ = docQ.internal.pageSize.getWidth(); const pageHeightQ = docQ.internal.pageSize.getHeight(); const maxWQ = pageWidthQ - 60; const maxHQ = pageHeightQ - 80; let scaleQ = Math.min(maxWQ / croppedFallback.width, maxHQ / croppedFallback.height); if(scaleQ>1.4) scaleQ=1.4; const imgWQ = croppedFallback.width * scaleQ; const imgHQ = croppedFallback.height * scaleQ; const xQ = 30 + (maxWQ - imgWQ)/2; const yQ = 50 + Math.max(0,(maxHQ - imgHQ)/4); docQ.addImage(imgDataFB,'PNG',xQ,yQ,imgWQ,imgHQ); const tsQ = new Date().toISOString().slice(0,19).replace(/:/g,'-'); docQ.save(`bi-architecture-snapshot-${tsQ}.pdf`); playground.showNotification('Snapshot PDF exported (fallback)','warning'); return; }
            // Draw connections first (simple straight lines)
            (dataQuick.connections||[]).forEach(c => {
                const from = nodes.find(n=>n.id===c.fromId); const to = nodes.find(n=>n.id===c.toId); if(!from||!to) return;
                const fw = from.width||140, fh = from.height||70; const tw = to.width||140, th = to.height||70;
                const x1 = (from.position.x - minX) + pad + fw/2; const y1 = (from.position.y - minY) + pad + fh/2;
                const x2 = (to.position.x - minX) + pad + tw/2; const y2 = (to.position.y - minY) + pad + th/2;
                ctx.strokeStyle = '#d0d4dc'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
                // Arrowhead
                const ang = Math.atan2(y2-y1,x2-x1); const ah=6; ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x2 - ah*Math.cos(ang-0.4), y2 - ah*Math.sin(ang-0.4)); ctx.lineTo(x2 - ah*Math.cos(ang+0.4), y2 - ah*Math.sin(ang+0.4)); ctx.closePath(); ctx.fillStyle='#d0d4dc'; ctx.fill();
            });
            // Draw nodes
            ctx.textBaseline='top';
            nodes.forEach(n=>{
                const w = n.width||140; const h = n.height||70; const x = (n.position.x - minX)+pad; const y = (n.position.y - minY)+pad;
                // Card background with subtle gradient
                const g = ctx.createLinearGradient(x,y,x,y+h);
                g.addColorStop(0,'#1f2228'); g.addColorStop(1,'#1a1c21');
                ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=12; ctx.shadowOffsetY=4; ctx.fillRect(x+2,y+3,w,h); // soft shadow blob
                ctx.shadowBlur=0; ctx.shadowOffsetY=0;
                ctx.fillStyle = g; ctx.strokeStyle = '#252830'; ctx.lineWidth=1; roundRect(ctx,x,y,w,h,8,true,true);
                // Accent bar
                const accent = pickAccent(n.className||'');
                ctx.fillStyle = accent; ctx.fillRect(x,y,4,h);
                // Title
                const name = (n.data && n.data.name) || n.type || 'Node';
                ctx.font = '600 12px Inter, Arial, sans-serif'; ctx.fillStyle='#e6edf3'; ctx.fillText(name, x+12, y+10, w-20);
                // Type badge
                const type = n.type || '';
                if(type){
                    ctx.font = '500 10px Inter, Arial, sans-serif'; const badgeText = type; const tw = ctx.measureText(badgeText).width + 12; const bh = 16; const bx = x + 12; const by = y + h - bh - 10; ctx.fillStyle = accent + '22'; ctx.strokeStyle = accent + '55'; roundRect(ctx,bx,by,tw,bh,6,true,true); ctx.fillStyle=accent; ctx.font='600 9px Inter, Arial, sans-serif'; ctx.fillText(badgeText, bx+6, by+4);
                }
            });
            function roundRect(ctx,x,y,w,h,r,fill,stroke){ if(r<0) r=0; ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); if(fill) ctx.fill(); if(stroke) ctx.stroke(); }
            const jsPDF = window.jspdf.jsPDF;
            const docQ = new jsPDF({orientation:'landscape', unit:'pt', format:'a4'});
            docQ.setFontSize(14); docQ.text('Architecture Snapshot',40,40);
            // Scale & place
            const pageWidthQ = docQ.internal.pageSize.getWidth();
            const pageHeightQ = docQ.internal.pageSize.getHeight();
            const maxWQ = pageWidthQ - 60; const maxHQ = pageHeightQ - 80;
            let scaleQ = Math.min(maxWQ / synth.width, maxHQ / synth.height); if(scaleQ>1.6) scaleQ=1.6;
            const imgWQ = synth.width * scaleQ; const imgHQ = synth.height * scaleQ;
            const xQ = 30 + (maxWQ - imgWQ)/2; const yQ = 50 + Math.max(0,(maxHQ - imgHQ)/4);
            const imgDataQ = synth.toDataURL('image/png');
            docQ.addImage(imgDataQ,'PNG',xQ,yQ,imgWQ,imgHQ);
            const tsQ = new Date().toISOString().slice(0,19).replace(/:/g,'-');
            docQ.save(`bi-architecture-snapshot-${tsQ}.pdf`);
            playground.showNotification('Snapshot PDF exported','success');
            return; // done
        }
        const doc = new jsPDF({orientation:'landscape', unit:'pt', format:'a4'});
        const ts = new Date().toISOString().slice(0,19).replace(/:/g,'-');
        const data = playground.serialize();

        // Helper: synthetic styled board renderer (shared aesthetic with quick snapshot)
        const buildSyntheticBoard = (dataObj) => {
            const accentMap = {
                'ci-pipeline':'#06b6d4','ci-dataset':'#10b981','ci-dataflow':'#14b8a6','ci-report':'#f59e0b','ci-dashboard':'#f97316','ci-semantic-model':'#8b5cf6','ci-warehouse':'#60a5fa','ci-lakehouse':'#38bdf8','ci-data-source':'#3b82f6','ci-notebook':'#6366f1','ci-consumption-powerbi':'#F2C811','ci-consumption-excel':'#217346','ci-consumption-sql-endpoint':'#0078D4','ci-consumption-notebooks':'#6A5ACD','ci-medallion-bronze':'#cd7f32','ci-medallion-silver':'#c0c0c0','ci-medallion-gold':'#ffd700'
            };
            const pickAccent = cls => { for(const k in accentMap){ if((cls||'').includes(k)) return accentMap[k]; } return '#3b82f6'; };
            const nodes = dataObj.items||[];
            if(!nodes.length) throw new Error('No nodes to render synthetically');
            let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
            nodes.forEach(n=>{ const w = n.width||140, h = n.height||70; minX=Math.min(minX,n.position.x); minY=Math.min(minY,n.position.y); maxX=Math.max(maxX,n.position.x+w); maxY=Math.max(maxY,n.position.y+h); });
            const pad=80; const boardW=(maxX-minX)+pad*2; const boardH=(maxY-minY)+pad*2;
            const synth=document.createElement('canvas'); synth.width=Math.max(200,boardW); synth.height=Math.max(150,boardH);
            const ctx=synth.getContext('2d');
            const bgGrad=ctx.createLinearGradient(0,0,0,synth.height); bgGrad.addColorStop(0,'#17191d'); bgGrad.addColorStop(1,'#121316'); ctx.fillStyle=bgGrad; ctx.fillRect(0,0,synth.width,synth.height);
            (dataObj.connections||[]).forEach(c=>{ const from=nodes.find(n=>n.id===c.fromId); const to=nodes.find(n=>n.id===c.toId); if(!from||!to) return; const fw=from.width||140, fh=from.height||70, tw=to.width||140, th=to.height||70; const x1=(from.position.x-minX)+pad+fw/2; const y1=(from.position.y-minY)+pad+fh/2; const x2=(to.position.x-minX)+pad+tw/2; const y2=(to.position.y-minY)+pad+th/2; ctx.strokeStyle='#d0d4dc'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); const ang=Math.atan2(y2-y1,x2-x1); const ah=6; ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x2-ah*Math.cos(ang-0.4), y2-ah*Math.sin(ang-0.4)); ctx.lineTo(x2-ah*Math.cos(ang+0.4), y2-ah*Math.sin(ang+0.4)); ctx.closePath(); ctx.fillStyle='#d0d4dc'; ctx.fill(); });
            ctx.textBaseline='top';
            function roundRect(ctx,x,y,w,h,r,fill,stroke){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); if(fill) ctx.fill(); if(stroke) ctx.stroke(); }
            nodes.forEach(n=>{ const w=n.width||140, h=n.height||70, x=(n.position.x-minX)+pad, y=(n.position.y-minY)+pad; const g=ctx.createLinearGradient(x,y,x,y+h); g.addColorStop(0,'#1f2228'); g.addColorStop(1,'#1a1c21'); ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=12; ctx.shadowOffsetY=4; ctx.fillRect(x+2,y+3,w,h); ctx.shadowBlur=0; ctx.shadowOffsetY=0; ctx.fillStyle=g; ctx.strokeStyle='#252830'; ctx.lineWidth=1; roundRect(ctx,x,y,w,h,8,true,true); const accent=pickAccent(n.className||''); ctx.fillStyle=accent; ctx.fillRect(x,y,4,h); const name=(n.data&&n.data.name)||n.type||'Node'; ctx.font='600 12px Inter, Arial'; ctx.fillStyle='#e6edf3'; ctx.fillText(name,x+12,y+10,w-20); const type=n.type||''; if(type){ ctx.font='500 10px Inter, Arial'; const badge=type; const tw=ctx.measureText(badge).width+12; const bh=16; const bx=x+12; const by=y+h-bh-10; ctx.fillStyle=accent+'22'; ctx.strokeStyle=accent+'55'; roundRect(ctx,bx,by,tw,bh,6,true,true); ctx.fillStyle=accent; ctx.font='600 9px Inter, Arial'; ctx.fillText(badge,bx+6,by+4); } });
            return synth;
        };

        // Simple icon map (emoji fallback so we avoid font embedding complexity)
        const typeIcons = {
            'Data Lake':'🗄️','Bronze':'🥉','Silver':'🥈','Gold':'🥇','Semantic Model':'📊','Power BI':'📈','Excel':'📑','Source':'🗂️','ETL':'⚙️','Warehouse':'🏬','Lakehouse':'💧','Dashboard':'📊'
        };
        const pickIcon = (it) => {
            const t = (it.type||'').toLowerCase();
            for (const k in typeIcons) { if (k.toLowerCase() === t) return typeIcons[k]; }
            return '⬜';
        };

        // Build connection maps
        const inCounts = {}; const outCounts = {};
        (data.connections||[]).forEach(c=>{ if(!inCounts[c.toId]) inCounts[c.toId]=0; inCounts[c.toId]++; if(!outCounts[c.fromId]) outCounts[c.fromId]=0; outCounts[c.fromId]++; });
        // Helper to fetch item by id quickly
        const itemById = {}; data.items.forEach(it=>{ itemById[it.id]=it; });

        // Component metrics
        const typeCounts = {};
        data.items.forEach(it=>{ const t = it.type||'Unknown'; typeCounts[t]=(typeCounts[t]||0)+1; });
        const orphanItems = data.items.filter(it => !(inCounts[it.id]) && !(outCounts[it.id]));

        // === TEMPLATE SYSTEM INTEGRATION ===
        const templateName = options.template || 'comprehensive';
        const template = PDFTemplates[templateName] || PDFTemplates.comprehensive;
        const branding = options.branding || {};
        
        console.log(`Generating PDF with template: ${template.name}`);
        
        // Generate pages based on template configuration
        template.pages.forEach((pageType, index) => {
            if (index > 0) doc.addPage('a4', 'landscape');
            
            try {
                if (PDFPageGenerators[pageType]) {
                    PDFPageGenerators[pageType](doc, data, template, branding);
                } else {
                    // Fall back to existing page generators for compatibility
                    generateLegacyPage(doc, pageType, data, {
                        buildSyntheticBoard, cropToContent, canvas,
                        typeCounts, orphanItems, inCounts, outCounts, itemById
                    });
                }
            } catch (error) {
                console.warn(`Failed to generate page ${pageType}:`, error);
                // Add error page
                doc.setFontSize(16);
                doc.text(`Error generating ${pageType} page`, 40, 100);
                doc.setFontSize(12);
                doc.text(error.message, 40, 120);
            }
        });
        
        // Skip legacy page generation if using modern templates
        if (template.style !== 'comprehensive') {
            const filename = `bi-${template.style}-${ts}.pdf`;
            doc.save(filename);
            playground.showNotification(`${template.name} PDF exported`, 'success');
            return;
        }

        // === LEGACY COMPREHENSIVE TEMPLATE (CURRENT FORMAT) ===
        
        // Legacy page generator for backward compatibility
        function generateLegacyPage(doc, pageType, data, helpers) {
            const { buildSyntheticBoard, cropToContent, canvas, typeCounts, orphanItems, inCounts, outCounts, itemById } = helpers;
            
            switch (pageType) {
                case 'metrics':
                    doc.setFontSize(20); 
                    doc.text('InfiniBI Studio Report', 40, 50);
                    doc.setFontSize(10); 
                    doc.text('Generated: ' + new Date().toLocaleString(), 40, 66);
                    doc.setDrawColor(180); 
                    doc.line(40, 72, 800, 72);
                    doc.setFontSize(12); 
                    doc.text('Summary Metrics', 40, 92);
                    doc.setFontSize(10);
                    
                    let y = 108;
                    const addLine = (label, val) => { 
                        doc.text(label + ':', 40, y); 
                        doc.text(String(val), 170, y); 
                        y += 14; 
                    };
                    
                    addLine('Total Components', data.items.length);
                    addLine('Total Connections', (data.connections || []).length);
                    addLine('Orphan Components', orphanItems.length);
                    
                    doc.text('Type Distribution:', 40, y); y += 14;
                    Object.keys(typeCounts).sort().forEach(t => { 
                        doc.text(`- ${t}: ${typeCounts[t]}`, 50, y); 
                        y += 12; 
                    });
                    
                    if (orphanItems.length) {
                        y += 6; 
                        doc.text('Orphans:', 40, y); 
                        y += 14;
                        orphanItems.slice(0, 10).forEach(o => { 
                            doc.text('- ' + (o.data?.name || o.type || o.id), 50, y); 
                            y += 12; 
                        });
                        if (orphanItems.length > 10) { 
                            doc.text(`(+${orphanItems.length - 10} more)`, 50, y); 
                            y += 12; 
                        }
                    }
                    break;
                    
                case 'snapshot':
                    doc.setFontSize(16); 
                    doc.text('Architecture Snapshot', 40, 50);
                    
                    let boardCanvasForFull;
                    try { 
                        boardCanvasForFull = buildSyntheticBoard(data); 
                    } catch(e) { 
                        console.warn('Synthetic board render failed for full PDF, fallback to html2canvas crop', e); 
                        boardCanvasForFull = cropToContent(canvas, { pad: 80 }); 
                    }
                    
                    if (boardCanvasForFull && (boardCanvasForFull.width < 60 || boardCanvasForFull.height < 60)) {
                        console.warn('[PDF full] Synthetic canvas tiny; using fallback raster capture');
                        boardCanvasForFull = cropToContent(canvas, { pad: 80 });
                    }
                    
                    const imgData = boardCanvasForFull.toDataURL('image/png');
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    const maxImgWidth = pageWidth - 80; 
                    const maxImgHeight = pageHeight - 100;
                    let scale = Math.min(maxImgWidth / boardCanvasForFull.width, maxImgHeight / boardCanvasForFull.height);
                    if (scale > 1.4) scale = 1.4;
                    
                    const imgW = boardCanvasForFull.width * scale; 
                    const imgH = boardCanvasForFull.height * scale;
                    const imgX = 40 + (maxImgWidth - imgW) / 2; 
                    const imgY = 60 + Math.max(0, (maxImgHeight - imgH) / 4);
                    
                    doc.addImage(imgData, 'PNG', imgX, imgY, imgW, imgH);
                    doc.setTextColor(0, 0, 0);
                    break;
            }
        }
        
        // PAGE 1: Metrics Summary
    doc.setFontSize(20); doc.text('InfiniBI Studio Report',40,50);
        doc.setFontSize(10); doc.text('Generated: '+ new Date().toLocaleString(),40,66);
        doc.setDrawColor(180); doc.line(40,72,800,72);
        doc.setFontSize(12); doc.text('Summary Metrics',40,92);
        doc.setFontSize(10);
        let y=108;
        const addLine = (label,val) => { doc.text(label+':',40,y); doc.text(String(val),170,y); y+=14; };
        addLine('Total Components', data.items.length);
        addLine('Total Connections', (data.connections||[]).length);
        addLine('Orphan Components', orphanItems.length);
        // Type distribution
        doc.text('Type Distribution:',40,y); y+=14;
        Object.keys(typeCounts).sort().forEach(t=>{ doc.text(`- ${t}: ${typeCounts[t]}`,50,y); y+=12; });
        if (orphanItems.length) {
            y+=6; doc.text('Orphans:',40,y); y+=14;
            orphanItems.slice(0,10).forEach(o=>{ doc.text('- '+ (o.data?.name||o.type||o.id),50,y); y+=12; });
            if (orphanItems.length>10) { doc.text(`(+${orphanItems.length-10} more)`,50,y); y+=12; }
        }

    // PAGE 2: Snapshot (synthetic styled renderer for consistency with quick mode)
    doc.addPage('a4','landscape');
    doc.setFontSize(16); doc.text('Architecture Snapshot',40,50);
        let boardCanvasForFull;
        try { boardCanvasForFull = buildSyntheticBoard(data); }
        catch(e){ console.warn('Synthetic board render failed for full PDF, fallback to html2canvas crop', e); boardCanvasForFull = cropToContent(canvas, { pad: 80 }); }
        // Detect degenerate synthetic board (e.g., missing nodes) and fallback
        if(boardCanvasForFull && (boardCanvasForFull.width < 60 || boardCanvasForFull.height < 60)) {
            console.warn('[PDF full] Synthetic canvas tiny; using fallback raster capture');
            boardCanvasForFull = cropToContent(canvas, { pad: 80 });
        }
    const imgData = boardCanvasForFull.toDataURL('image/png');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxImgWidth = pageWidth - 80; const maxImgHeight = pageHeight - 100;
    let scale = Math.min(maxImgWidth / boardCanvasForFull.width, maxImgHeight / boardCanvasForFull.height);
    if(scale>1.4) scale=1.4; // allow modest upscale for smaller diagrams
    const imgW = boardCanvasForFull.width * scale; const imgH = boardCanvasForFull.height * scale;
    const imgX = 40 + (maxImgWidth - imgW)/2; const imgY = 60 + Math.max(0,(maxImgHeight - imgH)/4);
    doc.addImage(imgData,'PNG',imgX,imgY,imgW,imgH);
    doc.setTextColor(0,0,0);

        // PAGE 3+: Component Table (dark themed header)
    doc.addPage('a4','landscape');
    doc.setFontSize(16); doc.text('Component Inventory',40,50); doc.setFontSize(9);
        const headers = [
            {k:'name', w:150, label:'Name'},
            {k:'type', w:80, label:'Type'},
            {k:'business', w:200, label:'Business (excerpt)'},
            {k:'technical', w:200, label:'Technical (excerpt)'},
            {k:'in', w:24, label:'In', align:'right'},
            {k:'out', w:28, label:'Out', align:'right'}
        ];
        const wrap = (txt, maxChars) => {
            if(!txt) return '';
            const t = String(txt).replace(/\s+/g,' ').trim();
            if(t.length <= maxChars) return t;
            return t.slice(0,maxChars-1) + '…';
        };
    // Inventory table layout tuning
    const headerTopY = 82; // push table further down so header not clipped
    const rowHeight = 18; y = headerTopY; // starting y reference
        doc.setFontSize(8);
        // Header background with slightly taller bar
    // Draw header bar (taller for better visual weight)
    const headerBarHeight = 20; // increased from 16
    doc.setFillColor(34,36,44); doc.setDrawColor(55,57,65); let x=40; headers.forEach(h=>{ doc.rect(x,y- (headerBarHeight-9),h.w,headerBarHeight,'FD'); x+=h.w; });
    // Header labels vertically centered within bar
    const labelBaselineOffset = Math.round(headerBarHeight/2) - 2; // center approximation
    doc.setTextColor(240); doc.setFontSize(9); x=40; headers.forEach(h=>{ const align = h.align==='right'?'right':'left'; const tx = align==='right'? x+h.w-5 : x+7; doc.text(h.label,tx,y - (headerBarHeight-9) + labelBaselineOffset,{align}); x+=h.w; });
    // Bottom separator
    doc.setDrawColor(70,72,80); const headerBottomY = y - (headerBarHeight-9) + headerBarHeight - 1; doc.line(40, headerBottomY, 40 + headers.reduce((acc,h)=>acc+h.w,0), headerBottomY);
    // Advance y to first row baseline
    doc.setTextColor(30); doc.setFontSize(8); y = headerBottomY + 8;
        const pageBottom = pageHeight - 40;
        data.items.forEach((it, idx)=>{
            if(y>pageBottom){
                doc.addPage('a4','landscape');
                // redraw header on new page
                let xh=40; const headerY=82; const headerBarHeight2=20; doc.setFillColor(34,36,44); doc.setDrawColor(55,57,65); headers.forEach(h=>{ doc.rect(xh,headerY-(headerBarHeight2-9),h.w,headerBarHeight2,'FD'); xh+=h.w; });
                const labelBaselineOffset2 = Math.round(headerBarHeight2/2) - 2; doc.setTextColor(240); doc.setFontSize(9); xh=40; headers.forEach(h=>{ const align = h.align==='right'?'right':'left'; const tx = align==='right'? xh+h.w-5 : xh+7; doc.text(h.label,tx,headerY-(headerBarHeight2-9)+labelBaselineOffset2,{align}); xh+=h.w; });
                doc.setDrawColor(70,72,80); const headerBottomY2 = headerY - (headerBarHeight2-9) + headerBarHeight2 - 1; doc.line(40, headerBottomY2, 40 + headers.reduce((acc,h)=>acc+h.w,0), headerBottomY2);
                doc.setTextColor(30); doc.setFontSize(8); y = headerBottomY2 + 8;
            }
            // zebra rows
            if(idx % 2 === 0){
                doc.setFillColor(246,247,249); let zx=40; headers.forEach(h=>{ doc.rect(zx,y-12,h.w,rowHeight,'F'); zx+=h.w; });
            }
            const meta = (it.data && it.data.meta) || {}; // metadata object
            // Build concise business summary
            let business = '';
            if (typeof meta.business === 'string') { business = meta.business; }
            else if (meta.business) {
                const parts = [];
                if (meta.business.purpose) parts.push(meta.business.purpose);
                if (meta.business.owner) parts.push(`Owner: ${meta.business.owner}`);
                if (meta.business.criticality) parts.push(`Crit: ${meta.business.criticality}`);
                business = parts.join(' – ');
            }
            let technical = '';
            if (typeof meta.technical === 'string') { technical = meta.technical; }
            else if (meta.technical) {
                const tparts = [];
                if (meta.technical.refresh) tparts.push(meta.technical.refresh);
                if (meta.technical.latency) tparts.push(meta.technical.latency);
                if (meta.technical.volume) tparts.push(meta.technical.volume);
                technical = tparts.join(' | ');
            }
            const name = (it.data?.name)|| it.type || it.id;
            x=40;
            const cells = {
                name: wrap(name,40),
                type: wrap(it.type,14),
                business: wrap(business,95),
                technical: wrap(technical,95),
                in: inCounts[it.id]||0,
                out: outCounts[it.id]||0
            };
            headers.forEach(h=>{ const align = h.align==='right'?'right':'left'; const cellVal = String(cells[h.k]??''); const tx = align==='right'? x+h.w-4 : x+4; doc.text(cellVal, tx, y-5, {align}); x+=h.w; });
            y+=rowHeight;
        });

        // DETAIL PAGES
        data.items.forEach(it=>{
            const meta = (it.data && it.data.meta) || {}; 
            // Expand business object
            let businessTxt = '';
            if (typeof meta.business === 'string') businessTxt = meta.business;
            else if (meta.business) {
                const lines = [];
                if (meta.business.purpose) lines.push(`Purpose: ${meta.business.purpose}`);
                if (meta.business.owner) lines.push(`Owner: ${meta.business.owner}`);
                if (meta.business.criticality) lines.push(`Criticality: ${meta.business.criticality}`);
                if (meta.business.status) lines.push(`Status: ${meta.business.status}`);
                businessTxt = lines.join('\n');
            }
            let technicalTxt = '';
            if (typeof meta.technical === 'string') technicalTxt = meta.technical;
            else if (meta.technical) {
                const lines = [];
                if (meta.technical.refresh) lines.push(`Refresh: ${meta.technical.refresh}`);
                if (meta.technical.latency) lines.push(`Latency: ${meta.technical.latency}`);
                if (meta.technical.volume) lines.push(`Volume: ${meta.technical.volume}`);
                technicalTxt = lines.join('\n');
            }
            const notesTxt = typeof meta.notes === 'string'? meta.notes:'';
            if(!businessTxt && !technicalTxt && !notesTxt) return; // skip empty detail page
            doc.addPage('a4','landscape');
            doc.setFontSize(14); doc.text((it.data?.name)|| it.type || it.id,40,50);
            doc.setFontSize(9);
            let cy=70; const maxW = pageWidth - 80; 
            const addSection=(title,txt)=>{ if(!txt) return; doc.setFontSize(11); doc.text(title,40,cy); cy+=14; doc.setFontSize(9); const paragraphs = String(txt).split(/\n+/); paragraphs.forEach(p=>{ const words=p.split(/\s+/); let line=''; words.forEach(w=>{ if(doc.getTextWidth(line+' '+w) > maxW){ doc.text(line,40,cy); cy+=12; line=w; if(cy>pageHeight-40){ doc.addPage('a4','landscape'); cy=60; } } else { line = line? line+' '+w : w; } }); if(line){ if(cy>pageHeight-40){ doc.addPage('a4','landscape'); cy=60;} doc.text(line,40,cy); cy+=12; } cy+=6; }); cy+=6; };
            addSection('Business', businessTxt);
            addSection('Technical', technicalTxt);
            addSection('Notes', notesTxt);
        });

        doc.save(`bi-architecture-${ts}.pdf`);
        playground.showNotification('PDF exported','success');
        playground.showNotification('PDF exported','success');
    } catch(err) {
        console.error('PDF export failed Error:', err);
        playground.showNotification('PDF export failed: '+ err.message,'error');
    }
}

function saveCanvas() {
    try {
        const data = playground.serialize();
        
        // Validate data before saving
        if (!data || !data.items) {
            playground.showNotification('No data to save', 'warning');
            return;
        }
        
        const jsonString = JSON.stringify(data);
        
        // Check if localStorage has enough space
        try {
            localStorage.setItem('playground-save', jsonString);
            
            // Create a backup with timestamp
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            localStorage.setItem(`playground-backup-${timestamp}`, jsonString);
            
            playground.showNotification(`Canvas saved (${data.items.length} items, ${data.connections.length} connections)`, 'success');
        } catch (quotaError) {
            // If localStorage is full, try to save without backup
            try {
                localStorage.setItem('playground-save', jsonString);
                playground.showNotification('Canvas saved (storage nearly full)', 'warning');
            } catch (e) {
                playground.showNotification('Save failed: Storage quota exceeded', 'error');
            }
        }
        
    } catch (e) {
        console.error('Save failed:', e);
        playground.showNotification('Save failed: ' + e.message, 'error');
    }
}

function loadCanvas() {
    try {
        const raw = localStorage.getItem('playground-save');
        if (!raw) {
            // Check for backup saves
            const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('playground-backup-'));
            if (backupKeys.length > 0) {
                const latestBackup = backupKeys.sort().pop();
                const backupData = localStorage.getItem(latestBackup);
                if (backupData) {
                    const data = JSON.parse(backupData);
                    playground.loadFromData(data);
                    playground.showNotification('Loaded from latest backup', 'info');
                    return;
                }
            }
            playground.showNotification('No saved canvas found', 'warning');
            return;
        }
        
        const data = JSON.parse(raw);
        
        // Validate data structure
        if (!data || typeof data !== 'object') {
            playground.showNotification('Invalid save data format', 'error');
            return;
        }
        
        playground.loadFromData(data);
        
    } catch (e) {
        console.error('Load failed:', e);
        playground.showNotification('Load failed: ' + e.message, 'error');
        
        // Try to recover from backup
        try {
            const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('playground-backup-'));
            if (backupKeys.length > 0) {
                const latestBackup = backupKeys.sort().pop();
                const backupData = localStorage.getItem(latestBackup);
                if (backupData) {
                    const data = JSON.parse(backupData);
                    playground.loadFromData(data);
                    playground.showNotification('Recovered from backup due to corrupted save', 'warning');
                    return;
                }
            }
        } catch (backupError) {
            console.error('Backup recovery also failed:', backupError);
        }
    }

}

function handleItemTypeSelection() {
    playground.handleItemTypeSelection();
}

function addSelectedItemToCanvas() {
    playground.addSelectedItemToCanvas();
}

function createDeploymentPipeline() {
    playground.showNotification('Deployment pipeline feature coming soon!', 'info');
}

function createApp() {
    playground.showNotification('Create app feature coming soon!', 'info');
}

function addDataSource() {
    // Simple example add; in real use, prompt the user
    const next = {
        name: 'New Source ' + (playground.sources.length + 1),
        type: 'SQL Server',
        icon: 'fas fa-server',
        dataType: 'sql-server'
    };
    playground.sources.push(next);
    playground.saveDataSources();
    playground.renderDataSources();
    playground.showNotification('Data source added to sidebar', 'success');
}

function importCanvas() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validate imported data
                if (!data || typeof data !== 'object') {
                    playground.showNotification('Invalid file format', 'error');
                    return;
                }
                
                if (!data.items && !data.metadata) {
                    playground.showNotification('No valid data found in file', 'error');
                    return;
                }
                
                playground.loadFromData(data);
                playground.showNotification(`Imported architecture from ${file.name}`, 'success');
                
            } catch (error) {
                console.error('Import failed:', error);
                playground.showNotification('Failed to import file: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function clearSaveData() {
    if (confirm('Clear all saved data? This cannot be undone.')) {
        try {
            // Clear main save
            localStorage.removeItem('playground-save');
            
            // Clear autosave
            localStorage.removeItem('playground-autosave');
            
            // Clear all backup saves
            const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('playground-backup-'));
            backupKeys.forEach(key => localStorage.removeItem(key));
            
            playground.showNotification(`Cleared save data (${backupKeys.length} backups removed)`, 'info');
        } catch (e) {
            playground.showNotification('Failed to clear save data', 'error');
        }
    }
}

// Global function for palette category toggling
function togglePaletteCategory(categoryId) {
    const categoryItems = document.getElementById(categoryId);
    
    if (!categoryItems) {
        console.error('Category items not found for ID:', categoryId);
        return;
    }
    
    const categoryHeader = categoryItems.previousElementSibling;
    
    if (categoryItems.classList.contains('expanded')) {
        // Collapsing category
        categoryItems.classList.remove('expanded');
        categoryHeader.classList.remove('expanded');
    } else {
        // Expanding category
        // Close all other categories first (accordion behavior)
        document.querySelectorAll('.category-items.expanded').forEach(items => {
            items.classList.remove('expanded');
            items.previousElementSibling.classList.remove('expanded');
        });
        
        // Calculate position relative to the header button
        const headerRect = categoryHeader.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Position dropdown below the header
        const top = headerRect.bottom + scrollTop;
        const left = headerRect.left + scrollLeft;
        
        // Apply positioning
        categoryItems.style.top = top + 'px';
        categoryItems.style.left = left + 'px';
        
        // Open the clicked category
        categoryItems.classList.add('expanded');
        categoryHeader.classList.add('expanded');
    }
}

// Function to close all open dropdowns
function closeAllDropdowns() {
    document.querySelectorAll('.category-items.expanded').forEach(items => {
        items.classList.remove('expanded');
        items.previousElementSibling.classList.remove('expanded');
    });
}

// Also make it available on window object for debugging
window.togglePaletteCategory = togglePaletteCategory;

// Setup event listeners for palette category toggles
function setupPaletteCategoryToggles() {
    // Find all category headers and set up click listeners
    document.querySelectorAll('.category-header').forEach((header) => {
        // Get the corresponding category items element
        const categoryItems = header.nextElementSibling;
        if (categoryItems && categoryItems.classList.contains('category-items')) {
            const categoryId = categoryItems.id;
            
            // Remove any existing onclick and add event listener
            header.removeAttribute('onclick');
            header.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                togglePaletteCategory(categoryId);
            });
        }
    });
    
    // Global click listener to close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        // Check if the click is outside the palette area
        const paletteArea = e.target.closest('.component-palette');
        const isDropdownOpen = document.querySelector('.category-items.expanded');
        
        // If we clicked outside the palette and there's an open dropdown, close it
        if (!paletteArea && isDropdownOpen) {
            closeAllDropdowns();
        }
    });
}

// Status indicator helper function
function updateComponentStatusIndicator(element, status) {
    // Remove any existing status indicator
    const existingIndicator = element.querySelector('.component-status-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // Add new status indicator if status is set
    if (status && status.trim() !== '') {
        const indicator = document.createElement('div');
        indicator.className = `component-status-indicator status-${status}`;
        indicator.title = `Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`;
        element.appendChild(indicator);
    }
}

// Initialize playground when DOM is loaded
let playground;
document.addEventListener('DOMContentLoaded', () => {
    playground = new ArchitecturePlayground();
    
    // Setup palette category toggles
    setupPaletteCategoryToggles();
    
    // Initialize inspector panel toggle
    const inspectorToggle = document.getElementById('inspector-toggle');
    const inspectorPanel = document.getElementById('inspector-panel');
    
    if (inspectorToggle && inspectorPanel) {
        inspectorToggle.addEventListener('click', () => {
            inspectorPanel.classList.toggle('collapsed');
            
            // Update connections after panel layout change
            setTimeout(() => {
                playground.updateConnections();
            }, 300); // Small delay to let CSS transitions complete
        });
    }
});
