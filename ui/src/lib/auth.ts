// OpsGraph Authentication System - Microsoft + Local Auth
// Supports both Azure AD (Microsoft) login and local accounts
// Integrates with SQL Server RLS for site-scoped access control

export type Profile = {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  site_ids: number[]; // Sites user can access
  team_ids: number[];
  role: 'admin' | 'manager' | 'technician' | 'viewer';
  auth_provider: 'microsoft' | 'local'; // Track auth method
  is_admin: boolean; // Quick admin check
  created_at: string;
  updated_at: string;
};

export type AuthUser = {
  id: string;
  email: string;
  profile?: Profile;
  access_token?: string;
  refresh_token?: string;
};

export type LoginMethod = 'microsoft' | 'local';

// Microsoft Azure AD configuration
const MICROSOFT_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '',
  tenantId: process.env.NEXT_PUBLIC_AZURE_TENANT_ID || 'common',
  redirectUri: process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI || `${window?.location?.origin}/auth/callback/microsoft`,
  scopes: ['openid', 'profile', 'email', 'User.Read'],
};

// Authentication client for OpsGraph
class OpsGraphAuth {
  private currentUser: AuthUser | null = null;
  private authStateListeners: ((user: AuthUser | null) => void)[] = [];

  constructor() {
    // Check for existing session on load
    this.initializeSession();
  }

  private async initializeSession() {
    try {
      // Check for stored session
      const token = localStorage.getItem('opsgraph_token');
      if (token) {
        // Validate token with backend
        const user = await this.validateToken(token);
        if (user) {
          this.setCurrentUser(user);
        } else {
          localStorage.removeItem('opsgraph_token');
        }
      }
    } catch (error) {
      console.error('Session initialization failed:', error);
    }
  }

  private async validateToken(token: string): Promise<AuthUser | null> {
    try {
      // TODO: Replace with actual API call to /api/auth/validate
      const response = await fetch('/api/auth/validate', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  }

  private setCurrentUser(user: AuthUser | null) {
    this.currentUser = user;
    // Notify all listeners
    this.authStateListeners.forEach(listener => listener(user));
    
    // Set session context for backend RLS
    if (user) {
      this.setSessionContext(user.id);
    }
  }

  private async setSessionContext(userId: string) {
    try {
      // TODO: This will call your backend to set SESSION_CONTEXT('user_id')
      await fetch('/api/auth/session-context', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('opsgraph_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
    } catch (error) {
      console.error('Failed to set session context:', error);
    }
  }

  // Microsoft Azure AD Login
  async signInWithMicrosoft(): Promise<{ user: AuthUser | null; error: Error | null }> {
    try {
      // Redirect to Microsoft login
      const authUrl = this.buildMicrosoftAuthUrl();
      window.location.href = authUrl;
      return { user: null, error: null }; // Will redirect, so no immediate return
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  private buildMicrosoftAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: MICROSOFT_CONFIG.clientId,
      response_type: 'code',
      redirect_uri: MICROSOFT_CONFIG.redirectUri,
      scope: MICROSOFT_CONFIG.scopes.join(' '),
      response_mode: 'query',
      state: crypto.randomUUID(), // CSRF protection
    });

    return `https://login.microsoftonline.com/${MICROSOFT_CONFIG.tenantId}/oauth2/v2.0/authorize?${params}`;
  }

  // Handle Microsoft callback
  async handleMicrosoftCallback(code: string, state: string): Promise<{ user: AuthUser | null; error: Error | null }> {
    try {
      // TODO: Replace with actual API call to /api/auth/microsoft/callback
      const response = await fetch('/api/auth/microsoft/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state })
      });

      if (!response.ok) {
        throw new Error('Microsoft login failed');
      }

      const data = await response.json();
      const user = data.user as AuthUser;
      
      // Store token and set user
      localStorage.setItem('opsgraph_token', data.access_token);
      this.setCurrentUser(user);
      
      return { user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  // Local Account Login
  async signInWithLocal(email: string, password: string): Promise<{ user: AuthUser | null; error: Error | null }> {
    try {
      // TODO: Replace with actual API call to /api/auth/local/signin
      const response = await fetch('/api/auth/local/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      const user = data.user as AuthUser;
      
      // Store token and set user
      localStorage.setItem('opsgraph_token', data.access_token);
      this.setCurrentUser(user);
      
      return { user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  // Create Local Account (Admin only)
  async createLocalAccount(userData: {
    email: string;
    password: string;
    full_name: string;
    site_ids: number[];
    role: 'manager' | 'technician' | 'viewer';
  }): Promise<{ user: AuthUser | null; error: Error | null }> {
    try {
      // TODO: Replace with actual API call to /api/auth/local/create
      const response = await fetch('/api/auth/local/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('opsgraph_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Account creation failed');
      }

      const data = await response.json();
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  async signOut(): Promise<{ error: Error | null }> {
    try {
      // Call backend to invalidate session
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('opsgraph_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Clear local storage and state
      localStorage.removeItem('opsgraph_token');
      this.setCurrentUser(null);
      
      return { error: null };
    } catch (error) {
      // Even if backend call fails, clear local state
      localStorage.removeItem('opsgraph_token');
      this.setCurrentUser(null);
      return { error: error as Error };
    }
  }

  async getUser(): Promise<AuthUser | null> {
    return this.currentUser;
  }

  async getProfile(userId: string): Promise<Profile | null> {
    return this.currentUser?.profile || null;
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<{ error: Error | null }> {
    try {
      // TODO: Replace with actual API call to /api/users/profile
      const response = await fetch(`/api/users/${userId}/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('opsgraph_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Profile update failed');
      }

      // Update local user state
      if (this.currentUser?.profile) {
        this.currentUser.profile = { ...this.currentUser.profile, ...updates };
        this.setCurrentUser(this.currentUser);
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async getCurrentSession(): Promise<{ user: AuthUser | null; error: Error | null }> {
    try {
      return { user: this.currentUser, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    this.authStateListeners.push(callback);
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  // Site access control methods
  async canAccessSite(siteId: number): Promise<boolean> {
    const profile = this.currentUser?.profile;
    if (!profile) return false;
    
    // Admins can access all sites
    if (profile.is_admin || profile.role === 'admin') return true;
    
    // Check if user has access to this specific site
    return profile.site_ids.includes(siteId);
  }

  async getUserSites(): Promise<number[]> {
    const profile = this.currentUser?.profile;
    return profile?.site_ids || [];
  }

  async hasAdminAccess(): Promise<boolean> {
    const profile = this.currentUser?.profile;
    return profile?.is_admin || profile?.role === 'admin' || false;
  }

  // Reset password for local accounts
  async resetPassword(email: string): Promise<{ error: Error | null }> {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/local/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error('Password reset failed');
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  // Change password for local accounts
  async changePassword(currentPassword: string, newPassword: string): Promise<{ error: Error | null }> {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/local/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('opsgraph_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!response.ok) {
        throw new Error('Password change failed');
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }
}

// Export singleton instance
export const opsGraphAuth = new OpsGraphAuth();

// Helper functions for common operations
export async function getCurrentUser(): Promise<AuthUser | null> {
  return await opsGraphAuth.getUser();
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  return user?.profile || null;
}

export async function getUserSites(): Promise<number[]> {
  const profile = await getCurrentProfile();
  return profile?.site_ids || [];
}

export async function hasAdminAccess(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return profile?.role === 'admin';
}

export async function canAccessSite(siteId: number): Promise<boolean> {
  const siteIds = await getUserSites();
  const isAdmin = await hasAdminAccess();
  return isAdmin || siteIds.includes(siteId);
}
