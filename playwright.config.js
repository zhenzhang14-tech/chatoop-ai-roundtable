import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'tests/ui',
  use:{baseURL:'http://127.0.0.1:5180',locale:'en-US',trace:'retain-on-failure'},
  reporter:process.env.CI?'github':'list',
  webServer:{command:'npm run dev',url:'http://127.0.0.1:5180',reuseExistingServer:!process.env.CI,timeout:30000},
  projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['Pixel 7']}}],
});
