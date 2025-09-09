"use strict";
exports.id = 462;
exports.ids = [462];
exports.modules = {

/***/ 3926:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   QF: () => (/* binding */ sidebarCollapsedAtom)
/* harmony export */ });
/* unused harmony exports colorModeAtom, sidebarWidthAtom, tablePageSizeAtom, tableDensityAtom, tableColumnsAtom, graphLayoutAtom, graphZoomLevelAtom, graphPhysicsEnabledAtom, nodeHighlightAtom, selectedNodeAtom, nodeNeighborsAtom, dateRangeAtom, ticketFiltersAtom, alertFiltersAtom, graphFiltersAtom, searchQueryAtom, searchHistoryAtom, searchResultsAtom, notificationsAtom, userPreferencesAtom */
/* harmony import */ var jotai_utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2752);
/* harmony import */ var jotai__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2451);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([jotai_utils__WEBPACK_IMPORTED_MODULE_0__, jotai__WEBPACK_IMPORTED_MODULE_1__]);
([jotai_utils__WEBPACK_IMPORTED_MODULE_0__, jotai__WEBPACK_IMPORTED_MODULE_1__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);


// Theme
const colorModeAtom = (0,jotai_utils__WEBPACK_IMPORTED_MODULE_0__.atomWithStorage)("colorMode", "system");
// Layout
const sidebarWidthAtom = (0,jotai_utils__WEBPACK_IMPORTED_MODULE_0__.atomWithStorage)("sidebarWidth", 280);
const sidebarCollapsedAtom = (0,jotai_utils__WEBPACK_IMPORTED_MODULE_0__.atomWithStorage)("sidebarCollapsed", false);
// View Settings
const tablePageSizeAtom = (0,jotai_utils__WEBPACK_IMPORTED_MODULE_0__.atomWithStorage)("tablePageSize", 10);
const tableDensityAtom = (0,jotai_utils__WEBPACK_IMPORTED_MODULE_0__.atomWithStorage)("tableDensity", "comfortable");
const tableColumnsAtom = (0,jotai_utils__WEBPACK_IMPORTED_MODULE_0__.atomWithStorage)("tableColumns", {
    tickets: [
        "id",
        "status",
        "priority",
        "summary",
        "assignedTo",
        "createdAt"
    ],
    alerts: [
        "id",
        "level",
        "code",
        "asset",
        "raisedAt",
        "status"
    ]
});
// Graph Settings
const graphLayoutAtom = (0,jotai_utils__WEBPACK_IMPORTED_MODULE_0__.atomWithStorage)("graphLayout", "force");
const graphZoomLevelAtom = (0,jotai_utils__WEBPACK_IMPORTED_MODULE_0__.atomWithStorage)("graphZoomLevel", 1);
const graphPhysicsEnabledAtom = (0,jotai_utils__WEBPACK_IMPORTED_MODULE_0__.atomWithStorage)("graphPhysicsEnabled", true);
const nodeHighlightAtom = (0,jotai__WEBPACK_IMPORTED_MODULE_1__.atom)(null);
const selectedNodeAtom = (0,jotai__WEBPACK_IMPORTED_MODULE_1__.atom)(null);
const nodeNeighborsAtom = (0,jotai__WEBPACK_IMPORTED_MODULE_1__.atom)([]);
// Filter State
const dateRangeAtom = (0,jotai_utils__WEBPACK_IMPORTED_MODULE_0__.atomWithStorage)("dateRange", {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString()
});
const ticketFiltersAtom = (0,jotai_utils__WEBPACK_IMPORTED_MODULE_0__.atomWithStorage)("ticketFilters", {
    status: [],
    priority: [],
    categories: [],
    assignedTo: []
});
const alertFiltersAtom = (0,jotai_utils__WEBPACK_IMPORTED_MODULE_0__.atomWithStorage)("alertFilters", {
    level: [],
    code: [],
    status: [],
    assets: []
});
const graphFiltersAtom = (0,jotai_utils__WEBPACK_IMPORTED_MODULE_0__.atomWithStorage)("graphFilters", {
    nodeTypes: [],
    edgeTypes: [],
    depth: 2
});
// Search
const searchQueryAtom = (0,jotai__WEBPACK_IMPORTED_MODULE_1__.atom)("");
const searchHistoryAtom = (0,jotai_utils__WEBPACK_IMPORTED_MODULE_0__.atomWithStorage)("searchHistory", []);
const searchResultsAtom = (0,jotai__WEBPACK_IMPORTED_MODULE_1__.atom)([]);
// Notifications
const notificationsAtom = (0,jotai_utils__WEBPACK_IMPORTED_MODULE_0__.atomWithStorage)("notifications", {
    alerts: true,
    tickets: true,
    mentions: true,
    updates: true
});
// User Preferences
const userPreferencesAtom = (0,jotai_utils__WEBPACK_IMPORTED_MODULE_0__.atomWithStorage)("userPreferences", {
    notifications: {
        desktop: true,
        email: true,
        sound: true
    },
    dashboard: {
        defaultView: "tickets",
        widgets: [
            "openTickets",
            "activeAlerts",
            "recentActivity",
            "teamWorkload"
        ]
    },
    accessibility: {
        reduceMotion: false,
        highContrast: false,
        largeText: false
    }
});

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 3462:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   h: () => (/* binding */ Header)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5893);
/* harmony import */ var _chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2210);
/* harmony import */ var _heroicons_react_24_outline_esm_Bars3Icon__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(657);
/* harmony import */ var _UserProfile__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(200);
/* harmony import */ var _SearchBar__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(191);
/* harmony import */ var _Notifications__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(1982);
/* harmony import */ var _ThemeSwitcher__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(1795);
/* harmony import */ var _Sidebar__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(4818);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__, _heroicons_react_24_outline_esm_Bars3Icon__WEBPACK_IMPORTED_MODULE_2__, _UserProfile__WEBPACK_IMPORTED_MODULE_3__, _SearchBar__WEBPACK_IMPORTED_MODULE_4__, _Notifications__WEBPACK_IMPORTED_MODULE_5__, _ThemeSwitcher__WEBPACK_IMPORTED_MODULE_6__, _Sidebar__WEBPACK_IMPORTED_MODULE_7__]);
([_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__, _heroicons_react_24_outline_esm_Bars3Icon__WEBPACK_IMPORTED_MODULE_2__, _UserProfile__WEBPACK_IMPORTED_MODULE_3__, _SearchBar__WEBPACK_IMPORTED_MODULE_4__, _Notifications__WEBPACK_IMPORTED_MODULE_5__, _ThemeSwitcher__WEBPACK_IMPORTED_MODULE_6__, _Sidebar__WEBPACK_IMPORTED_MODULE_7__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);








const Header = ()=>{
    const isMobile = (0,_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.useBreakpointValue)({
        base: true,
        lg: false
    });
    const { isOpen, onOpen, onClose } = (0,_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.useDisclosure)();
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Flex, {
        as: "header",
        align: "center",
        justify: "space-between",
        w: "full",
        px: {
            base: 4,
            md: 6
        },
        py: 3,
        bg: "white",
        borderBottomWidth: "1px",
        borderColor: "gray.200",
        boxShadow: "sm",
        children: [
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Flex, {
                align: "center",
                gap: 4,
                children: [
                    isMobile && /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.IconButton, {
                        "aria-label": "Open menu",
                        icon: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_heroicons_react_24_outline_esm_Bars3Icon__WEBPACK_IMPORTED_MODULE_2__["default"], {
                            width: 24
                        }),
                        onClick: onOpen,
                        variant: "ghost"
                    }),
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_SearchBar__WEBPACK_IMPORTED_MODULE_4__/* .SearchBar */ .E, {})
                ]
            }),
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Flex, {
                align: "center",
                gap: 4,
                children: [
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_ThemeSwitcher__WEBPACK_IMPORTED_MODULE_6__/* .ThemeSwitcher */ .O, {}),
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_Notifications__WEBPACK_IMPORTED_MODULE_5__/* .Notifications */ .T, {}),
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_UserProfile__WEBPACK_IMPORTED_MODULE_3__/* .UserProfile */ .I, {})
                ]
            }),
            isMobile && /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Drawer, {
                isOpen: isOpen,
                placement: "left",
                onClose: onClose,
                children: [
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.DrawerOverlay, {}),
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.DrawerContent, {
                        children: [
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.DrawerCloseButton, {}),
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.DrawerHeader, {
                                children: "OpsGraph"
                            }),
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.DrawerBody, {
                                children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_Sidebar__WEBPACK_IMPORTED_MODULE_7__/* .SidebarContent */ .T, {})
                            })
                        ]
                    })
                ]
            })
        ]
    });
};

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 1982:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   T: () => (/* binding */ Notifications)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5893);
/* harmony import */ var _chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2210);
/* harmony import */ var _heroicons_react_24_outline_esm_BellIcon__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(5550);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__, _heroicons_react_24_outline_esm_BellIcon__WEBPACK_IMPORTED_MODULE_2__]);
([_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__, _heroicons_react_24_outline_esm_BellIcon__WEBPACK_IMPORTED_MODULE_2__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);



const Notifications = ()=>{
    const notificationCount = 3;
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Menu, {
        children: [
            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.MenuButton, {
                as: _chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.IconButton,
                "aria-label": "Notifications",
                icon: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Box, {
                    position: "relative",
                    children: [
                        /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_heroicons_react_24_outline_esm_BellIcon__WEBPACK_IMPORTED_MODULE_2__["default"], {
                            width: 24
                        }),
                        notificationCount > 0 && /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Badge, {
                            position: "absolute",
                            top: "-2px",
                            right: "-2px",
                            colorScheme: "red",
                            borderRadius: "full",
                            minW: "20px",
                            h: "20px",
                            fontSize: "xs",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            children: notificationCount
                        })
                    ]
                }),
                variant: "ghost",
                _hover: {
                    bg: "gray.100"
                }
            }),
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.MenuList, {
                w: "300px",
                children: [
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Box, {
                        p: 3,
                        children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Text, {
                            fontWeight: "bold",
                            mb: 2,
                            children: "Notifications"
                        })
                    }),
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Divider, {}),
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.VStack, {
                        spacing: 0,
                        align: "stretch",
                        children: [
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.MenuItem, {
                                p: 3,
                                children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Box, {
                                    children: [
                                        /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Text, {
                                            fontSize: "sm",
                                            fontWeight: "medium",
                                            children: "New alert in Building A"
                                        }),
                                        /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Text, {
                                            fontSize: "xs",
                                            color: "gray.500",
                                            children: "2 minutes ago"
                                        })
                                    ]
                                })
                            }),
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.MenuItem, {
                                p: 3,
                                children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Box, {
                                    children: [
                                        /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Text, {
                                            fontSize: "sm",
                                            fontWeight: "medium",
                                            children: "Ticket #1234 assigned to you"
                                        }),
                                        /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Text, {
                                            fontSize: "xs",
                                            color: "gray.500",
                                            children: "15 minutes ago"
                                        })
                                    ]
                                })
                            }),
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.MenuItem, {
                                p: 3,
                                children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Box, {
                                    children: [
                                        /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Text, {
                                            fontSize: "sm",
                                            fontWeight: "medium",
                                            children: "System maintenance scheduled"
                                        }),
                                        /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Text, {
                                            fontSize: "xs",
                                            color: "gray.500",
                                            children: "1 hour ago"
                                        })
                                    ]
                                })
                            })
                        ]
                    }),
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Divider, {}),
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.MenuItem, {
                        justifyContent: "center",
                        color: "purple.500",
                        children: "View all notifications"
                    })
                ]
            })
        ]
    });
};

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 191:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   E: () => (/* binding */ SearchBar)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5893);
/* harmony import */ var _chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2210);
/* harmony import */ var _heroicons_react_24_outline_esm_MagnifyingGlassIcon__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(4775);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__, _heroicons_react_24_outline_esm_MagnifyingGlassIcon__WEBPACK_IMPORTED_MODULE_2__]);
([_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__, _heroicons_react_24_outline_esm_MagnifyingGlassIcon__WEBPACK_IMPORTED_MODULE_2__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);



const SearchBar = ()=>{
    return /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Box, {
        w: {
            base: "full",
            md: "400px"
        },
        children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.InputGroup, {
            children: [
                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.InputLeftElement, {
                    pointerEvents: "none",
                    children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_heroicons_react_24_outline_esm_MagnifyingGlassIcon__WEBPACK_IMPORTED_MODULE_2__["default"], {
                        width: 20,
                        color: "gray"
                    })
                }),
                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Input, {
                    placeholder: "Search tickets, alerts, assets...",
                    bg: "white",
                    border: "1px solid",
                    borderColor: "gray.200",
                    _hover: {
                        borderColor: "gray.300"
                    },
                    _focus: {
                        borderColor: "purple.500",
                        boxShadow: "0 0 0 1px purple.500"
                    }
                })
            ]
        })
    });
};

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 4818:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   T: () => (/* binding */ SidebarContent),
/* harmony export */   Y: () => (/* binding */ Sidebar)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5893);
/* harmony import */ var _chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2210);
/* harmony import */ var _heroicons_react_24_outline_esm_HomeIcon__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(5647);
/* harmony import */ var _heroicons_react_24_outline_esm_TicketIcon__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2783);
/* harmony import */ var _heroicons_react_24_outline_esm_BellAlertIcon__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(6949);
/* harmony import */ var _heroicons_react_24_outline_esm_ChartBarIcon__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(7143);
/* harmony import */ var _heroicons_react_24_outline_esm_CubeIcon__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(6565);
/* harmony import */ var _heroicons_react_24_outline_esm_Cog6ToothIcon__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(5689);
/* harmony import */ var _heroicons_react_24_outline_esm_ArrowLeftOnRectangleIcon__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(5856);
/* harmony import */ var _heroicons_react_24_outline_esm_ChevronDoubleLeftIcon__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(3241);
/* harmony import */ var _heroicons_react_24_outline_esm_ChevronDoubleRightIcon__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(1326);
/* harmony import */ var _heroicons_react_24_outline_esm_UserGroupIcon__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(5603);
/* harmony import */ var jotai__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(2451);
/* harmony import */ var _atoms__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(3926);
/* harmony import */ var next_link__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(1664);
/* harmony import */ var next_link__WEBPACK_IMPORTED_MODULE_14___default = /*#__PURE__*/__webpack_require__.n(next_link__WEBPACK_IMPORTED_MODULE_14__);
/* harmony import */ var _components_auth_AuthProvider__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(1716);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__, _heroicons_react_24_outline_esm_HomeIcon__WEBPACK_IMPORTED_MODULE_2__, _heroicons_react_24_outline_esm_TicketIcon__WEBPACK_IMPORTED_MODULE_3__, _heroicons_react_24_outline_esm_BellAlertIcon__WEBPACK_IMPORTED_MODULE_4__, _heroicons_react_24_outline_esm_ChartBarIcon__WEBPACK_IMPORTED_MODULE_5__, _heroicons_react_24_outline_esm_CubeIcon__WEBPACK_IMPORTED_MODULE_6__, _heroicons_react_24_outline_esm_Cog6ToothIcon__WEBPACK_IMPORTED_MODULE_7__, _heroicons_react_24_outline_esm_ArrowLeftOnRectangleIcon__WEBPACK_IMPORTED_MODULE_8__, _heroicons_react_24_outline_esm_ChevronDoubleLeftIcon__WEBPACK_IMPORTED_MODULE_9__, _heroicons_react_24_outline_esm_ChevronDoubleRightIcon__WEBPACK_IMPORTED_MODULE_10__, _heroicons_react_24_outline_esm_UserGroupIcon__WEBPACK_IMPORTED_MODULE_11__, jotai__WEBPACK_IMPORTED_MODULE_12__, _atoms__WEBPACK_IMPORTED_MODULE_13__]);
([_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__, _heroicons_react_24_outline_esm_HomeIcon__WEBPACK_IMPORTED_MODULE_2__, _heroicons_react_24_outline_esm_TicketIcon__WEBPACK_IMPORTED_MODULE_3__, _heroicons_react_24_outline_esm_BellAlertIcon__WEBPACK_IMPORTED_MODULE_4__, _heroicons_react_24_outline_esm_ChartBarIcon__WEBPACK_IMPORTED_MODULE_5__, _heroicons_react_24_outline_esm_CubeIcon__WEBPACK_IMPORTED_MODULE_6__, _heroicons_react_24_outline_esm_Cog6ToothIcon__WEBPACK_IMPORTED_MODULE_7__, _heroicons_react_24_outline_esm_ArrowLeftOnRectangleIcon__WEBPACK_IMPORTED_MODULE_8__, _heroicons_react_24_outline_esm_ChevronDoubleLeftIcon__WEBPACK_IMPORTED_MODULE_9__, _heroicons_react_24_outline_esm_ChevronDoubleRightIcon__WEBPACK_IMPORTED_MODULE_10__, _heroicons_react_24_outline_esm_UserGroupIcon__WEBPACK_IMPORTED_MODULE_11__, jotai__WEBPACK_IMPORTED_MODULE_12__, _atoms__WEBPACK_IMPORTED_MODULE_13__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);
















const navItems = [
    {
        icon: _heroicons_react_24_outline_esm_HomeIcon__WEBPACK_IMPORTED_MODULE_2__["default"],
        label: "Dashboard",
        href: "/dashboard"
    },
    {
        icon: _heroicons_react_24_outline_esm_TicketIcon__WEBPACK_IMPORTED_MODULE_3__["default"],
        label: "Tickets",
        href: "/tickets"
    },
    {
        icon: _heroicons_react_24_outline_esm_BellAlertIcon__WEBPACK_IMPORTED_MODULE_4__["default"],
        label: "Alerts",
        href: "/alerts"
    },
    {
        icon: _heroicons_react_24_outline_esm_CubeIcon__WEBPACK_IMPORTED_MODULE_6__["default"],
        label: "Assets",
        href: "/assets"
    },
    {
        icon: _heroicons_react_24_outline_esm_ChartBarIcon__WEBPACK_IMPORTED_MODULE_5__["default"],
        label: "Analytics",
        href: "/analytics"
    }
];
const Sidebar = ()=>{
    const [isCollapsed, setIsCollapsed] = (0,jotai__WEBPACK_IMPORTED_MODULE_12__.useAtom)(_atoms__WEBPACK_IMPORTED_MODULE_13__/* .sidebarCollapsedAtom */ .QF);
    const { user } = (0,_components_auth_AuthProvider__WEBPACK_IMPORTED_MODULE_15__/* .useAuth */ .aC)();
    const isAdmin = user?.profile?.role === "admin";
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Flex, {
        as: "nav",
        direction: "column",
        w: isCollapsed ? "80px" : "280px",
        h: "full",
        bgGradient: "linear(135deg, purple.900, blue.800)",
        borderRightWidth: "1px",
        borderColor: "whiteAlpha.200",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: "docked",
        transition: "width 0.2s ease-in-out",
        boxShadow: "xl",
        children: [
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Flex, {
                align: "center",
                justify: isCollapsed ? "center" : "space-between",
                p: 4,
                h: "60px",
                children: [
                    !isCollapsed && /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Text, {
                        fontSize: "xl",
                        fontWeight: "bold",
                        color: "white",
                        letterSpacing: "wider",
                        children: "OpsGraph"
                    }),
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.IconButton, {
                        "aria-label": isCollapsed ? "Expand sidebar" : "Collapse sidebar",
                        icon: isCollapsed ? /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_heroicons_react_24_outline_esm_ChevronDoubleRightIcon__WEBPACK_IMPORTED_MODULE_10__["default"], {
                            width: 20
                        }) : /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_heroicons_react_24_outline_esm_ChevronDoubleLeftIcon__WEBPACK_IMPORTED_MODULE_9__["default"], {
                            width: 20
                        }),
                        onClick: ()=>setIsCollapsed(!isCollapsed),
                        variant: "ghost",
                        color: "whiteAlpha.800",
                        _hover: {
                            bg: "whiteAlpha.200",
                            color: "white"
                        }
                    })
                ]
            }),
            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Divider, {
                borderColor: "whiteAlpha.200"
            }),
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.VStack, {
                as: "ul",
                spacing: 2,
                p: 2,
                flex: 1,
                align: "stretch",
                children: [
                    navItems.map(({ icon: Icon, label, href })=>/*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(NavItem, {
                            icon: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(Icon, {
                                width: 24
                            }),
                            label: label,
                            href: href,
                            isCollapsed: isCollapsed
                        }, label)),
                    isAdmin && /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(NavItem, {
                        icon: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_heroicons_react_24_outline_esm_UserGroupIcon__WEBPACK_IMPORTED_MODULE_11__["default"], {
                            width: 24
                        }),
                        label: "Admin",
                        href: "/admin",
                        isCollapsed: isCollapsed
                    })
                ]
            }),
            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Divider, {
                borderColor: "whiteAlpha.200"
            }),
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.VStack, {
                as: "ul",
                spacing: 2,
                p: 2,
                align: "stretch",
                children: [
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(NavItem, {
                        icon: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_heroicons_react_24_outline_esm_Cog6ToothIcon__WEBPACK_IMPORTED_MODULE_7__["default"], {
                            width: 24
                        }),
                        label: "Settings",
                        href: "/settings",
                        isCollapsed: isCollapsed
                    }),
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(NavItem, {
                        icon: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_heroicons_react_24_outline_esm_ArrowLeftOnRectangleIcon__WEBPACK_IMPORTED_MODULE_8__["default"], {
                            width: 24
                        }),
                        label: "Logout",
                        href: "/logout",
                        isCollapsed: isCollapsed
                    })
                ]
            })
        ]
    });
};
const NavItem = ({ icon, label, href, isCollapsed })=>{
    return /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Tooltip, {
        label: isCollapsed ? label : "",
        placement: "right",
        children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Box, {
            as: "li",
            listStyleType: "none",
            children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx((next_link__WEBPACK_IMPORTED_MODULE_14___default()), {
                href: href,
                style: {
                    textDecoration: "none"
                },
                children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Flex, {
                    align: "center",
                    p: 3,
                    borderRadius: "lg",
                    color: "whiteAlpha.800",
                    cursor: "pointer",
                    _hover: {
                        bg: "whiteAlpha.200",
                        color: "white",
                        transform: "translateX(4px)",
                        transition: "all 0.2s ease"
                    },
                    justify: isCollapsed ? "center" : "flex-start",
                    transition: "all 0.2s ease",
                    children: [
                        icon,
                        !isCollapsed && /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Text, {
                            ml: 4,
                            fontWeight: "medium",
                            children: label
                        })
                    ]
                })
            })
        })
    });
};
const SidebarContent = ()=>{
    const { user } = (0,_components_auth_AuthProvider__WEBPACK_IMPORTED_MODULE_15__/* .useAuth */ .aC)();
    const isAdmin = user?.profile?.role === "admin";
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.VStack, {
        as: "ul",
        spacing: 2,
        p: 2,
        flex: 1,
        align: "stretch",
        children: [
            navItems.map(({ icon: Icon, label, href })=>/*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(NavItem, {
                    icon: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(Icon, {
                        width: 24
                    }),
                    label: label,
                    href: href,
                    isCollapsed: false
                }, label)),
            isAdmin && /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(NavItem, {
                icon: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_heroicons_react_24_outline_esm_UserGroupIcon__WEBPACK_IMPORTED_MODULE_11__["default"], {
                    width: 24
                }),
                label: "Admin",
                href: "/admin",
                isCollapsed: false
            })
        ]
    });
};

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 1795:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   O: () => (/* binding */ ThemeSwitcher)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5893);
/* harmony import */ var _chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2210);
/* harmony import */ var _heroicons_react_24_outline_esm_SunIcon__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(6636);
/* harmony import */ var _heroicons_react_24_outline_esm_MoonIcon__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(3471);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__, _heroicons_react_24_outline_esm_SunIcon__WEBPACK_IMPORTED_MODULE_2__, _heroicons_react_24_outline_esm_MoonIcon__WEBPACK_IMPORTED_MODULE_3__]);
([_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__, _heroicons_react_24_outline_esm_SunIcon__WEBPACK_IMPORTED_MODULE_2__, _heroicons_react_24_outline_esm_MoonIcon__WEBPACK_IMPORTED_MODULE_3__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);




const ThemeSwitcher = ()=>{
    const { colorMode, toggleColorMode } = (0,_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.useColorMode)();
    return /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Tooltip, {
        label: `Switch to ${colorMode === "light" ? "dark" : "light"} mode`,
        children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.IconButton, {
            "aria-label": "Toggle theme",
            icon: colorMode === "light" ? /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_heroicons_react_24_outline_esm_MoonIcon__WEBPACK_IMPORTED_MODULE_3__["default"], {
                width: 20
            }) : /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_heroicons_react_24_outline_esm_SunIcon__WEBPACK_IMPORTED_MODULE_2__["default"], {
                width: 20
            }),
            onClick: toggleColorMode,
            variant: "ghost",
            _hover: {
                bg: "gray.100"
            },
            suppressHydrationWarning: true
        })
    });
};

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 200:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   I: () => (/* binding */ UserProfile)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5893);
/* harmony import */ var _chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2210);
/* harmony import */ var _components_auth_AuthProvider__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1716);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__]);
_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];



const UserProfile = ()=>{
    const { user, signOut } = (0,_components_auth_AuthProvider__WEBPACK_IMPORTED_MODULE_2__/* .useAuth */ .aC)();
    if (!user) return null;
    const profile = user.profile;
    const displayName = profile?.full_name || user.email.split("@")[0];
    const isAdmin = profile?.is_admin || profile?.role === "admin";
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Menu, {
        children: [
            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.MenuButton, {
                as: _chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Box,
                cursor: "pointer",
                children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Flex, {
                    align: "center",
                    gap: 2,
                    children: [
                        /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Avatar, {
                            size: "sm",
                            name: displayName,
                            src: profile?.avatar_url
                        }),
                        /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Box, {
                            display: {
                                base: "none",
                                md: "block"
                            },
                            children: [
                                /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Flex, {
                                    align: "center",
                                    gap: 2,
                                    children: [
                                        /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Text, {
                                            fontSize: "sm",
                                            fontWeight: "medium",
                                            children: displayName
                                        }),
                                        isAdmin && /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Badge, {
                                            colorScheme: "purple",
                                            size: "sm",
                                            children: "Admin"
                                        })
                                    ]
                                }),
                                /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Flex, {
                                    align: "center",
                                    gap: 2,
                                    children: [
                                        /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Text, {
                                            fontSize: "xs",
                                            color: "gray.500",
                                            textTransform: "capitalize",
                                            children: profile?.role || "User"
                                        }),
                                        /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.Text, {
                                            fontSize: "xs",
                                            color: "gray.400",
                                            children: [
                                                "(",
                                                profile?.auth_provider || "local",
                                                ")"
                                            ]
                                        })
                                    ]
                                })
                            ]
                        })
                    ]
                })
            }),
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.MenuList, {
                children: [
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.MenuItem, {
                        children: "Profile"
                    }),
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.MenuItem, {
                        children: "Settings"
                    }),
                    profile?.auth_provider === "local" && /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.MenuItem, {
                        children: "Change Password"
                    }),
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.MenuDivider, {}),
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_1__.MenuItem, {
                        onClick: ()=>signOut(),
                        children: "Sign out"
                    })
                ]
            })
        ]
    });
};

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ })

};
;