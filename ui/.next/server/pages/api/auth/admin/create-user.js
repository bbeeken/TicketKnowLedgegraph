"use strict";
(() => {
var exports = {};
exports.id = 653;
exports.ids = [653];
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

/***/ 4104:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  config: () => (/* binding */ config),
  "default": () => (/* binding */ next_route_loaderkind_PAGES_API_page_2Fapi_2Fauth_2Fadmin_2Fcreate_user_preferredRegion_absolutePagePath_private_next_pages_2Fapi_2Fauth_2Fadmin_2Fcreate_user_ts_middlewareConfigBase64_e30_3D_),
  routeModule: () => (/* binding */ routeModule)
});

// NAMESPACE OBJECT: ./src/pages/api/auth/admin/create-user.ts
var create_user_namespaceObject = {};
__webpack_require__.r(create_user_namespaceObject);
__webpack_require__.d(create_user_namespaceObject, {
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
;// CONCATENATED MODULE: ./src/pages/api/auth/admin/create-user.ts

async function POST(request) {
    try {
        const { email, password, full_name, role, site_ids } = await request.json();
        // Validate required fields
        if (!email || !password || !full_name || !site_ids?.length) {
            return next_response/* default */.Z.json({
                error: "Missing required fields"
            }, {
                status: 400
            });
        }
        // TODO: Replace with actual database call
        // This would typically:
        // 1. Verify the requesting user is an admin
        // 2. Hash the password
        // 3. Insert the new user into the database
        // 4. Return the created user data
        // Mock implementation
        const newUser = {
            id: crypto.randomUUID(),
            email,
            full_name,
            role,
            auth_provider: "local",
            site_ids,
            created_at: new Date().toISOString(),
            is_active: true
        };
        return next_response/* default */.Z.json({
            user: newUser,
            message: "User created successfully"
        });
    } catch (error) {
        console.error("Error creating user:", error);
        return next_response/* default */.Z.json({
            error: "Internal server error"
        }, {
            status: 500
        });
    }
}

;// CONCATENATED MODULE: ./node_modules/next/dist/build/webpack/loaders/next-route-loader/index.js?kind=PAGES_API&page=%2Fapi%2Fauth%2Fadmin%2Fcreate-user&preferredRegion=&absolutePagePath=private-next-pages%2Fapi%2Fauth%2Fadmin%2Fcreate-user.ts&middlewareConfigBase64=e30%3D!
// @ts-ignore this need to be imported from next/dist to be external



const PagesAPIRouteModule = pages_api_module.PagesAPIRouteModule;
// Import the userland code.
// @ts-expect-error - replaced by webpack/turbopack loader

// Re-export the handler (should be the default export).
/* harmony default export */ const next_route_loaderkind_PAGES_API_page_2Fapi_2Fauth_2Fadmin_2Fcreate_user_preferredRegion_absolutePagePath_private_next_pages_2Fapi_2Fauth_2Fadmin_2Fcreate_user_ts_middlewareConfigBase64_e30_3D_ = ((0,helpers/* hoist */.l)(create_user_namespaceObject, "default"));
// Re-export config.
const config = (0,helpers/* hoist */.l)(create_user_namespaceObject, "config");
// Create and export the route module that will be consumed.
const routeModule = new PagesAPIRouteModule({
    definition: {
        kind: route_kind/* RouteKind */.x.PAGES_API,
        page: "/api/auth/admin/create-user",
        pathname: "/api/auth/admin/create-user",
        // The following aren't used in production.
        bundlePath: "",
        filename: ""
    },
    userland: create_user_namespaceObject
});

//# sourceMappingURL=pages-api.js.map

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [752], () => (__webpack_exec__(4104)));
module.exports = __webpack_exports__;

})();