"use strict";
exports.id = 858;
exports.ids = [858];
exports.modules = {

/***/ 4858:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   X: () => (/* binding */ LoginPage)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5893);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6689);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2210);
/* harmony import */ var _heroicons_react_24_outline_esm_EyeIcon__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(5349);
/* harmony import */ var _heroicons_react_24_outline_esm_EyeSlashIcon__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(9439);
/* harmony import */ var _heroicons_react_24_outline_esm_UserIcon__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(9113);
/* harmony import */ var _lib_auth__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(6441);
/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(1853);
/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(next_router__WEBPACK_IMPORTED_MODULE_7__);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__, _heroicons_react_24_outline_esm_EyeIcon__WEBPACK_IMPORTED_MODULE_3__, _heroicons_react_24_outline_esm_EyeSlashIcon__WEBPACK_IMPORTED_MODULE_4__, _heroicons_react_24_outline_esm_UserIcon__WEBPACK_IMPORTED_MODULE_5__]);
([_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__, _heroicons_react_24_outline_esm_EyeIcon__WEBPACK_IMPORTED_MODULE_3__, _heroicons_react_24_outline_esm_EyeSlashIcon__WEBPACK_IMPORTED_MODULE_4__, _heroicons_react_24_outline_esm_UserIcon__WEBPACK_IMPORTED_MODULE_5__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);








const LoginPage = ({ onSuccess })=>{
    const [loginMethod, setLoginMethod] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)("local");
    const [email, setEmail] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)("");
    const [password, setPassword] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)("");
    const [showPassword, setShowPassword] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
    const [isLoading, setIsLoading] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
    const [error, setError] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
    const router = (0,next_router__WEBPACK_IMPORTED_MODULE_7__.useRouter)();
    const cardBg = (0,_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.useColorModeValue)("white", "gray.800");
    const borderColor = (0,_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.useColorModeValue)("gray.200", "gray.600");
    const handleLocalLogin = async ()=>{
        if (!email || !password) {
            setError("Please enter both email and password");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const { user, error } = await _lib_auth__WEBPACK_IMPORTED_MODULE_6__/* .opsGraphAuth */ .Pj.signInWithLocal(email, password);
            if (error) {
                setError(error.message);
            } else if (user) {
                onSuccess?.();
                router.push("/dashboard");
            }
        } catch (err) {
            setError("Login failed. Please try again.");
        } finally{
            setIsLoading(false);
        }
    };
    const handleMicrosoftLogin = async ()=>{
        setIsLoading(true);
        setError(null);
        try {
            const { error } = await _lib_auth__WEBPACK_IMPORTED_MODULE_6__/* .opsGraphAuth */ .Pj.signInWithMicrosoft();
            if (error) {
                setError(error.message);
            }
        // If no error, user will be redirected to Microsoft
        } catch (err) {
            setError("Microsoft login failed. Please try again.");
        } finally{
            setIsLoading(false);
        }
    };
    const handleSubmit = (e)=>{
        e.preventDefault();
        if (loginMethod === "local") {
            handleLocalLogin();
        } else {
            handleMicrosoftLogin();
        }
    };
    return /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Container, {
        maxW: "md",
        centerContent: true,
        py: 20,
        children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Card, {
            w: "full",
            bg: cardBg,
            borderColor: borderColor,
            borderWidth: "1px",
            shadow: "xl",
            children: [
                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.CardHeader, {
                    textAlign: "center",
                    pb: 6,
                    children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.VStack, {
                        spacing: 4,
                        children: [
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Box, {
                                p: 4,
                                borderRadius: "full",
                                bg: "brand.100",
                                _dark: {
                                    bg: "brand.900"
                                },
                                children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_heroicons_react_24_outline_esm_UserIcon__WEBPACK_IMPORTED_MODULE_5__["default"], {
                                    className: "w-8 h-8 text-brand-500"
                                })
                            }),
                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.VStack, {
                                spacing: 1,
                                children: [
                                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Heading, {
                                        size: "lg",
                                        color: "brand.500",
                                        children: "OpsGraph Login"
                                    }),
                                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Text, {
                                        color: "gray.500",
                                        fontSize: "sm",
                                        children: "Access your operations dashboard"
                                    })
                                ]
                            })
                        ]
                    })
                }),
                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.CardBody, {
                    children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.VStack, {
                        spacing: 6,
                        children: [
                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.HStack, {
                                spacing: 4,
                                w: "full",
                                children: [
                                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Button, {
                                        variant: loginMethod === "local" ? "solid" : "outline",
                                        colorScheme: "brand",
                                        flex: 1,
                                        onClick: ()=>setLoginMethod("local"),
                                        children: "Local Account"
                                    }),
                                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Button, {
                                        variant: loginMethod === "microsoft" ? "solid" : "outline",
                                        colorScheme: "blue",
                                        flex: 1,
                                        onClick: ()=>setLoginMethod("microsoft"),
                                        children: "Microsoft Login"
                                    })
                                ]
                            }),
                            error && /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Alert, {
                                status: "error",
                                borderRadius: "md",
                                children: [
                                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.AlertIcon, {}),
                                    error
                                ]
                            }),
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Box, {
                                as: "form",
                                onSubmit: handleSubmit,
                                w: "full",
                                children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.VStack, {
                                    spacing: 4,
                                    children: loginMethod === "local" ? /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, {
                                        children: [
                                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.FormControl, {
                                                isRequired: true,
                                                children: [
                                                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.FormLabel, {
                                                        children: "Email"
                                                    }),
                                                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Input, {
                                                        type: "email",
                                                        value: email,
                                                        onChange: (e)=>setEmail(e.target.value),
                                                        placeholder: "Enter your email",
                                                        disabled: isLoading
                                                    })
                                                ]
                                            }),
                                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.FormControl, {
                                                isRequired: true,
                                                children: [
                                                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.FormLabel, {
                                                        children: "Password"
                                                    }),
                                                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.InputGroup, {
                                                        children: [
                                                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Input, {
                                                                type: showPassword ? "text" : "password",
                                                                value: password,
                                                                onChange: (e)=>setPassword(e.target.value),
                                                                placeholder: "Enter your password",
                                                                disabled: isLoading
                                                            }),
                                                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.InputRightElement, {
                                                                children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.IconButton, {
                                                                    "aria-label": showPassword ? "Hide password" : "Show password",
                                                                    icon: showPassword ? /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_heroicons_react_24_outline_esm_EyeSlashIcon__WEBPACK_IMPORTED_MODULE_4__["default"], {
                                                                        className: "w-4 h-4"
                                                                    }) : /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_heroicons_react_24_outline_esm_EyeIcon__WEBPACK_IMPORTED_MODULE_3__["default"], {
                                                                        className: "w-4 h-4"
                                                                    }),
                                                                    variant: "ghost",
                                                                    size: "sm",
                                                                    onClick: ()=>setShowPassword(!showPassword)
                                                                })
                                                            })
                                                        ]
                                                    })
                                                ]
                                            }),
                                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Button, {
                                                type: "submit",
                                                colorScheme: "brand",
                                                size: "lg",
                                                w: "full",
                                                isLoading: isLoading,
                                                loadingText: "Signing in...",
                                                children: "Sign In"
                                            }),
                                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Button, {
                                                variant: "link",
                                                size: "sm",
                                                onClick: ()=>{
                                                    // TODO: Implement forgot password
                                                    setError("Password reset not yet implemented");
                                                },
                                                children: "Forgot your password?"
                                            })
                                        ]
                                    }) : /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, {
                                        children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.VStack, {
                                            spacing: 4,
                                            w: "full",
                                            children: [
                                                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Text, {
                                                    textAlign: "center",
                                                    color: "gray.600",
                                                    children: "Sign in with your Microsoft work account"
                                                }),
                                                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Button, {
                                                    type: "submit",
                                                    colorScheme: "blue",
                                                    size: "lg",
                                                    w: "full",
                                                    isLoading: isLoading,
                                                    loadingText: "Redirecting...",
                                                    leftIcon: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Box, {
                                                        as: "svg",
                                                        w: 5,
                                                        h: 5,
                                                        viewBox: "0 0 21 21",
                                                        children: [
                                                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("path", {
                                                                fill: "#f25022",
                                                                d: "M0 0h10v10H0z"
                                                            }),
                                                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("path", {
                                                                fill: "#00a4ef",
                                                                d: "M11 0h10v10H11z"
                                                            }),
                                                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("path", {
                                                                fill: "#7fba00",
                                                                d: "M0 11h10v10H0z"
                                                            }),
                                                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("path", {
                                                                fill: "#ffb900",
                                                                d: "M11 11h10v10H11z"
                                                            })
                                                        ]
                                                    }),
                                                    children: "Sign in with Microsoft"
                                                })
                                            ]
                                        })
                                    })
                                })
                            }),
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Divider, {}),
                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_chakra_ui_react__WEBPACK_IMPORTED_MODULE_2__.Text, {
                                fontSize: "xs",
                                color: "gray.500",
                                textAlign: "center",
                                children: [
                                    "OpsGraph Operations Management System",
                                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("br", {}),
                                    "Site access is controlled by your assigned permissions"
                                ]
                            })
                        ]
                    })
                })
            ]
        })
    });
};

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ })

};
;