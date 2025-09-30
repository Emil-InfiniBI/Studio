# Microsoft Fabric Authentication Test Guide

## 🧪 **Testing Your Azure Setup**

### **Before You Start:**
1. ✅ Complete Azure App Registration (follow SETUP_AZURE_APP.md)
2. ✅ Update azure-config.js with your Client ID and Tenant ID
3. ✅ Ensure you have access to DataEngineeringProd workspace

---

## 🚀 **Step-by-Step Testing**

### **Step 1: Update Configuration**
Edit `azure-config.js` and replace:
```javascript
CLIENT_ID: 'YOUR_CLIENT_ID_HERE',  // ← Your Azure App Client ID
TENANT_ID: 'YOUR_TENANT_ID_HERE',  // ← Your Azure App Tenant ID
```

### **Step 2: Open the Application**
1. Open `studio.html` in your browser (old `playground.html` will auto-redirect)
2. Look for the blue **"Connect to Fabric"** button in the header

### **Step 3: Test Connection**
1. Click **"Connect to Fabric"** button
2. **Expected behaviors:**

**If Configuration is Missing:**
- Shows red error modal: "Configuration Required"
- Lists missing configuration items
- Provides link to setup guide

**If Configuration is Complete:**
- Shows blue authentication modal
- Lists workspace: "DataEngineeringProd"
- Shows permissions that will be requested

### **Step 4: Authentication Flow**
1. Click **"Sign in with Microsoft"**
2. **Expected behaviors:**

**Success Flow:**
- Opens Microsoft login popup/redirect
- Asks for permissions to Power BI API
- Returns with access token
- Shows "Connecting to Microsoft Fabric..." notification
- Discovers your DataEngineeringProd workspace
- Loads datasets, reports, dashboards
- Auto-populates canvas with discovered items
- Shows "Successfully connected!" notification

**Error Flow:**
- Shows specific error message
- Check browser console for detailed logs
- Common issues: permissions, workspace access, CORS

---

## 🔍 **Troubleshooting**

### **Configuration Issues:**
```
❌ MSAL library not loaded
→ Check MSAL script is included in HTML

❌ Azure configuration incomplete
→ Update azure-config.js with real values

❌ Invalid Client ID/Tenant ID
→ Check Azure App Registration Overview page
```

### **Authentication Issues:**
```
❌ Login popup blocked
→ Allow popups for your domain

❌ Permission denied
→ Check API permissions in Azure App Registration
→ Ensure admin consent granted

❌ Workspace not found
→ Verify workspace name: 'DataEngineeringProd'
→ Check user has access to workspace
```

### **API Issues:**
```
❌ HTTP 401 Unauthorized
→ Token expired, try refreshing page

❌ HTTP 403 Forbidden  
→ User doesn't have permission to workspace
→ Check workspace access in Power BI Service

❌ HTTP 404 Not Found
→ Workspace name might be incorrect
→ Check exact spelling: 'DataEngineeringProd'
```

---

## 🎯 **Success Indicators**

### **Console Logs (F12 → Console):**
```
✅ MSAL initialized successfully
✅ Authentication successful
✅ Workspace found: [workspace-id]
✅ Loaded items: {datasets: X, reports: Y, dashboards: Z}
✅ Canvas populated with Fabric items
```

### **Visual Indicators:**
- Blue "Connect to Fabric" button changes after connection
- Canvas shows new items with Microsoft badges (blue border)
- Success notification: "Successfully connected to Microsoft Fabric!"
- Items appear with proper names from your workspace

### **Browser Network Tab:**
- Successful API calls to api.powerbi.com
- HTTP 200 responses for workspace and items APIs
- Bearer token in Authorization headers

---

## 📝 **Next Steps After Successful Test:**

1. **Verify Canvas Items:**
   - Items should have real names from your workspace
   - Check that item types are correctly mapped
   - Verify positioning looks good

2. **Test Refresh:**
   - Add new item to Power BI workspace
   - Click "Connect to Fabric" again
   - Verify new item appears

3. **Production Setup:**
   - Update redirect URIs for production domain
   - Consider token refresh implementation
   - Add error handling for network issues

---

## 🆘 **Need Help?**

**Common Commands for Testing:**
```javascript
// Check configuration
console.log(validateAzureConfig());

// Check authentication status  
console.log(fabricIntegration.isAuthenticated);

// Check discovered items
console.log(fabricIntegration.items);

// Manual token refresh
fabricIntegration.acquireTokenSilent();
```

**If you encounter issues, check:**
1. Browser console for error messages
2. Network tab for failed API calls
3. Azure App Registration permissions
4. Power BI workspace access