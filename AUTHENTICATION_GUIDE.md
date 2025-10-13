# 🔐 BI Studio Authentication Guide

## Overview
Your BI Studio now includes password protection to prevent unauthorized access.

## Default Login Credentials
- **Password:** `Baettr2025`
- **Session Duration:** 8 hours (auto-logout after inactivity)
- **Max Login Attempts:** 3 (5-minute lockout after failed attempts)

---

## How to Change the Password

### Method 1: Via Browser Console (Recommended)
1. Login to BI Studio
2. Press `F12` to open Developer Tools
3. Go to the "Console" tab
4. Run this command:
```javascript
authSystem.changePassword('BIStudio2025', 'YourNewPassword123')
```
5. Replace `'YourNewPassword123'` with your desired password
6. Press Enter

### Method 2: Programmatically
Add this code to your application:
```javascript
// Change password
async function updatePassword() {
    const current = prompt('Enter current password:');
    const newPass = prompt('Enter new password:');
    const confirm = prompt('Confirm new password:');
    
    if (newPass !== confirm) {
        alert('Passwords do not match!');
        return;
    }
    
    try {
        await authSystem.changePassword(current, newPass);
        alert('Password changed successfully!');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}
```

---

## Password Reset (Emergency)

If you forget your password, you can reset it to the default:

1. Close the browser
2. Press `F12` and go to Console
3. Run:
```javascript
localStorage.removeItem('bi_studio_password_hash');
localStorage.removeItem('bi_studio_auth_session');
```
4. Refresh the page
5. Login with default password: `Baettr2025`

---

## Security Features

✅ **Password Hashing** - Passwords are hashed using SHA-256  
✅ **Session Management** - 8-hour auto-logout  
✅ **Brute Force Protection** - 3 attempts, then 5-minute lockout  
✅ **Local Storage** - All data stored locally (no server needed)  
✅ **No Network Calls** - Works 100% offline  

---

## Sharing with Team

When sharing the ZIP file with colleagues:

1. Share the default password separately (email, Teams, etc.)
2. Instruct them to change it after first login
3. Or set a custom password before sharing

### Set Custom Password Before Sharing:
```javascript
// In browser console after login
authSystem.changePassword('Baettr2025', 'TeamPassword2025');
```

Then share `TeamPassword2025` with your team.

---

## User Management

### Current Session Info
```javascript
// Check session details
authSystem.getSessionInfo();
```

### Manual Logout
```javascript
// Logout current user
authSystem.logout();
window.location.reload();
```

### Check Authentication Status
```javascript
// Check if logged in
authSystem.isAuthenticated(); // returns true/false
```

---

## Advanced: Multiple Users (Future Enhancement)

To add individual user accounts, you would need to:
1. Create a user database (JSON file or localStorage)
2. Add username field to login form
3. Store password hashes per user
4. Add user management UI

This is a more complex implementation but can be added if needed.

---

## Troubleshooting

**Problem:** Locked out after too many attempts  
**Solution:** Wait 5 minutes or clear lockout:
```javascript
localStorage.removeItem('bi_studio_lockout_until');
localStorage.removeItem('bi_studio_login_attempts');
```

**Problem:** Forgot password  
**Solution:** Reset to default (see Password Reset above)

**Problem:** Session expired  
**Solution:** Just login again - your work is auto-saved

---

## Technical Details

- **Password Hash Storage:** `localStorage.bi_studio_password_hash`
- **Session Storage:** `localStorage.bi_studio_auth_session`
- **Hash Algorithm:** SHA-256
- **Session Key:** Encrypted JSON object with expiry

---

For questions or issues, contact your BI Studio administrator.
