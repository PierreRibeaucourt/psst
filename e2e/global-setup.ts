import { execSync } from 'node:child_process';

export const E2E_OUT = '.output-e2e';
/** Serveur local par défaut ; E2E_API=https://… pour valider un déploiement. */
export const E2E_API = process.env.E2E_API ?? 'http://127.0.0.1:8787';

export default function globalSetup() {
  execSync('npx wxt build', {
    stdio: 'inherit',
    env: { ...process.env, WXT_API_URL: E2E_API, WXT_OUT_DIR: E2E_OUT },
  });
}
