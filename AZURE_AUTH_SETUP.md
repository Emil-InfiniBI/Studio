# Microsoft Fabric Integration - Authentication Setup

## 🔐 **Azure App Registration Configuration**

### **Connection Details from Your Power BI Link:**
- **Workspace**: `DataEngineeringProd`
- **API Base**: `https://api.powerbi.com/v1.0/myorg`
- **Connection URI**: `powerbi://api.powerbi.com/v1.0/myorg/DataEngineeringProd`

---

## 🚀 **Step 1: Create Azure App Registration**

### **1.1 Navigate to Azure Portal**
1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "App registrations"
3. Click **"New registration"**

### **1.2 App Registration Details**
```
Name: BI-Mapping-Tool-Fabric-Integration
Supported account types: Accounts in this organizational directory only
Redirect URI: 
  - Type: Single-page application (SPA)
  - URL: http://localhost:8080 (for testing)
  - URL: [YOUR-PRODUCTION-URL] (when deployed)
```

### **1.3 Required API Permissions**
Add these permissions to your app registration:

**Power BI Service**:
- `Item.Read.All` - Read all Power BI items
- `Workspace.Read.All` - Read all workspaces
- `Dataset.Read.All` - Read all datasets
- `Report.Read.All` - Read all reports

**Microsoft Graph** (if needed):
- `User.Read` - Sign in and read user profile

---

## 🔧 **Step 2: Configure Authentication**

### **2.1 Update JavaScript Configuration**
Replace the placeholder in `fabric-integration.js`:

```javascript
const msalConfig = {
    auth: {
        clientId: 'YOUR_CLIENT_ID_HERE', // From App Registration
        authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
        redirectUri: window.location.origin
    },
    cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false
    }
};
```

### **2.2 Get Your Configuration Values**
From your Azure App Registration:
- **Client ID**: Found on the "Overview" page
- **Tenant ID**: Found on the "Overview" page
- **Directory (tenant) ID**: Same as Tenant ID

---

## 📋 **Step 3: Power BI API Endpoints for Your Workspace**

### **3.1 Primary Endpoints**
Based on your `DataEngineeringProd` workspace:

```javascript
// Get workspace by name
GET https://api.powerbi.com/v1.0/myorg/groups?$filter=name eq 'DataEngineeringProd'

// Get workspace items (once you have workspace ID)
GET https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/datasets
GET https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/reports  
GET https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/dashboards

// Fabric-specific endpoints
GET https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items
GET https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items/{itemId}/definition
```

### **3.2 Headers Required**
```javascript
Authorization: Bearer {access_token}
Content-Type: application/json
```

---

## 🧪 **Step 4: Testing Configuration**

### **4.1 Test Authentication Flow**
1. Open your tool in browser
2. Click "Connect to Fabric" button  
3. Should redirect to Microsoft login
4. After login, should return with access token
5. Check browser console for token details

### **4.2 Test API Calls**
```javascript
// Test workspace discovery
fetch('https://api.powerbi.com/v1.0/myorg/groups?$filter=name eq \'DataEngineeringProd\'', {
    headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    }
})
.then(response => response.json())
.then(data => console.log('Workspace:', data));
```

---

## 🔄 **Step 5: Implementation Phases**

### **Phase 1: Basic Authentication** ✅
- [x] Azure App Registration created
- [x] MSAL.js integration
- [x] Basic token acquisition

### **Phase 2: Workspace Discovery** 🚧
- [ ] Find DataEngineeringProd workspace
- [ ] Get workspace ID
- [ ] List workspace contents

### **Phase 3: Item Discovery** 🚧
- [ ] Discover Lakehouses
- [ ] Find Warehouses
- [ ] Identify Notebooks
- [ ] Map Semantic Models
- [ ] Locate Reports/Dashboards

### **Phase 4: Canvas Integration** 🚧
- [ ] Auto-populate canvas with discovered items
- [ ] Map Fabric types to canvas types
- [ ] Position items intelligently
- [ ] Create connections based on lineage

### **Phase 5: Real-time Sync** 🚧
- [ ] Periodic refresh of workspace items
- [ ] Handle item additions/deletions
- [ ] Update existing canvas items

---

## 📚 **Documentation References**

- [Power BI REST API](https://docs.microsoft.com/en-us/rest/api/power-bi/)
- [Microsoft Fabric API](https://learn.microsoft.com/en-us/fabric/admin/metadata-scanning)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [Azure App Registration Guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)

---

## ⚠️ **Important Notes**

1. **Permissions**: Your user account needs access to the DataEngineeringProd workspace
2. **CORS**: For local development, you might need to handle CORS issues
3. **Token Expiry**: Implement token refresh logic for production use
4. **Rate Limits**: Power BI API has rate limits - implement retry logic
5. **Security**: Never expose client secrets in frontend code (use PKCE flow)