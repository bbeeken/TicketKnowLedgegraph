"use strict";
(() => {
var exports = {};
exports.id = 98;
exports.ids = [98];
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

/***/ 3838:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  config: () => (/* binding */ config),
  "default": () => (/* binding */ next_route_loaderkind_PAGES_API_page_2Fapi_2Fauth_2Fmicrosoft_2Fcallback_preferredRegion_absolutePagePath_private_next_pages_2Fapi_2Fauth_2Fmicrosoft_2Fcallback_ts_middlewareConfigBase64_e30_3D_),
  routeModule: () => (/* binding */ routeModule)
});

// NAMESPACE OBJECT: ./src/pages/api/auth/microsoft/callback.ts
var callback_namespaceObject = {};
__webpack_require__.r(callback_namespaceObject);
__webpack_require__.d(callback_namespaceObject, {
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
;// CONCATENATED MODULE: ./src/pages/api/auth/microsoft/callback.ts

async function POST(request) {
    try {
        const { code, state } = await request.json();
        if (!code) {
            return next_response/* default */.Z.json({
                error: "Authorization code is required"
            }, {
                status: 400
            });
        }
        // TODO: Replace with actual Microsoft Graph API integration
        // This would typically:
        // 1. Exchange authorization code for access token
        // 2. Fetch user profile from Microsoft Graph
        // 3. Create or update user in local database
        // 4. Generate session token
        // 5. Set HTTP-only cookie for session management
        // Mock implementation - would normally call Microsoft Graph API
        const mockUser = {
            id: crypto.randomUUID(),
            email: "user@company.com",
            full_name: "Microsoft User",
            auth_provider: "microsoft",
            profile: {
                is_admin: false,
                role: "technician",
                site_ids: [
                    1,
                    2
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
            message: "Microsoft login successful"
        });
    } catch (error) {
        console.error("Microsoft callback error:", error);
        return next_response/* default */.Z.json({
            error: "Microsoft authentication failed"
        }, {
            status: 500
        });
    }
}

;// CONCATENATED MODULE: ./node_modules/next/dist/build/webpack/loaders/next-route-loader/index.js?kind=PAGES_API&page=%2Fapi%2Fauth%2Fmicrosoft%2Fcallback&preferredRegion=&absolutePagePath=private-next-pages%2Fapi%2Fauth%2Fmicrosoft%2Fcallback.ts&middlewareConfigBase64=e30%3D!
// @ts-ignore this need to be imported from next/dist to be external



const PagesAPIRouteModule = pages_api_module.PagesAPIRouteModule;
// Import the userland code.
// @ts-expect-error - replaced by webpack/turbopack loader

// Re-export the handler (should be the default export).
/* harmony default export */ const next_route_loaderkind_PAGES_API_page_2Fapi_2Fauth_2Fmicrosoft_2Fcallback_preferredRegion_absolutePagePath_private_next_pages_2Fapi_2Fauth_2Fmicrosoft_2Fcallback_ts_middlewareConfigBase64_e30_3D_ = ((0,helpers/* hoist */.l)(callback_namespaceObject, "default"));
// Re-export config.
const config = (0,helpers/* hoist */.l)(callback_namespaceObject, "config");
// Create and export the route module that will be consumed.
const routeModule = new PagesAPIRouteModule({
    definition: {
        kind: route_kind/* RouteKind */.x.PAGES_API,
        page: "/api/auth/microsoft/callback",
        pathname: "/api/auth/microsoft/callback",
        // The following aren't used in production.
        bundlePath: "",
        filename: ""
    },
    userland: callback_namespaceObject
});

//# sourceMappingURL=pages-api.js.map

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [752], () => (__webpack_exec__(3838)));
module.exports = __webpack_exports__;

})();