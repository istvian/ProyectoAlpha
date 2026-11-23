import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "mermas.spec.js",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5188",
    browserName: "chromium",
  },
  webServer: [
    {
      command: "python -m uvicorn tests.mermas_e2e_server:app --host 127.0.0.1 --port 8027",
      cwd: "../backend/app",
      url: "http://127.0.0.1:8027/docs",
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5188 --strictPort",
      cwd: "../frontend",
      env: { ...process.env, VITE_BASE_URL: "http://127.0.0.1:8027" },
      url: "http://127.0.0.1:5188",
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
