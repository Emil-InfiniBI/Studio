# Step-by-Step Azure App Registration Setup

## 🎯 **Complete Setup Guide for BI-Mapping Tool**

### **Phase 1: Create App Registration**

1. **Open Azure Portal**
   - Go to [portal.azure.com](https://portal.azure.com)
   - Sign in with your organizational account

2. **Navigate to App Registrations**
   - Search for "App registrations" in the top search bar
   - Click on "App registrations" service

3. **Create New Registration**
   ```
   Click: "New registration"
   
   Application name: BI-Mapping-Tool-Fabric
   
   Supported account types: 
   ☑️ Accounts in this organizational directory only (Single tenant)
   
   Redirect URI:
   Platform: Single-page application (SPA)
   URI: file:///
   ```

4. **Click "Register"**

---

### **Phase 2: Configure API Permissions**

After registration, you'll be on the app's Overview page:

1. **Click "API permissions" in left menu**

2. **Add Power BI Service Permissions**
   ```
   Click: "Add a permission"
   → Select: "Power BI Service"
   → Choose: "Delegated permissions"
   
   Select these permissions:
   ☑️ Item.Read.All
   ☑️ Workspace.Read.All  
   ☑️ Dataset.Read.All
   ☑️ Report.Read.All
   ☑️ Dashboard.Read.All
   ```

3. **Add Microsoft Graph (Optional)**
   ```
   Click: "Add a permission" again
   → Select: "Microsoft Graph"
   → Choose: "Delegated permissions"
   
   Select:
   ☑️ User.Read
   ```

4. **Grant Admin Consent**
   ```
   Click: "Grant admin consent for [Your Organization]"
   → Click: "Yes" to confirm
   ```

---

### **Phase 3: Get Configuration Values**

From your app's **Overview** page, copy these values:

```
Application (client) ID: [COPY THIS]
Directory (tenant) ID: [COPY THIS]
```

**Save these values - you'll need them in the next step!**

---

### **Phase 4: Configure Authentication**

1. **Click "Authentication" in left menu**

2. **Add Additional Redirect URIs**
   ```
   Under "Single-page application":
   
   Add these URIs:
   - file:///
   - http://localhost:3000
   - http://localhost:8080  
   - http://127.0.0.1:8080
   - [Your production domain when ready]
   ```

3. **Configure Advanced Settings**
   ```
   ☑️ Access tokens (used for implicit flows)
   ☑️ ID tokens (used for implicit and hybrid flows)
   
   ☑️ Allow public client flows: No
   ```

4. **Click "Save"**

---

## ✅ **Checklist - Confirm You Have:**

- [ ] App Registration created
- [ ] Client ID copied 
- [ ] Tenant ID copied
- [ ] Power BI API permissions added and consented
- [ ] Redirect URIs configured
- [ ] Advanced settings configured

---

## 🔄 **Next: Update Your Application**

Once you have the **Client ID** and **Tenant ID**, I'll update your application code with these values.

**Reply with your Client ID and Tenant ID when ready!**

*(They look like: `12345678-1234-1234-1234-123456789012`)*