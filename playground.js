// InfiniBI Studio - Standalone Version
class ArchitecturePlayground {
    constructor() {
        // Canvas + connection state
        this.connections = [];
        this.connectionMode = false;
        this.selectedSource = null;
        this.selectedItem = null;
        this.dragUpdateTimeout = null;
        this.canvasItems = [];
        this.connectionSvg = null;
        this.canvasSpacer = null;
        this.canvasMargin = 200;
        this.sources = [];
        this.canvasSourcesWindow = null;
        this._isDraggingCanvasWindow = false;
        this.editMode = false;
        this.gridSize = 20;
        this.manualAnchorMode = false;
        this.anchorHighlights = new Map();
        this.connectionPreview = null;
        this.pendingConnection = null;
        
        // Drag state
        this.isDragging = false;
        this.dragPrimaryItem = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragInitialPositions = new Map();
        
        // Zoom and pan state
        this.zoomLevel = 1.0;
        this.canvasOffset = { x: 0, y: 0 };
        this.minZoom = 0.25;
        this.maxZoom = 3.0;
        this.zoomStep = 0.1;
        this.panMode = false;
        
        // Container types for special handling
        this.containerTypes = [
            'api-collection', 'schema-container', 'table-group', 'process-container',
            'zone-container', 'datasources-container', 'onelake-container',
            'transformation-container', 'semantic-models-container', 'reports-container'
        ];

        // Undo/redo + selection
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;
        this.selectedItems = new Set();
        this.isSelecting = false;
        this.selectionBox = null;
        this.selectionStart = { x: 0, y: 0 };

        // Template + persistence helpers
        this.templates = typeof this.initializeTemplates === 'function' ? this.initializeTemplates() : [];
        this.canvasManager = null;

        this.init();
    }

    init() {
        this.setupEventListeners?.();
        this.setupDragAndDrop?.();
        this.initializeTheme?.();
        this.initializeConnectionLayer?.();
        this.setupConnectionToggle?.();
        this.setupEditToggle?.();
        this.setupDatabaseModal?.();
        this.setupMedallionTargets?.();
        this.ensureCanvasSourcesWindow?.();
        this.ensureModeDock?.();
        this.setupMultiSelect?.();
        this.setupUndoRedo?.();
        this.setupTemplates?.();
        // setupCanvasDragAndDrop is already called by setupDragAndDrop, removed duplicate
        this.setupCanvasZoom?.();
        this.loadDataSources?.();
    }

    toggleDatabaseGroup(groupName, table) {
        if (!table) return;
        const collapsedGroups = JSON.parse(localStorage.getItem('collapsed-database-groups') || '{}');
        const isCurrentlyCollapsed = table.classList.contains('collapsed') || table.style.display === 'none';
        const shouldCollapse = !isCurrentlyCollapsed;

        if (shouldCollapse) {
            table.classList.add('collapsed');
            table.style.display = 'none';
        } else {
            table.classList.remove('collapsed');
            table.style.display = '';
        }

        collapsedGroups[groupName] = shouldCollapse;
        localStorage.setItem('collapsed-database-groups', JSON.stringify(collapsedGroups));

        const groupHeaders = document.querySelectorAll('.database-group-header');
        groupHeaders.forEach(header => {
            const title = header.querySelector('h4');
            if (!title) return;
            const text = title.textContent || '';
            if (!text.includes(groupName)) return;
            const toggleIcon = header.querySelector('.group-toggle-icon');
            if (!toggleIcon) return;
            toggleIcon.className = shouldCollapse
                ? 'fas fa-chevron-right group-toggle-icon'
                : 'fas fa-chevron-down group-toggle-icon';
        });
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
            'aws-rds': 'fas fa-cloud',
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
            'aws-rds': 'AWS RDS',
            'excel': 'Excel',
            'dataverse': 'Dataverse',
            'sharepoint': 'SharePoint',
            'access': 'Access',
            'csv': 'CSV Files',
            'json': 'JSON Files',
            'xml': 'XML Files',
            'power-bi': 'Power BI',
            'tableau': 'Tableau',
            'salesforce': 'Salesforce',
            'dynamics-365': 'Dynamics 365',
            'sap': 'SAP',
            'web-service': 'Web Service',
            'rest-api': 'REST API',
            'odata': 'OData',
            'azure-synapse': 'Azure Synapse',
            'azure-data-lake': 'Azure Data Lake',
            'aws-s3': 'AWS S3',
            'hdfs': 'HDFS',
            'teradata': 'Teradata',
            'db2': 'IBM DB2',
            'sybase': 'Sybase',
            'mariadb': 'MariaDB',
            'sqlite': 'SQLite',
            'duckdb': 'DuckDB',
            'clickhouse': 'ClickHouse',
            'elasticsearch': 'Elasticsearch',
            'cosmos-db': 'Cosmos DB',
            'dynamodb': 'DynamoDB',
            'firebase': 'Firebase',
            'neo4j': 'Neo4j',
            'influxdb': 'InfluxDB',
            'other': 'Other'
        };
        return displayTypes[dbType] || dbType.toUpperCase();
    }

    getDefaultSources() {
        return [
            { name: 'SQL Server', type: 'SQL Server', icon: 'fas fa-database', dataType: 'sql-server' },
            { name: 'Azure SQL', type: 'Azure SQL', icon: 'fas fa-cloud', dataType: 'azure-sql' },
            { name: 'PostgreSQL', type: 'PostgreSQL', icon: 'fas fa-database', dataType: 'postgresql' },
            { name: 'MySQL', type: 'MySQL', icon: 'fas fa-database', dataType: 'mysql' },
            { name: 'REST API', type: 'REST API', icon: 'fas fa-plug', dataType: 'rest-api' },
            { name: 'Excel', type: 'Excel', icon: 'fas fa-file-excel', dataType: 'excel' },
            { name: 'SharePoint', type: 'SharePoint', icon: 'fab fa-microsoft', dataType: 'sharepoint' },
            { name: 'Dataverse', type: 'Dataverse', icon: 'fas fa-cubes', dataType: 'dataverse' }
        ];
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

    // Sync database changes from the databases page to canvas items
    syncDatabaseChanges() {
        try {
            // Get the databases from the databases page
            const databasesData = localStorage.getItem('company-databases');
            if (!databasesData) {
                console.log('No company databases found');
                return;
            }
            
            const databases = JSON.parse(databasesData);
            console.log('Found databases:', databases.map(db => ({ name: db.name, type: db.type })));
            
            let hasChanges = false;
            
            // Check all canvas items
            console.log('Checking canvas items:', this.canvasItems.length);
            this.canvasItems.forEach((canvasItem, index) => {
                console.log(`Canvas item ${index}:`, {
                    type: canvasItem.type,
                    data: canvasItem.data,
                    element: canvasItem.element?.className,
                    innerHTML: canvasItem.element?.innerHTML?.substring(0, 100)
                });
                
                // Handle both 'data-source' items and regular canvas items
                if ((canvasItem.type === 'data-source' || canvasItem.data?.name) && canvasItem.data) {
                    console.log('Checking item:', canvasItem.data.name);
                    
                    // Find matching database by name (case insensitive)
                    const matchingDb = databases.find(db => 
                        db.name && canvasItem.data.name && (
                            db.name === canvasItem.data.name || 
                            db.name.toLowerCase() === canvasItem.data.name.toLowerCase()
                        )
                    );
                    
                    if (matchingDb) {
                        console.log('Found matching database:', matchingDb.name, 'updating from', canvasItem.data.dataType, 'to', matchingDb.type);
                        
                        // Update the canvas item data with database info
                        const oldDataType = canvasItem.data.dataType;
                        canvasItem.data.dataType = matchingDb.type;
                        canvasItem.data.server = matchingDb.server;
                        canvasItem.data.environment = matchingDb.environment;
                        canvasItem.data.status = matchingDb.status;
                        canvasItem.data.purpose = matchingDb.purpose;
                        
                        // Update the visual display if dataType changed
                        if (oldDataType !== matchingDb.type) {
                            this.updateCanvasItemDisplay(canvasItem);
                            hasChanges = true;
                        }
                    } else {
                        console.log('No matching database found for:', canvasItem.data.name);
                    }
                }
            });
            
            if (hasChanges) {
                console.log('Canvas items updated, triggering autosave...');
                // Trigger autosave to persist changes
                if (this.canvasManager && this.canvasManager.autosaveCanvas) {
                    this.canvasManager.autosaveCanvas();
                }
            } else {
                console.log('No changes detected');
            }
            
        } catch (error) {
            console.error('Error syncing database changes:', error);
        }
    }

    // Update the visual display of a canvas item after data changes
    updateCanvasItemDisplay(canvasItem) {
        if (!canvasItem.element || !canvasItem.data.dataType) {
            console.log('Cannot update display - missing element or dataType');
            return;
        }
        
        console.log('Updating visual display for:', canvasItem.data.name, 'to type:', canvasItem.data.dataType);
        
        // Try different selectors for the type display
        let typeBadge = canvasItem.element.querySelector('.data-source-type') ||  // data source items
                        canvasItem.element.querySelector('.canvas-item-type') ||   // regular canvas items
                        canvasItem.element.querySelector('.item-type');            // fallback
        
        if (typeBadge) {
            console.log('Found type badge, updating text from', typeBadge.textContent, 'to', this.getDisplayType(canvasItem.data.dataType));
            typeBadge.textContent = this.getDisplayType(canvasItem.data.dataType);
        } else {
            console.log('No type badge found in element. Available classes:', canvasItem.element.className);
            console.log('Element HTML:', canvasItem.element.innerHTML);
        }
        
        // Update the icon - try different selectors
        let iconElement = canvasItem.element.querySelector('.ci-icon i') ||           // regular canvas items
                          canvasItem.element.querySelector('.data-source-icon i') ||  // data source items
                          canvasItem.element.querySelector('i');                      // fallback
        
        if (iconElement) {
            const newIconClass = this.getDatabaseIcon(canvasItem.data.dataType);
            console.log('Updating icon from', iconElement.className, 'to', newIconClass);
            iconElement.className = newIconClass;
        } else {
            console.log('No icon element found');
        }
        
        // Update colors
        if (typeBadge) {
            const newColor = this.getTypeColor(canvasItem.data.dataType);
            console.log('Updating color to:', newColor);
            typeBadge.style.backgroundColor = newColor;
        }
        
        console.log('Visual display update completed');
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
        // Palette items (drag or click to add) - Using event delegation for reliability
        const palette = document.getElementById('component-palette') || document.getElementById('item-palette');
        if (palette) {
            // Use event delegation for clicks - more reliable for dynamically shown/hidden elements
            palette.addEventListener('click', (e) => {
                const pi = e.target.closest('.palette-item');
                if (!pi) return;
                
                e.stopPropagation(); // Prevent dropdown from closing immediately
                
                if (pi.dataset.type === 'database-selector') {
                    this.showDatabaseModal();
                    return;
                }
                
                const canvas = document.getElementById('fabric-canvas');
                const rect = canvas.getBoundingClientRect();
                
                // Calculate the center of the visible viewport in canvas coordinates
                // Account for zoom and pan offset
                const viewportCenterX = rect.width / 2;
                const viewportCenterY = rect.height / 2;
                
                // Convert viewport center to canvas coordinates (accounting for zoom and pan)
                let x = (viewportCenterX - this.canvasOffset.x) / this.zoomLevel;
                let y = (viewportCenterY - this.canvasOffset.y) / this.zoomLevel;
                
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
                
                // Close the dropdown after adding item
                closeAllDropdowns();
            });
            
            // Keep individual dragstart handlers since delegation doesn't work well for dragstart
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
            // Toggle Pan/Select mode with Space key
            if (e.code === 'Space') {
                const activeTag = document.activeElement ? document.activeElement.tagName : '';
                const isEditable = document.activeElement && (
                    document.activeElement.isContentEditable ||
                    activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT'
                );
                if (!isEditable) {
                    e.preventDefault();
                    this.togglePanSelectMode();
                }
            }
            // Fit to view shortcut
            if (e.key === 'f' || e.key === 'F') {
                const activeTag = document.activeElement ? document.activeElement.tagName : '';
                const isEditable = document.activeElement && (
                    document.activeElement.isContentEditable ||
                    activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT'
                );
                if (!isEditable) {
                    e.preventDefault();
                    this.fitToView();
                }
            }
            // Auto-arrange shortcut
            if (e.key === 'a' || e.key === 'A') {
                const activeTag = document.activeElement ? document.activeElement.tagName : '';
                const isEditable = document.activeElement && (
                    document.activeElement.isContentEditable ||
                    activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT'
                );
                if (!isEditable) {
                    e.preventDefault();
                    this.autoArrangeCards();
                }
            }
            // Undo/Redo shortcuts
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                console.log('[Keyboard] Ctrl+Z pressed, calling undo(), stack size:', this.undoStack.length);
                e.preventDefault();
                this.undo();
            }
            if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                console.log('[Keyboard] Ctrl+Y/Ctrl+Shift+Z pressed, calling redo(), stack size:', this.redoStack.length);
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

        // Handle paste events for images
        document.addEventListener('paste', (e) => {
            // Don't handle paste if user is typing in an input field
            const activeTag = document.activeElement ? document.activeElement.tagName : '';
            const isEditable = document.activeElement && (
                document.activeElement.isContentEditable ||
                activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT'
            );
            if (isEditable) return;

            // Check if clipboard contains image data
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const blob = items[i].getAsFile();
                    this.addImageToCanvas(blob);
                    break;
                }
            }
        });

        // Canvas click handler to clear connection state when clicking empty areas
        const canvas = document.getElementById('fabric-canvas');
        if (canvas) {
            canvas.addEventListener('click', (e) => {
                // Don't clear selection if we just finished a selection box operation
                // The click event fires after mouseup, so we need to skip it
                if (this.justFinishedSelection) {
                    this.justFinishedSelection = false;
                    return;
                }
                
                // Check if we clicked on empty canvas (not on an item)
                const clickedElement = e.target;
                
                // If we clicked directly on the canvas or background, clear connection state
                if (clickedElement === canvas || 
                    clickedElement.id === 'fabric-canvas' ||
                    clickedElement.classList.contains('fabric-canvas') ||
                    clickedElement.classList.contains('canvas-background') || 
                    clickedElement.classList.contains('canvas-content-wrapper') ||
                    clickedElement.classList.contains('bg-panel') ||
                    clickedElement.classList.contains('bg-prepare') ||
                    clickedElement.classList.contains('bg-title')) {
                    
                    // Clear selection when clicking on empty canvas area
                    this.clearSelection();
                    
                    // Clear any pending connections or stuck anchors
                    if (this.pendingConnection || this.connectionPreview || this.manualAnchorMode) {
                        this.clearConnectionState();
                        this.showNotification('Connection cancelled', 'info');
                    }
                    
                    // Hide text formatting toolbar when clicking empty canvas
                    this.hideTextFormatToolbar();
                    
                    // Close any open palette dropdowns
                    closeAllDropdowns();
                }
            });
            
            // Canvas context menu (right-click on empty canvas)
            canvas.addEventListener('contextmenu', (e) => {
                // Only show canvas menu if clicking on empty space
                const clickedElement = e.target;
                if (clickedElement === canvas || 
                    clickedElement.classList.contains('canvas-background') || 
                    clickedElement.classList.contains('canvas-content-wrapper') ||
                    clickedElement.classList.contains('bg-panel') ||
                    clickedElement.classList.contains('bg-prepare')) {
                    
                    e.preventDefault();
                    this.showCanvasContextMenu(e);
                }
            });
        }
        
        // Global mouse handlers for dragging (centralized to avoid memory leaks)
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            // Get canvas position for proper coordinate calculation
            const canvas = document.getElementById('fabric-canvas');
            if (!canvas) return;
            const canvasRect = canvas.getBoundingClientRect();
            
            // Calculate mouse position in canvas coordinate space
            // The canvas content is transformed, so we need to account for zoom and pan
            const mouseCanvasX = (e.clientX - canvasRect.left - this.canvasOffset.x) / this.zoomLevel;
            const mouseCanvasY = (e.clientY - canvasRect.top - this.canvasOffset.y) / this.zoomLevel;
            
            // Calculate the new position for the primary item (accounting for click offset)
            // The offset is already in canvas coordinates, so no need to divide by zoom
            const newPrimaryX = mouseCanvasX - this.dragOffsetX;
            const newPrimaryY = mouseCanvasY - this.dragOffsetY;
            
            // Calculate how much the primary item moved from its initial position
            const primInit = this.dragInitialPositions.get(this.dragPrimaryItem);
            if (!primInit) return;
            
            const deltaX = newPrimaryX - primInit.x;
            const deltaY = newPrimaryY - primInit.y;
            
            // Move all selected items
            // Compute snap based on primary item only (skip snap for containers)
            let snapAdjust={dx:0,dy:0};
            if (!this.dragPrimaryItem.classList.contains('ci-container')){
                const candX = primInit.x + deltaX;
                const candY = primInit.y + deltaY;
                const snapped = this.snapToGrid(candX, candY);
                snapAdjust.dx = snapped.x - candX;
                snapAdjust.dy = snapped.y - candY;
            }
            this.selectedItems.forEach(ci => {
                const init = this.dragInitialPositions.get(ci.element);
                if (!init) return;
                const nx = init.x + deltaX + snapAdjust.dx;
                const ny = init.y + deltaY + snapAdjust.dy;
                
                // Skip snapping for containers - allow free movement
                if (ci.element.classList.contains('ci-container')) {
                    ci.element.style.left = nx + 'px';
                    ci.element.style.top = ny + 'px';
                } else {
                    const g = this.snapToGrid(nx, ny);
                    ci.element.style.left = g.x + 'px';
                    ci.element.style.top = g.y + 'px';
                }
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
            if (this.isDragging) {
                this.isDragging = false;
                
                // State was saved BEFORE move in startDragOperation
                // No saveState here - we want undo to restore the pre-move state
                
                this.selectedItems.forEach(ci => {
                    ci.element.style.zIndex = '';
                });
                this.dragInitialPositions.clear();
                
                // Final connection update after drag complete
                setTimeout(() => {
                    this.setupMedallionTargets();
                    this.updateConnections();
                    this.ensureCanvasExtents();
                    this.autosave();
                }, 100);
            }
        });
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
                console.log('Showing company databases grouped');
                
                // Group databases by their group property
                const groupedDatabases = {};
                companyDatabases.forEach(db => {
                    const groupName = db.group || 'Ungrouped';
                    if (!groupedDatabases[groupName]) {
                        groupedDatabases[groupName] = [];
                    }
                    groupedDatabases[groupName].push(db);
                });
                
                // Display each group
                Object.keys(groupedDatabases).sort().forEach((groupName, index) => {
                    const groupDbs = groupedDatabases[groupName];
                    
                    // Assign color based on group index
                    const groupColor = this.getGroupColor(index);
                    
                    // Check if group is collapsed (stored in localStorage)
                    const collapsedGroups = JSON.parse(localStorage.getItem('collapsed-database-groups') || '{}');
                    const isCollapsed = collapsedGroups[groupName] || false;
                    
                    // Group header
                    const groupHeader = document.createElement('div');
                    groupHeader.className = 'database-group-header';
                    groupHeader.style.setProperty('--group-color', groupColor);
                    groupHeader.style.cursor = 'pointer';
                    groupHeader.innerHTML = `
                        <h4>
                            <i class="fas fa-chevron-${isCollapsed ? 'right' : 'down'} group-toggle-icon"></i>
                            <i class="fas fa-folder"></i> ${groupName}
                            <span class="group-count">${groupDbs.length}</span>
                        </h4>
                    `;
                    
                    // Add click handler to toggle group
                    groupHeader.addEventListener('click', () => {
                        this.toggleDatabaseGroup(groupName, table);
                    });
                    
                    databaseList.appendChild(groupHeader);
                    
                    // Create table for this group
                    const table = document.createElement('table');
                    table.className = 'database-table';
                    table.style.setProperty('--group-color', groupColor);
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
                    groupDbs.forEach(db => {
                        console.log('Creating row for database:', db.name, 'in group:', groupName);
                        const row = this.createDatabaseTableRow(db, true);
                        row.style.setProperty('--group-color', groupColor);
                        tbody.appendChild(row);
                    });
                    
                    // Hide table if group is collapsed
                    if (isCollapsed) {
                        table.classList.add('collapsed');
                        table.style.display = 'none';
                    }
                    
                    databaseList.appendChild(table);
                    
                    // Add spacing between groups
                    const spacer = document.createElement('div');
                    spacer.style.height = '20px';
                    databaseList.appendChild(spacer);
                });
                
                console.log('Added grouped database tables');
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
            'other': '#6b7280',
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
        
        // Place in the prepare area (left side) - compact layout
        const x = 30 + (Math.random() * 80); // Compact horizontal spacing
        const y = 30 + (Math.random() * 100); // Compact vertical spacing
        
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

        // Save state BEFORE creating connection for proper undo
        this.saveState('before manual connection');

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
        
        // Create canvas content wrapper if it doesn't exist
        let contentWrapper = canvas.querySelector('.canvas-content-wrapper');
        if (!contentWrapper) {
            contentWrapper = document.createElement('div');
            contentWrapper.className = 'canvas-content-wrapper';
            contentWrapper.style.position = 'absolute';
            contentWrapper.style.top = '0';
            contentWrapper.style.left = '0';
            contentWrapper.style.width = '50000px';
            contentWrapper.style.height = '50000px';
            contentWrapper.style.transformOrigin = '0 0';
            
            // Move existing canvas-background into wrapper
            const background = canvas.querySelector('.canvas-background');
            if (background) {
                canvas.removeChild(background);
                contentWrapper.appendChild(background);
            }
            
            // Insert wrapper as first child
            canvas.insertBefore(contentWrapper, canvas.firstChild);
            this.canvasContentWrapper = contentWrapper;
        }
        
        // Create an SVG overlay for connections inside the wrapper
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '50000');
        svg.setAttribute('height', '50000');
        svg.setAttribute('viewBox', '0 0 50000 50000');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('class', 'connection-svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '5'; // Above containers (z-index: 1) but below components (z-index: 10)

        // Ensure canvas is positioned (should be already)
        canvas.style.position = canvas.style.position || 'relative';
        contentWrapper.appendChild(svg);
        this.connectionSvg = svg;

        // Keep connections accurate on resize
        window.addEventListener('resize', () => {
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
        this.setupNameEditingForItem(item);
        
        // Add item to canvas content wrapper (for proper zoom/pan)
        const wrapper = canvas.querySelector('.canvas-content-wrapper');
        if (wrapper) {
            wrapper.appendChild(item);
        } else {
            canvas.appendChild(item); // Fallback if wrapper doesn't exist yet
        }
    
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
        this.setupNameEditingForItem(item);
        
        // Add item to canvas content wrapper (for proper zoom/pan)
        const wrapper = canvas.querySelector('.canvas-content-wrapper');
        if (wrapper) {
            wrapper.appendChild(item);
        } else {
            canvas.appendChild(item); // Fallback if wrapper doesn't exist yet
        }
        
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

    // Find if coordinates are within a container
    findContainerAt(x, y) {
        const containers = this.canvasItems.filter(item => 
            this.containerTypes.includes(item.type)
        );
        
        console.log('Finding container at', x, y, 'containers found:', containers.length);
        
        for (const container of containers) {
            const element = container.element;
            const rect = element.getBoundingClientRect();
            const canvas = document.getElementById('fabric-canvas');
            const canvasRect = canvas.getBoundingClientRect();
            
            // Convert to canvas-relative coordinates
            const containerX = rect.left - canvasRect.left - 4; // account for canvas padding
            const containerY = rect.top - canvasRect.top - 4;
            const containerWidth = rect.width;
            const containerHeight = rect.height;
            
            console.log('Checking container', container.id, 'bounds:', {
                containerX, containerY, containerWidth, containerHeight,
                dropX: x, dropY: y
            });
            
            // Check if point is within container bounds
            if (x >= containerX && x <= containerX + containerWidth &&
                y >= containerY && y <= containerY + containerHeight) {
                console.log('Found container match:', container.id);
                return container.id;
            }
        }
        
        console.log('No container found at coordinates');
        return null;
    }

    setupContainerResize(containerElement) {
        const handles = containerElement.querySelectorAll('.resize-handle');
        
        handles.forEach(handle => {
            let isResizing = false;
            let startX, startY, startWidth, startHeight, startLeft, startTop;
            const direction = handle.dataset.direction;
            
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation(); // Prevent triggering drag
                
                // Save state BEFORE starting resize for proper undo
                this.saveState('before resize container');
                
                isResizing = true;
                
                startX = e.clientX;
                startY = e.clientY;
                startWidth = parseInt(containerElement.offsetWidth);
                startHeight = parseInt(containerElement.offsetHeight);
                startLeft = parseInt(containerElement.style.left);
                startTop = parseInt(containerElement.style.top);
                
                containerElement.classList.add('resizing');
                document.body.style.cursor = handle.style.cursor;
                
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isResizing) return;
                
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                let newWidth = startWidth;
                let newHeight = startHeight;
                let newLeft = startLeft;
                let newTop = startTop;
                
                // Calculate new dimensions based on handle direction
                switch (direction) {
                    case 'se': // bottom-right
                        newWidth = Math.max(200, startWidth + deltaX);
                        newHeight = Math.max(150, startHeight + deltaY);
                        break;
                    case 'sw': // bottom-left
                        newWidth = Math.max(200, startWidth - deltaX);
                        newHeight = Math.max(150, startHeight + deltaY);
                        newLeft = startLeft + deltaX;
                        break;
                    case 'ne': // top-right
                        newWidth = Math.max(200, startWidth + deltaX);
                        newHeight = Math.max(150, startHeight - deltaY);
                        newTop = startTop + deltaY;
                        break;
                    case 'nw': // top-left
                        newWidth = Math.max(200, startWidth - deltaX);
                        newHeight = Math.max(150, startHeight - deltaY);
                        newLeft = startLeft + deltaX;
                        newTop = startTop + deltaY;
                        break;
                }
                
                // Apply new dimensions
                containerElement.style.width = newWidth + 'px';
                containerElement.style.height = newHeight + 'px';
                containerElement.style.left = newLeft + 'px';
                containerElement.style.top = newTop + 'px';
            });
            
            document.addEventListener('mouseup', () => {
                if (isResizing) {
                    isResizing = false;
                    containerElement.classList.remove('resizing');
                    document.body.style.cursor = '';
                    
                    // State was saved BEFORE resize in mousedown
                    // No saveState here - we want undo to restore the pre-resize state
                    this.autosave();
                }
            });
        });
    }

    addCanvasItem(itemType, x, y, customDataOrContainerId = null) {
        // Support both old signature (containerId) and new (customData object)
        let containerId = null;
        let customData = null;
        
        if (typeof customDataOrContainerId === 'string') {
            // Old signature: containerId
            containerId = customDataOrContainerId;
        } else if (typeof customDataOrContainerId === 'object' && customDataOrContainerId !== null) {
            // New signature: customData object
            customData = customDataOrContainerId;
        }
        
        // Ensure items are never positioned outside visible canvas bounds
        const minX = 180;  // Large margin to account for canvas borders/padding
        const minY = 150;  // Large margin from top edge
        x = Math.max(minX, x);
        y = Math.max(minY, y);
        
        this.saveState('add ' + itemType);
        
        const canvas = document.getElementById('fabric-canvas');
        const item = document.createElement('div');
        const typeClass = this.getTypeClass(itemType);
        item.className = `canvas-item ${typeClass}`;
        item.draggable = true;
        
        // Ensure medallions use their specific accent colors
        if (itemType === 'bronze') {
            item.style.setProperty('--ci-accent', '#cd7f32');
        } else if (itemType === 'silver') {
            item.style.setProperty('--ci-accent', '#c0c0c0');
        } else if (itemType === 'gold') {
            item.style.setProperty('--ci-accent', '#ffd700');
        } else if (itemType === 'platinum') {
            item.style.setProperty('--ci-accent', '#e5e4e2');
        }
        
        const itemId = this.ensureElementId(item, 'canvas-item');
        
        const baseConfig = this.getItemConfig(itemType);
        const itemData = this.mergeItemData(baseConfig, customData);
        const isContainer = this.containerTypes.includes(itemType);
        
        const displayName = itemData.name;
        const displayType = itemData.type;
        
        if (itemType === 'raspberry-pi') {
            item.classList.add('ci-raspberry-shell');
            item.innerHTML = this.renderRaspberryPiCard({ ...itemData, typeLabel: displayType });
        } else {
            item.innerHTML = `
                <div class="canvas-item-header">
                    <div class="ci-icon">
                        ${this.getIconMarkup(itemType)}
                    </div>
                    <span class="canvas-item-title">${displayName}</span>
                </div>
                ${!isContainer ? `<div class="canvas-item-type">${displayType}</div>` : ''}
                ${isContainer ? `
                    <div class="resize-handle nw" data-direction="nw"></div>
                    <div class="resize-handle ne" data-direction="ne"></div>
                    <div class="resize-handle sw" data-direction="sw"></div>
                    <div class="resize-handle se" data-direction="se"></div>
                ` : ''}
            `;
        }
        
        // Place at exact coordinates without additional clamping
        item.style.left = x + 'px';
        item.style.top = y + 'px';
        item.style.visibility = 'visible';
        
        this.setupCanvasItemDrag(item);
        this.setupCanvasItemClick(item);
        this.setupNameEditingForItem(item);

        // Append to canvas content wrapper instead of canvas directly
        const wrapper = canvas.querySelector('.canvas-content-wrapper');
        if (wrapper) {
            wrapper.appendChild(item);
        } else {
            canvas.appendChild(item); // Fallback if wrapper doesn't exist yet
        }
        
        // Add status indicator if metadata exists
        if (itemData.meta && itemData.meta.business && itemData.meta.business.status) {
            updateComponentStatusIndicator(item, itemData.meta.business.status);
        }
        if (itemType === 'raspberry-pi') {
            this.decorateRaspberryPiItem(item, itemData);
        }
        if (this.editMode) this.showItemQuickActions(true);
        this.canvasItems.push({
            id: itemId,
            element: item,
            type: itemType,
            data: itemData,
            containerId: containerId
        });
        
        // Add visual indicator if item is in a container
        if (containerId) {
            item.classList.add('in-container');
        }
        
        // Setup resize handles for containers
        if (isContainer) {
            this.setupContainerResize(item);
        }
        
        this.ensureCanvasExtents();
        this.showNotification(`Added ${itemData.name} to canvas`, 'success');
        
        // Show container instructions for container types
        if (this.containerTypes.includes(itemType) && !localStorage.getItem('container-tip-shown')) {
            setTimeout(() => {
                this.showNotification('💡 Double-click containers to manage their contents', 'info', 5000);
                localStorage.setItem('container-tip-shown', 'true');
            }, 1000);
        }
        
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
            'table': { icon: '📋', name: 'Table', type: 'Storage' },
            'etl': { icon: '⚙️', name: 'ETL Process', type: 'Data Engineering' },
            'raspberry-pi': { icon: '🍓', name: 'Raspberry Pi', type: 'Edge Compute' },
            
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
            'data-classification': { icon: '🏷️', name: 'Data Classification', type: 'Security' },
            
            // Containers & Groups
            'api-collection': { icon: '📦', name: 'API Collection', type: 'Container' },
            'schema-container': { icon: '📁', name: 'Schema', type: 'Container' },
            'table-group': { icon: '📋', name: 'Table Group', type: 'Container' },
            'process-container': { icon: '⚙️', name: 'Process Group', type: 'Container' },
            'zone-container': { icon: '🏗️', name: 'Data Zone', type: 'Container' },
            'datasources-container': { icon: '🗄️', name: 'Datasources', type: 'Container' },
            'onelake-container': { icon: '🏞️', name: 'One Lake', type: 'Container' },
            'transformation-container': { icon: '🔄', name: 'Transformation', type: 'Container' },
            'semantic-models-container': { icon: '🧱', name: 'Semantic Models', type: 'Container' },
            'reports-container': { icon: '📊', name: 'Reports', type: 'Container' }
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
            case 'table': return 'ci-table';
            case 'etl': return 'ci-pipeline'; // Reuse pipeline styling
            case 'raspberry-pi': return 'ci-raspberry-pi';
            
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
            
            // Containers & Groups
            case 'api-collection': return 'ci-container ci-api-collection';
            case 'schema-container': return 'ci-container ci-schema-container';
            case 'table-group': return 'ci-container ci-table-group';
            case 'process-container': return 'ci-container ci-process-container';
            case 'zone-container': return 'ci-container ci-zone-container';
            case 'datasources-container': return 'ci-container ci-datasources-container';
            case 'onelake-container': return 'ci-container ci-onelake-container';
            case 'transformation-container': return 'ci-container ci-transformation-container';
            case 'semantic-models-container': return 'ci-container ci-semantic-models-container';
            case 'reports-container': return 'ci-container ci-reports-container';
            
            default: return 'ci-dataset'; // Default fallback
        }
    }

    // Ensure an element has an ID, generating one if necessary
    ensureElementId(element, prefix = 'element') {
        if (!element) return null;
        if (!element.id) {
            element.id = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        return element.id;
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
            'table': '<i class="fas fa-table"></i>',
            'etl': '<i class="fas fa-cogs"></i>',
            'raspberry-pi': '<i class="fab fa-raspberry-pi" style="color: #d61c4e;"></i>',
            
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
            'data-classification': '<i class="fas fa-tags" style="color: #20c997;"></i>',
            
            // Containers & Groups
            'api-collection': '<i class="fas fa-layer-group" style="color: #007bff;"></i>',
            'schema-container': '<i class="fas fa-folder-open" style="color: #6c757d;"></i>',
            'table-group': '<i class="fas fa-object-group" style="color: #28a745;"></i>',
            'process-container': '<i class="fas fa-box" style="color: #ffc107;"></i>',
            'zone-container': '<i class="fas fa-th-large" style="color: #6f42c1;"></i>',
            'datasources-container': '<i class="fas fa-database" style="color: #17a2b8;"></i>',
            'onelake-container': '<i class="fas fa-water" style="color: #20c997;"></i>',
            'transformation-container': '<i class="fas fa-exchange-alt" style="color: #fd7e14;"></i>',
            'semantic-models-container': '<i class="fas fa-cubes" style="color: #6610f2;"></i>',
            'reports-container': '<i class="fas fa-chart-bar" style="color: #e83e8c;"></i>'
        };
        return fa[itemType] || `<span class="emoji">${this.getItemConfig(itemType).icon}</span>`;
    }

    mergeItemData(baseConfig = {}, customData = null) {
        const merged = { ...baseConfig };
        if (customData && typeof customData === 'object') {
            Object.entries(customData).forEach(([key, value]) => {
                if (key === 'meta' && value) {
                    merged.meta = merged.meta || {};
                    merged.meta.business = { ...(merged.meta.business || {}), ...(value.business || {}) };
                    merged.meta.technical = { ...(merged.meta.technical || {}), ...(value.technical || {}) };
                    merged.meta.notes = { ...(merged.meta.notes || {}), ...(value.notes || {}) };
                } else {
                    merged[key] = value;
                }
            });
        }
        merged.meta = merged.meta || { business: {}, technical: {}, notes: {} };
        merged.meta.business = merged.meta.business || {};
        merged.meta.technical = merged.meta.technical || {};
        merged.meta.notes = merged.meta.notes || {};
        return merged;
    }

    // Simple Raspberry Pi card (edge device / data source)
    renderRaspberryPiCard(data = {}) {
        return `
            <div class="canvas-item-header">
                <div class="ci-icon">
                    ${this.getIconMarkup('raspberry-pi')}
                </div>
                <span class="canvas-item-title">${data.name || 'Raspberry Pi'}</span>
            </div>
            <div class="canvas-item-type">${data.description || data.typeLabel || 'Edge Device'}</div>
        `;
    }

    decorateRaspberryPiItem(element, itemData) {
        // Simple decoration - no special behavior needed
        if (!element) return;
    }

    // Snap coordinates to grid
    snapToGrid(x, y) {
        // If snap is disabled, return original coordinates
        if (!this.snapEnabled) {
            return { x, y };
        }
        
        return {
            x: Math.round(x / this.gridSize) * this.gridSize,
            y: Math.round(y / this.gridSize) * this.gridSize
        };
    }

    // === UNDO/REDO SYSTEM ===
    saveState(actionType = 'action') {
        console.log('[saveState] Called with action:', actionType, '| _isLoading:', this._isLoading);
        // Skip saving state during bulk load operations
        if (this._isLoading) {
            console.log('[saveState] Skipped due to _isLoading flag');
            return;
        }
        console.log('[saveState] Saving state, current stack size:', this.undoStack.length);
        
        const state = {
            items: this.canvasItems.map(ci => {
                const itemData = {
                    id: ci.id,
                    type: ci.type,
                    data: ci.data ? JSON.parse(JSON.stringify(ci.data)) : {},
                    position: {
                        x: parseInt(ci.element.style.left) || 0,
                        y: parseInt(ci.element.style.top) || 0
                    },
                    width: ci.element.offsetWidth || parseInt(ci.element.style.width) || null,
                    height: ci.element.offsetHeight || parseInt(ci.element.style.height) || null
                };
                
                // For text labels, save the actual text content and styles
                if (ci.type === 'text-label' && ci.element) {
                    // Get text content excluding resize handle
                    const clone = ci.element.cloneNode(true);
                    const handle = clone.querySelector('.text-label-resize-handle');
                    if (handle) handle.remove();
                    const text = clone.textContent || 'Double-click to edit';
                    
                    itemData.data = {
                        ...itemData.data,
                        name: text,
                        text: text
                    };
                    itemData.style = {
                        background: ci.element.style.background,
                        border: ci.element.style.border,
                        color: ci.element.style.color,
                        fontSize: ci.element.style.fontSize,
                        fontWeight: ci.element.style.fontWeight,
                        width: ci.element.style.width,
                        height: ci.element.style.height
                    };
                }

                // For images, save the src
                if (ci.type === 'image' && ci.element) {
                    const img = ci.element.querySelector('img');
                    if (img) {
                        itemData.data = { ...itemData.data, src: img.src };
                    }
                    itemData.style = { width: ci.element.style.width };
                }
                
                return itemData;
            }),
            connections: this.connections.map(conn => ({
                id: conn.id,
                type: conn.type,
                fromId: conn.from?.id || conn.fromId || null,
                toId: conn.to?.id || conn.toId || null,
                fromAnchor: conn.fromAnchor || null,
                toAnchor: conn.toAnchor || null,
                color: conn.color || null
            })),
            actionType,
            timestamp: Date.now()
        };
        
        this.undoStack.push(state);
        console.log('[saveState] State pushed, new stack size:', this.undoStack.length, '| items:', state.items.length, '| connections:', state.connections.length);
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Clear redo stack on new action
    }

    undo() {
        console.log('[Undo] Called. undoStack.length:', this.undoStack.length);
        if (this.undoStack.length === 0) {
            console.log('[Undo] Stack is empty, nothing to undo');
            this.showNotification('Nothing to undo', 'warning');
            return;
        }
        console.log('[Undo] Proceeding with undo...');
        
        // Save current state to redo stack
        const currentState = {
            items: this.canvasItems.map(ci => {
                const itemData = {
                    id: ci.id,
                    type: ci.type,
                    data: ci.data ? JSON.parse(JSON.stringify(ci.data)) : {},
                    position: {
                        x: parseInt(ci.element.style.left) || 0,
                        y: parseInt(ci.element.style.top) || 0
                    },
                    width: ci.element.offsetWidth || parseInt(ci.element.style.width) || null,
                    height: ci.element.offsetHeight || parseInt(ci.element.style.height) || null
                };
                
                if (ci.type === 'text-label' && ci.element) {
                    const clone = ci.element.cloneNode(true);
                    const handle = clone.querySelector('.text-label-resize-handle');
                    if (handle) handle.remove();
                    const text = clone.textContent || 'Double-click to edit';
                    itemData.data = { ...itemData.data, name: text, text: text };
                    itemData.style = {
                        background: ci.element.style.background,
                        border: ci.element.style.border,
                        color: ci.element.style.color,
                        fontSize: ci.element.style.fontSize,
                        fontWeight: ci.element.style.fontWeight,
                        width: ci.element.style.width,
                        height: ci.element.style.height
                    };
                }
                if (ci.type === 'image' && ci.element) {
                    const img = ci.element.querySelector('img');
                    if (img) itemData.data = { ...itemData.data, src: img.src };
                    itemData.style = { width: ci.element.style.width };
                }
                
                return itemData;
            }),
            connections: this.connections.map(conn => ({
                id: conn.id,
                type: conn.type,
                fromId: conn.from?.id || conn.fromId || null,
                toId: conn.to?.id || conn.toId || null,
                fromAnchor: conn.fromAnchor || null,
                toAnchor: conn.toAnchor || null,
                color: conn.color || null
            })),
            timestamp: Date.now()
        };
        this.redoStack.push(currentState);
        
        // Restore previous state
        const prevState = this.undoStack.pop();
        
        // Set flag to prevent loadFromData from calling saveState
        this._isUndoRedo = true;
        this.loadFromData(prevState);
        this._isUndoRedo = false;
        
        // Note: We intentionally do NOT restore viewport - user stays at current view position
        
        this.showNotification(`Undone: ${prevState.actionType}`, 'info');
    }

    redo() {
        if (this.redoStack.length === 0) {
            this.showNotification('Nothing to redo', 'warning');
            return;
        }
        
        // Save current state to undo stack (without clearing redo)
        const currentState = {
            items: this.canvasItems.map(ci => {
                const itemData = {
                    id: ci.id,
                    type: ci.type,
                    data: ci.data ? JSON.parse(JSON.stringify(ci.data)) : {},
                    position: {
                        x: parseInt(ci.element.style.left) || 0,
                        y: parseInt(ci.element.style.top) || 0
                    },
                    width: ci.element.offsetWidth || null,
                    height: ci.element.offsetHeight || null
                };
                if (ci.type === 'text-label' && ci.element) {
                    const clone = ci.element.cloneNode(true);
                    const handle = clone.querySelector('.text-label-resize-handle');
                    if (handle) handle.remove();
                    const text = clone.textContent || 'Double-click to edit';
                    itemData.data = { ...itemData.data, name: text, text: text };
                    itemData.style = {
                        background: ci.element.style.background,
                        border: ci.element.style.border,
                        color: ci.element.style.color,
                        fontSize: ci.element.style.fontSize,
                        fontWeight: ci.element.style.fontWeight,
                        width: ci.element.style.width,
                        height: ci.element.style.height
                    };
                }
                if (ci.type === 'image' && ci.element) {
                    const img = ci.element.querySelector('img');
                    if (img) itemData.data = { ...itemData.data, src: img.src };
                    itemData.style = { width: ci.element.style.width };
                }
                return itemData;
            }),
            connections: this.connections.map(conn => ({
                id: conn.id,
                type: conn.type,
                fromId: conn.from?.id || conn.fromId || null,
                toId: conn.to?.id || conn.toId || null,
                fromAnchor: conn.fromAnchor || null,
                toAnchor: conn.toAnchor || null,
                color: conn.color || null
            })),
            actionType: 'redo',
            timestamp: Date.now()
        };
        this.undoStack.push(currentState);
        
        // Restore next state
        const nextState = this.redoStack.pop();
        
        // Set flag to prevent loadFromData from calling saveState
        this._isUndoRedo = true;
        this.loadFromData(nextState);
        this._isUndoRedo = false;
        
        // Note: We intentionally do NOT restore viewport - user stays at current view position
        
        this.showNotification('Redone action', 'info');
    }

    // === TEXT LABEL FUNCTIONALITY ===
    addTextLabel() {
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;

        // Create unique ID for the text label
        const labelId = 'text-label-' + Date.now();

        // Create text label element
        const label = document.createElement('div');
        label.id = labelId;
        label.className = 'canvas-item text-label';
        label.contentEditable = 'false';  // Start as NOT editable so dragging works
        label.textContent = 'Double-click to edit';
        label.style.position = 'absolute';  // Absolutely positioned - won't affect layout
        label.style.left = '100px';
        label.style.top = '100px';
        label.style.width = '200px';  // Default width
        label.style.height = 'auto';  // Auto height based on content
        label.style.zIndex = '1000';
        label.draggable = true;
        
        // Initialize dataset properties for toggling
        label.dataset.lastBgColor = '#1a1a2e';  // Default background color
        label.dataset.lastBorder = '1px dashed #666';  // Default border
        
        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'text-label-resize-handle';
        label.appendChild(resizeHandle);
        
        // Setup resize functionality
        this.setupTextLabelResize(label, resizeHandle);

        // Add to canvas content wrapper (for proper zoom/pan)
        const wrapper = canvas.querySelector('.canvas-content-wrapper');
        if (wrapper) {
            wrapper.appendChild(label);
        } else {
            canvas.appendChild(label); // Fallback if wrapper doesn't exist yet
        }

        // Add to canvasItems array so it can be selected, deleted, etc.
        this.canvasItems.push({
            id: labelId,
            element: label,
            type: 'text-label',
            data: { 
                name: 'Double-click to edit', 
                text: 'Double-click to edit',
                type: 'text' 
            }
        });

        // Set up dragging (integrates with existing drag system)
        this.setupCanvasItemDrag(label);

        // Prevent drag when in edit mode
        label.addEventListener('mousedown', (e) => {
            if (label.contentEditable === 'true') {
                e.stopPropagation();
            }
        });

        // Double-click to edit
        label.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            // Save state BEFORE editing starts for proper undo
            this.saveState('before text-edit');
            
            label.contentEditable = 'true';
            label.classList.add('editing');
            label.style.cursor = 'text';
            label.style.border = '1px solid #00D4FF';
            label.draggable = false;  // Disable dragging while editing
            label.focus();
            // Select all text on double-click
            setTimeout(() => {
                const range = document.createRange();
                range.selectNodeContents(label);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }, 10);
        });

        // On blur, remove editing class and make non-editable
        label.addEventListener('blur', () => {
            label.classList.remove('editing');
            label.style.cursor = 'move';
            label.style.border = '1px dashed #666';
            label.contentEditable = 'false';  // Disable editing so dragging works again
            label.draggable = true;  // Re-enable dragging
            if (label.textContent.trim() === '') {
                label.textContent = 'Double-click to edit';
            }
            
            // Update the canvas item data to reflect the new text
            const canvasItem = this.canvasItems.find(ci => ci.element === label);
            if (canvasItem) {
                canvasItem.data = {
                    ...canvasItem.data,
                    name: label.textContent,
                    text: label.textContent
                };
                
                // Keep the label selected and show formatting toolbar
                this.clearSelection();
                this.selectedItems.add(canvasItem);
                label.classList.add('selected', 'multi-selected');
                this.showTextFormatToolbar(label);
            }
            
            // State was saved BEFORE editing in dblclick handler
            this.autosave(); // Ensure autosave after text edit
        });

        // Press Escape to stop editing
        label.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                label.blur();
            }
        });

        // Make text label selectable
        label.addEventListener('click', (e) => {
            // Don't select if we're in edit mode
            if (label.contentEditable === 'true') return;
            
            e.stopPropagation();
            
            // Find the canvas item object for this label
            const canvasItem = this.canvasItems.find(ci => ci.element === label);
            if (!canvasItem) return;
            
            if (e.ctrlKey) {
                // Multi-select toggle
                if (this.selectedItems.has(canvasItem)) {
                    this.selectedItems.delete(canvasItem);
                    label.classList.remove('multi-selected', 'selected');
                } else {
                    this.selectedItems.add(canvasItem);
                    label.classList.add('multi-selected');
                }
            } else {
                // Single select
                this.clearSelection();
                this.selectedItems.add(canvasItem);
                label.classList.add('selected', 'multi-selected');
                // Show formatting toolbar for text labels
                this.showTextFormatToolbar(label);
            }
        });

        // Save state
        this.saveState('add-text-label');
        this.showNotification('Text label added - Drag to move, double-click to edit, Delete to remove', 'success');
    }

    // Add image from clipboard to canvas
    addImageToCanvas(imageBlob, x = null, y = null) {
        if (!imageBlob) return;

        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;

        // If no position specified, place in center of viewport
        if (x === null || y === null) {
            const rect = canvas.getBoundingClientRect();
            x = (canvas.scrollLeft + rect.width / 2 - this.canvasOffset.x) / this.zoomLevel - 150;
            y = (canvas.scrollTop + rect.height / 2 - this.canvasOffset.y) / this.zoomLevel - 150;
        }

        // Create image element
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageId = 'canvas-image-' + Date.now();
            const imageContainer = document.createElement('div');
            imageContainer.className = 'canvas-item canvas-image-item';
            imageContainer.id = imageId;
            imageContainer.style.position = 'absolute';
            imageContainer.style.left = x + 'px';
            imageContainer.style.top = y + 'px';
            imageContainer.style.padding = '0';
            imageContainer.style.background = 'transparent';
            imageContainer.style.border = 'none';
            imageContainer.style.borderRadius = '0';
            imageContainer.style.boxShadow = 'none';
            imageContainer.style.cursor = 'move';
            imageContainer.style.minWidth = '100px';
            imageContainer.style.minHeight = '100px';
            imageContainer.style.maxWidth = '800px';
            imageContainer.style.maxHeight = '600px';

            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.display = 'block';
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.maxWidth = '100%';
            img.style.pointerEvents = 'none';
            img.style.userSelect = 'none';

            // Add resize handle
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'image-resize-handle';
            resizeHandle.style.position = 'absolute';
            resizeHandle.style.bottom = '2px';
            resizeHandle.style.right = '2px';
            resizeHandle.style.width = '16px';
            resizeHandle.style.height = '16px';
            resizeHandle.style.background = 'rgba(0, 120, 212, 0.8)';
            resizeHandle.style.cursor = 'nwse-resize';
            resizeHandle.style.borderRadius = '3px';
            resizeHandle.style.border = '2px solid white';
            resizeHandle.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
            resizeHandle.style.opacity = '0';
            resizeHandle.style.transition = 'opacity 0.2s ease';

            imageContainer.appendChild(img);
            imageContainer.appendChild(resizeHandle);

            // Show resize handle on hover
            imageContainer.addEventListener('mouseenter', () => {
                resizeHandle.style.opacity = '1';
            });
            imageContainer.addEventListener('mouseleave', () => {
                resizeHandle.style.opacity = '0';
            });

            // Add to canvas content wrapper
            const wrapper = canvas.querySelector('.canvas-content-wrapper');
            if (wrapper) {
                wrapper.appendChild(imageContainer);
            } else {
                canvas.appendChild(imageContainer);
            }

            // Setup resize
            this.setupImageResize(imageContainer, resizeHandle, img);

            // Add to canvasItems
            this.canvasItems.push({
                id: imageId,
                element: imageContainer,
                type: 'image',
                data: {
                    name: 'Image',
                    src: e.target.result,
                    type: 'image'
                }
            });

            // Setup drag and click
            this.setupCanvasItemDrag(imageContainer);
            this.setupCanvasItemClick(imageContainer);

            this.saveState('add-image');
            this.showNotification('Image added - Drag to move, resize from corner, Delete to remove', 'success');
        };

        reader.readAsDataURL(imageBlob);
    }

    // Setup resize functionality for images
    setupImageResize(container, resizeHandle, img) {
        const resizeState = {
            isResizing: false,
            startX: 0,
            startY: 0,
            startWidth: 0
        };

        const handleMouseDown = (e) => {
            if (e.target !== resizeHandle) return;
            e.preventDefault();
            e.stopPropagation();

            // Save state BEFORE starting resize for proper undo
            this.saveState('before resize-image');

            resizeState.isResizing = true;
            resizeState.startX = e.clientX;
            resizeState.startY = e.clientY;
            resizeState.startWidth = container.offsetWidth;

            document.body.style.cursor = 'nwse-resize';
        };

        const handleMouseMove = (e) => {
            if (!resizeState.isResizing) return;

            const deltaX = (e.clientX - resizeState.startX) / this.zoomLevel;
            const newWidth = Math.max(100, Math.min(800, resizeState.startWidth + deltaX));

            container.style.width = newWidth + 'px';
        };

        const handleMouseUp = () => {
            if (!resizeState.isResizing) return;
            resizeState.isResizing = false;
            document.body.style.cursor = '';
            // State was saved BEFORE resize in mousedown
            // No saveState here - we want undo to restore the pre-resize state
        };

        resizeHandle.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    // Setup resize functionality for text labels
    setupTextLabelResize(label, resizeHandle) {
        // Create a unique resize state for this specific label
        const resizeState = {
            isResizing: false,
            startX: 0,
            startY: 0,
            startWidth: 0,
            startHeight: 0,
            targetLabel: label  // Explicitly store which label we're resizing
        };
        
        const handleMouseDown = (e) => {
            // Only proceed if clicking THIS specific resize handle
            if (e.target !== resizeHandle) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            // Save state BEFORE starting resize for proper undo
            this.saveState('before resize-text-label');
            
            resizeState.isResizing = true;
            resizeState.startX = e.clientX;
            resizeState.startY = e.clientY;
            resizeState.startWidth = resizeState.targetLabel.offsetWidth;
            resizeState.startHeight = resizeState.targetLabel.offsetHeight;
            
            resizeState.targetLabel.draggable = false;  // Disable dragging while resizing
            resizeState.targetLabel.style.cursor = 'nwse-resize';
            
            // Add listeners to document for this specific resize operation
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };
        
        const handleMouseMove = (e) => {
            if (!resizeState.isResizing) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const deltaX = e.clientX - resizeState.startX;
            const deltaY = e.clientY - resizeState.startY;
            const newWidth = Math.max(100, resizeState.startWidth + deltaX);  // Minimum 100px
            const newHeight = Math.max(30, resizeState.startHeight + deltaY);  // Minimum 30px
            
            // Only resize THIS specific label - use requestAnimationFrame for smooth resize
            requestAnimationFrame(() => {
                if (resizeState.targetLabel && resizeState.isResizing) {
                    resizeState.targetLabel.style.width = newWidth + 'px';
                    resizeState.targetLabel.style.height = newHeight + 'px';
                }
            });
        };
        
        const handleMouseUp = (e) => {
            if (!resizeState.isResizing) return;
            
            resizeState.isResizing = false;
            resizeState.targetLabel.draggable = true;  // Re-enable dragging
            resizeState.targetLabel.style.cursor = 'move';
            
            // Remove listeners
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            
            // State was saved BEFORE resize in mousedown
            // No saveState here - we want undo to restore the pre-resize state
            this.autosave();
        };
        
        // Attach mousedown to the resize handle
        resizeHandle.addEventListener('mousedown', handleMouseDown);
        
        // Prevent click from bubbling
        resizeHandle.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Toggle snap-to-grid
    toggleSnapToGrid() {
        this.snapEnabled = !this.snapEnabled;
        
        // Update button visual state
        const snapBtn = document.getElementById('snap-toggle-btn');
        if (snapBtn) {
            if (this.snapEnabled) {
                snapBtn.classList.add('active');
            } else {
                snapBtn.classList.remove('active');
            }
        }
        
        // Show notification
        const status = this.snapEnabled ? 'enabled' : 'disabled';
        this.showNotification(`Snap to grid ${status}`, 'info');
        
        // Save preference to localStorage
        try {
            localStorage.setItem('snapToGrid', this.snapEnabled.toString());
        } catch (error) {
            console.warn('Failed to save snap preference:', error);
        }
    }

    // Initialize snap toggle from localStorage
    initializeSnapToggle() {
        try {
            const savedSnap = localStorage.getItem('snapToGrid');
            if (savedSnap !== null) {
                this.snapEnabled = savedSnap === 'true';
            }
        } catch (error) {
            console.warn('Failed to load snap preference:', error);
        }
        
        // Update button visual state
        const snapBtn = document.getElementById('snap-toggle-btn');
        if (snapBtn && this.snapEnabled) {
            snapBtn.classList.add('active');
        }
    }

    // Toggle between Pan and Select modes
    togglePanSelectMode() {
        this.panMode = !this.panMode;
        
        // Update button visual state
        const modeBtn = document.getElementById('mode-toggle-btn');
        if (modeBtn) {
            if (this.panMode) {
                modeBtn.innerHTML = '<i class="fas fa-hand-paper"></i><span style="margin-left: 4px; font-size: 11px;">Pan</span>';
                modeBtn.title = 'Toggle Pan/Select Mode (Space) - Currently: Pan';
            } else {
                modeBtn.innerHTML = '<i class="fas fa-mouse-pointer"></i><span style="margin-left: 4px; font-size: 11px;">Select</span>';
                modeBtn.title = 'Toggle Pan/Select Mode (Space) - Currently: Select';
            }
        }
        
        // Show notification
        const mode = this.panMode ? 'Pan' : 'Select';
        this.showNotification(`Mode: ${mode}`, 'info');
        
        // Save preference to localStorage
        try {
            localStorage.setItem('canvasPanMode', this.panMode.toString());
        } catch (error) {
            console.warn('Failed to save mode preference:', error);
        }
    }

    // Initialize pan mode from localStorage
    initializePanMode() {
        try {
            const savedMode = localStorage.getItem('canvasPanMode');
            if (savedMode !== null) {
                this.panMode = savedMode === 'true';
            }
        } catch (error) {
            console.warn('Failed to load mode preference:', error);
        }
        
        // Update button visual state
        const modeBtn = document.getElementById('mode-toggle-btn');
        if (modeBtn) {
            if (this.panMode) {
                modeBtn.innerHTML = '<i class="fas fa-hand-paper"></i><span style="margin-left: 4px; font-size: 11px;">Pan</span>';
                modeBtn.title = 'Toggle Pan/Select Mode (Space) - Currently: Pan';
            } else {
                modeBtn.innerHTML = '<i class="fas fa-mouse-pointer"></i><span style="margin-left: 4px; font-size: 11px;">Select</span>';
                modeBtn.title = 'Toggle Pan/Select Mode (Space) - Currently: Select';
            }
        }
    }

    // === CANVAS ZOOM FUNCTIONALITY ===
    setupCanvasZoom() {
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) {
            console.warn('Canvas element not found for zoom setup');
            return;
        }

        // Add mouse wheel event listener for zoom (no Ctrl needed)
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault(); // Prevent page scroll
            console.log('[WHEEL] Zoom event triggered, current zoom:', this.zoomLevel);
            
            // Get mouse position relative to canvas
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Calculate mouse position in canvas coordinates (before zoom)
            const canvasMouseX = (mouseX - this.canvasOffset.x) / this.zoomLevel;
            const canvasMouseY = (mouseY - this.canvasOffset.y) / this.zoomLevel;
            
            // Determine zoom direction
            const delta = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
            const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + delta));
            
            if (newZoom !== this.zoomLevel) {
                console.log('[WHEEL] Applying new zoom:', newZoom);
                // Calculate new offset to keep mouse position fixed
                const newOffsetX = mouseX - (canvasMouseX * newZoom);
                const newOffsetY = mouseY - (canvasMouseY * newZoom);
                
                this.canvasOffset = { x: newOffsetX, y: newOffsetY };
                this.setCanvasZoom(newZoom);
                console.log('[WHEEL] After setCanvasZoom, zoomLevel is:', this.zoomLevel);
                
                // Save pan offset to current page
                if (typeof pageManager !== 'undefined' && pageManager.currentPageId && pageManager.pages[pageManager.currentPageId]) {
                    pageManager.pages[pageManager.currentPageId].canvasOffset = { ...this.canvasOffset };
                    pageManager.savePages();
                }
            }
        }, { passive: false });
        
        // Add panning with left mouse button on canvas (not on items)
        let canDrag = false;
        let dragStartTime = 0;
        const clickThreshold = 200; // ms - distinguish between click and drag
        
        canvas.addEventListener('mousedown', (e) => {
            // Left-click on empty canvas = pan OR selection box (depending on mode)
            // Middle mouse button or Shift+left also work for pan
            // Don't pan if clicking on canvas items, connections, or UI elements
            const clickedOnCanvas = e.target === canvas || 
                                   e.target.classList.contains('canvas-background') || 
                                   e.target.classList.contains('canvas-content-wrapper') ||
                                   e.target.classList.contains('bg-panel') ||
                                   e.target.classList.contains('bg-prepare');
            
            const clickedOnItem = e.target.closest('.canvas-item, .text-label-wrapper, .canvas-connection');
            
            // Only handle if clicking on empty canvas (not on items or connections)
            if (clickedOnCanvas && !clickedOnItem) {
                // Middle mouse or Shift+left always pans
                if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                    e.preventDefault();
                    this.isPanning = true;
                    canDrag = true;
                    dragStartTime = Date.now();
                    this.panStart = { x: e.clientX, y: e.clientY };
                    canvas.style.cursor = 'grabbing';
                }
                // Left-click behavior depends on mode
                else if (e.button === 0) {
                    if (this.panMode) {
                        // Pan mode
                        e.preventDefault();
                        this.isPanning = true;
                        canDrag = true;
                        dragStartTime = Date.now();
                        this.panStart = { x: e.clientX, y: e.clientY };
                        canvas.style.cursor = 'grabbing';
                    } else {
                        // Selection mode - start selection box
                        e.preventDefault();
                        this.startSelection(e);
                    }
                }
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (this.isPanning && canDrag) {
                e.preventDefault();
                const dx = e.clientX - this.panStart.x;
                const dy = e.clientY - this.panStart.y;
                
                this.canvasOffset.x += dx;
                this.canvasOffset.y += dy;
                
                this.panStart = { x: e.clientX, y: e.clientY };
                this.applyCanvasTransform();
            }
        });
        
        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 1 || (e.button === 0 && this.isPanning)) {
                this.isPanning = false;
                canDrag = false;
                canvas.style.cursor = '';
                
                // Save pan offset to current page
                if (typeof pageManager !== 'undefined' && pageManager.currentPageId && pageManager.pages[pageManager.currentPageId]) {
                    pageManager.pages[pageManager.currentPageId].canvasOffset = { ...this.canvasOffset };
                    pageManager.savePages();
                }
            }
        });
        
        canvas.addEventListener('mouseleave', () => {
            if (this.isPanning) {
                this.isPanning = false;
                canDrag = false;
                canvas.style.cursor = '';
            }
        });

        // Initial zoom and pan will be loaded per-page by PageManager
    }

    setCanvasZoom(zoomLevel) {
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;

        // Clamp zoom level to valid range
        this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, zoomLevel));

        // Apply transform with zoom and pan
        this.applyCanvasTransform();
        
        // Update all connections after zoom
        this.updateAllConnections();

        // Update zoom indicator
        this.updateZoomIndicator();

        // Show zoom percentage notification
        const zoomPercent = Math.round(this.zoomLevel * 100);
        this.showNotification(`Zoom: ${zoomPercent}%`, 'info');

        // Save zoom to current page
        if (typeof pageManager !== 'undefined' && pageManager.currentPageId && pageManager.pages[pageManager.currentPageId]) {
            pageManager.pages[pageManager.currentPageId].zoomLevel = this.zoomLevel;
            pageManager.savePages();
        }
    }
    
    applyCanvasTransform() {
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;
        
        // Apply transform only to the content wrapper - this transforms everything at once
        const wrapper = canvas.querySelector('.canvas-content-wrapper');
        if (wrapper) {
            wrapper.style.transform = `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px) scale(${this.zoomLevel})`;
            wrapper.style.transformOrigin = '0 0';
        }
        
        // Update connections after transform
        this.updateConnections();
    }

    // Reset zoom to 100% and center the view
    resetCanvasZoom() {
        this.centerCanvasView();
        this.setCanvasZoom(1);
    }
    
    // Center the canvas view on a specific point (defaults to center of content area)
    centerCanvasView(targetX = 1000, targetY = 800) {
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const viewportCenterX = rect.width / 2;
        const viewportCenterY = rect.height / 2;
        
        // Calculate offset so that targetX, targetY is at the center of the viewport
        this.canvasOffset = {
            x: viewportCenterX - (targetX * this.zoomLevel),
            y: viewportCenterY - (targetY * this.zoomLevel)
        };
        
        this.applyCanvasTransform();
    }

    // Zoom in
    zoomIn() {
        const newZoom = Math.min(this.maxZoom, this.zoomLevel + this.zoomStep);
        this.setCanvasZoom(newZoom);
    }

    // Zoom out
    zoomOut() {
        const newZoom = Math.max(this.minZoom, this.zoomLevel - this.zoomStep);
        this.setCanvasZoom(newZoom);
    }

    // Fit all items to view
    fitToView(padding = 80) {
        const canvas = document.getElementById('fabric-canvas');
        const canvasContainer = canvas?.parentElement;
        if (!canvas || !canvasContainer) return;

        // Get all canvas items
        const allItems = canvas.querySelectorAll('.canvas-item, .data-source-card, .medallion-target');
        if (allItems.length === 0) return;

        // Calculate bounding box of all items
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        allItems.forEach(item => {
            const rect = item.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            
            // Get item position relative to canvas (accounting for current transform)
            const x = parseFloat(item.style.left) || 0;
            const y = parseFloat(item.style.top) || 0;
            const width = rect.width / this.zoomLevel;
            const height = rect.height / this.zoomLevel;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
        });

        // Calculate content dimensions
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const contentCenterX = minX + contentWidth / 2;
        const contentCenterY = minY + contentHeight / 2;

        // Get container dimensions
        const containerWidth = canvasContainer.clientWidth;
        const containerHeight = canvasContainer.clientHeight;

        // Calculate zoom to fit with padding
        const scaleX = (containerWidth - padding * 2) / contentWidth;
        const scaleY = (containerHeight - padding * 2) / contentHeight;
        
        // Allow zooming out to fit all content (minimum 20% zoom)
        const minZoomToFit = 0.2;
        const newZoom = Math.max(minZoomToFit, Math.min(this.maxZoom, Math.min(scaleX, scaleY)));

        // Calculate pan offset to center content
        const offsetX = (containerWidth / 2) - (contentCenterX * newZoom);
        const offsetY = (containerHeight / 2) - (contentCenterY * newZoom);

        // Apply zoom and pan
        this.zoomLevel = newZoom;
        this.canvasOffset = { x: offsetX, y: offsetY };
        this.applyCanvasTransform();
        // updateConnections is called inside applyCanvasTransform

        // Update zoom indicator
        this.updateZoomIndicator();

        // Show notification
        const zoomPercent = Math.round(this.zoomLevel * 100);
        this.showNotification(`Fit to view - Zoom: ${zoomPercent}%`, 'success');

        // Save zoom and pan to current page
        if (typeof pageManager !== 'undefined' && pageManager.currentPageId && pageManager.pages[pageManager.currentPageId]) {
            pageManager.pages[pageManager.currentPageId].zoomLevel = this.zoomLevel;
            pageManager.pages[pageManager.currentPageId].canvasOffset = { ...this.canvasOffset };
            pageManager.savePages();
        }
    }

    // Update the zoom level indicator display
    updateZoomIndicator() {
        const zoomPercent = Math.round(this.zoomLevel * 100);
        const zoomIndicator = document.getElementById('zoom-level-text');
        if (zoomIndicator) {
            zoomIndicator.textContent = `${zoomPercent}%`;
        }
    }

    // Auto-arrange cards in left-to-right hierarchical flow
    autoArrangeCards() {
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;

        const allItems = Array.from(canvas.querySelectorAll('.canvas-item, .data-source-card, .medallion-target'));
        if (allItems.length === 0) return;

        // Count connections for each item
        const connections = this.connections || [];
        const connectionCount = new Map();
        
        allItems.forEach(item => connectionCount.set(item, 0));
        
        connections.forEach(conn => {
            if (conn.from) {
                connectionCount.set(conn.from, (connectionCount.get(conn.from) || 0) + 1);
            }
            if (conn.to) {
                connectionCount.set(conn.to, (connectionCount.get(conn.to) || 0) + 1);
            }
        });

        // Separate connected and unconnected items
        const connectedItems = allItems.filter(item => (connectionCount.get(item) || 0) > 0);
        const unconnectedItems = allItems.filter(item => (connectionCount.get(item) || 0) === 0);

        // Sort connected items by connection count (most connected first)
        connectedItems.sort((a, b) => {
            const countA = connectionCount.get(a) || 0;
            const countB = connectionCount.get(b) || 0;
            return countB - countA; // Descending order
        });

        // Layout parameters
        const connectedItemsPerColumn = 5; // Max connected items per vertical column
        const unconnectedItemsPerColumn = 8; // More unconnected items per column (compact)
        const connectedColumnSpacing = 220; // More space for connected items
        const connectedRowSpacing = 130;    // More vertical space for connected items
        const unconnectedColumnSpacing = 150; // Less space for unconnected items
        const unconnectedRowSpacing = 100;   // Tighter vertical spacing for unconnected items

        // Calculate total width and height needed
        const connectedColumns = Math.ceil(connectedItems.length / connectedItemsPerColumn);
        const unconnectedColumns = Math.ceil(unconnectedItems.length / unconnectedItemsPerColumn);
        const totalWidth = (connectedColumns * connectedColumnSpacing) + 50 + (unconnectedColumns * unconnectedColumnSpacing);
        const maxConnectedRows = Math.min(connectedItemsPerColumn, connectedItems.length);
        const maxUnconnectedRows = Math.min(unconnectedItemsPerColumn, unconnectedItems.length);
        const totalHeight = Math.max(maxConnectedRows * connectedRowSpacing, maxUnconnectedRows * unconnectedRowSpacing);

        // Center the layout on visible viewport with proper margins
        const canvasContainer = canvas.parentElement;
        const viewportWidth = canvasContainer ? canvasContainer.clientWidth : 1600;
        const viewportHeight = canvasContainer ? canvasContainer.clientHeight : 900;
        
        // Calculate centered start position with minimum margins to keep items in bounds
        const minMargin = 50; // Minimum margin from edges
        const startX = Math.max(minMargin, (viewportWidth - totalWidth) / 2);
        const startY = Math.max(minMargin, (viewportHeight - totalHeight) / 2);

        // Arrange connected items first
        connectedItems.forEach((item, index) => {
            const columnIndex = Math.floor(index / connectedItemsPerColumn);
            const rowIndex = index % connectedItemsPerColumn;
            
            const x = startX + (columnIndex * connectedColumnSpacing);
            const y = startY + (rowIndex * connectedRowSpacing);
            
            // Apply position with snap to grid
            const snapped = this.snapToGrid(x, y);
            item.style.left = snapped.x + 'px';
            item.style.top = snapped.y + 'px';
        });

        // Calculate where unconnected items should start
        const unconnectedStartX = startX + (connectedColumns * connectedColumnSpacing) + 50; // Small gap after connected items

        // Arrange unconnected items compactly after connected items
        unconnectedItems.forEach((item, index) => {
            const columnIndex = Math.floor(index / unconnectedItemsPerColumn);
            const rowIndex = index % unconnectedItemsPerColumn;
            
            const x = unconnectedStartX + (columnIndex * unconnectedColumnSpacing);
            const y = startY + (rowIndex * unconnectedRowSpacing);
            
            // Apply position with snap to grid
            const snapped = this.snapToGrid(x, y);
            item.style.left = snapped.x + 'px';
            item.style.top = snapped.y + 'px';
        });

        // Update all connections
        this.updateAllConnections();
        
        // Show notification
        this.showNotification(`Auto-arranged: ${connectedItems.length} connected, ${unconnectedItems.length} unconnected (compact)`, 'success');
        
        // Fit to view after arranging
        setTimeout(() => this.fitToView(), 100);
    }

    // === TEXT FORMATTING FUNCTIONS ===
    showTextFormatToolbar(textLabel) {
        const toolbar = document.getElementById('text-format-toolbar');
        if (!toolbar) {
            console.warn('Text format toolbar not found');
            return;
        }
        
        toolbar.style.display = 'flex';
        this.selectedTextLabel = textLabel;
        console.log('Text label selected for formatting:', textLabel);
        
        // Update toolbar to reflect current text label styles
        const computedStyle = window.getComputedStyle(textLabel);
        
        // Update color pickers
        const textColorPicker = document.getElementById('text-color-picker');
        const bgColorPicker = document.getElementById('bg-color-picker');
        
        if (textColorPicker) {
            const rgb = computedStyle.color;
            textColorPicker.value = this.rgbToHex(rgb);
        }
        
        if (bgColorPicker && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && computedStyle.backgroundColor !== 'transparent') {
            const rgb = computedStyle.backgroundColor;
            bgColorPicker.value = this.rgbToHex(rgb);
        }
        
        // Update bold button state
        const boldBtn = document.getElementById('bold-btn');
        if (boldBtn) {
            const fontWeight = computedStyle.fontWeight;
            if (fontWeight === 'bold' || parseInt(fontWeight) >= 600) {
                boldBtn.classList.add('active');
            } else {
                boldBtn.classList.remove('active');
            }
        }
    }

    hideTextFormatToolbar() {
        const toolbar = document.getElementById('text-format-toolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
        }
        this.selectedTextLabel = null;
    }

    setTextSize(size) {
        if (!this.selectedTextLabel) {
            console.warn('No text label selected');
            this.showNotification('Please select a text label first', 'warning');
            return;
        }
        
        const sizes = {
            small: '14px',
            medium: '18px',
            large: '28px'
        };
        
        this.saveState('before text-format');
        this.selectedTextLabel.style.fontSize = sizes[size] || sizes.medium;
        this.selectedTextLabel.style.lineHeight = '1.4';
        this.showNotification(`Text size changed to ${size}`, 'success');
    }

    toggleBold() {
        if (!this.selectedTextLabel) return;
        
        const currentWeight = window.getComputedStyle(this.selectedTextLabel).fontWeight;
        const isBold = currentWeight === 'bold' || parseInt(currentWeight) >= 600;
        
        this.saveState('before text-format');
        this.selectedTextLabel.style.fontWeight = isBold ? 'normal' : 'bold';
        
        const boldBtn = document.getElementById('bold-btn');
        if (boldBtn) {
            boldBtn.classList.toggle('active', !isBold);
        }
    }

    setTextColor(color) {
        if (!this.selectedTextLabel) return;
        
        this.saveState('before text-format');
        this.selectedTextLabel.style.color = color;
    }

    setBackgroundColor(color) {
        if (!this.selectedTextLabel) return;
        
        // Store the color for toggling back from transparent
        this.selectedTextLabel.dataset.lastBgColor = color;
        
        this.saveState('before text-format');
        this.selectedTextLabel.style.background = color;
        this.selectedTextLabel.style.border = '1px solid ' + color;
    }

    toggleBackgroundTransparent() {
        if (!this.selectedTextLabel) return;
        
        const currentBg = window.getComputedStyle(this.selectedTextLabel).backgroundColor;
        const isTransparent = currentBg === 'rgba(0, 0, 0, 0)' || currentBg === 'transparent';
        
        this.saveState('before text-format');
        if (isTransparent) {
            // Restore last color or use default
            const lastColor = this.selectedTextLabel.dataset.lastBgColor || '#1a1a2e';
            this.selectedTextLabel.style.background = lastColor;
            this.selectedTextLabel.style.border = '1px solid ' + lastColor;
            this.showNotification('Background color restored', 'info');
            
            // Update the color picker
            const bgColorPicker = document.getElementById('bg-color-picker');
            if (bgColorPicker) {
                bgColorPicker.value = lastColor;
            }
        } else {
            // Save current color and make transparent
            this.selectedTextLabel.dataset.lastBgColor = currentBg.startsWith('rgb') ? this.rgbToHex(currentBg) : currentBg;
            this.selectedTextLabel.style.background = 'transparent';
            this.selectedTextLabel.style.border = '1px dashed #666';
            this.showNotification('Background set to transparent', 'info');
        }
    }

    toggleBorder() {
        if (!this.selectedTextLabel) return;
        
        const currentBorder = window.getComputedStyle(this.selectedTextLabel).borderStyle;
        const hasBorder = currentBorder !== 'none';
        
        this.saveState('before text-format');
        if (hasBorder) {
            // Save current border and remove it
            this.selectedTextLabel.dataset.lastBorder = this.selectedTextLabel.style.border;
            this.selectedTextLabel.style.border = 'none';
            this.showNotification('Border hidden', 'info');
        } else {
            // Restore last border or use default
            const lastBorder = this.selectedTextLabel.dataset.lastBorder || '1px dashed #666';
            this.selectedTextLabel.style.border = lastBorder;
            this.showNotification('Border shown', 'info');
        }
    }

    setBackgroundTransparent() {
        // Keep old function for backward compatibility, redirect to toggle
        this.toggleBackgroundTransparent();
    }

    rgbToHex(rgb) {
        // Convert rgb(r, g, b) to #rrggbb
        const result = rgb.match(/\d+/g);
        if (!result) return '#ffffff';
        
        const r = parseInt(result[0]);
        const g = parseInt(result[1]);
        const b = parseInt(result[2]);
        
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    setupUndoRedo() {
        // Save initial state
        this.saveState('initial');
    }

    // === MULTI-SELECT SYSTEM ===
    setupMultiSelect() {
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;

        // Selection is now handled in setupCanvasZoom based on panMode
        // Mouse move and mouseup are attached to document to handle selection even when mouse leaves canvas
        
        // Bound handlers so we can remove them later
        this._selectionMoveHandler = (e) => {
            if (this.isSelecting) {
                this.updateSelection(e);
            }
        };
        
        this._selectionUpHandler = (e) => {
            if (this.isSelecting) {
                this.endSelection(e);
            }
        };
        
        // Attach to document so selection works even when mouse leaves canvas
        document.addEventListener('mousemove', this._selectionMoveHandler);
        document.addEventListener('mouseup', this._selectionUpHandler);
    }

    startSelection(e) {
        this.isSelecting = true;
        const canvas = document.getElementById('fabric-canvas');
        const wrapper = canvas.querySelector('.canvas-content-wrapper');
        const rect = canvas.getBoundingClientRect();
        
        // Calculate position accounting for canvas transform
        const canvasX = (e.clientX - rect.left - this.canvasOffset.x) / this.zoomLevel;
        const canvasY = (e.clientY - rect.top - this.canvasOffset.y) / this.zoomLevel;
        
        this.selectionStart = { x: canvasX, y: canvasY };
        this.selectionClientStart = { x: e.clientX, y: e.clientY };

        // Create selection box in the wrapper
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'selection-box';
        this.selectionBox.style.cssText = `
            position: absolute;
            border: 2px dashed #0078d4;
            background: rgba(0, 120, 212, 0.1);
            pointer-events: none;
            z-index: 1000;
            left: ${canvasX}px;
            top: ${canvasY}px;
            width: 0px;
            height: 0px;
        `;
        
        if (wrapper) {
            wrapper.appendChild(this.selectionBox);
        } else {
            canvas.appendChild(this.selectionBox);
        }

        // Clear previous selection if not holding Ctrl
        if (!e.ctrlKey) {
            this.clearSelection();
        }
    }

    updateSelection(e) {
        if (!this.selectionBox) return;
        
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        
        // Calculate position accounting for canvas transform
        // Clamp coordinates to canvas bounds to prevent selection box from going outside
        let clientX = e.clientX;
        let clientY = e.clientY;
        
        // Allow some overflow but clamp to reasonable bounds
        clientX = Math.max(rect.left - 50, Math.min(rect.right + 50, clientX));
        clientY = Math.max(rect.top - 50, Math.min(rect.bottom + 50, clientY));
        
        const currentX = (clientX - rect.left - this.canvasOffset.x) / this.zoomLevel;
        const currentY = (clientY - rect.top - this.canvasOffset.y) / this.zoomLevel;

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
            if (!canvas) {
                // Cleanup if canvas not found
                if (this.selectionBox.parentNode) {
                    this.selectionBox.remove();
                }
                this.selectionBox = null;
                this.isSelecting = false;
                return;
            }
            const rect = canvas.getBoundingClientRect();
            
            // Calculate position accounting for canvas transform
            // Clamp coordinates to canvas bounds
            let clientX = e.clientX;
            let clientY = e.clientY;
            clientX = Math.max(rect.left - 50, Math.min(rect.right + 50, clientX));
            clientY = Math.max(rect.top - 50, Math.min(rect.bottom + 50, clientY));
            
            const currentX = (clientX - rect.left - this.canvasOffset.x) / this.zoomLevel;
            const currentY = (clientY - rect.top - this.canvasOffset.y) / this.zoomLevel;

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
        
        // Set flag to prevent the click event from clearing the selection we just made
        this.justFinishedSelection = true;
    }

    highlightItemsInSelection(left, top, width, height) {
        // During drag selection, highlight and select items that overlap with selection box
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
        document.querySelectorAll('.canvas-item.multi-selected, .canvas-item.selected').forEach(el => {
            el.classList.remove('multi-selected', 'selected');
        });
        // Also clear any text-label selections
        document.querySelectorAll('.text-label.multi-selected, .text-label.selected').forEach(el => {
            el.classList.remove('multi-selected', 'selected');
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
        
        this.saveState('before delete selected');
        
        const itemsToDelete = Array.from(this.selectedItems);
        
        // Use internal delete that doesn't save state (since we already saved it)
        itemsToDelete.forEach(ci => {
            this._deleteCanvasItemInternal(ci);
        });
        
        this.clearSelection();
        this.showNotification(`Deleted ${itemsToDelete.length} items`, 'success');
    }

    // Internal delete without saving state (for batch operations)
    _deleteCanvasItemInternal(ci) {
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
    }

    deleteCanvasItem(ci) {
        this.saveState('before delete item');
        this._deleteCanvasItemInternal(ci);
        this.showNotification('Item deleted', 'success');
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
        // Create template dropdown in toolbar
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
        `;

        toolbar.appendChild(templateContainer);

        // Create menu as a separate element appended to body for proper z-index layering
        const templateMenu = document.createElement('div');
        templateMenu.className = 'template-menu';
        templateMenu.id = 'template-menu';
        templateMenu.innerHTML = Object.entries(this.templates).map(([key, template]) => `
            <div class="template-item" data-template="${key}">
                <div class="template-name">${template.name}</div>
                <div class="template-desc">${template.description}</div>
            </div>
        `).join('');
        document.body.appendChild(templateMenu);

        // Toggle dropdown
        const templateBtn = templateContainer.querySelector('#template-btn');
        
        templateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Position the menu below the button
            const btnRect = templateBtn.getBoundingClientRect();
            templateMenu.style.position = 'fixed';
            templateMenu.style.top = (btnRect.bottom + 4) + 'px';
            templateMenu.style.left = btnRect.left + 'px';
            
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

        // Save state before loading template (so user can undo back to previous state)
        this.saveState('before load template: ' + template.name);
        
        // Set loading flag to prevent inner functions from creating additional undo states
        this._isLoading = true;

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
        
        // Clear loading flag after items are created
        this._isLoading = false;

        // Create connections after all items are created and rendered
        setTimeout(() => {
            // Set loading flag again for connections
            this._isLoading = true;
            
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
            
            // Re-enable notifications and clear loading flag
            this._suppressNotifications = false;
            this._isLoading = false;
            
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
        // Drag state is now managed at the class level, not per-item
        // This prevents memory leaks from adding multiple document listeners
        
        item.addEventListener('mousedown', (e) => {
            if (this.connectionMode) return;
            
            // Check if item is locked - prevent all drag interactions
            if (item.dataset.locked === 'true') {
                e.preventDefault();
                e.stopPropagation();
                this.showNotification('Item is locked - right-click to unlock', 'warning', 2000);
                return;
            }
            
            // Find the canvas item for this element
            const canvasItem = this.canvasItems.find(ci => ci.element === item);
            
            // Check if this item is already in the selection (by element reference or by checking the Set)
            const isItemSelected = canvasItem && (
                this.selectedItems.has(canvasItem) || 
                Array.from(this.selectedItems).some(ci => ci.element === item)
            );
            
            // Handle multi-select with Ctrl key
            if (e.ctrlKey) {
                if (isItemSelected) {
                    // Remove from selection
                    this.selectedItems.forEach(ci => {
                        if (ci.element === item) {
                            this.selectedItems.delete(ci);
                        }
                    });
                    item.classList.remove('multi-selected');
                } else {
                    // Add to selection
                    if (canvasItem) {
                        this.selectedItems.add(canvasItem);
                        item.classList.add('multi-selected');
                    }
                }
                return;
            }
            
            // If item is not in selection, clear selection and select just this item
            if (canvasItem && !isItemSelected) {
                this.clearSelection();
                this.selectedItems.add(canvasItem);
                item.classList.add('multi-selected');
                
                // Hide text formatting toolbar when selecting non-text items
                if (canvasItem.type !== 'text-label') {
                    this.hideTextFormatToolbar();
                }
            }
            
            // Start drag operation (will move all selected items)
            this.startDragOperation(item, e);
            
            e.preventDefault();
            e.stopPropagation();
        });
    }

    startDragOperation(primaryItem, e) {
        // Save state BEFORE starting the drag for proper undo
        this.saveState('before move');
        
        this.isDragging = true;
        this.dragPrimaryItem = primaryItem;
        
        // Get canvas for coordinate calculations
        const canvas = document.getElementById('fabric-canvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        // Calculate mouse position in canvas coordinate space (accounting for zoom and pan)
        const mouseCanvasX = (e.clientX - canvasRect.left - this.canvasOffset.x) / this.zoomLevel;
        const mouseCanvasY = (e.clientY - canvasRect.top - this.canvasOffset.y) / this.zoomLevel;
        
        // Get the item's current position in canvas coordinates
        const itemX = parseInt(primaryItem.style.left) || 0;
        const itemY = parseInt(primaryItem.style.top) || 0;
        
        // Store the offset in canvas coordinates
        this.dragOffsetX = mouseCanvasX - itemX;
        this.dragOffsetY = mouseCanvasY - itemY;
        
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        
        // Store initial positions for all selected items (excluding locked items)
        this.dragInitialPositions = new Map();
        this.selectedItems.forEach(ci => {
            // Skip locked items in multi-selection drag
            if (ci.element.dataset.locked === 'true') {
                return;
            }
            
            this.dragInitialPositions.set(ci.element, {
                x: parseInt(ci.element.style.left) || 0,
                y: parseInt(ci.element.style.top) || 0
            });
            ci.element.style.zIndex = '1000';
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
                // Check if this item is part of a multi-selection - don't clear if so
                const isMultiSelected = item.classList.contains('multi-selected');
                const hasMultipleSelected = this.selectedItems.size > 1;
                
                // Only clear and re-select if not part of existing multi-selection
                if (!isMultiSelected || !hasMultipleSelected) {
                    this.clearSelections();
                    item.classList.add('selected');
                    
                    // Show helpful tip on first selection
                    if (!localStorage.getItem('properties-tip-shown')) {
                        this.showNotification('💡 Double-click or right-click for Properties', 'info', 4000);
                        localStorage.setItem('properties-tip-shown', 'true');
                    }
                }
            }
        });
        
        // Double-click to open metadata panel
        item.addEventListener('dblclick', (e) => {
            if (!this.connectionMode) {
                e.preventDefault();
                try {
                    const canvasItem = this.canvasItems.find(ci => ci.element === item);
                    const id = item.id || canvasItem?.id;
                    if (id && typeof metadataPanel !== 'undefined') {
                        metadataPanel.openForItem(id);
                    }
                } catch(err){ console.warn('Double-click handler failed', err); }
            }
        });
        
        // Right-click context menu
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showItemContextMenu(e, item);
        });
    }

    setupNameEditingForItem(item) {
        // Add event listeners for name editing to trigger autosave
        const nameElement = item.querySelector('.ci-name');
        if (nameElement) {
            nameElement.addEventListener('blur', () => {
                this.saveToLocalStorage();
            });
            
            nameElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    nameElement.blur();
                    this.saveToLocalStorage();
                }
            });

            nameElement.addEventListener('input', () => {
                // Save the name to the item's data
                const canvasItem = this.canvasItems.find(ci => ci.element === item);
                if (canvasItem && canvasItem.data) {
                    canvasItem.data.name = nameElement.textContent.trim();
                }
            });
        }
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
        
        // Check if item is locked
        const isLocked = item.dataset.locked === 'true';
        
        menu.innerHTML = `
            <div class="context-menu-item" data-action="properties">
                <i class="fas fa-cog"></i> Properties
            </div>
            <div class="context-menu-item" data-action="${isLocked ? 'unlock' : 'lock'}">
                <i class="fas fa-${isLocked ? 'unlock' : 'lock'}"></i> ${isLocked ? 'Unlock' : 'Lock'}
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
            } else if (action === 'lock') {
                this.lockItem(item);
            } else if (action === 'unlock') {
                this.unlockItem(item);
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
    
    showCanvasContextMenu(e) {
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
        
        const editModeActive = this.editMode || this.connectionMode;
        const snapEnabled = this.snapToGridEnabled;
        const isPanMode = this.panMode;
        
        menu.innerHTML = `
            <div class="context-menu-item" data-action="toggle-pan-select">
                <i class="fas fa-${isPanMode ? 'mouse-pointer' : 'hand-paper'}"></i> Switch to ${isPanMode ? 'Select' : 'Pan'} Mode
            </div>
            <div class="context-menu-separator"></div>
            ${editModeActive ? `
                <div class="context-menu-item" data-action="cancel-edit">
                    <i class="fas fa-times"></i> Cancel Edit Mode
                </div>
                <div class="context-menu-separator"></div>
            ` : ''}
            <div class="context-menu-item" data-action="toggle-edit">
                <i class="fas fa-${editModeActive ? 'mouse-pointer' : 'pen'}"></i> ${editModeActive ? 'Exit Edit Mode' : 'Edit Mode'}
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="toggle-snap">
                <i class="fas fa-grip"></i> ${snapEnabled ? '✓ Snap to Grid' : 'Snap to Grid'}
            </div>
            <div class="context-menu-item" data-action="add-text">
                <i class="fas fa-font"></i> Add Text Label
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="canvas-settings">
                <i class="fas fa-sliders-h"></i> Canvas Settings
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="select-all">
                <i class="fas fa-object-group"></i> Select All
            </div>
        `;
        
        // Add click handlers
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (action === 'toggle-pan-select') {
                this.togglePanSelectMode();
            } else if (action === 'cancel-edit') {
                // Cancel edit mode without completing the action
                this.editMode = false;
                this.connectionMode = false;
                this.selectedItem = null;
                this.selectedSource = null;
                document.body.style.cursor = 'default';
                this.showNotification('Edit mode cancelled', 'info');
            } else if (action === 'toggle-edit') {
                this.toggleUnifiedMode();
            } else if (action === 'toggle-snap') {
                this.toggleSnapToGrid();
            } else if (action === 'add-text') {
                this.addTextLabel();
            } else if (action === 'canvas-settings') {
                // Open canvas settings modal
                const settingsBtn = document.getElementById('settings-btn');
                if (settingsBtn) {
                    settingsBtn.click();
                }
            } else if (action === 'select-all') {
                this.selectAllItems();
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
            // Note: saveState is called by the underlying add functions (addConsumptionItemToCanvas, etc.)
            // so we don't save state here to avoid double-saving
            
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
                this.saveState('before delete item');
                
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

    lockItem(item) {
        try {
            this.saveState('before lock item');
            
            item.dataset.locked = 'true';
            item.classList.add('locked-item');
            
            // No lock icon overlay - just silent locking
            
            this.showNotification('Item locked', 'info');
            
        } catch (error) {
            console.error('Error locking item:', error);
            this.showNotification('Failed to lock item', 'error');
        }
    }

    unlockItem(item) {
        try {
            this.saveState('before unlock item');
            
            item.dataset.locked = 'false';
            item.classList.remove('locked-item');
            
            // Remove any existing lock icon overlay (if any)
            const lockIcon = item.querySelector('.lock-icon-overlay');
            if (lockIcon) {
                lockIcon.remove();
            }
            
            this.showNotification('Item unlocked', 'info');
            
        } catch (error) {
            console.error('Error unlocking item:', error);
            this.showNotification('Failed to unlock item', 'error');
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
        if (fromElement === toElement) {
            this.showNotification('Ignored: cannot connect an item to itself', 'warning');
            return;
        }
        
        // Save state BEFORE creating connection for proper undo
        this.saveState('before create connection');
        
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

    drawConnection(connection, overrideColor = null) {
        // Store the override color on the connection object for future redraws
        if (overrideColor) {
            connection.color = overrideColor;
        }
        
        // If this connection has manual anchors, use the manual drawing method
        if (connection.fromAnchor && connection.toAnchor) {
            return this.drawManualConnection(connection);
        }
        
        if (!this.connectionSvg) return;
        
        // Use the playground's connection style (per-page)
        const connectionStyle = this.connectionStyle || 'orthogonal';
        
        console.log('[DrawConnection] Drawing', connection.id, 'with style:', connectionStyle, 'color:', connection.color);
        
        if (connectionStyle === 'curved') {
            return this.drawCurvedConnection(connection);
        } else {
            return this.drawOrthogonalConnection(connection);
        }
    }

    drawCurvedConnection(connection) {
        if (!this.connectionSvg) return;
        const svg = this.connectionSvg;
        const canvas = document.getElementById('fabric-canvas');
        const fromRect = connection.from.getBoundingClientRect();
        const toRect = connection.to.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();

        const toSvgPoint = (clientX, clientY) => {
            const pt = svg.createSVGPoint();
            pt.x = clientX; pt.y = clientY;
            const ctm = svg.getScreenCTM();
            if (!ctm) return { x: clientX - canvasRect.left, y: clientY - canvasRect.top };
            const inv = ctm.inverse();
            const sp = pt.matrixTransform(inv);
            return { x: sp.x, y: sp.y };
        };

        // Get centers
        const fromCenter = toSvgPoint(
            fromRect.left + fromRect.width / 2,
            fromRect.top + fromRect.height / 2
        );
        const toCenter = toSvgPoint(
            toRect.left + toRect.width / 2,
            toRect.top + toRect.height / 2
        );

        // Create curved path using cubic bezier
        const dx = toCenter.x - fromCenter.x;
        const dy = toCenter.y - fromCenter.y;
        
        // Control points for smooth curve
        const curve = Math.abs(dx) * 0.5; // Curve intensity
        const cp1x = fromCenter.x + curve;
        const cp1y = fromCenter.y;
        const cp2x = toCenter.x - curve;
        const cp2y = toCenter.y;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = `M ${fromCenter.x} ${fromCenter.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toCenter.x} ${toCenter.y}`;
        
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('class', 'connection-path');
        
        // Use connection-specific color if provided, otherwise fall back to CSS variable
        const lineColor = connection.color || 'var(--connection-base-color)';
        path.setAttribute('stroke', lineColor);
        path.setAttribute('stroke-width', '2');
        
        // Create arrowhead at the end point
        const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        
        // Calculate angle at the end of the curve
        // For bezier curve, the tangent at the end is in the direction from cp2 to end
        const angle = Math.atan2(toCenter.y - cp2y, toCenter.x - cp2x);
        const arrowLength = 12;
        
        const arrowX1 = toCenter.x - arrowLength * Math.cos(angle - Math.PI / 6);
        const arrowY1 = toCenter.y - arrowLength * Math.sin(angle - Math.PI / 6);
        const arrowX2 = toCenter.x - arrowLength * Math.cos(angle + Math.PI / 6);
        const arrowY2 = toCenter.y - arrowLength * Math.sin(angle + Math.PI / 6);
        
        arrowHead.setAttribute('points', `${toCenter.x},${toCenter.y} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`);
        arrowHead.setAttribute('fill', connection.color || '#60a5fa');
        arrowHead.setAttribute('stroke', '#ffffff');
        arrowHead.setAttribute('stroke-width', '1');
        arrowHead.style.opacity = '0.9';
        arrowHead.setAttribute('pointer-events', 'none');
        console.log('[DrawCurvedConnection] Created arrowhead at', toCenter.x, toCenter.y, 'color: #60a5fa');
        
        // Create group and add elements (same structure as orthogonal)
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.appendChild(path);
        
        // Add animated flow overlay
        const flow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        flow.setAttribute('d', pathData);
        flow.setAttribute('class', 'connection-flow');
        group.appendChild(flow);
        
        // Add arrowhead
        group.appendChild(arrowHead);
        
        connection.element = group;
        this.connectionSvg.appendChild(group);

        // Make line clickable for deletion in edit mode (same as orthogonal)
        group.dataset.connectionId = connection.id;
        path.setAttribute('pointer-events', 'stroke');
        group.setAttribute('pointer-events', 'visible');
        group.style.cursor = this.editMode ? 'pointer' : 'default';
        group.addEventListener('click', (e) => {
            if (!this.editMode) return;
            e.stopPropagation();
            this.deleteConnectionById(connection.id);
        });
        
        // Add hover highlighting
        group.addEventListener('mouseenter', () => {
            group.classList.add('connection-highlighted');
        });
        group.addEventListener('mouseleave', () => {
            group.classList.remove('connection-highlighted');
        });
    }

    drawOrthogonalConnection(connection) {
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
            bottom: { x: r.left + r.width / 2, y: r.bottom },
            center: { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        });
        const Acl = anchorsClient(fromRect);
        const Bcl = anchorsClient(toRect);
        const A = {
            left: toSvgPoint(Acl.left.x, Acl.left.y),
            right: toSvgPoint(Acl.right.x, Acl.right.y),
            top: toSvgPoint(Acl.top.x, Acl.top.y),
            bottom: toSvgPoint(Acl.bottom.x, Acl.bottom.y),
            center: toSvgPoint(Acl.center.x, Acl.center.y)
        };
        const B = {
            left: toSvgPoint(Bcl.left.x, Bcl.left.y),
            right: toSvgPoint(Bcl.right.x, Bcl.right.y),
            top: toSvgPoint(Bcl.top.x, Bcl.top.y),
            bottom: toSvgPoint(Bcl.bottom.x, Bcl.bottom.y),
            center: toSvgPoint(Bcl.center.x, Bcl.center.y)
        };

        const Cfrom = center(fromRect);
        const Cto = center(toRect);
        const CfromSvg = toSvgPoint(Cfrom.x, Cfrom.y);
        const CtoSvg = toSvgPoint(Cto.x, Cto.y);

        // Calculate connection points - always use center-to-center for clean, consistent look
        let fromX, fromY, toX, toY;
        
        // Always use center-to-center connections for consistent appearance
        fromX = A.center.x; fromY = A.center.y;
        toX = B.center.x; toY = B.center.y;

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
        path.setAttribute('class', 'connection-path');
        
        // Use connection-specific color if provided
        if (connection.color) {
            path.setAttribute('stroke', connection.color);
        }
        
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
        const arrowLength = 12;  // Increased from 8 for better visibility
        const arrowWidth = 8;    // Increased from 6
        
        const arrowX1 = toX - arrowLength * Math.cos(angle - Math.PI / 6);
        const arrowY1 = toY - arrowLength * Math.sin(angle - Math.PI / 6);
        const arrowX2 = toX - arrowLength * Math.cos(angle + Math.PI / 6);
        const arrowY2 = toY - arrowLength * Math.sin(angle + Math.PI / 6);
        
        arrowHead.setAttribute('points', `${toX},${toY} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`);
    arrowHead.setAttribute('fill', connection.color || '#60a5fa');  // Use connection color or default
    arrowHead.setAttribute('stroke', '#ffffff');  // White outline
    arrowHead.setAttribute('stroke-width', '1');
    arrowHead.style.opacity = '0.9';
    arrowHead.setAttribute('pointer-events', 'none');  // Don't block clicks
    console.log('[DrawOrthogonalConnection] Created arrowhead at', toX, toY, 'color:', connection.color || '#60a5fa');
        
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.appendChild(path);
    // animated overlay following same geometry
    const flow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    flow.setAttribute('d', pathData);
    flow.setAttribute('class', 'connection-flow');
    group.appendChild(flow);
    const midArrow = createMidArrow(pts);
    if (midArrow) group.appendChild(midArrow);
    group.appendChild(arrowHead);
        
        connection.element = group;
        this.connectionSvg.appendChild(group);

        // Make line clickable for deletion in edit mode
        group.dataset.connectionId = connection.id;
        // Make both the path and the group clickable
        path.setAttribute('pointer-events', 'stroke');
        group.setAttribute('pointer-events', 'visible');
        group.style.cursor = this.editMode ? 'pointer' : 'default';
        group.addEventListener('click', (e) => {
            if (!this.editMode) return;
            e.stopPropagation();
            this.deleteConnectionById(connection.id);
        });
    }

    drawManualConnection(connection) {
        if (!this.connectionSvg) return;
        
        // Use the playground's connection style (per-page)
        const connectionStyle = this.connectionStyle || 'orthogonal';
        
        // If curved style is selected, use curved drawing instead
        if (connectionStyle === 'curved') {
            return this.drawCurvedConnection(connection);
        }
        
        // Otherwise proceed with orthogonal (original manual connection logic)
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
        path.setAttribute('class', 'connection-path');
        
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
        const arrowLength = 12;  // Increased from 8 for better visibility
        
        const arrowX1 = endPoint[0] - arrowLength * Math.cos(angle - Math.PI / 6);
        const arrowY1 = endPoint[1] - arrowLength * Math.sin(angle - Math.PI / 6);
        const arrowX2 = endPoint[0] - arrowLength * Math.cos(angle + Math.PI / 6);
        const arrowY2 = endPoint[1] - arrowLength * Math.sin(angle + Math.PI / 6);
        
        arrowHead.setAttribute('points', `${endPoint[0]},${endPoint[1]} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`);
        arrowHead.setAttribute('fill', '#60a5fa');  // Blue color for better visibility
        arrowHead.setAttribute('stroke', '#ffffff');  // White outline
        arrowHead.setAttribute('stroke-width', '1');
        arrowHead.style.opacity = '0.9';
        arrowHead.setAttribute('pointer-events', 'none');  // Don't block clicks

        // Create group and add visual indicator for manual connection
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('data-manual', 'true'); // Mark as manual connection
        group.appendChild(path);
        // animated overlay following same geometry
        const flow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        flow.setAttribute('d', pathData);
        flow.setAttribute('class', 'connection-flow');
        group.appendChild(flow);
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
        group.setAttribute('pointer-events', 'visible');
        group.style.cursor = this.editMode ? 'pointer' : 'default';
        group.addEventListener('click', (e) => {
            if (!this.editMode) return;
            e.stopPropagation();
            this.deleteConnectionById(connection.id);
        });
        
        // Add hover highlighting
        group.addEventListener('mouseenter', () => {
            group.classList.add('connection-highlighted');
        });
        group.addEventListener('mouseleave', () => {
            group.classList.remove('connection-highlighted');
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
        if (!this.connectionSvg) {
            return;
        }
        
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

    // Alias for updating connections (used by settings panel)
    redrawAllConnections() {
        this.updateConnections();
    }

    setupConnectionHighlighting() {
        // Add hover event listeners to all canvas items
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;

        // Track currently highlighted item to avoid duplicate processing
        let currentHighlightedItem = null;

        // Use mouseover for better event bubbling
        canvas.addEventListener('mouseover', (e) => {
            const item = e.target.closest('.canvas-item, .data-source-card, .medallion-target');
            
            // If we're hovering over the same item, don't reprocess
            if (!item || item === currentHighlightedItem) return;
            
            // Clear previous highlights
            if (currentHighlightedItem) {
                this.clearConnectionHighlights();
            }
            
            currentHighlightedItem = item;

            // Find all connections involving this item
            const connectedItems = new Set();
            const highlightedConnections = [];

            this.connections.forEach(connection => {
                if (connection.from === item || connection.to === item) {
                    highlightedConnections.push(connection);
                    connectedItems.add(connection.from);
                    connectedItems.add(connection.to);
                }
            });

            // Add highlight class to connected items
            connectedItems.forEach(connectedItem => {
                connectedItem.classList.add('connection-highlighted');
            });

            // Highlight the connection paths
            highlightedConnections.forEach(connection => {
                if (connection.element) {
                    connection.element.classList.add('connection-highlighted');
                }
            });
        });

        canvas.addEventListener('mouseout', (e) => {
            const item = e.target.closest('.canvas-item, .data-source-card, .medallion-target');
            if (!item) return;
            
            // Check if we're leaving the item (not just moving between children)
            const relatedTarget = e.relatedTarget;
            if (relatedTarget && item.contains(relatedTarget)) return;
            
            currentHighlightedItem = null;
            this.clearConnectionHighlights();
        });
    }

    clearConnectionHighlights() {
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas) return;
        
        // Remove all highlights from canvas items
        const highlightedItems = canvas.querySelectorAll('.connection-highlighted');
        highlightedItems.forEach(el => el.classList.remove('connection-highlighted'));

        // Remove all highlights from connection paths
        const highlightedPaths = this.connectionSvg.querySelectorAll('.connection-highlighted');
        highlightedPaths.forEach(el => el.classList.remove('connection-highlighted'));
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
                
                // For text labels, capture the actual text content
                let itemData = {
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
                
                // Special handling for text labels - save the text content
                if (ci.type === 'text-label' && ci.element) {
                    itemData.data = {
                        ...itemData.data,
                        name: ci.element.textContent || 'Double-click to edit',
                        text: ci.element.textContent || 'Double-click to edit',
                        lastBgColor: ci.element.dataset.lastBgColor || null,
                        lastBorder: ci.element.dataset.lastBorder || null
                    };
                    
                    // Save inline styles for text labels
                    itemData.style = {
                        background: ci.element.style.background || '',
                        border: ci.element.style.border || '',
                        color: ci.element.style.color || '',
                        fontSize: ci.element.style.fontSize || '',
                        fontWeight: ci.element.style.fontWeight || '',
                        whiteSpace: ci.element.style.whiteSpace || '',  // Save white-space if manually set
                        width: ci.element.style.width || '',  // Save width for resizable labels
                        height: ci.element.style.height || ''  // Save height for resizable labels
                    };
                    
                    // Check if text contains newlines - if so, we need pre-wrap
                    const hasNewlines = ci.element.textContent && ci.element.textContent.includes('\n');
                    if (hasNewlines && !itemData.style.whiteSpace) {
                        itemData.style.whiteSpace = 'pre-wrap';
                    }
                }
                
                // Special handling for images - save the image data
                if (ci.type === 'image' && ci.element) {
                    const img = ci.element.querySelector('img');
                    if (img) {
                        itemData.data = {
                            ...itemData.data,
                            src: img.src,
                            name: 'Image'
                        };
                        itemData.style = {
                            width: ci.element.style.width || ''
                        };
                    }
                }
                
                return itemData;
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
        if (this._suppressNotifications || this._isLoading || this.canvasItems.length === 0) return;
        
        try {
            const data = this.serialize();
            
            // Only autosave if we have meaningful content
            if (data.items && data.items.length > 0) {
                localStorage.setItem('playground-autosave', JSON.stringify(data));
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
                // Debug: Log text labels being restored
                const textLabels = data.items.filter(item => item.type === 'text-label');
                if (textLabels.length > 0) {
                    console.log('Restoring text labels:', textLabels.map(tl => ({
                        id: tl.id,
                        text: tl.data?.text,
                        name: tl.data?.name
                    })));
                }
                
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
        console.log('[loadFromData] START');
        const canvas = document.getElementById('fabric-canvas');
        if (!canvas || !data) {
            this.showNotification('Invalid data or canvas not found', 'error');
            return;
        }

        // Set loading flag to prevent saveState from being called for each item
        this._isLoading = true;
        console.log('[loadFromData] _isLoading set to true');

        // Clear existing
        canvas.querySelectorAll('.canvas-item').forEach(el => el.remove());
        this.canvasItems = [];
        this.connections = [];
        if (this.connectionSvg) this.connectionSvg.innerHTML = '';
        console.log('[loadFromData] Canvas cleared');

        // Suppress notifications during bulk load
        this._suppressNotifications = true;

        // Keep track of successfully loaded items
        const loadedItems = new Map();

        // Recreate items using creation helpers to preserve classes, accents and structure
        console.log('[loadFromData] Starting items loop, count:', (data.items || []).length);
        let itemIndex = 0;
        (data.items || []).forEach(item => {
            console.log('[loadFromData] Processing item', itemIndex, item.type, item.id);
            itemIndex++;
            let px = item.position?.x || 0;
            let py = item.position?.y || 0;
            
            // Safety check: if position is (0,0) or negative for text labels, use default visible position
            if (item.type === 'text-label') {
                if (px <= 0) px = 100;
                if (py <= 0) py = 100;
            }
            
            const savedId = item.id || ('canvas-item-' + Date.now() + '-' + Math.random());

            try {
                // Images - restore from saved data
                if (item.type === 'image') {
                    const canvas = document.getElementById('fabric-canvas');
                    if (canvas && item.data?.src) {
                        const imageContainer = document.createElement('div');
                        imageContainer.className = 'canvas-item canvas-image-item';
                        imageContainer.id = savedId;
                        imageContainer.style.position = 'absolute';
                        imageContainer.style.left = (px || 100) + 'px';
                        imageContainer.style.top = (py || 100) + 'px';
                        imageContainer.style.padding = '0';
                        imageContainer.style.background = 'transparent';
                        imageContainer.style.border = 'none';
                        imageContainer.style.borderRadius = '0';
                        imageContainer.style.boxShadow = 'none';
                        imageContainer.style.cursor = 'move';
                        imageContainer.style.minWidth = '100px';
                        imageContainer.style.minHeight = '100px';

                        // Restore saved width if available
                        if (item.style?.width) {
                            imageContainer.style.width = item.style.width;
                        }

                        const img = document.createElement('img');
                        img.src = item.data.src;
                        img.style.display = 'block';
                        img.style.width = '100%';
                        img.style.height = 'auto';
                        img.style.maxWidth = '100%';
                        img.style.pointerEvents = 'none';
                        img.style.userSelect = 'none';

                        const resizeHandle = document.createElement('div');
                        resizeHandle.className = 'image-resize-handle';
                        resizeHandle.style.position = 'absolute';
                        resizeHandle.style.bottom = '2px';
                        resizeHandle.style.right = '2px';
                        resizeHandle.style.width = '16px';
                        resizeHandle.style.height = '16px';
                        resizeHandle.style.background = 'rgba(0, 120, 212, 0.8)';
                        resizeHandle.style.cursor = 'nwse-resize';
                        resizeHandle.style.borderRadius = '3px';
                        resizeHandle.style.border = '2px solid white';
                        resizeHandle.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
                        resizeHandle.style.opacity = '0';
                        resizeHandle.style.transition = 'opacity 0.2s ease';

                        imageContainer.appendChild(img);
                        imageContainer.appendChild(resizeHandle);

                        // Show resize handle on hover
                        imageContainer.addEventListener('mouseenter', () => {
                            resizeHandle.style.opacity = '1';
                        });
                        imageContainer.addEventListener('mouseleave', () => {
                            resizeHandle.style.opacity = '0';
                        });

                        // Add to canvas content wrapper
                        const wrapper = canvas.querySelector('.canvas-content-wrapper');
                        if (wrapper) {
                            wrapper.appendChild(imageContainer);
                        } else {
                            canvas.appendChild(imageContainer);
                        }

                        // Setup resize and drag
                        this.setupImageResize(imageContainer, resizeHandle, img);
                        this.setupCanvasItemDrag(imageContainer);
                        this.setupCanvasItemClick(imageContainer);

                        // Add to canvasItems
                        this.canvasItems.push({
                            id: savedId,
                            element: imageContainer,
                            type: 'image',
                            data: item.data
                        });

                        loadedItems.set(savedId, imageContainer);
                    }
                    return; // Skip to next item (this is inside forEach, not a loop)
                }
                
                // Text labels - restore as simple text, not canvas items
                if (item.type === 'text-label') {
                    const canvas = document.getElementById('fabric-canvas');
                    if (canvas) {
                        const textToRestore = item.data?.name || item.data?.text || 'Double-click to edit';
                        console.log('Creating text label with text:', textToRestore, 'at position:', px, py, 'from data:', item.data);
                        
                        const label = document.createElement('div');
                        label.id = savedId;
                        label.className = 'canvas-item text-label';
                        label.contentEditable = 'false';
                        label.textContent = textToRestore;
                        label.style.position = 'absolute';  // Force absolute positioning
                        label.style.left = (px || 100) + 'px';  // Fallback to 100px if no position
                        label.style.top = (py || 100) + 'px';   // Fallback to 100px if no position
                        label.style.zIndex = '1000';
                        label.draggable = true;
                        
                        // Restore saved styles if available
                        if (item.style) {
                            if (item.style.background) label.style.background = item.style.background;
                            if (item.style.border) label.style.border = item.style.border;
                            if (item.style.color) label.style.color = item.style.color;
                            if (item.style.fontSize) label.style.fontSize = item.style.fontSize;
                            if (item.style.fontWeight) label.style.fontWeight = item.style.fontWeight;
                            if (item.style.whiteSpace) label.style.whiteSpace = item.style.whiteSpace;
                            if (item.style.width) label.style.width = item.style.width;
                            if (item.style.height) label.style.height = item.style.height;
                        } else {
                            // Default width if not saved
                            label.style.width = '200px';
                        }
                        
                        // Restore dataset properties
                        if (item.data?.lastBgColor) label.dataset.lastBgColor = item.data.lastBgColor;
                        if (item.data?.lastBorder) label.dataset.lastBorder = item.data.lastBorder;
                        
                        // Add resize handle
                        const resizeHandle = document.createElement('div');
                        resizeHandle.className = 'text-label-resize-handle';
                        label.appendChild(resizeHandle);
                        
                        // Add to canvas content wrapper (for proper zoom/pan)
                        const wrapper = canvas.querySelector('.canvas-content-wrapper');
                        if (wrapper) {
                            wrapper.appendChild(label);
                        } else {
                            canvas.appendChild(label); // Fallback if wrapper doesn't exist yet
                        }
                        
                        // Setup resize functionality
                        this.setupTextLabelResize(label, resizeHandle);
                        
                        // Add to canvasItems
                        this.canvasItems.push({
                            id: savedId,
                            element: label,
                            type: 'text-label',
                            data: { 
                                name: label.textContent, 
                                text: label.textContent,
                                type: 'text' 
                            }
                        });
                        
                        loadedItems.set(savedId, label);
                        
                        // Set up event listeners
                        this.setupCanvasItemDrag(label);
                        
                        label.addEventListener('mousedown', (e) => {
                            if (label.contentEditable === 'true') {
                                e.stopPropagation();
                            }
                        });
                        
                        label.addEventListener('dblclick', (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            
                            // Save state BEFORE editing starts for proper undo
                            this.saveState('before text-edit');
                            
                            label.contentEditable = 'true';
                            label.classList.add('editing');
                            label.style.cursor = 'text';
                            label.style.border = '1px solid #00D4FF';
                            label.draggable = false;
                            label.focus();
                            setTimeout(() => {
                                const range = document.createRange();
                                range.selectNodeContents(label);
                                const sel = window.getSelection();
                                sel.removeAllRanges();
                                sel.addRange(range);
                            }, 10);
                        });
                        
                        label.addEventListener('blur', () => {
                            label.classList.remove('editing');
                            label.style.cursor = 'move';
                            label.style.border = '1px dashed #666';
                            label.contentEditable = 'false';
                            label.draggable = true;
                            if (label.textContent.trim() === '') {
                                label.textContent = 'Double-click to edit';
                            }
                            
                            // Update the canvas item data to reflect the new text
                            const canvasItem = this.canvasItems.find(ci => ci.element === label);
                            if (canvasItem) {
                                canvasItem.data = {
                                    ...canvasItem.data,
                                    name: label.textContent,
                                    text: label.textContent
                                };
                                
                                // Keep the label selected and show formatting toolbar
                                this.clearSelection();
                                this.selectedItems.add(canvasItem);
                                label.classList.add('selected', 'multi-selected');
                                this.showTextFormatToolbar(label);
                            }
                            
                            // State was saved BEFORE editing in dblclick handler
                            this.autosave(); // Ensure autosave after text edit
                        });
                        
                        label.addEventListener('keydown', (e) => {
                            if (e.key === 'Escape') {
                                label.blur();
                            }
                        });
                        
                        label.addEventListener('click', (e) => {
                            if (label.contentEditable === 'true') return;
                            e.stopPropagation();
                            
                            // Find the canvas item object for this label
                            const canvasItem = this.canvasItems.find(ci => ci.element === label);
                            if (!canvasItem) return;
                            
                            if (e.ctrlKey) {
                                // Multi-select toggle
                                if (this.selectedItems.has(canvasItem)) {
                                    this.selectedItems.delete(canvasItem);
                                    label.classList.remove('multi-selected', 'selected');
                                } else {
                                    this.selectedItems.add(canvasItem);
                                    label.classList.add('multi-selected');
                                }
                            } else {
                                // Single select
                                this.clearSelection();
                                this.selectedItems.add(canvasItem);
                                label.classList.add('selected', 'multi-selected');
                                // Show formatting toolbar for text labels
                                this.showTextFormatToolbar(label);
                            }
                        });
                    }
                    return;
                }

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
                    this.addCanvasItem(item.type, px, py, item.data || null);
                    const lastItem = this.canvasItems[this.canvasItems.length - 1];
                    if (lastItem && lastItem.element) {
                        lastItem.id = savedId;
                        lastItem.element.id = savedId;
                        loadedItems.set(savedId, lastItem.element);
                    }
                    return;
                }

                // Fallback for unknown items
                this.addCanvasItem('dataset', px, py, item.data || null);
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
                        color: conn.color || null,
                        element: null
                    };
                    
                    this.connections.push(connection);
                    this.drawConnection(connection, conn.color);
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

        // Restore dimensions for all loaded items (especially containers)
        (data.items || []).forEach(savedItem => {
            const canvasItem = this.canvasItems.find(ci => ci.id === savedItem.id);
            if (canvasItem && canvasItem.element) {
                // Restore saved dimensions if they exist
                if (savedItem.width && savedItem.width > 0) {
                    canvasItem.element.style.width = savedItem.width + 'px';
                }
                if (savedItem.height && savedItem.height > 0) {
                    canvasItem.element.style.height = savedItem.height + 'px';
                }
                
                // Restore saved name if it exists
                if (savedItem.data && savedItem.data.name) {
                    const nameEl = canvasItem.element.querySelector('.canvas-item-title') || 
                                   canvasItem.element.querySelector('.data-source-name');
                    if (nameEl) {
                        nameEl.textContent = savedItem.data.name;
                    }
                    // Also update the canvasItem data
                    canvasItem.data = canvasItem.data || {};
                    canvasItem.data.name = savedItem.data.name;
                }
            }
        });

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

        // Re-enable notifications and clear loading flag
        this._suppressNotifications = false;
        this._isLoading = false;
        
        // Save initial state for undo after load is complete (but NOT during undo/redo operations)
        if (!this._isUndoRedo) {
            this.saveState('load');
        }
        
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

// ================= Presentation Mode =================
function togglePresentationMode() {
    const workspace = document.querySelector('.fabric-workspace');
    const header = document.querySelector('.playground-header');
    const toolbar = document.querySelector('.fabric-toolbar');
    const palette = document.querySelector('.component-palette');
    const inspector = document.querySelector('.inspector-panel');
    const canvas = document.querySelector('.fabric-canvas');
    const btn = event.currentTarget;
    const icon = btn.querySelector('i');
    
    if (!workspace.classList.contains('presentation-mode')) {
        // Enter presentation mode
        workspace.classList.add('presentation-mode');
        if (header) header.style.display = 'none';
        if (toolbar) toolbar.style.display = 'none';
        if (palette) palette.style.display = 'none';
        if (inspector) inspector.style.display = 'none';
        icon.classList.remove('fa-expand');
        icon.classList.add('fa-compress');
        btn.title = 'Exit Presentation Mode';
        
        // Auto-fit canvas content
        setTimeout(() => {
            fitCanvasToContent(canvas);
        }, 100);
        
        // Make workspace fullscreen
        if (workspace.requestFullscreen) {
            workspace.requestFullscreen();
        } else if (workspace.webkitRequestFullscreen) {
            workspace.webkitRequestFullscreen();
        } else if (workspace.msRequestFullscreen) {
            workspace.msRequestFullscreen();
        }
    } else {
        // Exit presentation mode
        exitPresentationMode();
    }
}

function fitCanvasToContent(canvas) {
    if (!canvas) return;
    
    // Get all canvas items (cards, containers, text labels)
    const items = canvas.querySelectorAll('.canvas-item, .text-label');
    if (items.length === 0) return;
    
    // Calculate bounding box of all items
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    items.forEach(item => {
        const rect = item.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        
        // Convert to canvas-relative coordinates
        const x = rect.left - canvasRect.left + canvas.scrollLeft;
        const y = rect.top - canvasRect.top + canvas.scrollTop;
        const right = x + rect.width;
        const bottom = y + rect.height;
        
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, right);
        maxY = Math.max(maxY, bottom);
    });
    
    // Add padding around content
    const padding = 40;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    // Calculate content dimensions
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // Calculate scale to fit viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const scaleX = viewportWidth / contentWidth;
    const scaleY = viewportHeight / contentHeight;
    const scale = Math.min(scaleX, scaleY, 2); // Max 2x zoom
    
    // Calculate translation to center content
    const translateX = -minX * scale + (viewportWidth - contentWidth * scale) / 2;
    const translateY = -minY * scale + (viewportHeight - contentHeight * scale) / 2;
    
    // Apply transform
    canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    canvas.style.transformOrigin = 'top left';
}

function exitPresentationMode() {
    const workspace = document.querySelector('.fabric-workspace');
    const header = document.querySelector('.playground-header');
    const toolbar = document.querySelector('.fabric-toolbar');
    const palette = document.querySelector('.component-palette');
    const inspector = document.querySelector('.inspector-panel');
    const canvas = document.querySelector('.fabric-canvas');
    const btn = document.querySelector('[onclick="togglePresentationMode()"]');
    
    workspace.classList.remove('presentation-mode');
    if (header) header.style.display = '';
    if (toolbar) toolbar.style.display = '';
    if (palette) palette.style.display = '';
    if (inspector) inspector.style.display = '';
    
    // Reset canvas transform
    if (canvas) {
        canvas.style.transform = '';
        canvas.style.transformOrigin = '';
    }
    
    if (btn) {
        const icon = btn.querySelector('i');
        icon.classList.remove('fa-compress');
        icon.classList.add('fa-expand');
        btn.title = 'Presentation Mode - Fullscreen Canvas';
    }
    
    // Exit fullscreen
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

// Listen for ESC key or fullscreen change to exit presentation mode
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        const workspace = document.querySelector('.fabric-workspace');
        if (workspace && workspace.classList.contains('presentation-mode')) {
            exitPresentationMode();
        }
    }
});

document.addEventListener('webkitfullscreenchange', () => {
    if (!document.webkitFullscreenElement) {
        const workspace = document.querySelector('.fabric-workspace');
        if (workspace && workspace.classList.contains('presentation-mode')) {
            exitPresentationMode();
        }
    }
});

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
    // Count current items
    const itemCount = playground.canvasItems ? playground.canvasItems.length : 0;
    const connectionCount = playground.connections ? playground.connections.length : 0;
    
    if (itemCount === 0 && connectionCount === 0) {
        playground.showNotification('Canvas is already empty', 'info');
        return;
    }
    
    // Confirmation dialog
    const message = `Are you sure you want to clear the canvas?\n\nThis will remove:\n• ${itemCount} item(s)\n• ${connectionCount} connection(s)\n\nThis action cannot be undone.`;
    
    if (!confirm(message)) {
        return;
    }
    
    const canvas = document.getElementById('fabric-canvas');
    const items = canvas.querySelectorAll('.canvas-item, .text-label');
    items.forEach(item => item.remove());
    
    playground.canvasItems = [];
    playground.connections = [];
    
    if (playground.connectionSvg) {
        playground.connectionSvg.innerHTML = '';
    }
    
    playground.showNotification('Canvas cleared', 'success');
}

function exportCanvas() {
    try {
        console.log('[Export] Starting multi-page export...');
        
        // Save current page to page manager
        if (typeof pageManager !== 'undefined' && pageManager.saveCurrentPage) {
            pageManager.saveCurrentPage();
        }
        
        // Get all pages data
        const pagesData = localStorage.getItem('canvas-pages');
        const isMultiPage = pagesData && JSON.parse(pagesData).pages;
        
        let exportData;
        
        if (isMultiPage) {
            // Export all pages
            const multiPageData = JSON.parse(pagesData);
            const pageCount = Object.keys(multiPageData.pages).length;
            
            exportData = {
                format: 'multi-page',
                version: '2.0',
                metadata: {
                    exportDate: new Date().toISOString(),
                    pageCount: pageCount,
                    currentPageId: multiPageData.currentPageId,
                    totalItems: 0,
                    totalConnections: 0
                },
                pages: multiPageData.pages,
                pageCounter: multiPageData.pageCounter
            };
            
            // Calculate totals
            Object.values(multiPageData.pages).forEach(page => {
                if (page.data) {
                    exportData.metadata.totalItems += page.data.items?.length || 0;
                    exportData.metadata.totalConnections += page.data.connections?.length || 0;
                }
            });
            
            console.log('[Export] Multi-page data:', {
                pages: pageCount,
                totalItems: exportData.metadata.totalItems,
                totalConnections: exportData.metadata.totalConnections
            });
        } else {
            // Fallback to single page export
            const data = playground.serialize();
            console.log('[Export] Single page data:', {
                items: data.items?.length || 0,
                connections: data.connections?.length || 0
            });
            
            if (!data.items || data.items.length === 0) {
                playground.showNotification('No items to export', 'warning');
                return;
            }
            
            exportData = {
                format: 'single-page',
                version: '1.0',
                metadata: {
                    exportDate: new Date().toISOString(),
                    itemCount: data.items.length,
                    connectionCount: data.connections.length
                },
                ...data
            };
        }
        
        const jsonStr = JSON.stringify(exportData, null, 2);

        // Prompt user for filename (optional). Provide sensible default.
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const defaultName = isMultiPage ? 
            `bi-architecture-multipage-${timestamp}` : 
            `bi-architecture-${timestamp}`;
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
        
        if (isMultiPage) {
            playground.showNotification(
                `Multi-page architecture exported (${exportData.metadata.pageCount} pages, ${exportData.metadata.totalItems} items)`, 
                'success'
            );
        } else {
            playground.showNotification(`Architecture exported (${exportData.items.length} items)`, 'success');
        }
    } catch (e) {
        console.error('Export failed:', e);
        playground.showNotification('Export failed: ' + e.message, 'error');
    }
}

function importCanvas(inputElement) {
    // If no input element provided, create one and trigger file picker
    if (!inputElement || !inputElement.files) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        
        // Add to DOM (required for some browsers)
        document.body.appendChild(input);
        
        input.addEventListener('change', function handleFileSelect(e) {
            // Remove the input from DOM
            document.body.removeChild(input);
            
            const file = e.target.files[0];
            if (!file) return;
            
            // Process the file with a delay
            setTimeout(function() {
                processImportFile(e.target);
            }, 200);
        });
        
        input.click();
        return;
    }
    
    processImportFile(inputElement);
}

function processImportFile(inputElement) {
    try {
        const file = inputElement.files[0];
        if (!file) {
            playground.showNotification('No file selected', 'warning');
            return;
        }
        
        if (!file.name.endsWith('.json')) {
            playground.showNotification('Please select a JSON file', 'error');
            return;
        }
        
        playground.showNotification('Reading file...', 'info');
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            setTimeout(function() {
                try {
                    const importData = JSON.parse(e.target.result);
                    
                    if (importData.format === 'multi-page' && importData.pages) {
                        handleMultiPageImport(importData);
                    } else if (importData.format === 'single-page' || importData.items) {
                        handleSinglePageImport(importData);
                    } else {
                        throw new Error('Invalid file format: unrecognized structure');
                    }
                    
                } catch (parseError) {
                    console.error('[Import] Parse error:', parseError);
                    playground.showNotification('Failed to parse JSON file: ' + parseError.message, 'error');
                }
            }, 50);
        };
        
        reader.onerror = function(e) {
            console.error('[Import] FileReader error:', e);
            playground.showNotification('Failed to read file', 'error');
        };
        
        reader.readAsText(file);
        inputElement.value = '';
        
    } catch (error) {
        console.error('[Import] Error:', error);
        playground.showNotification('Import failed: ' + error.message, 'error');
    }
}

function handleMultiPageImport(importData) {
    console.log('[Import] Importing multi-page data:', {
        pages: Object.keys(importData.pages).length,
        totalItems: importData.metadata?.totalItems || 0
    });
    
    const pageCount = Object.keys(importData.pages).length;
    const confirmReplace = confirm(
        `This will replace all current pages with ${pageCount} imported page(s). Continue?`
    );
    
    if (!confirmReplace) {
        playground.showNotification('Import cancelled', 'info');
        return;
    }
    
    // Save the multi-page data
    const multiPageData = {
        pages: importData.pages,
        currentPageId: importData.currentPageId || Object.keys(importData.pages)[0],
        pageCounter: importData.pageCounter || Object.keys(importData.pages).length
    };
    
    localStorage.setItem('canvas-pages', JSON.stringify(multiPageData));
    
    // Reinitialize page manager
    if (typeof pageManager !== 'undefined' && pageManager.init) {
        pageManager.init();
    }
    
    playground.showNotification(
        `Multi-page architecture imported (${pageCount} pages)`,
        'success'
    );
}

function handleSinglePageImport(importData) {
    console.log('[Import] Starting single page import...');
    console.log('[Import] Items:', importData.items?.length || 0);
    console.log('[Import] Connections:', importData.connections?.length || 0);
    
    // Validate the imported data structure
    if (!importData.items || !Array.isArray(importData.items)) {
        throw new Error('Invalid file format: missing items array');
    }
    
    // Set loading flag BEFORE clearing canvas
    playground._isLoading = true;
    playground._suppressNotifications = true;
    
    try {
        // Clear current canvas using the method (not the global function)
        console.log('[Import] Clearing canvas...');
        const canvas = document.getElementById('fabric-canvas');
        canvas.querySelectorAll('.canvas-item').forEach(el => el.remove());
        playground.canvasItems = [];
        playground.connections = [];
        if (playground.connectionSvg) playground.connectionSvg.innerHTML = '';
        
        console.log('[Import] Loading data...');
        // Load the imported data
        playground.loadFromData(importData);
        
        const itemCount = importData.items.length;
        const connectionCount = (importData.connections || []).length;
        
        console.log('[Import] Complete!');
        playground.showNotification(
            `Architecture imported (${itemCount} items, ${connectionCount} connections)`,
            'success'
        );
    } catch (error) {
        console.error('[Import] Error during import:', error);
        playground.showNotification('Import failed: ' + error.message, 'error');
    } finally {
        // Always clear the loading flags
        playground._isLoading = false;
        playground._suppressNotifications = false;
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
        
        // Use the same high-quality capture method as PNG/HTML export
        let canvas = null;
        try {
            // Always sanitize CSS to avoid oklab/lab/lch errors (same as PNG export)
            const captureCanvas = async (sanitize = true) => {
                const canvasEl = document.getElementById('fabric-canvas');
                if (!canvasEl) throw new Error('Canvas not found');
                
                let mutated = [];
                if (sanitize) {
                    const disallow = /(oklab|lab\(|lch|conic-gradient|repeating-conic-gradient|color-mix)/i;
                    const all = canvasEl.querySelectorAll('*');
                    all.forEach(el => {
                        const style = window.getComputedStyle(el);
                        const bgImg = style.backgroundImage;
                        const bgCol = style.backgroundColor;
                        const color = style.color;
                        const borderColor = style.borderColor;
                        const outlineColor = style.outlineColor;
                        const boxShadow = style.boxShadow;
                        const textShadow = style.textShadow;
                        
                        if (bgImg && disallow.test(bgImg)) {
                            mutated.push({el, prop:'backgroundImage', value: el.style.backgroundImage});
                            el.style.backgroundImage = 'none';
                            mutated.push({el, prop:'backgroundColor', value: el.style.backgroundColor});
                            el.style.backgroundColor = '#1e1f25';
                        } else if (bgCol && disallow.test(bgCol)) {
                            mutated.push({el, prop:'backgroundColor', value: el.style.backgroundColor});
                            el.style.backgroundColor = '#1e1f25';
                        }
                        
                        if (color && disallow.test(color)) {
                            mutated.push({el, prop:'color', value: el.style.color});
                            el.style.color = '#ffffff';
                        }
                        
                        if (borderColor && disallow.test(borderColor)) {
                            mutated.push({el, prop:'borderColor', value: el.style.borderColor});
                            el.style.borderColor = '#3b82f6';
                        }
                        
                        if (outlineColor && disallow.test(outlineColor)) {
                            mutated.push({el, prop:'outlineColor', value: el.style.outlineColor});
                            el.style.outlineColor = '#3b82f6';
                        }
                        
                        if (boxShadow && disallow.test(boxShadow)) {
                            mutated.push({el, prop:'boxShadow', value: el.style.boxShadow});
                            el.style.boxShadow = 'none';
                        }
                        
                        if (textShadow && disallow.test(textShadow)) {
                            mutated.push({el, prop:'textShadow', value: el.style.textShadow});
                            el.style.textShadow = 'none';
                        }
                    });
                }
                
                try {
                    return await html2canvas(canvasEl, {
                        backgroundColor: '#1e1f25',
                        scale: 3, // High quality 3x scale
                        logging: false,
                        useCORS: true,
                        foreignObjectRendering: false
                    });
                } finally {
                    mutated.forEach(m => { m.el.style[m.prop] = m.value; });
                }
            };
            
            // Always use sanitization for PDF export
            canvas = await captureCanvas(true);
            
        } catch(e1) {
            console.warn('[PDF] High-quality capture failed', e1);
            try { 
                canvas = await capture(true); 
            } catch(e2) {
                console.warn('[PDF] Fallback capture failed', e2);
                try { 
                    canvas = await capturePlainSafe(); 
                } catch(e3) {
                    console.warn('[PDF] Plain safe capture failed', e3);
                    try { 
                        const svgData = buildSVGImage(); 
                        canvas = await svgToCanvas(svgData); 
                    } catch(e4) {
                        console.warn('[PDF] SVG reconstruction failed, emitting text-only PDF', e4);
                        const doc = new jsPDF({orientation:'landscape', unit:'pt', format:'a4'});
                        doc.setFontSize(14); 
                        doc.text('InfiniBI Studio Snapshot (Text Fallback)', 40,40);
                        const data = playground.serialize();
                        doc.setFontSize(10); 
                        let y=60;
                        data.items.forEach(it=>{ 
                            if(y>520){doc.addPage(); y=40;} 
                            doc.text(`- ${it.id}: ${it.data?.name||it.type||'Item'}`,40,y); 
                            y+=14; 
                        });
                        doc.save('bi-architecture-fallback.pdf');
                        playground.showNotification('PDF (text-only fallback) exported','info');
                        return;
                    }
                }
            }
        }
        
        if(!canvas) throw new Error('Canvas capture failed at all stages');
        
        // Auto-crop using DOM-based bounds (same as PNG/HTML export)
        const cropToContent = (baseCanvas, opts = {}) => {
            try {
                const scale = opts.scale ?? 3; // Same 3x scale as PNG/HTML exports
                const pad = opts.pad ?? 20; // Padding in DOM pixels
                
                const items = Array.from(document.querySelectorAll('#fabric-canvas .canvas-item'))
                    .filter(el => el.offsetWidth && el.offsetHeight && 
                                  window.getComputedStyle(el).visibility !== 'hidden' && 
                                  window.getComputedStyle(el).opacity !== '0');
                
                if(!items.length) return baseCanvas;
                
                // Calculate bounds in DOM coordinates
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                
                items.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    const container = document.getElementById('fabric-canvas');
                    const containerRect = container.getBoundingClientRect();
                    
                    const x = rect.left - containerRect.left;
                    const y = rect.top - containerRect.top;
                    const w = rect.width;
                    const h = rect.height;
                    
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x + w);
                    maxY = Math.max(maxY, y + h);
                });
                
                if(!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
                    return baseCanvas;
                }
                
                // Add padding and convert to canvas coordinates (scaled)
                const cropX = (minX - pad) * scale;
                const cropY = (minY - pad) * scale;
                const cropW = (maxX - minX + pad * 2) * scale;
                const cropH = (maxY - minY + pad * 2) * scale;
                
                // Create cropped canvas
                const crop = document.createElement('canvas');
                crop.width = Math.max(50, Math.round(cropW));
                crop.height = Math.max(50, Math.round(cropH));
                
                const ctx = crop.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.fillStyle = '#1e1f25';
                ctx.fillRect(0, 0, crop.width, crop.height);
                
                // Draw cropped region from source canvas
                ctx.drawImage(
                    baseCanvas,
                    cropX, cropY, cropW, cropH, // Source rectangle
                    0, 0, crop.width, crop.height // Destination rectangle
                );
                
                return crop;
            } catch(e) { 
                console.warn('Crop to content failed, using full canvas', e); 
                return baseCanvas; 
            }
        };
        
        // Apply high-quality auto-crop to the captured canvas
        canvas = cropToContent(canvas, { scale: 3, pad: 20 });

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
        // Save current page first
        pageManager.saveCurrentPage();
        
        // Save all pages to localStorage
        pageManager.savePages();
        
        // Count total items across all pages
        let totalItems = 0;
        let totalConnections = 0;
        Object.values(pageManager.pages).forEach(page => {
            if (page.data && page.data.items) {
                totalItems += page.data.items.length;
                totalConnections += (page.data.connections || []).length;
            }
        });
        
        const pageCount = Object.keys(pageManager.pages).length;
        playground.showNotification(`All ${pageCount} pages saved (${totalItems} items, ${totalConnections} connections)`, 'success');
        
    } catch (e) {
        console.error('Save failed:', e);
        playground.showNotification('Save failed: ' + e.message, 'error');
    }
}

function loadCanvas() {
    try {
        // Reload pages from localStorage
        pageManager.init();
        
        // Load the current page
        if (pageManager.currentPageId && pageManager.pages[pageManager.currentPageId]) {
            pageManager.loadPage(pageManager.currentPageId);
            
            const pageCount = Object.keys(pageManager.pages).length;
            playground.showNotification(`Loaded ${pageCount} pages`, 'success');
        } else {
            playground.showNotification('No saved pages found', 'warning');
        }
        
    } catch (e) {
        console.error('Load failed:', e);
        playground.showNotification('Load failed: ' + e.message, 'error');
    }
}



// ================= Template Management =================
function saveAsTemplate() {
    try {
        const data = playground.serialize();
        
        if (!data || !data.items || data.items.length === 0) {
            playground.showNotification('Canvas is empty - nothing to save as template', 'warning');
            return;
        }
        
        // Prompt for template name
        const templateName = prompt('Enter a name for this template:', 'My Architecture Template');
        if (!templateName) return;
        
        // Create template object with metadata
        const template = {
            name: templateName,
            description: `Template created on ${new Date().toLocaleDateString()}`,
            created: new Date().toISOString(),
            itemCount: data.items.length,
            connectionCount: data.connections.length,
            data: data
        };
        
        // Get existing templates
        let templates = [];
        try {
            const stored = localStorage.getItem('canvas-templates');
            if (stored) {
                templates = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error loading existing templates:', e);
        }
        
        // Add new template
        templates.push(template);
        
        // Save back to localStorage
        localStorage.setItem('canvas-templates', JSON.stringify(templates));
        
        playground.showNotification(`Template "${templateName}" saved (${data.items.length} items)`, 'success');
        
    } catch (e) {
        console.error('Save template failed:', e);
        playground.showNotification('Save template failed: ' + e.message, 'error');
    }
}

function loadTemplate() {
    try {
        // Get saved templates
        const stored = localStorage.getItem('canvas-templates');
        if (!stored) {
            playground.showNotification('No templates found. Save your current canvas as a template first!', 'info');
            return;
        }
        
        const templates = JSON.parse(stored);
        if (!templates || templates.length === 0) {
            playground.showNotification('No templates available', 'warning');
            return;
        }
        
        // Create template selection dialog
        let message = 'Select a template to load:\n\n';
        templates.forEach((template, index) => {
            message += `${index + 1}. ${template.name}\n`;
            message += `   Created: ${new Date(template.created).toLocaleDateString()}\n`;
            message += `   Items: ${template.itemCount}, Connections: ${template.connectionCount}\n\n`;
        });
        message += `\nEnter template number (1-${templates.length}), or 0 to cancel:`;
        
        const selection = prompt(message, '1');
        if (!selection || selection === '0') return;
        
        const index = parseInt(selection) - 1;
        if (index < 0 || index >= templates.length) {
            playground.showNotification('Invalid template number', 'error');
            return;
        }
        
        const template = templates[index];
        
        // Ask for confirmation if canvas is not empty
        const currentData = playground.serialize();
        if (currentData && currentData.items && currentData.items.length > 0) {
            if (!confirm(`This will replace your current canvas (${currentData.items.length} items). Continue?`)) {
                return;
            }
        }
        
        // Load the template
        playground.loadFromData(template.data);
        playground.showNotification(`Template "${template.name}" loaded`, 'success');
        
    } catch (e) {
        console.error('Load template failed:', e);
        playground.showNotification('Load template failed: ' + e.message, 'error');
    }
}

// ================= Page Management =================
const pageManager = {
    pages: {},
    currentPageId: 'page-1',
    pageCounter: 1,
    pageOrder: ['page-1'], // Track the order of pages
    draggedPageId: null,
    
    init() {
        // Load pages from localStorage or create default page
        const saved = localStorage.getItem('canvas-pages');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.pages = data.pages;
                this.currentPageId = data.currentPageId;
                this.pageCounter = data.pageCounter;
                this.pageOrder = data.pageOrder || Object.keys(data.pages);
            } catch (e) {
                console.error('Failed to load pages:', e);
                this.createDefaultPage();
            }
        } else {
            this.createDefaultPage();
        }
        
        this.renderTabs();
        this.loadPage(this.currentPageId);
    },
    
    createDefaultPage() {
        this.pages['page-1'] = {
            id: 'page-1',
            name: 'Page 1',
            data: { items: [], connections: [] },
            canvasSettings: typeof CanvasSettings !== 'undefined' ? CanvasSettings.getDefaults() : null,
            zoomLevel: 1.0,
            canvasOffset: null, // null means center on load
            connectionStyle: 'orthogonal'
        };
    },
    
    addPage() {
        this.pageCounter++;
        const newPageId = `page-${this.pageCounter}`;
        this.pages[newPageId] = {
            id: newPageId,
            name: `Page ${this.pageCounter}`,
            data: { items: [], connections: [] },
            canvasSettings: typeof CanvasSettings !== 'undefined' ? CanvasSettings.getAppliedSettings() : null,
            zoomLevel: 1.0,
            canvasOffset: null, // null means center on load
            connectionStyle: playground.connectionStyle || 'orthogonal'
        };
        this.pageOrder.push(newPageId); // Add to order
        this.saveCurrentPage();
        this.currentPageId = newPageId;
        this.savePages();
        this.renderTabs();
        this.loadPage(newPageId);
        playground.showNotification(`New page created: Page ${this.pageCounter}`, 'success');
    },
    
    duplicatePage(pageId) {
        const sourcePage = this.pages[pageId];
        if (!sourcePage) return;
        
        this.pageCounter++;
        const newPageId = `page-${this.pageCounter}`;
        
        // Deep copy the source page data
        const duplicatedData = JSON.parse(JSON.stringify(sourcePage.data || { items: [], connections: [] }));
        
        // Deep copy canvas settings if they exist
        const duplicatedSettings = sourcePage.canvasSettings ? 
            JSON.parse(JSON.stringify(sourcePage.canvasSettings)) : null;
        
        this.pages[newPageId] = {
            id: newPageId,
            name: `${sourcePage.name} (Copy)`,
            data: duplicatedData,
            canvasSettings: duplicatedSettings,
            zoomLevel: sourcePage.zoomLevel !== undefined ? sourcePage.zoomLevel : 1.0,
            canvasOffset: sourcePage.canvasOffset ? { ...sourcePage.canvasOffset } : { x: 0, y: 0 },
            connectionStyle: sourcePage.connectionStyle || 'orthogonal'
        };
        
        // Add after the source page
        const sourceIndex = this.pageOrder.indexOf(pageId);
        this.pageOrder.splice(sourceIndex + 1, 0, newPageId);
        
        this.saveCurrentPage();
        this.currentPageId = newPageId;
        this.savePages();
        this.renderTabs();
        this.loadPage(newPageId);
        playground.showNotification(`Page duplicated: ${this.pages[newPageId].name}`, 'success');
    },
    
    deletePage(pageId) {
        const pageKeys = Object.keys(this.pages);
        if (pageKeys.length <= 1) {
            playground.showNotification('Cannot delete the last page', 'warning');
            return;
        }
        
        const pageName = this.pages[pageId]?.name || pageId;
        if (!confirm(`Delete "${pageName}"?\n\nThis action cannot be undone.`)) {
            return;
        }
        
        delete this.pages[pageId];
        
        // Remove from order
        this.pageOrder = this.pageOrder.filter(id => id !== pageId);
        
        // Switch to another page if we deleted the current one
        if (pageId === this.currentPageId) {
            this.currentPageId = pageKeys.find(id => id !== pageId);
            this.loadPage(this.currentPageId);
        }
        
        this.savePages();
        this.renderTabs();
        playground.showNotification(`Page "${pageName}" deleted`, 'info');
    },
    
    switchPage(pageId) {
        if (pageId === this.currentPageId) return;
        
        // Save current page data before switching
        this.saveCurrentPage();
        
        this.currentPageId = pageId;
        this.loadPage(pageId);
        this.savePages();
        this.renderTabs();
    },
    
    renamePage(pageId) {
        const page = this.pages[pageId];
        if (!page) return;
        
        const newName = prompt('Enter new page name:', page.name);
        if (!newName || newName === page.name) return;
        
        page.name = newName;
        this.savePages();
        this.renderTabs();
        playground.showNotification(`Page renamed to "${newName}"`, 'success');
    },
    
    saveCurrentPage() {
        if (!this.currentPageId || !this.pages[this.currentPageId]) return;
        
        const currentData = playground.serialize();
        this.pages[this.currentPageId].data = currentData;
        
        // Save canvas settings with the page
        if (typeof CanvasSettings !== 'undefined' && CanvasSettings.getAppliedSettings) {
            this.pages[this.currentPageId].canvasSettings = CanvasSettings.getAppliedSettings();
        }
        
        // Save zoom and pan state with the page
        this.pages[this.currentPageId].zoomLevel = playground.zoomLevel;
        this.pages[this.currentPageId].canvasOffset = { ...playground.canvasOffset };
        
        // Save connection style with the page
        this.pages[this.currentPageId].connectionStyle = playground.connectionStyle || 'orthogonal';
    },
    
    saveCurrentPageSettings() {
        if (!this.currentPageId || !this.pages[this.currentPageId]) return;
        
        // Save only canvas settings
        if (typeof CanvasSettings !== 'undefined' && CanvasSettings.getAppliedSettings) {
            this.pages[this.currentPageId].canvasSettings = CanvasSettings.getAppliedSettings();
            this.savePages();
        }
    },
    
    loadPage(pageId) {
        const page = this.pages[pageId];
        if (!page) return;
        
        // Check if playground is initialized
        if (typeof playground === 'undefined' || !playground) {
            console.warn('loadPage: playground not initialized yet, deferring load');
            // Defer loading until playground is ready
            setTimeout(() => this.loadPage(pageId), 100);
            return;
        }
        
        // Clear current canvas
        const canvas = document.getElementById('fabric-canvas');
        const items = canvas.querySelectorAll('.canvas-item, .text-label');
        items.forEach(item => item.remove());
        
        playground.canvasItems = [];
        playground.connections = [];
        
        if (playground.connectionSvg) {
            playground.connectionSvg.innerHTML = '';
        }
        
        // Restore zoom and pan state for this page
        if (page.zoomLevel !== undefined) {
            playground.zoomLevel = page.zoomLevel;
        } else {
            playground.zoomLevel = 1.0; // Default zoom
        }
        
        if (page.canvasOffset) {
            playground.canvasOffset = { ...page.canvasOffset };
        } else {
            // For new pages, center the view instead of starting at top-left corner
            playground.centerCanvasView(1000, 800);
        }
        
        // Apply the transform
        playground.applyCanvasTransform();
        playground.updateZoomIndicator();
        
        // Restore connection style for this page
        if (page.connectionStyle !== undefined) {
            playground.connectionStyle = page.connectionStyle;
        } else {
            playground.connectionStyle = 'orthogonal'; // Default style
        }
        
        // Update the UI dropdown for connection style
        const connectionStyleDropdown = document.getElementById('set-connection-style');
        if (connectionStyleDropdown) {
            connectionStyleDropdown.value = playground.connectionStyle;
        }
        
        // Load canvas settings if available
        if (page.canvasSettings && typeof CanvasSettings !== 'undefined') {
            CanvasSettings.apply(page.canvasSettings);
            CanvasSettings.syncUI(page.canvasSettings);
        }
        
        // Load page data
        if (page.data && (page.data.items?.length > 0 || page.data.connections?.length > 0)) {
            playground.loadFromData(page.data);
        }
    },
    
    savePages() {
        const data = {
            pages: this.pages,
            currentPageId: this.currentPageId,
            pageCounter: this.pageCounter,
            pageOrder: this.pageOrder
        };
        localStorage.setItem('canvas-pages', JSON.stringify(data));
    },
    
    renderTabs() {
        const tabsContainer = document.getElementById('page-tabs');
        if (!tabsContainer) return;
        
        tabsContainer.innerHTML = '';
        
        // Render in order
        this.pageOrder.forEach(pageId => {
            const page = this.pages[pageId];
            if (!page) return;
            
            const tab = document.createElement('div');
            tab.className = 'page-tab';
            if (page.id === this.currentPageId) {
                tab.classList.add('active');
            }
            tab.dataset.pageId = page.id;
            tab.draggable = true;
            
            tab.innerHTML = `
                <span class="page-tab-name" title="Double-click to rename, drag to reorder">${page.name}</span>
            `;
            
            // Track mouse down position to differentiate click from drag
            let mouseDownX = 0;
            let mouseDownY = 0;
            let isDragging = false;
            
            tab.addEventListener('mousedown', (e) => {
                mouseDownX = e.clientX;
                mouseDownY = e.clientY;
                isDragging = false;
            });
            
            // Click to switch pages (only if not dragging)
            tab.addEventListener('click', (e) => {
                if (!isDragging) {
                    this.switchPage(page.id);
                }
            });
            
            // Drag events
            tab.addEventListener('dragstart', (e) => {
                isDragging = true;
                this.draggedPageId = page.id;
                tab.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            tab.addEventListener('dragend', (e) => {
                tab.classList.remove('dragging');
                this.draggedPageId = null;
                // Reset isDragging after a short delay to prevent click from firing
                setTimeout(() => { isDragging = false; }, 100);
            });
            
            tab.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                if (this.draggedPageId && this.draggedPageId !== page.id) {
                    const rect = tab.getBoundingClientRect();
                    const midpoint = rect.left + rect.width / 2;
                    
                    if (e.clientX < midpoint) {
                        tab.classList.add('drag-before');
                        tab.classList.remove('drag-after');
                    } else {
                        tab.classList.add('drag-after');
                        tab.classList.remove('drag-before');
                    }
                }
            });
            
            tab.addEventListener('dragleave', (e) => {
                tab.classList.remove('drag-before', 'drag-after');
            });
            
            tab.addEventListener('drop', (e) => {
                e.preventDefault();
                tab.classList.remove('drag-before', 'drag-after');
                
                if (this.draggedPageId && this.draggedPageId !== page.id) {
                    this.reorderPages(this.draggedPageId, page.id, e.clientX < (tab.getBoundingClientRect().left + tab.getBoundingClientRect().width / 2));
                }
            });
            
            // Double-click to rename
            tab.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this.renamePage(page.id);
            });
            
            // Right-click for context menu
            tab.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showPageContextMenu(page.id, e);
            });
            
            tabsContainer.appendChild(tab);
        });
    },
    
    reorderPages(draggedId, targetId, insertBefore) {
        const draggedIndex = this.pageOrder.indexOf(draggedId);
        const targetIndex = this.pageOrder.indexOf(targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        // Remove dragged page from its current position
        this.pageOrder.splice(draggedIndex, 1);
        
        // Find new target index (it might have shifted)
        const newTargetIndex = this.pageOrder.indexOf(targetId);
        
        // Insert at the new position
        if (insertBefore) {
            this.pageOrder.splice(newTargetIndex, 0, draggedId);
        } else {
            this.pageOrder.splice(newTargetIndex + 1, 0, draggedId);
        }
        
        this.savePages();
        this.renderTabs();
    },
    
    showPageContextMenu(pageId, event) {
        // Remove any existing menu
        const existingMenu = document.querySelector('.page-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        const menu = document.createElement('div');
        menu.className = 'page-context-menu';
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';
        
        const pageCount = Object.keys(this.pages).length;
        
        menu.innerHTML = `
            <div class="context-menu-item" onclick="pageManager.renamePage('${pageId}')">
                <i class="fas fa-edit"></i> Rename Page
            </div>
            <div class="context-menu-item" onclick="pageManager.duplicatePage('${pageId}')">
                <i class="fas fa-copy"></i> Duplicate Page
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item ${pageCount <= 1 ? 'disabled' : ''}" 
                 onclick="${pageCount > 1 ? `pageManager.deletePage('${pageId}')` : ''}">
                <i class="fas fa-trash"></i> Delete Page
            </div>
        `;
        
        document.body.appendChild(menu);
        
        // Close menu on click outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 10);
    }
};

// Global functions for page management
function addNewPage() {
    pageManager.addPage();
}

function deletePage(pageId) {
    pageManager.deletePage(pageId);
}

// Initialize page manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    pageManager.init();
});

// ============================================
// WELCOME MODAL
// ============================================

function showWelcomeModal() {
    const modal = document.getElementById('welcome-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeWelcomeModal() {
    const modal = document.getElementById('welcome-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function toggleWelcomePreference() {
    const checkbox = document.getElementById('welcome-dont-show');
    if (checkbox) {
        localStorage.setItem('infinibi-hide-welcome', checkbox.checked ? 'true' : 'false');
    }
}

function loadDemoProject() {
    closeWelcomeModal();
    
    // Check if playground is initialized
    if (!playground) {
        console.error('[loadDemoProject] playground is not initialized!');
        alert('Error: Application not fully initialized. Please refresh the page.');
        return;
    }
    
    // Get current canvas view center to position demo content there
    const canvas = document.getElementById('fabric-canvas');
    const canvasRect = canvas.getBoundingClientRect();
    const zoom = playground.canvasZoom || 1;
    const offset = playground.canvasOffset || { x: 0, y: 0 };
    
    // Calculate the center of the visible canvas area in canvas coordinates
    const viewCenterX = (canvasRect.width / 2 - offset.x) / zoom;
    const viewCenterY = (canvasRect.height / 2 - offset.y) / zoom;
    
    // Demo content dimensions
    const demoWidth = 2800;
    const demoHeight = 1400;
    
    // Calculate offset to center the demo content in current view
    const baseX = Math.round(viewCenterX - demoWidth / 2);
    const baseY = Math.round(viewCenterY - demoHeight / 2);
    
    // Realistic Medallion Architecture Demo
    const demoData = {
        format: 'single-page',
        exportedAt: new Date().toISOString(),
        items: [
            // ========== DATA SOURCES (Column 1) ==========
            { id: 'src-erp', type: 'data-source', position: { x: baseX + 0, y: baseY + 200 }, data: { name: 'ERP System', sourceType: 'SQL Server', icon: 'fas fa-database' } },
            { id: 'src-crm', type: 'data-source', position: { x: baseX + 0, y: baseY + 450 }, data: { name: 'CRM System', sourceType: 'Dynamics 365', icon: 'fas fa-users' } },
            { id: 'src-excel', type: 'data-source', position: { x: baseX + 0, y: baseY + 700 }, data: { name: 'Excel Files', sourceType: 'SharePoint', icon: 'fas fa-file-excel' } },
            { id: 'src-api', type: 'data-source', position: { x: baseX + 0, y: baseY + 950 }, data: { name: 'External API', sourceType: 'REST API', icon: 'fas fa-plug' } },
            
            // ========== BRONZE LAYER - Raw Tables (Column 2) ==========
            // From ERP
            { id: 'brz-sales-orders', type: 'bronze', position: { x: baseX + 350, y: baseY + 100 }, data: { name: 'Raw_SalesOrders' } },
            { id: 'brz-order-lines', type: 'bronze', position: { x: baseX + 350, y: baseY + 200 }, data: { name: 'Raw_OrderLines' } },
            { id: 'brz-products', type: 'bronze', position: { x: baseX + 350, y: baseY + 300 }, data: { name: 'Raw_Products' } },
            // From CRM
            { id: 'brz-customers', type: 'bronze', position: { x: baseX + 350, y: baseY + 450 }, data: { name: 'Raw_Customers' } },
            { id: 'brz-contacts', type: 'bronze', position: { x: baseX + 350, y: baseY + 550 }, data: { name: 'Raw_Contacts' } },
            // From Excel
            { id: 'brz-factories', type: 'bronze', position: { x: baseX + 350, y: baseY + 700 }, data: { name: 'Raw_Factories' } },
            { id: 'brz-regions', type: 'bronze', position: { x: baseX + 350, y: baseY + 800 }, data: { name: 'Raw_Regions' } },
            // From API
            { id: 'brz-exchange', type: 'bronze', position: { x: baseX + 350, y: baseY + 950 }, data: { name: 'Raw_ExchangeRates' } },
            { id: 'brz-weather', type: 'bronze', position: { x: baseX + 350, y: baseY + 1050 }, data: { name: 'Raw_WeatherData' } },
            
            // ========== SILVER LAYER - Cleaned & Merged (Column 3) ==========
            { id: 'slv-customer', type: 'silver', position: { x: baseX + 750, y: baseY + 150 }, data: { name: 'Dim_Customer' } },
            { id: 'slv-product', type: 'silver', position: { x: baseX + 750, y: baseY + 300 }, data: { name: 'Dim_Product' } },
            { id: 'slv-factory', type: 'silver', position: { x: baseX + 750, y: baseY + 450 }, data: { name: 'Dim_Factory' } },
            { id: 'slv-geography', type: 'silver', position: { x: baseX + 750, y: baseY + 600 }, data: { name: 'Dim_Geography' } },
            { id: 'slv-date', type: 'silver', position: { x: baseX + 750, y: baseY + 750 }, data: { name: 'Dim_Date' } },
            { id: 'slv-sales', type: 'silver', position: { x: baseX + 750, y: baseY + 900 }, data: { name: 'Fact_Sales' } },
            { id: 'slv-currency', type: 'silver', position: { x: baseX + 750, y: baseY + 1050 }, data: { name: 'Dim_Currency' } },
            
            // ========== GOLD LAYER - Star Schema Model (Column 4) ==========
            { id: 'gld-dim-customer', type: 'gold', position: { x: baseX + 1150, y: baseY + 200 }, data: { name: 'Customer' } },
            { id: 'gld-dim-product', type: 'gold', position: { x: baseX + 1150, y: baseY + 350 }, data: { name: 'Product' } },
            { id: 'gld-dim-factory', type: 'gold', position: { x: baseX + 1150, y: baseY + 500 }, data: { name: 'Factory' } },
            { id: 'gld-dim-date', type: 'gold', position: { x: baseX + 1150, y: baseY + 650 }, data: { name: 'Date' } },
            { id: 'gld-fact-sales', type: 'gold', position: { x: baseX + 1150, y: baseY + 850 }, data: { name: 'Sales' } },
            { id: 'gld-dim-geo', type: 'gold', position: { x: baseX + 1150, y: baseY + 1000 }, data: { name: 'Geography' } },
            
            // ========== SEMANTIC MODEL (Column 5) ==========
            { id: 'semantic-model', type: 'semantic-model', position: { x: baseX + 1550, y: baseY + 550 }, data: { name: 'Sales Analytics Model' } },
            
            // ========== REPORTS (Column 6) ==========
            { id: 'rpt-exec', type: 'report', position: { x: baseX + 1950, y: baseY + 300 }, data: { name: 'Executive Dashboard' } },
            { id: 'rpt-sales', type: 'report', position: { x: baseX + 1950, y: baseY + 500 }, data: { name: 'Sales Performance' } },
            { id: 'rpt-factory', type: 'report', position: { x: baseX + 1950, y: baseY + 700 }, data: { name: 'Factory Analysis' } },
            { id: 'rpt-customer', type: 'report', position: { x: baseX + 1950, y: baseY + 900 }, data: { name: 'Customer 360' } },
            
            // ========== LAYER LABELS ==========
            { id: 'lbl-sources', type: 'text-label', position: { x: baseX - 30, y: baseY + 50 }, data: { text: '📥 Data Sources', name: '📥 Data Sources', fontSize: 22, fontWeight: 'bold', color: '#64748b' } },
            { id: 'lbl-bronze', type: 'text-label', position: { x: baseX + 320, y: baseY + 0 }, data: { text: '🥉 Bronze Layer', name: '🥉 Bronze Layer', fontSize: 22, fontWeight: 'bold', color: '#CD7F32' } },
            { id: 'lbl-bronze-sub', type: 'text-label', position: { x: baseX + 320, y: baseY + 30 }, data: { text: 'Raw Data (1:1 copy)', name: 'Raw Data (1:1 copy)', fontSize: 14, fontWeight: 'normal', color: '#94a3b8' } },
            { id: 'lbl-silver', type: 'text-label', position: { x: baseX + 720, y: baseY + 0 }, data: { text: '🥈 Silver Layer', name: '🥈 Silver Layer', fontSize: 22, fontWeight: 'bold', color: '#A0A0A0' } },
            { id: 'lbl-silver-sub', type: 'text-label', position: { x: baseX + 720, y: baseY + 30 }, data: { text: 'Cleaned & Merged', name: 'Cleaned & Merged', fontSize: 14, fontWeight: 'normal', color: '#94a3b8' } },
            { id: 'lbl-gold', type: 'text-label', position: { x: baseX + 1130, y: baseY + 50 }, data: { text: '🥇 Gold Layer', name: '🥇 Gold Layer', fontSize: 22, fontWeight: 'bold', color: '#DAA520' } },
            { id: 'lbl-gold-sub', type: 'text-label', position: { x: baseX + 1130, y: baseY + 80 }, data: { text: 'Star Schema', name: 'Star Schema', fontSize: 14, fontWeight: 'normal', color: '#94a3b8' } },
            { id: 'lbl-semantic', type: 'text-label', position: { x: baseX + 1500, y: baseY + 450 }, data: { text: '🧱 Semantic Model', name: '🧱 Semantic Model', fontSize: 20, fontWeight: 'bold', color: '#F2C811' } },
            { id: 'lbl-reports', type: 'text-label', position: { x: baseX + 1920, y: baseY + 180 }, data: { text: '📊 Reports', name: '📊 Reports', fontSize: 22, fontWeight: 'bold', color: '#64748b' } }
        ],
        connections: [
            // === Sources to Bronze ===
            // ERP -> Bronze
            { fromId: 'src-erp', toId: 'brz-sales-orders', color: '#CD7F32' },
            { fromId: 'src-erp', toId: 'brz-order-lines', color: '#CD7F32' },
            { fromId: 'src-erp', toId: 'brz-products', color: '#CD7F32' },
            // CRM -> Bronze
            { fromId: 'src-crm', toId: 'brz-customers', color: '#CD7F32' },
            { fromId: 'src-crm', toId: 'brz-contacts', color: '#CD7F32' },
            // Excel -> Bronze
            { fromId: 'src-excel', toId: 'brz-factories', color: '#CD7F32' },
            { fromId: 'src-excel', toId: 'brz-regions', color: '#CD7F32' },
            // API -> Bronze
            { fromId: 'src-api', toId: 'brz-exchange', color: '#CD7F32' },
            { fromId: 'src-api', toId: 'brz-weather', color: '#CD7F32' },
            
            // === Bronze to Silver (many-to-one merges) ===
            // Customer dimension from CRM
            { fromId: 'brz-customers', toId: 'slv-customer', color: '#A0A0A0' },
            { fromId: 'brz-contacts', toId: 'slv-customer', color: '#A0A0A0' },
            // Product dimension from ERP
            { fromId: 'brz-products', toId: 'slv-product', color: '#A0A0A0' },
            // Factory dimension from Excel
            { fromId: 'brz-factories', toId: 'slv-factory', color: '#A0A0A0' },
            // Geography dimension from regions
            { fromId: 'brz-regions', toId: 'slv-geography', color: '#A0A0A0' },
            // Sales fact from orders
            { fromId: 'brz-sales-orders', toId: 'slv-sales', color: '#A0A0A0' },
            { fromId: 'brz-order-lines', toId: 'slv-sales', color: '#A0A0A0' },
            // Currency from exchange rates
            { fromId: 'brz-exchange', toId: 'slv-currency', color: '#A0A0A0' },
            
            // === Silver to Gold (final model tables) ===
            { fromId: 'slv-customer', toId: 'gld-dim-customer', color: '#DAA520' },
            { fromId: 'slv-product', toId: 'gld-dim-product', color: '#DAA520' },
            { fromId: 'slv-factory', toId: 'gld-dim-factory', color: '#DAA520' },
            { fromId: 'slv-date', toId: 'gld-dim-date', color: '#DAA520' },
            { fromId: 'slv-geography', toId: 'gld-dim-geo', color: '#DAA520' },
            { fromId: 'slv-sales', toId: 'gld-fact-sales', color: '#DAA520' },
            { fromId: 'slv-currency', toId: 'gld-fact-sales', color: '#DAA520' },
            
            // === Gold to Semantic Model ===
            { fromId: 'gld-dim-customer', toId: 'semantic-model', color: '#F2C811' },
            { fromId: 'gld-dim-product', toId: 'semantic-model', color: '#F2C811' },
            { fromId: 'gld-dim-factory', toId: 'semantic-model', color: '#F2C811' },
            { fromId: 'gld-dim-date', toId: 'semantic-model', color: '#F2C811' },
            { fromId: 'gld-fact-sales', toId: 'semantic-model', color: '#F2C811' },
            { fromId: 'gld-dim-geo', toId: 'semantic-model', color: '#F2C811' },
            
            // === Semantic Model to Reports ===
            { fromId: 'semantic-model', toId: 'rpt-exec', color: '#00D4FF' },
            { fromId: 'semantic-model', toId: 'rpt-sales', color: '#00D4FF' },
            { fromId: 'semantic-model', toId: 'rpt-factory', color: '#00D4FF' },
            { fromId: 'semantic-model', toId: 'rpt-customer', color: '#00D4FF' }
        ]
    };
    
    // Load the demo project
    setTimeout(() => {
        // Clear undo stack when loading demo - fresh start
        playground.undoStack = [];
        playground.redoStack = [];
        
        playground.loadFromData(demoData);
        
        // Fit view to show all demo items with padding
        setTimeout(() => {
            playground.fitToView(80);
            playground.showNotification('Medallion Architecture demo loaded!', 'success');
        }, 200);
    }, 100);
}

// Check if we should show welcome modal on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if user has dismissed welcome before
    const hideWelcome = localStorage.getItem('infinibi-hide-welcome') === 'true';
    
    // Show welcome only if not dismissed (regardless of saved work - let users see demo option)
    if (!hideWelcome) {
        // Small delay to let the app initialize first
        setTimeout(() => {
            showWelcomeModal();
        }, 500);
    }
});

// Close welcome modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const welcomeModal = document.getElementById('welcome-modal');
        if (welcomeModal && welcomeModal.classList.contains('active')) {
            closeWelcomeModal();
        }
    }
});

// Close welcome modal when clicking outside
document.addEventListener('click', (e) => {
    const welcomeModal = document.getElementById('welcome-modal');
    if (welcomeModal && welcomeModal.classList.contains('active')) {
        if (e.target === welcomeModal) {
            closeWelcomeModal();
        }
    }
});

// ============================================
// END WELCOME MODAL
// ============================================

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
function togglePaletteCategory(categoryId, event) {
    console.log('[togglePaletteCategory] Called with:', categoryId);
    
    if (!categoryId) {
        console.warn('[togglePaletteCategory] No categoryId provided');
        return;
    }

    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const categoryItems = document.getElementById(categoryId);
    console.log('[togglePaletteCategory] Found element:', categoryItems);
    
    if (!categoryItems) {
        console.error('[togglePaletteCategory] Element not found for ID:', categoryId);
        return;
    }

    const categoryHeader = categoryItems.previousElementSibling;
    const isExpanded = categoryItems.classList.contains('expanded');
    
    console.log('[togglePaletteCategory] Current state - isExpanded:', isExpanded);
    console.log('[togglePaletteCategory] Current classes:', categoryItems.className);
    console.log('[togglePaletteCategory] Computed display:', window.getComputedStyle(categoryItems).display);

    // Close any other open categories for an accordion-style experience
    document.querySelectorAll('.category-items.expanded').forEach(items => {
        if (items !== categoryItems) {
            items.classList.remove('expanded');
            items.previousElementSibling?.classList.remove('expanded');
        }
    });

    if (isExpanded) {
        console.log('[togglePaletteCategory] Closing dropdown');
        categoryItems.classList.remove('expanded');
        categoryHeader?.classList.remove('expanded');
    } else {
        console.log('[togglePaletteCategory] Opening dropdown');
        categoryItems.classList.add('expanded');
        categoryHeader?.classList.add('expanded');
        
        // Force reflow to ensure display changes are applied
        void categoryItems.offsetHeight;
    }
    
    console.log('[togglePaletteCategory] New classes:', categoryItems.className);
    console.log('[togglePaletteCategory] New display:', window.getComputedStyle(categoryItems).display);
}

function closeAllDropdowns() {
    document.querySelectorAll('.category-items.expanded').forEach(items => {
        items.classList.remove('expanded');
        items.previousElementSibling?.classList.remove('expanded');
    });
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    const isClickInsidePalette = e.target.closest('.palette-category');
    if (!isClickInsidePalette) {
        closeAllDropdowns();
    }
});

window.togglePaletteCategory = togglePaletteCategory;
window.closeAllDropdowns = closeAllDropdowns;

// Setup event listeners for palette category toggles
function setupPaletteCategoryToggles() {
    document.querySelectorAll('.category-header').forEach(header => header.classList.remove('expanded'));
    document.querySelectorAll('.category-items').forEach(items => items.classList.remove('expanded'));

    // Close open categories when clicking outside the palette
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.palette-category')) {
            document.querySelectorAll('.category-items.expanded').forEach(items => {
                items.classList.remove('expanded');
                items.previousElementSibling?.classList.remove('expanded');
            });
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
    
    // Center the canvas view on startup so user doesn't see edges
    setTimeout(() => {
        playground.centerCanvasView(2500, 2000); // Start near center of infinite canvas
    }, 100);
    
    // Sync any database changes from the databases page
    setTimeout(() => {
        playground.syncDatabaseChanges();
    }, 1000); // Small delay to ensure everything is loaded
    
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

// Canvas & Line Settings Management
const CanvasSettings = {
    root: document.documentElement,
    STORAGE_KEY: 'bi-mapper.canvas-settings.v1',
    
    elements: {
        openBtn: document.getElementById('settings-btn'),
        modal: document.getElementById('settings-modal'),
        closeBtn: document.getElementById('settings-close'),
        applyBtn: document.getElementById('settings-apply'),
        resetBtn: document.getElementById('settings-reset'),
        
        // Color inputs
        lineColor: document.getElementById('set-line-color'),
        baseColor: document.getElementById('set-base-color'),
        arrowColor: document.getElementById('set-arrow-color'),
        
        // Dropdown/select inputs
        connectionStyle: document.getElementById('set-connection-style'),
        
        // Range inputs
        glow: document.getElementById('set-glow'),
        width: document.getElementById('set-width'),
        dashA: document.getElementById('set-dash-a'),
        dashB: document.getElementById('set-dash-b'),
        speed: document.getElementById('set-speed'),
        itemSize: document.getElementById('set-item-size'),
        
        // Checkbox inputs
        animate: document.getElementById('set-animate-lines'),
        showArrows: document.getElementById('set-show-arrows'),
        
        // Value displays
        glowValue: document.getElementById('glow-value'),
        widthValue: document.getElementById('width-value'),
        dashAValue: document.getElementById('dash-a-value'),
        dashBValue: document.getElementById('dash-b-value'),
        speedValue: document.getElementById('speed-value'),
        itemSizeValue: document.getElementById('item-size-value')
    },

    // Helper functions
    getVar(name) {
        return getComputedStyle(this.root).getPropertyValue(name).trim();
    },

    parseAlpha(rgba) {
        const match = (rgba || '').match(/rgba?\(\s*\d+,\s*\d+,\s*\d+(?:,\s*([0-9.]+))?\s*\)/i);
        return match ? Number(match[1] ?? 1) : 0.85;
    },

    hexToRgba(hex, alpha = 1) {
        const h = hex.replace('#', '');
        const value = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
        const r = (value >> 16) & 255;
        const g = (value >> 8) & 255;
        const b = value & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },

    // Default settings based on current CSS variables
    getDefaults() {
        return {
            lineColor: this.getVar('--connection-flow-color') || '#ffffff',
            baseColor: this.getVar('--connection-base-color') || '#ffffff',
            arrowColor: this.getVar('--connection-arrow-color') || '#ffffff',
            glow: this.parseAlpha(this.getVar('--connection-flow-glow') || 'rgba(255,255,255,0)'),
            width: Number(this.getVar('--connection-flow-width') || 3),
            dashA: Number((this.getVar('--connection-dash') || '14 10').split(/\s+/)[0] || 14),
            dashB: Number((this.getVar('--connection-dash') || '14 10').split(/\s+/)[1] || 10),
            speed: Number((this.getVar('--connection-speed') || '1.1s').replace('s', '')) || 1.1,
            itemSize: Number(this.getVar('--canvas-item-size') || 1.0),
            animate: !document.body.classList.contains('no-connection-animation'),
            showArrows: !document.body.classList.contains('hide-mid-arrows')
        };
    },

    // Load settings from localStorage
    load() {
        try {
            const stored = JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
            return { ...this.getDefaults(), ...stored };
        } catch {
            return this.getDefaults();
        }
    },

    // Save settings to localStorage
    save(settings) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    },

    // Apply settings to CSS variables and body classes
    apply(settings) {
        this.root.style.setProperty('--connection-flow-color', settings.lineColor);
        this.root.style.setProperty('--connection-base-color', settings.baseColor);
        this.root.style.setProperty('--connection-arrow-color', settings.arrowColor);
        this.root.style.setProperty('--connection-flow-glow', this.hexToRgba(settings.lineColor, Number(settings.glow)));
        this.root.style.setProperty('--connection-flow-width', String(settings.width));
        this.root.style.setProperty('--connection-dash', `${settings.dashA} ${settings.dashB}`);
        this.root.style.setProperty('--connection-speed', `${settings.speed}s`);
        this.root.style.setProperty('--canvas-item-size', String(settings.itemSize));

        document.body.classList.toggle('no-connection-animation', !settings.animate);
        document.body.classList.toggle('hide-mid-arrows', !settings.showArrows);

        // Update speed slider state
        if (this.elements.speed) {
            this.elements.speed.disabled = !settings.animate;
        }
    },

    // Update UI to reflect current settings
    syncUI(settings) {
        if (!this.elements.modal) return; // Safety check

        // Update input values
        if (this.elements.lineColor) this.elements.lineColor.value = settings.lineColor;
        if (this.elements.baseColor) this.elements.baseColor.value = settings.baseColor;
        if (this.elements.arrowColor) this.elements.arrowColor.value = settings.arrowColor;
        if (this.elements.glow) this.elements.glow.value = settings.glow;
        if (this.elements.width) this.elements.width.value = settings.width;
        if (this.elements.dashA) this.elements.dashA.value = settings.dashA;
        if (this.elements.dashB) this.elements.dashB.value = settings.dashB;
        if (this.elements.speed) this.elements.speed.value = settings.speed;
        if (this.elements.itemSize) this.elements.itemSize.value = settings.itemSize;
        if (this.elements.animate) this.elements.animate.checked = settings.animate;
        if (this.elements.showArrows) this.elements.showArrows.checked = settings.showArrows;

        // Update value displays
        this.updateValueDisplays(settings);
    },

    // Update the value display elements
    updateValueDisplays(settings) {
        if (this.elements.glowValue) this.elements.glowValue.textContent = settings.glow.toFixed(2);
        if (this.elements.widthValue) this.elements.widthValue.textContent = settings.width;
        if (this.elements.dashAValue) this.elements.dashAValue.textContent = settings.dashA;
        if (this.elements.dashBValue) this.elements.dashBValue.textContent = settings.dashB;
        if (this.elements.speedValue) this.elements.speedValue.textContent = settings.speed.toFixed(1);
        if (this.elements.itemSizeValue) this.elements.itemSizeValue.textContent = settings.itemSize.toFixed(1);
        
        // Update color hex displays
        this.updateColorHex(this.elements.lineColor, settings.lineColor);
        this.updateColorHex(this.elements.baseColor, settings.baseColor);
        this.updateColorHex(this.elements.arrowColor, settings.arrowColor);
    },
    
    // Update color hex display next to color input
    updateColorHex(colorInput, value) {
        if (!colorInput) return;
        const wrapper = colorInput.closest('.color-preview-wrapper');
        if (wrapper) {
            const hexSpan = wrapper.querySelector('.color-hex');
            if (hexSpan) {
                hexSpan.textContent = value.toUpperCase();
            }
        }
    },

    // Get current settings from UI
    getCurrentSettings() {
        return {
            lineColor: this.elements.lineColor?.value || '#f59e0b',
            baseColor: this.elements.baseColor?.value || '#ffffff',
            arrowColor: this.elements.arrowColor?.value || '#ffffff',
            glow: Number(this.elements.glow?.value || 0.85),
            width: Number(this.elements.width?.value || 3),
            dashA: Number(this.elements.dashA?.value || 14),
            dashB: Number(this.elements.dashB?.value || 10),
            speed: Number(this.elements.speed?.value || 1.1),
            itemSize: Number(this.elements.itemSize?.value || 1.0),
            animate: !!this.elements.animate?.checked,
            showArrows: !!this.elements.showArrows?.checked
        };
    },
    
    // Get currently applied settings (from CSS variables and body classes)
    getAppliedSettings() {
        return {
            lineColor: this.getVar('--connection-flow-color') || '#f59e0b',
            baseColor: this.getVar('--connection-base-color') || '#ffffff',
            arrowColor: this.getVar('--connection-arrow-color') || '#ffffff',
            glow: this.parseAlpha(this.getVar('--connection-flow-glow')),
            width: Number(this.getVar('--connection-flow-width') || 3),
            dashA: Number((this.getVar('--connection-dash') || '14 10').split(/\s+/)[0] || 14),
            dashB: Number((this.getVar('--connection-dash') || '14 10').split(/\s+/)[1] || 10),
            speed: Number((this.getVar('--connection-speed') || '1.1s').replace('s', '')) || 1.1,
            itemSize: Number(this.getVar('--canvas-item-size') || 1.0),
            animate: !document.body.classList.contains('no-connection-animation'),
            showArrows: !document.body.classList.contains('hide-mid-arrows')
        };
    },

    // Handle live updates
    handleChange() {
        const settings = this.getCurrentSettings();
        this.apply(settings);
        this.updateValueDisplays(settings);
        this.save(settings);
        // Save to current page if pageManager exists
        if (typeof pageManager !== 'undefined' && pageManager.saveCurrentPageSettings) {
            pageManager.saveCurrentPageSettings();
        }
    },
    
    // Handle color input change specifically (for hex display)
    handleColorChange(colorInput) {
        if (colorInput) {
            this.updateColorHex(colorInput, colorInput.value);
        }
        this.handleChange();
    },

    // Modal controls
    openModal() {
        if (this.elements.modal) {
            this.elements.modal.style.display = 'flex';
            this.elements.modal.setAttribute('aria-hidden', 'false');
        }
    },

    closeModal() {
        if (this.elements.modal) {
            this.elements.modal.style.display = 'none';
            this.elements.modal.setAttribute('aria-hidden', 'true');
        }
    },

    // Reset to defaults
    reset() {
        const defaults = this.getDefaults();
        this.apply(defaults);
        this.syncUI(defaults);
        this.save(defaults);
        localStorage.removeItem(this.STORAGE_KEY);
    },

    // Initialize the settings system
    init() {
        if (!this.elements.modal) return; // No settings modal on this page

        // Load and apply saved settings
        const settings = this.load();
        this.apply(settings);
        this.syncUI(settings);

        // Event listeners
        if (this.elements.openBtn) {
            this.elements.openBtn.addEventListener('click', () => this.openModal());
        }

        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (this.elements.applyBtn) {
            this.elements.applyBtn.addEventListener('click', () => this.closeModal());
        }

        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => this.reset());
        }

        // Close modal when clicking outside
        if (this.elements.modal) {
            this.elements.modal.addEventListener('click', (e) => {
                if (e.target === this.elements.modal) {
                    this.closeModal();
                }
            });
        }

        // Color input event listeners (special handler for hex display)
        const colorInputs = [
            this.elements.lineColor, this.elements.baseColor, this.elements.arrowColor
        ].filter(Boolean);
        
        colorInputs.forEach(input => {
            ['input', 'change'].forEach(eventType => {
                input.addEventListener(eventType, () => this.handleColorChange(input));
            });
        });

        // Non-color input event listeners
        const otherInputs = [
            this.elements.glow, this.elements.width, this.elements.dashA, this.elements.dashB,
            this.elements.speed, this.elements.itemSize, this.elements.animate, this.elements.showArrows
        ].filter(Boolean);

        otherInputs.forEach(input => {
            ['input', 'change'].forEach(eventType => {
                input.addEventListener(eventType, () => this.handleChange());
            });
        });
        
        // Connection style change requires redrawing all connections
        if (this.elements.connectionStyle) {
            this.elements.connectionStyle.addEventListener('change', () => {
                const style = this.elements.connectionStyle.value;
                console.log('[CanvasSettings] Connection style changed to:', style);
                
                // Update playground's connection style (per-page)
                if (playground) {
                    playground.connectionStyle = style;
                }
                
                // Save to current page
                if (typeof pageManager !== 'undefined' && pageManager.currentPageId && pageManager.pages[pageManager.currentPageId]) {
                    pageManager.pages[pageManager.currentPageId].connectionStyle = style;
                    pageManager.savePages();
                }
                
                // Force redraw of all connections
                if (playground && playground.connections) {
                    console.log('[CanvasSettings] Redrawing', playground.connections.length, 'connections');
                    playground.redrawAllConnections();
                }
                
                if (playground && playground.showNotification) {
                    playground.showNotification(`Connection style changed to ${style}`, 'success');
                }
            });
            
            // Connection style will be loaded per-page by PageManager
        }
    }
};

// Initialize settings when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    CanvasSettings.init();
});

// Global function to sync database changes (called from HTML button)
function syncDatabaseChanges() {
    if (playground && playground.syncDatabaseChanges) {
        console.log('Manual sync triggered...');
        playground.syncDatabaseChanges();
        
        // Show a brief notification
        const notification = document.createElement('div');
        notification.innerHTML = '<i class="fas fa-check"></i> Database changes synced!';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    } else {
        console.warn('Playground not initialized or sync function not available');
    }
}

// Export canvas as PNG image
async function exportToPNG() {
    try {
        // Ensure html2canvas is loaded
        if (typeof html2canvas === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const canvasEl = document.getElementById('fabric-canvas');
        if (!canvasEl) {
            throw new Error('Canvas element not found');
        }

        // Show loading notification
        if (playground && playground.showNotification) {
            playground.showNotification('Generating PNG image...', 'info');
        }

        // Use the same capture settings as HTML export for consistency
        const captureCanvas = async (withSanitize = false) => {
            let mutated = [];
            
            if (withSanitize) {
                const disallow = /(oklab|lab\(|lch|conic-gradient|repeating-conic-gradient|color-mix)/i;
                const all = canvasEl.querySelectorAll('*');
                
                all.forEach(el => {
                    const style = window.getComputedStyle(el);
                    
                    // Fix background image
                    const bgImg = style.backgroundImage;
                    if (bgImg && bgImg !== 'none' && disallow.test(bgImg)) {
                        mutated.push({el, prop:'backgroundImage', value: el.style.backgroundImage});
                        el.style.backgroundImage = 'none';
                    }
                    
                    // Fix background color
                    const bgCol = style.backgroundColor;
                    if (bgCol && disallow.test(bgCol)) {
                        mutated.push({el, prop:'backgroundColor', value: el.style.backgroundColor});
                        el.style.backgroundColor = '#1e1f25';
                    }
                    
                    // Fix text color
                    const color = style.color;
                    if (color && disallow.test(color)) {
                        mutated.push({el, prop:'color', value: el.style.color});
                        el.style.color = '#ffffff';
                    }
                    
                    // Fix border color
                    const borderColor = style.borderColor;
                    if (borderColor && disallow.test(borderColor)) {
                        mutated.push({el, prop:'borderColor', value: el.style.borderColor});
                        el.style.borderColor = '#3b82f6';
                    }
                    
                    // Fix outline color
                    const outlineColor = style.outlineColor;
                    if (outlineColor && disallow.test(outlineColor)) {
                        mutated.push({el, prop:'outlineColor', value: el.style.outlineColor});
                        el.style.outlineColor = '#3b82f6';
                    }
                    
                    // Fix box shadow
                    const boxShadow = style.boxShadow;
                    if (boxShadow && boxShadow !== 'none' && disallow.test(boxShadow)) {
                        mutated.push({el, prop:'boxShadow', value: el.style.boxShadow});
                        el.style.boxShadow = 'none';
                    }
                    
                    // Fix text shadow
                    const textShadow = style.textShadow;
                    if (textShadow && textShadow !== 'none' && disallow.test(textShadow)) {
                        mutated.push({el, prop:'textShadow', value: el.style.textShadow});
                        el.style.textShadow = 'none';
                    }
                });
            }
            
            try {
                return await html2canvas(canvasEl, {
                    backgroundColor: '#1a1c22',
                    scale: 3,  // Match HTML export quality
                    logging: false,
                    useCORS: true,
                    foreignObjectRendering: false,  // Match HTML export
                    ignoreElements: (element) => {
                        // Ignore elements that might cause issues
                        return element.classList?.contains('text-format-toolbar') ||
                               element.classList?.contains('component-palette');
                    }
                });
            } finally {
                mutated.forEach(m => {
                    m.el.style[m.prop] = m.value;
                });
            }
        };

        // Always use sanitization to avoid oklab errors
        let canvas;
        try {
            console.log('Capturing PNG with CSS sanitization...');
            canvas = await captureCanvas(true);  // Always sanitize
        } catch (error) {
            throw new Error('Canvas capture failed: ' + error.message);
        }

        // Auto-crop to remove empty space (same as HTML export)
        const cropToContent = (baseCanvas, opts = {}) => {
            try {
                const pad = opts.pad ?? 20;
                const scale = opts.scale ?? 3;
                
                const items = Array.from(document.querySelectorAll('#fabric-canvas .canvas-item'))
                    .filter(el => el.offsetWidth && el.offsetHeight && 
                           window.getComputedStyle(el).visibility !== 'hidden' && 
                           window.getComputedStyle(el).opacity !== '0');
                
                if (!items.length) {
                    console.warn('No visible items found for cropping');
                    return baseCanvas;
                }
                
                const bounds = items.map(el => {
                    const x = parseInt(el.style.left || '0', 10);
                    const y = parseInt(el.style.top || '0', 10);
                    return { 
                        x, 
                        y, 
                        w: el.offsetWidth, 
                        h: el.offsetHeight, 
                        bottom: y + el.offsetHeight, 
                        right: x + el.offsetWidth 
                    };
                });
                
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                bounds.forEach(b => {
                    minX = Math.min(minX, b.x);
                    minY = Math.min(minY, b.y);
                    maxX = Math.max(maxX, b.right);
                    maxY = Math.max(maxY, b.bottom);
                });
                
                if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
                    console.warn('Invalid bounds calculated, using original canvas');
                    return baseCanvas;
                }
                
                const scaledMinX = minX * scale;
                const scaledMinY = minY * scale;
                const scaledMaxX = maxX * scale;
                const scaledMaxY = maxY * scale;
                const scaledPad = pad * scale;
                
                const cw = (scaledMaxX - scaledMinX) + scaledPad * 2;
                const ch = (scaledMaxY - scaledMinY) + scaledPad * 2;
                
                const crop = document.createElement('canvas');
                crop.width = Math.max(50, Math.round(cw));
                crop.height = Math.max(50, Math.round(ch));
                const ctx = crop.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.fillStyle = '#1a1c22';
                ctx.fillRect(0, 0, crop.width, crop.height);
                
                ctx.drawImage(
                    baseCanvas,
                    scaledMinX - scaledPad,
                    scaledMinY - scaledPad,
                    crop.width,
                    crop.height,
                    0,
                    0,
                    crop.width,
                    crop.height
                );
                
                return crop;
            } catch (e) {
                console.warn('Crop to content failed, using full canvas', e);
                return baseCanvas;
            }
        };

        // Crop the canvas to content
        const croppedCanvas = cropToContent(canvas, { pad: 20, scale: 3 });
        console.log('PNG cropped from', canvas.width, 'x', canvas.height, 'to', croppedCanvas.width, 'x', croppedCanvas.height);

        // Convert canvas to blob with high quality
        croppedCanvas.toBlob(blob => {
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            link.download = `bi-architecture-${timestamp}.png`;
            link.href = url;
            link.click();

            // Cleanup
            URL.revokeObjectURL(url);

            if (playground && playground.showNotification) {
                playground.showNotification('PNG exported successfully!', 'success');
            }
        }, 'image/png', 1.0); // Maximum quality

    } catch (error) {
        console.error('PNG export failed:', error);
        if (playground && playground.showNotification) {
            playground.showNotification('PNG export failed: ' + error.message, 'error');
        }
    }
}

// Export canvas as standalone HTML file with embedded image
async function exportToHTML() {
    try {
        // Prompt user for diagram name
        const diagramName = prompt('Enter a name for this diagram:', 'BI Architecture Diagram');
        if (diagramName === null) {
            // User cancelled
            return;
        }
        
        const finalName = diagramName.trim() || 'BI Architecture Diagram';
        
        // Ensure html2canvas is loaded
        if (typeof html2canvas === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const canvasEl = document.getElementById('fabric-canvas');
        if (!canvasEl) {
            throw new Error('Canvas element not found');
        }

        // Show loading notification
        if (playground && playground.showNotification) {
            playground.showNotification('Generating HTML with diagram image...', 'info');
        }

        // Helper function to capture with optional sanitization
        const captureCanvas = async (withSanitize = false) => {
            let mutated = [];
            
            if (withSanitize) {
                const disallow = /(oklab|lab\(|lch|conic-gradient|repeating-conic-gradient|color-mix)/i;
                const all = canvasEl.querySelectorAll('*');
                
                all.forEach(el => {
                    const style = window.getComputedStyle(el);
                    
                    // Only remove background images that contain problematic CSS
                    const bgImg = style.backgroundImage;
                    if (bgImg && bgImg !== 'none' && disallow.test(bgImg)) {
                        mutated.push({el, prop:'backgroundImage', value: el.style.backgroundImage});
                        el.style.backgroundImage = 'none';
                    }
                    
                    // Fix background color
                    const bgCol = style.backgroundColor;
                    if (bgCol && disallow.test(bgCol)) {
                        mutated.push({el, prop:'backgroundColor', value: el.style.backgroundColor});
                        el.style.backgroundColor = '#1e1f25';
                    }
                    
                    // Fix text color
                    const color = style.color;
                    if (color && disallow.test(color)) {
                        mutated.push({el, prop:'color', value: el.style.color});
                        el.style.color = '#ffffff';
                    }
                    
                    // Fix border color
                    const borderColor = style.borderColor;
                    if (borderColor && disallow.test(borderColor)) {
                        mutated.push({el, prop:'borderColor', value: el.style.borderColor});
                        el.style.borderColor = '#3b82f6';
                    }
                    
                    // Fix outline color
                    const outlineColor = style.outlineColor;
                    if (outlineColor && disallow.test(outlineColor)) {
                        mutated.push({el, prop:'outlineColor', value: el.style.outlineColor});
                        el.style.outlineColor = '#3b82f6';
                    }
                    
                    // Fix box shadow (can contain colors)
                    const boxShadow = style.boxShadow;
                    if (boxShadow && boxShadow !== 'none' && disallow.test(boxShadow)) {
                        mutated.push({el, prop:'boxShadow', value: el.style.boxShadow});
                        el.style.boxShadow = 'none';
                    }
                    
                    // Fix text shadow
                    const textShadow = style.textShadow;
                    if (textShadow && textShadow !== 'none' && disallow.test(textShadow)) {
                        mutated.push({el, prop:'textShadow', value: el.style.textShadow});
                        el.style.textShadow = 'none';
                    }
                });
            }
            
            try {
                return await html2canvas(canvasEl, {
                    backgroundColor: '#1a1c22',
                    scale: 3,  // Increased from 1.5 to 3 for higher quality (2x resolution boost)
                    logging: false,
                    useCORS: true,
                    foreignObjectRendering: false
                });
            } finally {
                // Restore original styles
                mutated.forEach(m => {
                    m.el.style[m.prop] = m.value;
                });
            }
        };

        // Try normal capture first, fall back to sanitized if it fails
        let canvas;
        try {
            console.log('Attempting normal capture...');
            canvas = await captureCanvas(false);
        } catch (e1) {
            console.warn('Normal capture failed, trying with sanitization:', e1);
            try {
                canvas = await captureCanvas(true);
            } catch (e2) {
                throw new Error('Canvas capture failed even with sanitization: ' + e2.message);
            }
        }

        console.log('Canvas captured, dimensions:', canvas.width, 'x', canvas.height);

        // Auto-crop to remove empty space using DOM-based approach (more efficient and accurate)
        const cropToContent = (baseCanvas, opts = {}) => {
            try {
                const pad = opts.pad ?? 40; // padding around content
                const scale = opts.scale ?? 3; // Scale factor used by html2canvas (updated to 3)
                
                const items = Array.from(document.querySelectorAll('#fabric-canvas .canvas-item'))
                    .filter(el => el.offsetWidth && el.offsetHeight && 
                           window.getComputedStyle(el).visibility !== 'hidden' && 
                           window.getComputedStyle(el).opacity !== '0');
                
                if (!items.length) {
                    console.warn('No visible items found for cropping');
                    return baseCanvas;
                }
                
                // Collect bounds of all visible elements
                const bounds = items.map(el => {
                    const x = parseInt(el.style.left || '0', 10);
                    const y = parseInt(el.style.top || '0', 10);
                    return { 
                        x, 
                        y, 
                        w: el.offsetWidth, 
                        h: el.offsetHeight, 
                        bottom: y + el.offsetHeight, 
                        right: x + el.offsetWidth 
                    };
                });
                
                // Calculate min/max bounds in DOM coordinates
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                bounds.forEach(b => {
                    minX = Math.min(minX, b.x);
                    minY = Math.min(minY, b.y);
                    maxX = Math.max(maxX, b.right);
                    maxY = Math.max(maxY, b.bottom);
                });
                
                // Also check connection lines to ensure they're included
                const connSvg = document.querySelector('#fabric-canvas svg, #connections-svg');
                if (connSvg) {
                    try {
                        // Check all line/path elements in the SVG
                        const paths = connSvg.querySelectorAll('line, path, polyline');
                        paths.forEach(path => {
                            const bbox = path.getBBox ? path.getBBox() : null;
                            if (bbox) {
                                minX = Math.min(minX, bbox.x);
                                minY = Math.min(minY, bbox.y);
                                maxX = Math.max(maxX, bbox.x + bbox.width);
                                maxY = Math.max(maxY, bbox.y + bbox.height);
                            }
                        });
                    } catch (svgErr) {
                        console.warn('Connection SVG bounds failed', svgErr);
                    }
                }
                
                if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
                    console.warn('Invalid bounds calculated, using original canvas');
                    return baseCanvas;
                }
                
                // Apply scale factor to convert DOM coordinates to canvas coordinates
                const scaledMinX = minX * scale;
                const scaledMinY = minY * scale;
                const scaledMaxX = maxX * scale;
                const scaledMaxY = maxY * scale;
                const scaledPad = pad * scale;
                
                const cw = (scaledMaxX - scaledMinX) + scaledPad * 2;
                const ch = (scaledMaxY - scaledMinY) + scaledPad * 2;
                
                // Create cropped canvas
                const crop = document.createElement('canvas');
                crop.width = Math.max(50, Math.round(cw));
                crop.height = Math.max(50, Math.round(ch));
                const ctx = crop.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.fillStyle = '#1a1c22';
                ctx.fillRect(0, 0, crop.width, crop.height);
                
                // Draw the cropped region from the source canvas
                ctx.drawImage(
                    baseCanvas,
                    scaledMinX - scaledPad, // source x
                    scaledMinY - scaledPad, // source y
                    crop.width,             // source width
                    crop.height,            // source height
                    0,                      // dest x
                    0,                      // dest y
                    crop.width,             // dest width
                    crop.height             // dest height
                );
                
                console.log('Crop bounds (DOM):', { minX, minY, maxX, maxY });
                console.log('Crop bounds (scaled):', { scaledMinX, scaledMinY, scaledMaxX, scaledMaxY });
                
                return crop;
            } catch (e) {
                console.warn('Crop to content failed, using full canvas', e);
                return baseCanvas;
            }
        };

        // Crop the canvas to content (pass the scale factor used in html2canvas)
        const croppedCanvas = cropToContent(canvas, { pad: 20, scale: 3 });
        console.log('Cropped from', canvas.width, 'x', canvas.height, 'to', croppedCanvas.width, 'x', croppedCanvas.height);

        // Convert cropped canvas to base64 data URL - use PNG for lossless quality
        const imageDataUrl = croppedCanvas.toDataURL('image/png');  // Changed from JPEG to PNG for lossless quality
        console.log('Image data URL length:', imageDataUrl.length, 'bytes');

        // Get metadata
        const items = canvasEl.querySelectorAll('.canvas-item:not(.text-label)');
        const connections = playground ? playground.connections.length : 0;
            
            // Build HTML content with embedded image
            const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${finalName} - ${new Date().toLocaleDateString()}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            background: #0a0b0f;
            color: #ffffff;
            overflow: auto;
            padding: 10px;
        }
        
        .container {
            max-width: 1600px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            padding: 15px 20px;
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            border-radius: 12px;
            margin-bottom: 15px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        
        .header h1 {
            font-size: 24px;
            color: #ffffff;
            margin-bottom: 8px;
            font-weight: 700;
        }
        
        .header .subtitle {
            font-size: 13px;
            color: #9ca3af;
            margin-bottom: 12px;
        }
        
        .metadata {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 10px;
        }
        
        .metadata-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
        }
        
        .metadata-value {
            font-size: 24px;
            font-weight: 700;
            color: #3b82f6;
        }
        
        .metadata-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .diagram-container {
            background: linear-gradient(180deg, #1a1c22 0%, #13151a 100%);
            border-radius: 12px;
            padding: 15px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            overflow: hidden;
            margin-bottom: 15px;
            min-height: 400px;
            position: relative;
            cursor: grab;
            user-select: none;
        }
        
        .diagram-container:active {
            cursor: grabbing;
        }
        
        .diagram-wrapper {
            width: 100%;
            height: auto;
            overflow: hidden;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 10px;
        }
        
        .diagram-image {
            display: block;
            max-width: 98%;
            max-height: 65vh;
            width: auto;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            transform-origin: center center;
            transition: none;
            pointer-events: none;
            object-fit: contain;
        }
        
        .loading-message {
            color: #9ca3af;
            text-align: center;
            padding: 40px;
        }
        
        .controls {
            text-align: center;
            padding: 12px;
            background: rgba(31, 41, 55, 0.5);
            border-radius: 8px;
            margin-bottom: 15px;
        }
        
        .controls button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            margin: 0 10px;
            transition: background 0.2s;
        }
        
        .controls button:hover {
            background: #2563eb;
        }
        
        .footer {
            text-align: center;
            padding: 15px 20px;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .footer strong {
            color: #9ca3af;
        }
        
        @media print {
            body {
                background: white;
            }
            .controls, .footer {
                display: none;
            }
            .diagram-container {
                box-shadow: none;
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${finalName}</h1>
            <p class="subtitle">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            
            <div class="metadata">
                <div class="metadata-item">
                    <div class="metadata-value">${items.length}</div>
                    <div class="metadata-label">Components</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-value">${connections}</div>
                    <div class="metadata-label">Connections</div>
                </div>
            </div>
        </div>
        
        <div class="controls">
            <button onclick="window.print()">🖨️ Print</button>
            <button onclick="downloadImage()">💾 Download Image</button>
            <button onclick="zoomIn()">🔍 Zoom In</button>
            <button onclick="zoomOut()">🔍 Zoom Out</button>
            <button onclick="resetZoom()">↺ Reset Zoom</button>
        </div>
        
        <div class="diagram-container" id="diagramContainer">
            <div class="diagram-wrapper">
                <img id="diagram" class="diagram-image" src="${imageDataUrl}" alt="${finalName}" 
                     onerror="this.parentElement.innerHTML='<div class=loading-message>⚠️ Image failed to load. The diagram may be too large.</div>';">
            </div>
        </div>
        
        <div class="footer">
            <p><strong>InfiniBI Studio</strong> - Architecture Visualization Tool</p>
            <p>This diagram is a static export. For interactive editing, use the InfiniBI Studio application.</p>
            <p style="margin-top: 10px; font-size: 11px; color: #4b5563;">
                Export created: ${new Date().toISOString()}<br>
                Quality: High Resolution (2x scale)<br>
                Format: PNG embedded in HTML
            </p>
        </div>
    </div>
    
    <script>
        let currentZoom = 1;
        let panX = 0;
        let panY = 0;
        let isPanning = false;
        let startX = 0;
        let startY = 0;
        
        const diagram = document.getElementById('diagram');
        const wrapper = diagram.parentElement;
        
        // Fit diagram to screen on load
        diagram.onload = function() {
            console.log('Image loaded successfully!');
            console.log('Image dimensions:', this.naturalWidth, 'x', this.naturalHeight);
            
            // Start at 100% zoom (1:1) - this matches "Reset Zoom" behavior
            currentZoom = 1;
            
            // Center the diagram
            panX = 0;
            panY = 0;
            
            applyTransform();
            console.log('Initial zoom set to:', currentZoom);
        };
        
        diagram.onerror = function() {
            console.error('Image failed to load!');
        };
        
        // Apply transform with current zoom and pan
        function applyTransform() {
            diagram.style.transform = \`translate(\${panX}px, \${panY}px) scale(\${currentZoom})\`;
        }
        
        // Scroll to zoom
        wrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const rect = wrapper.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newZoom = Math.max(0.25, Math.min(3, currentZoom + delta));
            
            if (newZoom !== currentZoom) {
                // Calculate the point under the mouse in the diagram's coordinate space
                const pointX = (mouseX - panX) / currentZoom;
                const pointY = (mouseY - panY) / currentZoom;
                
                // Adjust pan so that point stays under mouse after zoom
                panX = mouseX - pointX * newZoom;
                panY = mouseY - pointY * newZoom;
                
                currentZoom = newZoom;
                applyTransform();
            }
        }, { passive: false });
        
        // Mouse drag to pan (regular click and drag)
        wrapper.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isPanning = true;
            startX = e.clientX - panX;
            startY = e.clientY - panY;
            wrapper.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isPanning) {
                panX = e.clientX - startX;
                panY = e.clientY - startY;
                applyTransform();
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isPanning) {
                isPanning = false;
                wrapper.style.cursor = 'grab';
            }
        });
        
        // Button controls
        function zoomIn() {
            currentZoom = Math.min(currentZoom + 0.25, 3);
            applyTransform();
        }
        
        function zoomOut() {
            currentZoom = Math.max(currentZoom - 0.25, 0.25);
            applyTransform();
        }
        
        function resetZoom() {
            currentZoom = 1;
            panX = 0;
            panY = 0;
            applyTransform();
        }
        
        function downloadImage() {
            const link = document.createElement('a');
            link.href = diagram.src;
            link.download = '${finalName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png';
            link.click();
        }
    </script>
</body>
</html>`;

        // Create blob and download
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const sanitizedName = finalName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        link.download = `${sanitizedName}-${timestamp}.html`;
        link.href = url;
        link.click();

        // Cleanup
        URL.revokeObjectURL(url);

        if (playground && playground.showNotification) {
            playground.showNotification('HTML exported successfully! Open in browser to view.', 'success');
        }

    } catch (error) {
        console.error('HTML export failed:', error);
        if (playground && playground.showNotification) {
            playground.showNotification('HTML export failed: ' + error.message, 'error');
        }
    }
}

// Export animated interactive HTML with live diagram
async function exportAnimatedHTML() {
    try {
        // Prompt user for diagram name
        const diagramName = prompt('Enter a name for this animated diagram:', 'BI Architecture Diagram');
        if (diagramName === null) {
            return; // User cancelled
        }
        
        const finalName = diagramName.trim() || 'BI Architecture Diagram';
        
        if (playground && playground.showNotification) {
            playground.showNotification('Generating animated HTML export with canvas capture...', 'info');
        }
        
        // Ensure html2canvas is loaded
        if (typeof html2canvas === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        
        // Capture the canvas as high-quality image (same as PNG export)
        const canvasEl = document.getElementById('fabric-canvas');
        if (!canvasEl) {
            throw new Error('Canvas element not found');
        }
        
        // Helper function to capture with CSS sanitization
        const captureCanvas = async (sanitize = true) => {
            let mutated = [];
            
            // Hide connection SVG during capture so we can redraw them animated
            const connectionSvg = document.querySelector('#connections-svg, #connection-layer, svg[id*="connection"]');
            let svgDisplay = null;
            if (connectionSvg) {
                svgDisplay = connectionSvg.style.display;
                connectionSvg.style.display = 'none';
            }
            
            if (sanitize) {
                const disallow = /(oklab|lab\(|lch|conic-gradient|repeating-conic-gradient|color-mix)/i;
                const all = canvasEl.querySelectorAll('*');
                
                all.forEach(el => {
                    const style = window.getComputedStyle(el);
                    const bgImg = style.backgroundImage;
                    const bgCol = style.backgroundColor;
                    const color = style.color;
                    const borderColor = style.borderColor;
                    const outlineColor = style.outlineColor;
                    const boxShadow = style.boxShadow;
                    const textShadow = style.textShadow;
                    
                    if (bgImg && disallow.test(bgImg)) {
                        mutated.push({el, prop:'backgroundImage', value: el.style.backgroundImage});
                        el.style.backgroundImage = 'none';
                        mutated.push({el, prop:'backgroundColor', value: el.style.backgroundColor});
                        el.style.backgroundColor = '#1e1f25';
                    } else if (bgCol && disallow.test(bgCol)) {
                        mutated.push({el, prop:'backgroundColor', value: el.style.backgroundColor});
                        el.style.backgroundColor = '#1e1f25';
                    }
                    
                    if (color && disallow.test(color)) {
                        mutated.push({el, prop:'color', value: el.style.color});
                        el.style.color = '#ffffff';
                    }
                    
                    if (borderColor && disallow.test(borderColor)) {
                        mutated.push({el, prop:'borderColor', value: el.style.borderColor});
                        el.style.borderColor = '#3b82f6';
                    }
                    
                    if (outlineColor && disallow.test(outlineColor)) {
                        mutated.push({el, prop:'outlineColor', value: el.style.outlineColor});
                        el.style.outlineColor = '#3b82f6';
                    }
                    
                    if (boxShadow && disallow.test(boxShadow)) {
                        mutated.push({el, prop:'boxShadow', value: el.style.boxShadow});
                        el.style.boxShadow = 'none';
                    }
                    
                    if (textShadow && disallow.test(textShadow)) {
                        mutated.push({el, prop:'textShadow', value: el.style.textShadow});
                        el.style.textShadow = 'none';
                    }
                });
            }
            
            try {
                return await html2canvas(canvasEl, {
                    backgroundColor: '#1a1c22',
                    scale: 3,
                    logging: false,
                    useCORS: true,
                    foreignObjectRendering: false
                });
            } finally {
                // Restore connection SVG
                if (connectionSvg && svgDisplay !== null) {
                    connectionSvg.style.display = svgDisplay;
                }
                // Restore other styles
                mutated.forEach(m => { m.el.style[m.prop] = m.value; });
            }
        };
        
        // Capture canvas with sanitization
        let canvas = await captureCanvas(true);
        
        // Auto-crop to content
        const cropToContent = (baseCanvas, opts = {}) => {
            try {
                const scale = opts.scale ?? 3;
                const pad = opts.pad ?? 20;
                
                const items = Array.from(document.querySelectorAll('#fabric-canvas .canvas-item'))
                    .filter(el => el.offsetWidth && el.offsetHeight && 
                                  window.getComputedStyle(el).visibility !== 'hidden' && 
                                  window.getComputedStyle(el).opacity !== '0');
                
                if(!items.length) return baseCanvas;
                
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                
                items.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    const container = document.getElementById('fabric-canvas');
                    const containerRect = container.getBoundingClientRect();
                    
                    const x = rect.left - containerRect.left;
                    const y = rect.top - containerRect.top;
                    const w = rect.width;
                    const h = rect.height;
                    
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x + w);
                    maxY = Math.max(maxY, y + h);
                });
                
                if(!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
                    return baseCanvas;
                }
                
                const cropX = (minX - pad) * scale;
                const cropY = (minY - pad) * scale;
                const cropW = (maxX - minX + pad * 2) * scale;
                const cropH = (maxY - minY + pad * 2) * scale;
                
                const crop = document.createElement('canvas');
                crop.width = Math.max(50, Math.round(cropW));
                crop.height = Math.max(50, Math.round(cropH));
                
                const ctx = crop.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.fillStyle = '#1a1c22';
                ctx.fillRect(0, 0, crop.width, crop.height);
                
                ctx.drawImage(
                    baseCanvas,
                    cropX, cropY, cropW, cropH,
                    0, 0, crop.width, crop.height
                );
                
                return crop;
            } catch(e) { 
                console.warn('Crop failed, using full canvas', e); 
                return baseCanvas; 
            }
        };
        
        // Crop the canvas
        const croppedCanvas = cropToContent(canvas, { scale: 3, pad: 20 });
        
        // Convert to data URL
        const imageDataUrl = croppedCanvas.toDataURL('image/png');
        
        // Serialize the current diagram data
        const data = playground.serialize();
        
        // Extract all CSS animations and styles needed
        const styleElement = document.querySelector('style, link[rel="stylesheet"]');
        
        // Build the animated HTML with captured canvas image
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${finalName} - Interactive</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            background: #0a0b0f;
            color: #ffffff;
            overflow: hidden;
        }
        
        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            padding: 12px 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            z-index: 1000;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header h1 {
            font-size: 18px;
            font-weight: 700;
        }
        
        .controls {
            display: flex;
            gap: 10px;
        }
        
        .controls button {
            background: #3b82f6;
            border: none;
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            transition: background 0.2s;
        }
        
        .controls button:hover {
            background: #2563eb;
        }
        
        #canvas-container {
            position: fixed;
            top: 50px;
            left: 0;
            right: 0;
            bottom: 40px;
            background: linear-gradient(135deg, #0a0b0f 0%, #1a1c22 100%);
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        #diagram-wrapper {
            position: relative;
            transform-origin: 0 0;
            transition: transform 0.3s ease;
        }
        
        #diagram-image {
            display: block;
            max-width: none;
            height: auto;
        }
        
        /* Animated connection overlay */
        #connection-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }
        
        /* Connection line (white/grey with animated dashes) */
        .connection-line {
            stroke: rgba(255, 255, 255, 0.6);
            stroke-width: 2;
            fill: none;
            stroke-dasharray: 8 4;
            animation: connection-flow 3s linear infinite;
        }
        
        @keyframes connection-flow {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -100; }
        }
        
        body.no-animation .connection-line {
            animation: none;
        }
        
        .connection-arrow {
            fill: rgba(255, 255, 255, 0.6);
        }
        
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(31, 41, 55, 0.95);
            padding: 8px 20px;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
            backdrop-filter: blur(10px);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${finalName}</h1>
        <div class="controls">
            <button onclick="toggleAnimation()">⏯️ Toggle Animation</button>
            <button onclick="zoomIn()">🔍 Zoom In</button>
            <button onclick="zoomOut()">🔍 Zoom Out</button>
            <button onclick="fitToScreen()">↔️ Fit Screen</button>
            <button onclick="resetView()">↺ Reset</button>
        </div>
    </div>
    
    <div id="canvas-container">
        <div id="diagram-wrapper">
            <img id="diagram-image" src="${imageDataUrl}" alt="${finalName}">
            <svg id="connection-overlay"></svg>
        </div>
    </div>
    
    <div class="footer">
        <strong>InfiniBI Studio</strong> - Interactive Architecture Diagram | Generated ${new Date().toLocaleDateString()} | ${data.items.length} Components, ${data.connections.length} Connections
    </div>
    
    <script>
        // Embedded diagram data for connection animations
        const diagramData = ${JSON.stringify(data, null, 2)};
        
        let currentZoom = 1;
        let panX = 0;
        let panY = 0;
        let isPanning = false;
        let startX = 0;
        let startY = 0;
        
        const wrapper = document.getElementById('diagram-wrapper');
        const image = document.getElementById('diagram-image');
        const svg = document.getElementById('connection-overlay');
        const container = document.getElementById('canvas-container');
        
        // Wait for image to load
        image.onload = function() {
            // Set SVG to match image dimensions
            svg.setAttribute('width', image.naturalWidth);
            svg.setAttribute('height', image.naturalHeight);
            svg.style.width = image.width + 'px';
            svg.style.height = image.height + 'px';
            
            // Fit to screen initially
            fitToScreen();
            
            // Render animated connections
            renderConnections();
        };
        
        function renderConnections() {
            svg.innerHTML = '';
            
            // Get the scale factor used when capturing (3x)
            const captureScale = 3;
            
            diagramData.connections.forEach(conn => {
                const fromItem = diagramData.items.find(i => i.id === conn.fromId);
                const toItem = diagramData.items.find(i => i.id === conn.toId);
                
                if (!fromItem || !toItem) return;
                
                // Calculate positions (scaled by capture factor)
                const fromX = ((fromItem.position?.x || 0) + (fromItem.width || 140) / 2) * captureScale;
                const fromY = ((fromItem.position?.y || 0) + (fromItem.height || 70) / 2) * captureScale;
                const toX = ((toItem.position?.x || 0) + (toItem.width || 140) / 2) * captureScale;
                const toY = ((toItem.position?.y || 0) + (toItem.height || 70) / 2) * captureScale;
                
                // Draw animated white/grey line (dashed, flowing)
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('class', 'connection-line');
                line.setAttribute('x1', fromX);
                line.setAttribute('y1', fromY);
                line.setAttribute('x2', toX);
                line.setAttribute('y2', toY);
                svg.appendChild(line);
                
                // Draw arrow (white/grey)
                const angle = Math.atan2(toY - fromY, toX - fromX);
                const arrowSize = 24; // Scaled up for 3x
                const arrowDist = 60; // Scaled up for 3x
                const arrowX = toX - Math.cos(angle) * arrowDist;
                const arrowY = toY - Math.sin(angle) * arrowDist;
                
                const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                arrow.setAttribute('class', 'connection-arrow');
                const points = [
                    [arrowX, arrowY],
                    [arrowX - arrowSize * Math.cos(angle - Math.PI / 6), arrowY - arrowSize * Math.sin(angle - Math.PI / 6)],
                    [arrowX - arrowSize * Math.cos(angle + Math.PI / 6), arrowY - arrowSize * Math.sin(angle + Math.PI / 6)]
                ];
                arrow.setAttribute('points', points.map(p => p.join(',')).join(' '));
                svg.appendChild(arrow);
            });
        }
        
        function applyTransform() {
            const containerRect = container.getBoundingClientRect();
            const imgWidth = image.naturalWidth;
            const imgHeight = image.naturalHeight;
            
            // Center the diagram
            const offsetX = (containerRect.width - imgWidth * currentZoom) / 2;
            const offsetY = (containerRect.height - imgHeight * currentZoom) / 2;
            
            wrapper.style.transform = \`translate(\${panX + offsetX}px, \${panY + offsetY}px) scale(\${currentZoom})\`;
        }
        
        // Pan and zoom controls
        wrapper.addEventListener('mousedown', (e) => {
            isPanning = true;
            startX = e.clientX - panX;
            startY = e.clientY - panY;
            wrapper.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isPanning) {
                panX = e.clientX - startX;
                panY = e.clientY - startY;
                applyTransform();
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isPanning) {
                isPanning = false;
                wrapper.style.cursor = 'grab';
            }
        });
        
        wrapper.style.cursor = 'grab';
        
        // Zoom controls
        function zoomIn() {
            currentZoom = Math.min(currentZoom + 0.2, 3);
            applyTransform();
        }
        
        function zoomOut() {
            currentZoom = Math.max(currentZoom - 0.2, 0.3);
            applyTransform();
        }
        
        function fitToScreen() {
            const containerRect = container.getBoundingClientRect();
            const imgWidth = image.naturalWidth;
            const imgHeight = image.naturalHeight;
            
            const scaleX = (containerRect.width * 0.9) / imgWidth;
            const scaleY = (containerRect.height * 0.9) / imgHeight;
            
            currentZoom = Math.min(scaleX, scaleY);
            panX = 0;
            panY = 0;
            applyTransform();
        }
        
        function resetView() {
            currentZoom = 1;
            panX = 0;
            panY = 0;
            applyTransform();
        }
        
        function toggleAnimation() {
            document.body.classList.toggle('no-animation');
        }
        
        // Mouse wheel zoom
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            currentZoom = Math.max(0.3, Math.min(3, currentZoom + delta));
            applyTransform();
        });
    </script>
</body>
</html>`;

        // Create blob and download
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const sanitizedName = finalName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        link.download = `${sanitizedName}-animated-${timestamp}.html`;
        link.href = url;
        link.click();

        // Cleanup
        URL.revokeObjectURL(url);

        if (playground && playground.showNotification) {
            playground.showNotification('Animated HTML exported successfully!', 'success');
        }

    } catch (error) {
        console.error('Animated HTML export failed:', error);
        if (playground && playground.showNotification) {
            playground.showNotification('Animated HTML export failed: ' + error.message, 'error');
        }
    }
}


// Cache refresh: 2025-10-02 13:12:44

// Cache refresh: 2025-10-02 13:13:16

// Text label fix: 2025-10-02 13:59:31

// Text label restore fix: 2025-10-02 21:04:13

// Text formatting feature: 2025-10-02 21:25:57

// Text label selection fix: 2025-10-02 21:32:57
