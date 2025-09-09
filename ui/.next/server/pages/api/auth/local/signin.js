"use strict";
(() => {
var exports = {};
exports.id = 336;
exports.ids = [336];
exports.modules = {

/***/ 730:
/***/ ((module) => {

module.exports = require("next/dist/server/api-utils/node.js");

/***/ }),

/***/ 3076:
/***/ ((module) => {

module.exports = require("next/dist/server/future/route-modules/route-module.js");

/***/ }),

/***/ 1056:
/***/ ((module) => {

module.exports = require("next/dist/server/web/spec-extension/response.js");

/***/ }),

/***/ 4131:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  config: () => (/* binding */ config),
  "default": () => (/* binding */ next_route_loaderkind_PAGES_API_page_2Fapi_2Fauth_2Flocal_2Fsignin_preferredRegion_absolutePagePath_private_next_pages_2Fapi_2Fauth_2Flocal_2Fsignin_ts_middlewareConfigBase64_e30_3D_),
  routeModule: () => (/* binding */ routeModule)
});

// NAMESPACE OBJECT: ./src/pages/api/auth/local/signin.ts
var signin_namespaceObject = {};
__webpack_require__.r(signin_namespaceObject);
__webpack_require__.d(signin_namespaceObject, {
  POST: () => (POST)
});

// EXTERNAL MODULE: ./node_modules/next/dist/server/future/route-modules/pages-api/module.js
var pages_api_module = __webpack_require__(6429);
// EXTERNAL MODULE: ./node_modules/next/dist/server/future/route-kind.js
var route_kind = __webpack_require__(7153);
// EXTERNAL MODULE: ./node_modules/next/dist/build/webpack/loaders/next-route-loader/helpers.js
var helpers = __webpack_require__(7305);
// EXTERNAL MODULE: ./node_modules/next/dist/server/web/exports/next-response.js
var next_response = __webpack_require__(3141);
;// CONCATENATED MODULE: ./src/pages/api/auth/local/signin.ts

async function POST(request) {
    try {
        const { email, password } = await request.json();
        if (!email || !password) {
            return next_response/* default */.Z.json({
                error: "Email and password are required"
            }, {
                status: 400
            });
        }
        // TODO: Replace with actual database authentication
        // This would typically:
        // 1. Look up user by email in the database
        // 2. Verify password hash
        // 3. Check if account is active
        // 4. Generate session token
        // 5. Set HTTP-only cookie for session management
        // Mock implementation - in real app, verify against database
        if (email === "admin@opsgraph.com" && password === "admin123") {
            const mockUser = {
                id: crypto.randomUUID(),
                email: "admin@opsgraph.com",
                full_name: "System Administrator",
                auth_provider: "local",
                profile: {
                    is_admin: true,
                    role: "admin",
                    site_ids: [
                        1,
                        2,
                        3,
                        4,
                        5,
                        6,
                        7
                    ],
                    avatar_url: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            };
            const accessToken = "mock_jwt_token_" + crypto.randomUUID();
            return next_response/* default */.Z.json({
                user: mockUser,
                access_token: accessToken,
                message: "Login successful"
            });
        }
        // Mock for regular user
        if (email === "manager@hotsprings.com" && password === "manager123") {
            const mockUser = {
                id: crypto.randomUUID(),
                email: "manager@hotsprings.com",
                full_name: "Site Manager",
                auth_provider: "local",
                profile: {
                    is_admin: false,
                    role: "manager",
                    site_ids: [
                        1
                    ],
                    avatar_url: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            };
            const accessToken = "mock_jwt_token_" + crypto.randomUUID();
            return next_response/* default */.Z.json({
                user: mockUser,
                access_token: accessToken,
                message: "Login successful"
            });
        }
        return next_response/* default */.Z.json({
            error: "Invalid email or password"
        }, {
            status: 401
        });
    } catch (error) {
        console.error("Local signin error:", error);
        return next_response/* default */.Z.json({
            error: "Authentication failed"
        }, {
            status: 500
        });
    }
}

;// CONCATENATED MODULE: ./node_modules/next/dist/build/webpack/loaders/next-route-loader/index.js?kind=PAGES_API&page=%2Fapi%2Fauth%2Flocal%2Fsignin&preferredRegion=&absolutePagePath=private-next-pages%2Fapi%2Fauth%2Flocal%2Fsignin.ts&middlewareConfigBase64=e30%3D!
// @ts-ignore this need to be imported from next/dist to be external



const PagesAPIRouteModule = pages_api_module.PagesAPIRouteModule;
// Import the userland code.
// @ts-expect-error - replaced by webpack/turbopack loader

// Re-export the handler (should be the default export).
/* harmony default export */ const next_route_loaderkind_PAGES_API_page_2Fapi_2Fauth_2Flocal_2Fsignin_preferredRegion_absolutePagePath_private_next_pages_2Fapi_2Fauth_2Flocal_2Fsignin_ts_middlewareConfigBase64_e30_3D_ = ((0,helpers/* hoist */.l)(signin_namespaceObject, "default"));
// Re-export config.
const config = (0,helpers/* hoist */.l)(signin_namespaceObject, "config");
// Create and export the route module that will be consumed.
const routeModule = new PagesAPIRouteModule({
    definition: {
        kind: route_kind/* RouteKind */.x.PAGES_API,
        page: "/api/auth/local/signin",
        pathname: "/api/auth/local/signin",
        // The following aren't used in production.
        bundlePath: "",
        filename: ""
    },
    userland: signin_namespaceObject
});

//# sourceMappingURL=pages-api.js.map

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [752], () => (__webpack_exec__(4131)));
module.exports = __webpack_exports__;

})();