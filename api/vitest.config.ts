import { defineConfig } from 'vitest/config';
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

// Load .env.test if present
const envPath = join(__dirname, '.env.test');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
  },
});
