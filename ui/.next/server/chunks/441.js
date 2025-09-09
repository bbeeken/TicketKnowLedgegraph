"use strict";
exports.id = 441;
exports.ids = [441];
exports.modules = {

/***/ 6441:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Pj: () => (/* binding */ opsGraphAuth)
/* harmony export */ });
/* unused harmony exports getCurrentUser, getCurrentProfile, getUserSites, hasAdminAccess, canAccessSite */
// OpsGraph Authentication System - Microsoft + Local Auth
// Supports both Azure AD (Microsoft) login and local accounts
// Integrates with SQL Server RLS for site-scoped access control
// Microsoft Azure AD configuration
const MICROSOFT_CONFIG = {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "",
    tenantId: process.env.NEXT_PUBLIC_AZURE_TENANT_ID || "common",
    redirectUri: process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI || ( false ? 0 : ""),
    scopes: [
        "openid",
        "profile",
        "email",
        "User.Read"
    ]
};
// Authentication client for OpsGraph
class OpsGraphAuth {
    constructor(){
        this.currentUser = null;
        this.authStateListeners = [];
        // Check for existing session on load
        this.initializeSession();
    }
    async initializeSession() {
        try {
            // Check for stored session
            const token = localStorage.getItem("opsgraph_token");
            if (token) {
                // Validate token with backend
                const user = await this.validateToken(token);
                if (user) {
                    this.setCurrentUser(user);
                } else {
                    localStorage.removeItem("opsgraph_token");
                }
            }
        } catch (error) {
            console.error("Session initialization failed:", error);
        }
    }
    async validateToken(token) {
        try {
            // TODO: Replace with actual API call to /api/auth/validate
            const response = await fetch("/api/auth/validate", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error("Token validation failed:", error);
            return null;
        }
    }
    setCurrentUser(user) {
        this.currentUser = user;
        // Notify all listeners
        this.authStateListeners.forEach((listener)=>listener(user));
        // Set session context for backend RLS
        if (user) {
            this.setSessionContext(user.id);
        }
    }
    async setSessionContext(userId) {
        try {
            // TODO: This will call your backend to set SESSION_CONTEXT('user_id')
            await fetch("/api/auth/session-context", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("opsgraph_token")}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId
                })
            });
        } catch (error) {
            console.error("Failed to set session context:", error);
        }
    }
    // Microsoft Azure AD Login
    async signInWithMicrosoft() {
        try {
            // Redirect to Microsoft login
            const authUrl = this.buildMicrosoftAuthUrl();
            window.location.href = authUrl;
            return {
                user: null,
                error: null
            }; // Will redirect, so no immediate return
        } catch (error) {
            return {
                user: null,
                error: error
            };
        }
    }
    buildMicrosoftAuthUrl() {
        const params = new URLSearchParams({
            client_id: MICROSOFT_CONFIG.clientId,
            response_type: "code",
            redirect_uri: MICROSOFT_CONFIG.redirectUri,
            scope: MICROSOFT_CONFIG.scopes.join(" "),
            response_mode: "query",
            state: crypto.randomUUID()
        });
        return `https://login.microsoftonline.com/${MICROSOFT_CONFIG.tenantId}/oauth2/v2.0/authorize?${params}`;
    }
    // Handle Microsoft callback
    async handleMicrosoftCallback(code, state) {
        try {
            // TODO: Replace with actual API call to /api/auth/microsoft/callback
            const response = await fetch("/api/auth/microsoft/callback", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    code,
                    state
                })
            });
            if (!response.ok) {
                throw new Error("Microsoft login failed");
            }
            const data = await response.json();
            const user = data.user;
            // Store token and set user
            localStorage.setItem("opsgraph_token", data.access_token);
            this.setCurrentUser(user);
            return {
                user,
                error: null
            };
        } catch (error) {
            return {
                user: null,
                error: error
            };
        }
    }
    // Local Account Login
    async signInWithLocal(email, password) {
        try {
            // TODO: Replace with actual API call to /api/auth/local/signin
            const response = await fetch("/api/auth/local/signin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Login failed");
            }
            const data = await response.json();
            const user = data.user;
            // Store token and set user
            localStorage.setItem("opsgraph_token", data.access_token);
            this.setCurrentUser(user);
            return {
                user,
                error: null
            };
        } catch (error) {
            return {
                user: null,
                error: error
            };
        }
    }
    // Create Local Account (Admin only)
    async createLocalAccount(userData) {
        try {
            // TODO: Replace with actual API call to /api/auth/local/create
            const response = await fetch("/api/auth/local/create", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("opsgraph_token")}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(userData)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Account creation failed");
            }
            const data = await response.json();
            return {
                user: data.user,
                error: null
            };
        } catch (error) {
            return {
                user: null,
                error: error
            };
        }
    }
    async signOut() {
        try {
            // Call backend to invalidate session
            await fetch("/api/auth/signout", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("opsgraph_token")}`,
                    "Content-Type": "application/json"
                }
            });
            // Clear local storage and state
            localStorage.removeItem("opsgraph_token");
            this.setCurrentUser(null);
            return {
                error: null
            };
        } catch (error) {
            // Even if backend call fails, clear local state
            localStorage.removeItem("opsgraph_token");
            this.setCurrentUser(null);
            return {
                error: error
            };
        }
    }
    async getUser() {
        return this.currentUser;
    }
    async getProfile(userId) {
        return this.currentUser?.profile || null;
    }
    async updateProfile(userId, updates) {
        try {
            // TODO: Replace with actual API call to /api/users/profile
            const response = await fetch(`/api/users/${userId}/profile`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("opsgraph_token")}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(updates)
            });
            if (!response.ok) {
                throw new Error("Profile update failed");
            }
            // Update local user state
            if (this.currentUser?.profile) {
                this.currentUser.profile = {
                    ...this.currentUser.profile,
                    ...updates
                };
                this.setCurrentUser(this.currentUser);
            }
            return {
                error: null
            };
        } catch (error) {
            return {
                error: error
            };
        }
    }
    async getCurrentSession() {
        try {
            return {
                user: this.currentUser,
                error: null
            };
        } catch (error) {
            return {
                user: null,
                error: error
            };
        }
    }
    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
        // Return unsubscribe function
        return ()=>{
            const index = this.authStateListeners.indexOf(callback);
            if (index > -1) {
                this.authStateListeners.splice(index, 1);
            }
        };
    }
    // Site access control methods
    async canAccessSite(siteId) {
        const profile = this.currentUser?.profile;
        if (!profile) return false;
        // Admins can access all sites
        if (profile.is_admin || profile.role === "admin") return true;
        // Check if user has access to this specific site
        return profile.site_ids.includes(siteId);
    }
    async getUserSites() {
        const profile = this.currentUser?.profile;
        return profile?.site_ids || [];
    }
    async hasAdminAccess() {
        const profile = this.currentUser?.profile;
        return profile?.is_admin || profile?.role === "admin" || false;
    }
    // Reset password for local accounts
    async resetPassword(email) {
        try {
            // TODO: Replace with actual API call
            const response = await fetch("/api/auth/local/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email
                })
            });
            if (!response.ok) {
                throw new Error("Password reset failed");
            }
            return {
                error: null
            };
        } catch (error) {
            return {
                error: error
            };
        }
    }
    // Change password for local accounts
    async changePassword(currentPassword, newPassword) {
        try {
            // TODO: Replace with actual API call
            const response = await fetch("/api/auth/local/change-password", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("opsgraph_token")}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });
            if (!response.ok) {
                throw new Error("Password change failed");
            }
            return {
                error: null
            };
        } catch (error) {
            return {
                error: error
            };
        }
    }
}
// Export singleton instance
const opsGraphAuth = new OpsGraphAuth();
// Helper functions for common operations
async function getCurrentUser() {
    return await opsGraphAuth.getUser();
}
async function getCurrentProfile() {
    const user = await getCurrentUser();
    return user?.profile || null;
}
async function getUserSites() {
    const profile = await getCurrentProfile();
    return profile?.site_ids || [];
}
async function hasAdminAccess() {
    const profile = await getCurrentProfile();
    return profile?.role === "admin";
}
async function canAccessSite(siteId) {
    const siteIds = await getUserSites();
    const isAdmin = await hasAdminAccess();
    return isAdmin || siteIds.includes(siteId);
}


/***/ })

};
;