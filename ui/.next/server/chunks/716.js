"use strict";
exports.id = 716;
exports.ids = [716];
exports.modules = {

/***/ 1716:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   aC: () => (/* binding */ useAuth),
/* harmony export */   c2: () => (/* binding */ withAdminAuth)
/* harmony export */ });
/* unused harmony exports AuthProvider, withAuth */
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5893);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6689);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _lib_auth__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(6441);
/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(1853);
/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(next_router__WEBPACK_IMPORTED_MODULE_3__);




const AuthContext = /*#__PURE__*/ (0,react__WEBPACK_IMPORTED_MODULE_1__.createContext)(undefined);
const AuthProvider = ({ children })=>{
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    useEffect(()=>{
        // Subscribe to auth state changes
        const unsubscribe = opsGraphAuth.onAuthStateChange((newUser)=>{
            setUser(newUser);
            setIsLoading(false);
        });
        // Initial auth check
        const checkAuth = async ()=>{
            try {
                const currentUser = await opsGraphAuth.getUser();
                setUser(currentUser);
            } catch (error) {
                console.error("Auth check failed:", error);
            } finally{
                setIsLoading(false);
            }
        };
        checkAuth();
        return unsubscribe;
    }, []);
    // Redirect to login if not authenticated (except for public pages)
    useEffect(()=>{
        const publicPaths = [
            "/login",
            "/auth/callback/microsoft"
        ];
        const isPublicPath = publicPaths.some((path)=>router.pathname.startsWith(path));
        if (!isLoading && !user && !isPublicPath) {
            router.push("/login");
        }
    }, [
        user,
        isLoading,
        router.pathname
    ]);
    const signOut = async ()=>{
        await opsGraphAuth.signOut();
        router.push("/login");
    };
    const canAccessSite = async (siteId)=>{
        return await opsGraphAuth.canAccessSite(siteId);
    };
    const hasAdminAccess = async ()=>{
        return await opsGraphAuth.hasAdminAccess();
    };
    const getUserSites = async ()=>{
        return await opsGraphAuth.getUserSites();
    };
    const value = {
        user,
        isLoading,
        signOut,
        canAccessSite,
        hasAdminAccess,
        getUserSites
    };
    return /*#__PURE__*/ _jsx(AuthContext.Provider, {
        value: value,
        children: children
    });
};
const useAuth = ()=>{
    const context = (0,react__WEBPACK_IMPORTED_MODULE_1__.useContext)(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
// Higher-order component for protecting routes
const withAuth = (Component)=>{
    return (props)=>{
        const { user, isLoading } = useAuth();
        const router = useRouter();
        useEffect(()=>{
            if (!isLoading && !user) {
                router.push("/login");
            }
        }, [
            user,
            isLoading,
            router
        ]);
        if (isLoading) {
            return /*#__PURE__*/ _jsx("div", {
                children: "Loading..."
            }); // You can replace with a proper loading component
        }
        if (!user) {
            return null;
        }
        return /*#__PURE__*/ _jsx(Component, {
            ...props
        });
    };
};
// Higher-order component for admin-only routes
const withAdminAuth = (Component)=>{
    return (props)=>{
        const { user, isLoading, hasAdminAccess } = useAuth();
        const [isAdmin, setIsAdmin] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
        const [adminCheckLoading, setAdminCheckLoading] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(true);
        const router = (0,next_router__WEBPACK_IMPORTED_MODULE_3__.useRouter)();
        (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(()=>{
            const checkAdmin = async ()=>{
                if (user) {
                    const adminAccess = await hasAdminAccess();
                    setIsAdmin(adminAccess);
                }
                setAdminCheckLoading(false);
            };
            if (!isLoading) {
                checkAdmin();
            }
        }, [
            user,
            isLoading,
            hasAdminAccess
        ]);
        (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(()=>{
            if (!isLoading && !adminCheckLoading && (!user || !isAdmin)) {
                router.push("/dashboard"); // Redirect non-admins to dashboard
            }
        }, [
            user,
            isAdmin,
            isLoading,
            adminCheckLoading,
            router
        ]);
        if (isLoading || adminCheckLoading) {
            return /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("div", {
                children: "Loading..."
            });
        }
        if (!user || !isAdmin) {
            return null;
        }
        return /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(Component, {
            ...props
        });
    };
};


/***/ })

};
;