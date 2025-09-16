// BI Architecture Playground - Standalone Version

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

    init() {
        this.setupEventListeners();
        // Data sources panel removed - databases now available via modal
        this.setupDragAndDrop();
        this.initializeTheme();
        this.initializeConnectionLayer();
        this.setupConnectionToggle();
    this.setupEditToggle();
    this.setupDatabaseModal();
    
    // Temporarily clear corrupted autosave data to fix connection issues
    localStorage.removeItem('playground-autosave');
    console.log('Cleared potentially corrupted autosave data');
    
    // this.restoreAutosave(); // Disabled temporarily
    this.setupMedallionTargets();
    this.ensureCanvasSourcesWindow();
    this.ensureModeDock();
    this.setupMultiSelect();
    this.setupUndoRedo();
    this.setupTemplates();
    }

    getDefaultSources() {
        return [
            { name: 'Atlas', type: 'SQL Server', icon: 'fas fa-server', dataType: 'sql-server' },
            { name: 'QAS', type: 'SQL Server', icon: 'fas fa-server', dataType: 'sql-server' },
            { name: 'Procapita', type: 'Cloud', icon: 'fas fa-cloud', dataType: 'cloud' }
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
        // Palette items (drag or click to add)
        const palette = document.getElementById('item-palette');
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
                e.preventDefault();
                this.deleteSelectedItems();
            }
            // Select all
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                this.selectAllItems();
            }
        });
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
        // Setup database selector button
        const databaseBtn = document.querySelector('.database-selector-btn');
        if (databaseBtn) {
            databaseBtn.addEventListener('click', () => this.showDatabaseModal());
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

        // Setup checkbox selection functionality
        const checkboxes = document.querySelectorAll('.db-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const option = checkbox.closest('.database-option');
                if (checkbox.checked) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
                this.updateModalButtons();
            });
        });

        // Setup database option click to toggle checkbox
        const databaseOptions = document.querySelectorAll('.database-option');
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

        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.selectAllDatabases());
        }

        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAllDatabases());
        }

        if (addSelectedBtn) {
            addSelectedBtn.addEventListener('click', () => this.addSelectedDatabases());
        }

        this.updateModalButtons();
    }

    showDatabaseModal() {
        const modal = document.getElementById('database-modal');
        if (modal) {
            modal.style.display = 'flex';
            // Add animation
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
            });
            this.updateModalButtons();
        }
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
        const selectedCheckboxes = document.querySelectorAll('.db-checkbox:checked');
        
        if (selectedCheckboxes.length === 0) {
            return;
        }

        selectedCheckboxes.forEach((checkbox, index) => {
            const option = checkbox.closest('.database-option');
            
            // Add small delay between each database addition for smooth animation
            setTimeout(() => {
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
        const dbName = option.dataset.dbName;
        const dbType = option.dataset.dbType;
        const dbIcon = option.dataset.icon;

        // Find a good position for the new database
        const canvas = document.getElementById('fabric-canvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        // Place in the prepare area (left side)
        const x = 100 + (Math.random() * 200); // Random position in left area
        const y = 100 + (Math.random() * 300); // Random height
        
        const snapped = this.snapToGrid(x, y);

        // Create database data source item
        const databaseData = {
            type: 'data-source',
            name: dbName,
            sourceType: dbType,
            icon: dbIcon
        };

        this.addDataSourceToCanvas(databaseData, snapped.x, snapped.y);
        
        // Show success notification
        this.showNotification(`${dbName} database added to canvas`, 'success');
        
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

        // Create the connection with specific anchors
        const connection = {
            from: fromElement,
            to: toElement,
            fromAnchor: fromAnchor,
            toAnchor: toAnchor,
            type: this.getConnectionType(fromElement, toElement),
            id: Date.now()
        };

        this.connections.push(connection);
        this.drawManualConnection(connection);
        
        this.showNotification(`Connected ${fromAnchor} to ${toAnchor}`, 'success');
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
        }
        
        const itemId = 'canvas-item-' + Date.now();
        item.id = itemId;
        
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
    if (this.editMode) this.showItemQuickActions(true);
        this.canvasItems.push({
            id: itemId,
            element: item,
            type: itemType,
            data: itemConfig
        });
        
        this.ensureCanvasExtents();
        this.showNotification(`Added ${itemConfig.name} to canvas`, 'success');
    }

    getItemConfig(itemType) {
        const configs = {
            'notebook': { icon: '📓', name: 'Notebook', type: 'Development' },
            'pipeline': { icon: '🔄', name: 'Data Pipeline', type: 'Data Engineering' },
            'dataset': { icon: '📊', name: 'Dataset', type: 'Data' },
            'dataflow': { icon: '🌊', name: 'Dataflow', type: 'Data Engineering' },
            'report': { icon: '📈', name: 'Report', type: 'Analytics' },
            'dashboard': { icon: '📋', name: 'Dashboard', type: 'Analytics' },
            'semantic-model': { icon: '🧱', name: 'Semantic Model', type: 'Data Modeling' },
            'warehouse': { icon: '🏬', name: 'Warehouse', type: 'Storage' },
            'lakehouse': { icon: '🏞️', name: 'Lakehouse', type: 'Storage' },
            'data-lake': { icon: '🗄️', name: 'Data Lake', type: 'Raw Data Source' },
            'bronze': { icon: '🥉', name: 'Bronze', type: 'Raw data' },
            'silver': { icon: '🥈', name: 'Silver', type: 'Cleaned data' },
            'gold': { icon: '🥇', name: 'Gold', type: 'Modelled data' }
        };
        
        return configs[itemType] || { icon: '❓', name: 'Unknown', type: 'Unknown' };
    }

    getTypeClass(itemType) {
        switch (itemType) {
            case 'pipeline': return 'ci-pipeline';
            case 'dataset': return 'ci-dataset';
            case 'dataflow': return 'ci-dataflow';
            case 'report': return 'ci-report';
            case 'dashboard': return 'ci-dashboard';
            case 'semantic-model': return 'ci-semantic-model';
            case 'warehouse': return 'ci-warehouse';
            case 'lakehouse': return 'ci-lakehouse';
            case 'data-lake': return 'ci-data-source'; // Use existing data source styling
            case 'notebook': return 'ci-notebook';
            case 'bronze': return 'ci-medallion ci-medallion-bronze';
            case 'silver': return 'ci-medallion ci-medallion-silver';
            case 'gold': return 'ci-medallion ci-medallion-gold';
            default: return '';
        }
    }

    getIconMarkup(itemType) {
        // Prefer Font Awesome where it fits; fallback to emoji
        const fa = {
            'pipeline': '<i class="fas fa-arrows-rotate"></i>',
            'dataset': '<i class="fas fa-table"></i>',
            'dataflow': '<i class="fas fa-diagram-project"></i>',
            'report': '<i class="fas fa-chart-line"></i>',
            'dashboard': '<i class="fas fa-gauge-high"></i>',
            'semantic-model': '<i class="fas fa-cubes"></i>',
            'warehouse': '<i class="fas fa-warehouse"></i>',
            'lakehouse': '<i class="fas fa-water"></i>',
            'data-lake': '<i class="fas fa-database"></i>',
            'notebook': '<i class="fas fa-book"></i>',
            'bronze': '<i class="fas fa-medal" style="color: #cd7f32;"></i>',
            'silver': '<i class="fas fa-medal" style="color: #c0c0c0;"></i>',
            'gold': '<i class="fas fa-medal" style="color: #ffd700;"></i>'
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
            if (this.connectionMode || this.editMode) return;
            
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
            this.selectionBox.remove();
            this.selectionBox = null;
        }
        this.isSelecting = false;
    }

    highlightItemsInSelection(left, top, width, height) {
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
                    { type: 'data-lake', x: 400, y: 160 }, // Use data-lake canvas item instead of data-source
                    { type: 'bronze', x: 540, y: 160 },
                    { type: 'silver', x: 680, y: 160 },
                    { type: 'gold', x: 820, y: 160 },
                    { type: 'semantic-model', x: 960, y: 160 },
                    { type: 'consumption-item', name: 'Power BI', category: 'Analytics', consumptionType: 'powerbi', x: 1100, y: 160, icon: 'fas fa-chart-bar', iconColor: '#F2C811' }
                ],
                connections: [
                    { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 }
                ]
            },
            lambda: {
                name: "Lambda Architecture",
                description: "Batch + Speed layers with serving layer",
                items: [
                    { type: 'data-lake', x: 400, y: 100 }, // Event Stream
                    { type: 'data-lake', x: 400, y: 220 }, // Batch Data
                    { type: 'pipeline', x: 540, y: 100 }, // Speed layer
                    { type: 'pipeline', x: 540, y: 220 }, // Batch layer
                    { type: 'warehouse', x: 680, y: 160 }, // Serving layer
                    { type: 'semantic-model', x: 820, y: 160 },
                    { type: 'consumption-item', name: 'Dashboard', category: 'Analytics', consumptionType: 'powerbi', x: 960, y: 160, icon: 'fas fa-chart-bar', iconColor: '#F2C811' }
                ],
                connections: [
                    { from: 0, to: 2 }, { from: 1, to: 3 }, { from: 2, to: 4 }, { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 }
                ]
            },
            starSchema: {
                name: "Star Schema",
                description: "Central fact table with dimension tables",
                items: [
                    { type: 'data-lake', x: 400, y: 200 }, // Sales Data source
                    { type: 'dataset', x: 540, y: 80 }, // Dim Customer
                    { type: 'dataset', x: 680, y: 80 }, // Dim Product  
                    { type: 'dataset', x: 820, y: 80 }, // Dim Time
                    { type: 'warehouse', x: 680, y: 200 }, // Fact Sales (center)
                    { type: 'dataset', x: 540, y: 320 }, // Dim Store
                    { type: 'dataset', x: 820, y: 320 }, // Dim Geography
                    { type: 'semantic-model', x: 960, y: 200 },
                    { type: 'consumption-item', name: 'Reports', category: 'Analytics', consumptionType: 'powerbi', x: 1100, y: 200, icon: 'fas fa-chart-line', iconColor: '#F2C811' }
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
                    { type: 'data-lake', x: 400, y: 120 }, // CRM System
                    { type: 'data-lake', x: 400, y: 220 }, // ERP System
                    { type: 'warehouse', x: 540, y: 120 }, // Hub Customer
                    { type: 'warehouse', x: 540, y: 220 }, // Hub Product
                    { type: 'warehouse', x: 680, y: 170 }, // Link Customer-Product
                    { type: 'dataset', x: 620, y: 80 }, // Sat Customer Details
                    { type: 'dataset', x: 620, y: 260 }, // Sat Product Details
                    { type: 'semantic-model', x: 820, y: 170 },
                    { type: 'consumption-item', name: 'Analytics', category: 'BI', consumptionType: 'powerbi', x: 960, y: 170, icon: 'fas fa-chart-bar', iconColor: '#F2C811' }
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
                    { type: 'data-lake', x: 400, y: 140 }, // SaaS Apps
                    { type: 'data-lake', x: 400, y: 200 }, // Databases
                    { type: 'pipeline', x: 540, y: 170 }, // ELT Tool
                    { type: 'warehouse', x: 680, y: 170 }, // Cloud DW
                    { type: 'semantic-model', x: 820, y: 170 }, // dbt models
                    { type: 'consumption-item', name: 'BI Tool', category: 'Analytics', consumptionType: 'powerbi', x: 960, y: 120, icon: 'fas fa-chart-bar', iconColor: '#F2C811' },
                    { type: 'consumption-item', name: 'Notebooks', category: 'ML', consumptionType: 'notebooks', x: 960, y: 220, icon: 'fas fa-code', iconColor: '#6A5ACD' }
                ],
                connections: [
                    { from: 0, to: 2 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 4, to: 6 }
                ]
            },
            mlOps: {
                name: "MLOps Pipeline",
                description: "Machine learning operations workflow",
                items: [
                    { type: 'data-lake', x: 400, y: 160 }, // Training Data
                    { type: 'notebook', x: 540, y: 160 }, // Feature Engineering
                    { type: 'notebook', x: 680, y: 100 }, // Model Training
                    { type: 'warehouse', x: 680, y: 220 }, // Model Registry
                    { type: 'pipeline', x: 820, y: 160 }, // Deployment Pipeline
                    { type: 'consumption-item', name: 'API Endpoint', category: 'Serving', consumptionType: 'sql-endpoint', x: 960, y: 160, icon: 'fas fa-globe', iconColor: '#0078D4' }
                ],
                connections: [
                    { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 }
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
            
            template.connections.forEach((conn, connIndex) => {
                const fromItem = createdItems[conn.from];
                const toItem = createdItems[conn.to];
                
                if (fromItem && toItem && fromItem.element && toItem.element) {
                    // Verify elements are in DOM and have proper dimensions
                    const fromRect = fromItem.element.getBoundingClientRect();
                    const toRect = toItem.element.getBoundingClientRect();
                    
                    if (fromRect.width > 0 && fromRect.height > 0 && toRect.width > 0 && toRect.height > 0) {
                        this.createConnection(fromItem.element, toItem.element, 'item-to-item');
                    } else {
                        console.warn(`Skipping connection ${connIndex}: elements not properly sized`);
                    }
                } else {
                    console.warn(`Skipping connection ${connIndex}: missing elements`);
                }
            });
            this.showNotification(`Loaded template: ${template.name}`, 'success');
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
            this.selectedItems.forEach(ci => {
                const initial = initialPositions.get(ci.element);
                if (initial) {
                    const newX = initial.x + deltaX;
                    const newY = initial.y + deltaY;
                    
                    // Snap to grid for precise alignment
                    const snapped = this.snapToGrid(newX, newY);
                    
                    ci.element.style.left = snapped.x + 'px';
                    ci.element.style.top = snapped.y + 'px';
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
            if (isDragging) {
                isDragging = false;
                
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

    setupCanvasItemClick(item) {
        item.addEventListener('click', (e) => {
            if (this.connectionMode) {
                e.preventDefault();
                this.handleCanvasItemClick(item);
            }
        });
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
        
        const connectionId = 'connection-' + Date.now();
        const connection = {
            id: connectionId,
            from: fromElement,
            to: toElement,
            type: connectionType,
            element: null
        };
        
        this.connections.push(connection);
        this.drawConnection(connection);
        
        const fromName = this.getElementName(fromElement);
        const toName = this.getElementName(toElement);
        this.showNotification(`Connected ${fromName} to ${toName}`, 'success');
    this.autosave();
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

        // Build an orthogonal (elbow) path based on chosen anchors in SVG space
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let pts;
        if (Math.abs(toX - fromX) >= Math.abs(toY - fromY)) {
            const midX = Math.round((fromX + toX) / 2);
            pts = [[fromX, fromY], [midX, fromY], [midX, toY], [toX, toY]];
        } else {
            const midY = Math.round((fromY + toY) / 2);
            pts = [[fromX, fromY], [fromX, midY], [toX, midY], [toX, toY]];
        }
        const toD = (p) => `M ${p[0][0]} ${p[0][1]} L ${p[1][0]} ${p[1][1]} L ${p[2][0]} ${p[2][1]} L ${p[3][0]} ${p[3][1]}`;
        const pathData = toD(pts);

        path.setAttribute('d', pathData);
        path.setAttribute('stroke', '#ffffff');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linejoin', 'miter');
        path.setAttribute('stroke-linecap', 'butt');
        path.style.opacity = '0.8';
        
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
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linejoin', 'miter');
        path.setAttribute('stroke-linecap', 'butt');
        path.style.opacity = '0.8';

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
        
        this.connections.forEach(connection => {
            if (connection.element) {
                this.connectionSvg.removeChild(connection.element);
                this.drawConnection(connection);
            }
        });
    }

    showNotification(message, type = 'info') {
        if (this._suppressNotifications) return;
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        
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
        return {
            theme: document.documentElement.getAttribute('data-theme') || 'dark',
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
            }))
        };
    }

    autosave() {
        try {
            const data = this.serialize();
            localStorage.setItem('playground-autosave', JSON.stringify(data));
        } catch (e) {
            console.warn('Autosave failed:', e);
        }
    }

    restoreAutosave() {
        try {
            const raw = localStorage.getItem('playground-autosave');
            if (!raw) return;
            const data = JSON.parse(raw);
            
            // Validate data structure to prevent corrupted connections
            if (!data || typeof data !== 'object') return;
            if (data.connections && !Array.isArray(data.connections)) return;
            if (data.items && !Array.isArray(data.items)) return;
            
            this.loadFromData(data);
            this.showNotification('Autosaved session restored', 'info');
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
        if (!canvas || !data) return;

        // Clear existing
        canvas.querySelectorAll('.canvas-item').forEach(el => el.remove());
        this.canvasItems = [];
        this.connections = [];
        if (this.connectionSvg) this.connectionSvg.innerHTML = '';

        // Suppress notifications during bulk load
        this._suppressNotifications = true;

        // Recreate items using creation helpers to preserve classes, accents and structure
        (data.items || []).forEach(item => {
            const px = item.position?.x || 0;
            const py = item.position?.y || 0;

            const savedId = item.id || ('canvas-item-' + Date.now());

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
                // Overwrite id to preserve connections
                const last = this.canvasItems[this.canvasItems.length - 1];
                if (last) { last.id = savedId; if (last.element) last.element.id = savedId; }
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
                const last = this.canvasItems[this.canvasItems.length - 1];
                if (last) { last.id = savedId; if (last.element) last.element.id = savedId; }
                return;
            }

            // Canvas core items including medallions
            if (item.type) {
                this.addCanvasItem(item.type, px, py);
                const last = this.canvasItems[this.canvasItems.length - 1];
                if (last) { last.id = savedId; if (last.element) last.element.id = savedId; }
                return;
            }

            // Fallback unknown
            this.addCanvasItem('dataset', px, py);
            const last = this.canvasItems[this.canvasItems.length - 1];
            if (last) { last.id = savedId; if (last.element) last.element.id = savedId; }
        });

    // Recreate connections by matching item ids
        const itemsById = Object.fromEntries(this.canvasItems.map(ci => [ci.id, ci.element]));
        (data.connections || []).forEach(conn => {
            const fromEl = itemsById[conn.fromId];
            const toEl = itemsById[conn.toId];
            if (fromEl && toEl) {
                this.createConnection(fromEl, toEl, conn.type || 'item-to-item');
            }
        });

        // Restore theme
        if (data.theme) this.setTheme(data.theme);

        // Final update
        this.updateConnections();

    // Re-enable notifications after load
    this._suppressNotifications = false;
    }
}

// Global functions for HTML onclick handlers
function toggleTheme() {
    playground.setTheme(
        document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    );
}

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
    const data = {
        items: playground.canvasItems.map(item => ({
            id: item.id,
            type: item.type,
            data: item.data,
            position: {
                x: item.element.style.left,
                y: item.element.style.top
            }
        })),
        connections: playground.connections.map(conn => ({
            id: conn.id,
            type: conn.type,
            from: playground.getElementName(conn.from),
            to: playground.getElementName(conn.to)
        }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bi-architecture.json';
    a.click();
    URL.revokeObjectURL(url);
    
    playground.showNotification('Architecture exported', 'success');
}

function saveCanvas() {
    const data = playground.serialize();
    try {
        localStorage.setItem('playground-save', JSON.stringify(data));
        playground.showNotification('Canvas saved', 'success');
    } catch (e) {
        playground.showNotification('Save failed', 'error');
    }
}

function loadCanvas() {
    try {
        const raw = localStorage.getItem('playground-save');
        if (!raw) {
            playground.showNotification('No saved canvas found', 'warning');
            return;
        }
        const data = JSON.parse(raw);
        playground.loadFromData(data);
        playground.showNotification('Canvas loaded', 'success');
    } catch (e) {
        playground.showNotification('Load failed', 'error');
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

// Initialize playground when DOM is loaded
let playground;
document.addEventListener('DOMContentLoaded', () => {
    playground = new ArchitecturePlayground();
});
