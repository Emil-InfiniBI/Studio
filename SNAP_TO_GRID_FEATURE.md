# Snap-to-Grid Toggle Feature

## Overview
Added a toggle button to enable/disable snap-to-grid functionality for canvas items. This allows users to:
- Keep items aligned to a 20px grid for clean, organized layouts
- Disable snapping for fine-tuned positioning when needed
- Improve connection line appearance by aligning connected items

## Changes Made

### 1. JavaScript (playground.js)
- **Added property**: `this.snapEnabled = true` (default: enabled)
- **Modified function**: `snapToGrid(x, y)` - Now returns original coordinates when snap is disabled
- **New function**: `toggleSnapToGrid()` - Toggles snap state, updates UI, saves to localStorage
- **New function**: `initializeSnapToggle()` - Restores saved snap preference on page load
- **Updated**: `init()` method to call `initializeSnapToggle()`

### 2. HTML (studio.html)
- **Added button**: "Snap to Grid" button with grid icon in toolbar
- **Location**: Between "Edit Mode" and "Add Text" buttons
- **Handler**: Calls `playground.toggleSnapToGrid()` on click

### 3. CSS (styles.css)
- **Added styles**: `.toolbar-btn.active` - Cyan background (#00D4FF) for enabled state
- **Added styles**: `.toolbar-btn.active:hover` - Darker cyan on hover

## How It Works

### Default Behavior
- Snap is **enabled by default** for new users
- All items snap to a 20px grid when dragged or placed
- Button shows active state (cyan background)

### Toggle Behavior
1. Click "Snap to Grid" button
2. Snap state toggles (enabled ↔ disabled)
3. Button changes appearance:
   - **Active** (snap enabled): Cyan background
   - **Inactive** (snap disabled): Default button appearance
4. Notification shows current state
5. Preference saved to browser localStorage

### Persistence
- Snap preference is saved to localStorage
- Restored automatically on page reload
- Survives browser restarts

## Usage Instructions

1. **To align items to grid**:
   - Ensure snap is enabled (button should be cyan)
   - Drag items - they will automatically snap to 20px grid points
   - This creates clean, aligned layouts with straight connection lines

2. **To fine-tune positions**:
   - Click "Snap to Grid" button to disable (button turns gray)
   - Drag items freely without grid constraints
   - Re-enable when done for future items

3. **Best practice**:
   - Start with snap **enabled** to create organized layouts
   - Disable snap for minor adjustments
   - Re-enable snap before adding more items

## Technical Details

### Grid Size
- Grid size: **20 pixels**
- Defined in: `playground.js` line 18 (`this.gridSize = 20`)

### Snap Function
```javascript
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
```

### Toggle Function
```javascript
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
    localStorage.setItem('snapToGrid', this.snapEnabled.toString());
}
```

## Testing

1. **Test basic toggle**:
   - Open application
   - Button should be cyan (snap enabled by default)
   - Click button → should turn gray, show "Snap to grid disabled" notification
   - Click again → should turn cyan, show "Snap to grid enabled" notification

2. **Test dragging behavior**:
   - Enable snap, drag item → should snap to 20px grid
   - Disable snap, drag item → should move freely
   - Re-enable snap, drag item → should snap again

3. **Test persistence**:
   - Toggle snap off
   - Refresh page (F5)
   - Verify snap is still off and button is gray
   - Toggle snap on
   - Refresh page
   - Verify snap is on and button is cyan

4. **Test with connections**:
   - Add several items with snap enabled
   - Connect them → lines should be straight
   - Disable snap and move items slightly
   - Notice connection lines become less aligned

## Benefits

1. **Cleaner layouts**: Grid alignment keeps items organized
2. **Straight connections**: Aligned items produce cleaner connection lines
3. **Flexibility**: Can disable for fine-tuning when needed
4. **User preference**: Setting persists across sessions
5. **Visual feedback**: Button clearly shows current state

## Future Enhancements (Optional)

- Add keyboard shortcut (e.g., Ctrl+G) to toggle snap
- Add "Align to Grid" function to snap existing items to grid
- Add custom grid size option in settings
- Show grid lines when snap is enabled
- Add snap indicator on canvas
