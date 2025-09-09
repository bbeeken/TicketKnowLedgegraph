import { extendTheme } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';

// Modern gradient-based color palette with depth
const colors = {
  brand: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd', 
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6b21a8',
    900: '#581c87',
  },
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    500: '#10b981',
    700: '#047857',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    700: '#b45309',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    700: '#b91c1c',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    700: '#1d4ed8',
  },
};

// Custom semantic tokens
const semanticTokens = {
  colors: {
    'bg.surface': {
      default: 'gray.50',
      _dark: 'gray.800',
    },
    'bg.subtle': {
      default: 'gray.100',
      _dark: 'gray.700',
    },
    'bg.muted': {
      default: 'gray.200',
      _dark: 'gray.600',
    },
    'border.subtle': {
      default: 'gray.200',
      _dark: 'gray.700',
    },
    'text.primary': {
      default: 'gray.900',
      _dark: 'gray.50',
    },
    'text.secondary': {
      default: 'gray.600',
      _dark: 'gray.400',
    },
    'text.muted': {
      default: 'gray.500',
      _dark: 'gray.500',
    },
  },
};

// Custom components styles with modern aesthetics
const components = {
  Button: {
    baseStyle: {
      fontWeight: '600',
      borderRadius: 'xl',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      _focus: {
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.15)',
      },
    },
    variants: {
      solid: (props: any) => ({
        bg: `linear-gradient(135deg, ${mode('brand.500', 'brand.400')(props)}, ${mode('purple.500', 'purple.400')(props)})`,
        color: 'white',
        shadow: 'lg',
        _hover: {
          transform: 'translateY(-1px)',
          shadow: 'xl',
          bg: `linear-gradient(135deg, ${mode('brand.600', 'brand.500')(props)}, ${mode('purple.600', 'purple.500')(props)})`,
        },
        _active: {
          transform: 'translateY(0)',
        },
      }),
      outline: (props: any) => ({
        borderColor: mode('brand.500', 'brand.300')(props),
        color: mode('brand.600', 'brand.200')(props),
        borderWidth: '2px',
        _hover: {
          bg: mode('brand.50', 'whiteAlpha.100')(props),
          transform: 'translateY(-1px)',
        },
      }),
      ghost: (props: any) => ({
        _hover: {
          bg: mode('gray.100', 'whiteAlpha.200')(props),
          transform: 'translateY(-1px)',
        },
      }),
    },
  },
  Card: {
    baseStyle: (props: any) => ({
      container: {
        bg: mode('white', 'gray.800')(props),
        borderRadius: '2xl',
        boxShadow: mode(
          '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        )(props),
        borderWidth: '1px',
        borderColor: mode('gray.100', 'gray.700')(props),
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        _hover: {
          transform: 'translateY(-2px)',
          boxShadow: mode(
            '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
          )(props),
        },
      },
      header: {
        py: 6,
        px: 8,
        borderBottom: '1px solid',
        borderColor: mode('gray.100', 'gray.700')(props),
      },
      body: {
        py: 6,
        px: 8,
      },
      footer: {
        py: 6,
        px: 8,
        borderTop: '1px solid',
        borderColor: mode('gray.100', 'gray.700')(props),
      },
    }),
  },
  Table: {
    variants: {
      simple: {
        th: {
          borderColor: 'border.subtle',
          fontSize: 'sm',
          textTransform: 'none',
          letterSpacing: 'normal',
        },
        td: {
          borderColor: 'border.subtle',
        },
      },
    },
  },
};

// Custom global styles with modern aesthetics
const styles = {
  global: (props: any) => ({
    body: {
      bg: mode(
        'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)'
      )(props),
      color: mode('gray.800', 'gray.100')(props),
      fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
      fontVariantNumeric: 'oldstyle-nums',
    },
    '*': {
      scrollBehavior: 'smooth',
    },
    '*::-webkit-scrollbar': {
      width: '8px',
    },
    '*::-webkit-scrollbar-track': {
      bg: mode('gray.100', 'gray.700')(props),
      borderRadius: 'full',
    },
    '*::-webkit-scrollbar-thumb': {
      bg: mode('gray.300', 'gray.500')(props),
      borderRadius: 'full',
      _hover: {
        bg: mode('gray.400', 'gray.400')(props),
      },
    },
  }),
};

// Typography configuration with modern font stack
const typography = {
  fonts: {
    heading: '"Inter Variable", "SF Pro Display", system-ui, -apple-system, sans-serif',
    body: '"Inter Variable", "SF Pro Text", system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", "SF Mono", Consolas, monospace',
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
    '7xl': '4.5rem',
    '8xl': '6rem',
    '9xl': '8rem',
  },
  fontWeights: {
    hairline: 100,
    thin: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
};

// Space and sizing scale
const space = {
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
};

// Radii configuration
const radii = {
  none: '0',
  sm: '0.125rem',
  base: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
};

// Z-index configuration
const zIndices = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
};

const config = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

export const theme = extendTheme({
  colors,
  semanticTokens,
  components,
  styles,
  typography,
  space,
  radii,
  zIndices,
  config,
});
