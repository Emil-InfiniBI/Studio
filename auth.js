// BI Studio Authentication System
// Simple password-based authentication with session management

class AuthSystem {
    constructor() {
        // Default password hash (SHA-256 of "Baettr2025")
        // You can change this password in the settings
        this.passwordHash = '8d17e39274db3ae506b98c61a2e9113d546a730f04d5201a026e5623096d9bbd';
        this.sessionKey = 'bi_studio_auth_session';
        this.sessionDuration = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
        this.maxAttempts = 3;
        this.lockoutDuration = 5 * 60 * 1000; // 5 minutes lockout
        this.attemptKey = 'bi_studio_login_attempts';
        this.lockoutKey = 'bi_studio_lockout_until';
        
        // Load custom password hash if set
        const customHash = localStorage.getItem('bi_studio_password_hash');
        if (customHash) {
            this.passwordHash = customHash;
        }
    }

    // Hash password using SHA-256
    async hashPassword(password) {
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // Check if user is currently authenticated
    isAuthenticated() {
        const session = localStorage.getItem(this.sessionKey);
        if (!session) return false;

        try {
            const sessionData = JSON.parse(session);
            const now = Date.now();
            
            // Check if session is still valid
            if (sessionData.expiresAt > now) {
                return true;
            } else {
                // Session expired, clean up
                this.logout();
                return false;
            }
        } catch (e) {
            return false;
        }
    }

    // Check if user is locked out due to too many failed attempts
    isLockedOut() {
        const lockoutUntil = localStorage.getItem(this.lockoutKey);
        if (!lockoutUntil) return false;

        const now = Date.now();
        const lockoutTime = parseInt(lockoutUntil);

        if (now < lockoutTime) {
            return true;
        } else {
            // Lockout expired, clean up
            localStorage.removeItem(this.lockoutKey);
            localStorage.removeItem(this.attemptKey);
            return false;
        }
    }

    // Get remaining lockout time in seconds
    getLockoutTime() {
        const lockoutUntil = localStorage.getItem(this.lockoutKey);
        if (!lockoutUntil) return 0;

        const now = Date.now();
        const lockoutTime = parseInt(lockoutUntil);
        const remaining = Math.max(0, Math.floor((lockoutTime - now) / 1000));
        return remaining;
    }

    // Attempt login with password
    async login(password) {
        // Check if locked out
        if (this.isLockedOut()) {
            const remaining = this.getLockoutTime();
            throw new Error(`Too many failed attempts. Try again in ${remaining} seconds.`);
        }

        // Hash the provided password
        const hash = await this.hashPassword(password);

        // Check if password matches
        if (hash === this.passwordHash) {
            // Success! Create session
            const session = {
                authenticated: true,
                loginTime: Date.now(),
                expiresAt: Date.now() + this.sessionDuration
            };
            localStorage.setItem(this.sessionKey, JSON.stringify(session));
            
            // Clear failed attempts
            localStorage.removeItem(this.attemptKey);
            localStorage.removeItem(this.lockoutKey);
            
            return true;
        } else {
            // Failed attempt
            const attempts = parseInt(localStorage.getItem(this.attemptKey) || '0') + 1;
            localStorage.setItem(this.attemptKey, attempts.toString());

            if (attempts >= this.maxAttempts) {
                // Lock out user
                const lockoutUntil = Date.now() + this.lockoutDuration;
                localStorage.setItem(this.lockoutKey, lockoutUntil.toString());
                throw new Error(`Too many failed attempts. Account locked for ${this.lockoutDuration / 60000} minutes.`);
            } else {
                const remaining = this.maxAttempts - attempts;
                throw new Error(`Invalid password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
            }
        }
    }

    // Logout and clear session
    logout() {
        localStorage.removeItem(this.sessionKey);
    }

    // Change password (requires current password)
    async changePassword(currentPassword, newPassword) {
        const currentHash = await this.hashPassword(currentPassword);
        
        if (currentHash !== this.passwordHash) {
            throw new Error('Current password is incorrect');
        }

        const newHash = await this.hashPassword(newPassword);
        localStorage.setItem('bi_studio_password_hash', newHash);
        this.passwordHash = newHash;
        
        return true;
    }

    // Reset to default password (for admin recovery)
    resetToDefault() {
        localStorage.removeItem('bi_studio_password_hash');
        this.passwordHash = '8d17e39274db3ae506b98c61a2e9113d546a730f04d5201a026e5623096d9bbd'; // Baettr2025
    }

    // Get session info
    getSessionInfo() {
        const session = localStorage.getItem(this.sessionKey);
        if (!session) return null;

        try {
            const sessionData = JSON.parse(session);
            const now = Date.now();
            const remainingTime = Math.max(0, sessionData.expiresAt - now);
            const remainingHours = Math.floor(remainingTime / (60 * 60 * 1000));
            const remainingMinutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));

            return {
                loginTime: new Date(sessionData.loginTime).toLocaleString(),
                expiresAt: new Date(sessionData.expiresAt).toLocaleString(),
                remainingTime: `${remainingHours}h ${remainingMinutes}m`
            };
        } catch (e) {
            return null;
        }
    }
}

// Create global auth instance
const authSystem = new AuthSystem();

// Check authentication on page load
window.addEventListener('DOMContentLoaded', () => {
    if (!authSystem.isAuthenticated()) {
        showLoginModal();
    }
});

// Show login modal
function showLoginModal() {
    // Check if modal already exists
    if (document.getElementById('auth-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.innerHTML = `
        <div class="auth-overlay">
            <div class="auth-modal">
                <div class="auth-header">
                    <h2>🔐 InfiniBI Studio</h2>
                    <p>Please login to access the application</p>
                </div>
                <div class="auth-body">
                    <form id="login-form" class="auth-form">
                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" id="auth-password" placeholder="Enter password" autocomplete="current-password" required>
                        </div>
                        <div id="auth-error" class="auth-error"></div>
                        <button type="submit" class="auth-btn">Login</button>
                    </form>
                    <div class="auth-footer">
                        <small>Default password: <code>Baettr2025</code></small>
                        <br>
                        <small style="margin-top: 8px; display: block; color: #6b7280;">Contact your administrator if you forgot your password</small>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .auth-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
        }

        .auth-modal {
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            width: 90%;
            max-width: 420px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            overflow: hidden;
        }

        .auth-header {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            padding: 24px;
            text-align: center;
            color: white;
        }

        .auth-header h2 {
            margin: 0 0 8px 0;
            font-size: 24px;
            font-weight: 700;
        }

        .auth-header p {
            margin: 0;
            opacity: 0.9;
            font-size: 14px;
        }

        .auth-body {
            padding: 32px 24px 24px;
        }

        .auth-form {
            margin-bottom: 20px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            color: #e5e7eb;
            margin-bottom: 8px;
            font-weight: 600;
            font-size: 14px;
        }

        .form-group input {
            width: 100%;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: white;
            font-size: 14px;
            transition: all 0.2s;
            box-sizing: border-box;
        }

        .form-group input:focus {
            outline: none;
            border-color: #3b82f6;
            background: rgba(255, 255, 255, 0.08);
        }

        .auth-btn {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .auth-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
        }

        .auth-btn:active {
            transform: translateY(0);
        }

        .auth-error {
            color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
            padding: 10px 12px;
            border-radius: 6px;
            margin-bottom: 16px;
            font-size: 13px;
            display: none;
            border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .auth-error.show {
            display: block;
        }

        .auth-footer {
            text-align: center;
            padding-top: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .auth-footer small {
            color: #9ca3af;
            font-size: 12px;
        }

        .auth-footer code {
            background: rgba(255, 255, 255, 0.1);
            padding: 2px 8px;
            border-radius: 4px;
            color: #60a5fa;
            font-family: monospace;
        }
    `;
    document.head.appendChild(style);

    // Handle form submission
    const form = document.getElementById('login-form');
    const passwordInput = document.getElementById('auth-password');
    const errorDiv = document.getElementById('auth-error');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = passwordInput.value;

        try {
            await authSystem.login(password);
            
            // Success - remove modal
            modal.remove();
            
            // Show success notification if available
            if (window.playground && playground.showNotification) {
                playground.showNotification('✅ Login successful!', 'success');
            }
        } catch (error) {
            // Show error
            errorDiv.textContent = error.message;
            errorDiv.classList.add('show');
            passwordInput.value = '';
            passwordInput.focus();
        }
    });

    passwordInput.focus();
}

// Add logout button to application (call this from your app's UI)
function addLogoutButton() {
    const logoutBtn = document.createElement('button');
    logoutBtn.innerHTML = '🚪 Logout';
    logoutBtn.className = 'logout-btn';
    logoutBtn.onclick = () => {
        if (confirm('Are you sure you want to logout?')) {
            authSystem.logout();
            window.location.reload();
        }
    };
    
    // Find a suitable place to add the button (e.g., header or toolbar)
    const header = document.querySelector('.header') || document.querySelector('header') || document.body;
    header.appendChild(logoutBtn);
}
