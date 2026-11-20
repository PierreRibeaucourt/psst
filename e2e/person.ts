import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { chromium, expect, type BrowserContext, type Page, type Worker } from '@playwright/test';
import { E2E_OUT } from './global-setup';

const EXT = resolve(E2E_OUT, 'chrome-mv3');
const DEFAULT_FIXTURE = 'tests/fixtures/orders.html';
/** Styles et images de l'export brut, s'il est là (non versionné) : seulement pour des captures réalistes. */
const LIST_PAGE = /\/(gp\/css\/order-history|your-orders\/orders|your-orders\/search)/;

export const ordersUrl = (host: string) => `https://${host}/gp/css/order-history`;
export const detailsUrl = (host: string, orderId: string) => `https://${host}/your-orders/order-details?orderID=${orderId}`;

/** Une personne = un profil Chromium avec l'extension, comme dans la vraie vie. */
export class Person {
  private constructor(
    public name: string,
    public context: BrowserContext,
    public worker: Worker,
    public extensionId: string,
    public host: string,
  ) {}

  static async launch(name: string, lang: 'fr' | 'en', host: string, fixture = DEFAULT_FIXTURE, scale = 1): Promise<Person> {
    const page = readFileSync(resolve(fixture), 'utf8');
    const dir = mkdtempSync(join(tmpdir(), `cc-e2e-${name}-`));
    const context = await chromium.launchPersistentContext(dir, {
      channel: 'chromium',
      headless: true,
      locale: lang === 'fr' ? 'fr-FR' : 'en-US',
      viewport: { width: 1100, height: 900 },
      deviceScaleFactor: scale,
      args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, `--lang=${lang}`],
    });
    await context.route(/^https:\/\/www\.amazon\./, async (route) => {
      const url = new URL(route.request().url());
      const file = decodeURIComponent(url.pathname);
      const assets = /\/((?:Vos commandes|Your Orders)_files)\//.exec(file);
      if (file.includes('/demo-products/')) {
        return route.fulfill({ path: resolve('tests/fixtures/demo-products', basename(file)) });
      }
      if (assets) {
        const local = join(resolve(assets[1]!), basename(file));
        return existsSync(local) ? route.fulfill({ path: local }) : route.fulfill({ status: 404 });
      }
      if (LIST_PAGE.test(url.pathname)) {
        return route.fulfill({ contentType: 'text/html; charset=utf-8', body: page });
      }
      if (url.pathname.includes('order-details')) {
        const id = url.searchParams.get('orderID');
        return route.fulfill({
          contentType: 'text/html; charset=utf-8',
          body: `<!doctype html><html lang="fr"><head><title>Détails de la commande</title></head>
            <body><h1>Détails de la commande ${id}</h1><p id="contenu">Contenu de la commande</p></body></html>`,
        });
      }
      return route.fulfill({ status: 404, body: '' });
    });
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const extensionId = new URL(worker.url()).host;
    return new Person(name, context, worker, extensionId, host);
  }

  async popup(): Promise<Page> {
    const page = await this.context.newPage();
    await page.goto(`chrome-extension://${this.extensionId}/popup.html`);
    return page;
  }

  async state(): Promise<any> {
    return this.worker.evaluate(async () => (await (globalThis as any).chrome.storage.local.get('cc')).cc);
  }

  /** Attend que tout ce que cette personne a modifié soit parti sur le serveur. */
  async waitPushed() {
    await expect
      .poll(async () => {
        const s = await this.state();
        return s && !s.sync.lastError && s.sync.pending.length === 0 && !!s.sync.lastOk;
      })
      .toBe(true);
  }

  /**
   * Ouvre « Vos commandes » en notant chaque décision de l'extension sur chaque carte,
   * pour vérifier qu'une commande cachée n'a jamais été montrée, même un instant.
   */
  async openOrders(): Promise<Page> {
    const page = await this.context.newPage();
    await page.addInitScript(() => {
      const log: [string, string][] = [];
      (window as any).__ccLog = log;
      new MutationObserver((muts) => {
        for (const m of muts) {
          const el = m.target as HTMLElement;
          const id =
            el.querySelector?.('.yohtmlc-order-id')?.textContent?.match(/[0-9A-Z]{3}-\d{7}-\d{7}/)?.[0] ?? '?';
          log.push([id, el.dataset.ccState ?? '']);
        }
      }).observe(document, { attributes: true, attributeFilter: ['data-cc-state'], subtree: true });
    });
    await page.goto(ordersUrl(this.host));
    await expect(page.locator('.js-order-card:not([data-cc-state])')).toHaveCount(0);
    return page;
  }

  async close() {
    await this.context.close();
  }
}

export function card(page: Page, text: string) {
  return page.locator('.js-order-card', { hasText: text });
}

export async function orderIdOf(page: Page, text: string): Promise<string> {
  const label = await card(page, text).locator('.yohtmlc-order-id').textContent();
  return label!.match(/[0-9A-Z]{3}-\d{7}-\d{7}/)![0];
}

/** États successifs pris par la carte d'une commande pendant le chargement. */
export async function statesOf(page: Page, orderId: string): Promise<string[]> {
  const log = (await page.evaluate(() => (window as any).__ccLog)) as [string, string][];
  return log.filter(([id]) => id === orderId).map(([, s]) => s);
}
