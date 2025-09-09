# Install dependencies
yarn create next-app opsgraph-ui --typescript --app --import-alias '@/*' --src-dir --tailwind
cd opsgraph-ui
yarn add @chakra-ui/react @emotion/react @emotion/styled framer-motion
yarn add @heroicons/react @monaco-editor/react @tanstack/react-query @tanstack/react-table
yarn add dagre echarts echarts-for-react
yarn add react-force-graph reactflow react-markdown socket.io-client swr zustand
yarn add @supabase/supabase-js
yarn add react-hook-form @hookform/resolvers zod
yarn add -D @testing-library/react @testing-library/jest-dom jest cypress
yarn add @nivo/core @nivo/line @nivo/pie
yarn add date-fns

# Create required directories
mkdir -p src/lib/api
mkdir -p src/components/graphs
mkdir -p src/hooks
mkdir -p src/pages
mkdir -p src/styles

# Add environment variables
cat > .env.local << EOL
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001
EOL

# Configure TypeScript for absolute imports
cat > tsconfig.json << EOL
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOL
