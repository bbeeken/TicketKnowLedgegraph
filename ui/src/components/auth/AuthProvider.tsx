import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthUser, opsGraphAuth } from '@/lib/auth';
import { useRouter } from 'next/router';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  canAccessSite: (siteId: number) => Promise<boolean>;
  hasAdminAccess: () => Promise<boolean>;
  getUserSites: () => Promise<number[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = opsGraphAuth.onAuthStateChange((newUser) => {
      setUser(newUser);
      setIsLoading(false);
    });

    // Initial auth check
    const checkAuth = async () => {
      try {
  // Wait for client-side auth initialization to complete
  await opsGraphAuth.waitUntilInitialized();
        const currentUser = await opsGraphAuth.getUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    return unsubscribe;
  }, []);

  // Redirect to login if not authenticated (except for public pages)
  useEffect(() => {
    const publicPaths = ['/login', '/auth/callback/microsoft'];
    const isPublicPath = publicPaths.some(path => router.pathname.startsWith(path));
    
    if (!isLoading && !user && !isPublicPath) {
      router.push('/login');
    }
  }, [user, isLoading, router.pathname, router]);

  const signOut = async () => {
    await opsGraphAuth.signOut();
    router.push('/login');
  };

  const canAccessSite = async (siteId: number): Promise<boolean> => {
    return await opsGraphAuth.canAccessSite(siteId);
  };

  const hasAdminAccess = async (): Promise<boolean> => {
    return await opsGraphAuth.hasAdminAccess();
  };

  const getUserSites = async (): Promise<number[]> => {
    return await opsGraphAuth.getUserSites();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    signOut,
    canAccessSite,
    hasAdminAccess,
    getUserSites,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protecting routes
export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  const AuthenticatedComponent = (props: P) => {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !user) {
        router.push('/login');
      }
    }, [user, isLoading, router]);

    if (isLoading) {
      return <div>Loading...</div>; // You can replace with a proper loading component
    }

    if (!user) {
      return null;
    }

    return <Component {...props} />;
  };
  
  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name || 'Component'})`;
  return AuthenticatedComponent;
};

// Higher-order component for admin-only routes
export const withAdminAuth = <P extends object>(Component: React.ComponentType<P>) => {
  const AdminComponent = (props: P) => {
    const { user, isLoading, hasAdminAccess } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminCheckLoading, setAdminCheckLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
      const checkAdmin = async () => {
        if (user) {
          const adminAccess = await hasAdminAccess();
          setIsAdmin(adminAccess);
        }
        setAdminCheckLoading(false);
      };

      if (!isLoading) {
        checkAdmin();
      }
    }, [user, isLoading, hasAdminAccess]);

    useEffect(() => {
      if (!isLoading && !adminCheckLoading && (!user || !isAdmin)) {
        router.push('/dashboard'); // Redirect non-admins to dashboard
      }
    }, [user, isAdmin, isLoading, adminCheckLoading, router]);

    if (isLoading || adminCheckLoading) {
      return <div>Loading...</div>;
    }

    if (!user || !isAdmin) {
      return null;
    }

    return <Component {...props} />;
  };
  
  AdminComponent.displayName = `withAdminAuth(${Component.displayName || Component.name || 'Component'})`;
  return AdminComponent;
};
