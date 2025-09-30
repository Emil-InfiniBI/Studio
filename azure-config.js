/**
 * Azure Configuration for Microsoft Fabric Integration
 * Update these values after setting up your Azure App Registration
 */

const AZURE_CONFIG = {
    // Real Azure App Registration values
    CLIENT_ID: '9a6daac8-705e-4a40-97be-16a3e2e29619',  // Your Azure App Registration Client ID
    TENANT_ID: 'b203d621-fb1f-41e5-a186-be4d4c5184b1',  // Your Azure App Registration Tenant ID
    
    // Redirect URIs (ensure these match your Azure App Registration)
    REDIRECT_URI: window.location.origin,
    
    // Power BI API Configuration
    POWER_BI_API: {
        BASE_URL: 'https://api.powerbi.com/v1.0/myorg',
        SCOPES: [
            'https://analysis.windows.net/powerbi/api/Item.Read.All',
            'https://analysis.windows.net/powerbi/api/Workspace.Read.All',
            'https://analysis.windows.net/powerbi/api/Dataset.Read.All',
            'https://analysis.windows.net/powerbi/api/Report.Read.All',
            'https://analysis.windows.net/powerbi/api/Dashboard.Read.All'
        ]
    },
    
    // Microsoft Fabric API Configuration  
    FABRIC_API: {
        BASE_URL: 'https://api.fabric.microsoft.com/v1',
        SCOPES: [
            'https://api.fabric.microsoft.com/Item.Read.All',
            'https://api.fabric.microsoft.com/Workspace.Read.All'
        ]
    },
    
    // Your specific workspace
    WORKSPACE: {
        NAME: 'DataEngineeringProd',
        CONNECTION_URI: 'powerbi://api.powerbi.com/v1.0/myorg/DataEngineeringProd'
    }
};

// Validation function to check if configuration is set up
function validateAzureConfig() {
    const missingConfig = [];
    
    if (AZURE_CONFIG.CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
        missingConfig.push('CLIENT_ID');
    }
    
    if (AZURE_CONFIG.TENANT_ID === 'YOUR_TENANT_ID_HERE') {
        missingConfig.push('TENANT_ID');
    }
    
    return {
        isValid: missingConfig.length === 0,
        missingConfig: missingConfig
    };
}

// Export configuration
window.AZURE_CONFIG = AZURE_CONFIG;
window.validateAzureConfig = validateAzureConfig;