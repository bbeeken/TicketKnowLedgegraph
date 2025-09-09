"use strict";
(() => {
var exports = {};
exports.id = 255;
exports.ids = [255];
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

/***/ 4861:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  config: () => (/* binding */ config),
  "default": () => (/* binding */ next_route_loaderkind_PAGES_API_page_2Fapi_2Fauth_2Fsignout_preferredRegion_absolutePagePath_private_next_pages_2Fapi_2Fauth_2Fsignout_ts_middlewareConfigBase64_e30_3D_),
  routeModule: () => (/* binding */ routeModule)
});

// NAMESPACE OBJECT: ./src/pages/api/auth/signout.ts
var signout_namespaceObject = {};
__webpack_require__.r(signout_namespaceObject);
__webpack_require__.d(signout_namespaceObject, {
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
;// CONCATENATED MODULE: ./src/pages/api/auth/signout.ts

async function POST(request) {
    try {
        // TODO: Replace with actual session invalidation
        // This would typically:
        // 1. Get session token from Authorization header or HTTP-only cookie
        // 2. Invalidate session in database/cache
        // 3. Clear HTTP-only cookies
        // 4. Log the signout event
        // Clear any cookies (in real app, these would be HTTP-only)
        const response = next_response/* default */.Z.json({
            message: "Signed out successfully"
        });
        // In a real implementation, you'd clear HTTP-only cookies here
        response.cookies.set("opsgraph_session", "", {
            expires: new Date(0),
            httpOnly: true,
            secure: "production" === "production",
            sameSite: "strict",
            path: "/"
        });
        return response;
    } catch (error) {
        console.error("Signout error:", error);
        return next_response/* default */.Z.json({
            error: "Signout failed"
        }, {
            status: 500
        });
    }
}

;// CONCATENATED MODULE: ./node_modules/next/dist/build/webpack/loaders/next-route-loader/index.js?kind=PAGES_API&page=%2Fapi%2Fauth%2Fsignout&preferredRegion=&absolutePagePath=private-next-pages%2Fapi%2Fauth%2Fsignout.ts&middlewareConfigBase64=e30%3D!
// @ts-ignore this need to be imported from next/dist to be external



const PagesAPIRouteModule = pages_api_module.PagesAPIRouteModule;
// Import the userland code.
// @ts-expect-error - replaced by webpack/turbopack loader

// Re-export the handler (should be the default export).
/* harmony default export */ const next_route_loaderkind_PAGES_API_page_2Fapi_2Fauth_2Fsignout_preferredRegion_absolutePagePath_private_next_pages_2Fapi_2Fauth_2Fsignout_ts_middlewareConfigBase64_e30_3D_ = ((0,helpers/* hoist */.l)(signout_namespaceObject, "default"));
// Re-export config.
const config = (0,helpers/* hoist */.l)(signout_namespaceObject, "config");
// Create and export the route module that will be consumed.
const routeModule = new PagesAPIRouteModule({
    definition: {
        kind: route_kind/* RouteKind */.x.PAGES_API,
        page: "/api/auth/signout",
        pathname: "/api/auth/signout",
        // The following aren't used in production.
        bundlePath: "",
        filename: ""
    },
    userland: signout_namespaceObject
});

//# sourceMappingURL=pages-api.js.map

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [752], () => (__webpack_exec__(4861)));
module.exports = __webpack_exports__;

})();