import { defineConfig } from '@playwright/test';

/**
 * Tests de bout en bout : la vraie extension dans Chromium, deux profils (Leo et
 * Emma), le serveur de synchro en local (wrangler dev) et la fixture anonymisée
 * servie à la place de amazon.fr.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  workers: 1,
  globalSetup: './e2e/global-setup.ts',
  webServer: {
    command: 'npm --prefix server run dev',
    // 401 = le serveur répond (jeton absent), Playwright l'accepte comme « prêt ».
    url: 'http://127.0.0.1:8787/v1/h/AAAAAAAAAAAAAAAAAAAAAA',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
