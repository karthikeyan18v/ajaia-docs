import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    // `server-only` throws outside a React Server Components bundle; tests run
    // the server layer directly, so map it to its no-op build.
    alias: { 'server-only': 'server-only/empty.js' },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
