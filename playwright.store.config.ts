import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/** Visuels du Store : `npx playwright test -c playwright.store.config.ts` → store/assets/ */
export default defineConfig({
  ...base,
  testDir: 'store',
  timeout: 240_000,
});
