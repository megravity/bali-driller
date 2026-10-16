import { defineConfig } from '@playwright/test';

const basePath = process.env.BASE_PATH || '';
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: `http://127.0.0.1:4173${basePath}/`, headless: true },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: `http://127.0.0.1:4173${basePath}/`,
    reuseExistingServer: false
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
});
