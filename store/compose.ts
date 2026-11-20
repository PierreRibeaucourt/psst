/** Mise en scène des captures brutes aux formats du Chrome Web Store, dans la charte Psst. */
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

const b64 = (buf: Buffer, type = 'image/png') => `data:${type};base64,${buf.toString('base64')}`;
const FONT = b64(readFileSync('brand/fonts/Nunito-VariableFont_wght.ttf'), 'font/ttf');
const svg = (name: string) => readFileSync(`brand/${name}`, 'utf8');
const LOGO = svg('logo.svg');
const LOGO_REVERSE = svg('logo-reverse.svg');
const MARK = svg('mark.svg');

const BASE_CSS = `
@font-face { font-family: Nunito; src: url(${FONT}) format('truetype'); font-weight: 200 1000; }
* { box-sizing: border-box; margin: 0; }
html, body { background: transparent; }
body { font-family: Nunito, sans-serif; color: #1B2738; -webkit-font-smoothing: antialiased; }
.frame { position: relative; overflow: hidden; }
h1 { font-weight: 900; letter-spacing: -0.02em; line-height: 1.08; }
p { font-weight: 600; line-height: 1.45; }
.logo svg { height: 100%; width: auto; display: block; }
.shot { display: block; border-radius: 14px; box-shadow: 0 24px 60px rgba(27, 39, 56, .22), 0 2px 6px rgba(27, 39, 56, .12);
  background: #fff; }
.blob { position: absolute; border-radius: 50%; }
.browser { border-radius: 14px; overflow: hidden; background: #fff;
  box-shadow: 0 24px 60px rgba(27, 39, 56, .22), 0 2px 6px rgba(27, 39, 56, .12); }
.browser .top { height: 34px; background: #EEF0F3; display: flex; align-items: center; gap: 7px; padding: 0 14px; }
.browser .dot { width: 11px; height: 11px; border-radius: 50%; background: #CDD2D9; }
.browser .url { margin-left: 12px; flex: 1; height: 22px; border-radius: 11px; background: #fff; font: 600 12px Nunito;
  color: #5B6472; display: flex; align-items: center; padding: 0 12px; }
.tag { display: inline-block; padding: 6px 14px; border-radius: 999px; background: #1B2738; color: #fff;
  font-weight: 800; font-size: 18px; margin-bottom: 12px; }
`;

async function render(page: Page, w: number, h: number, body: string, out: string) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><head><style>${BASE_CSS}</style></head><body>${body}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } });
}

/** Capture 1280×800 : texte à gauche, capture à droite. */
export async function shotFrame(
  page: Page,
  out: string,
  copy: { title: string; sub: string },
  image: Buffer,
  opts: { maxW?: number; maxH?: number; browserUrl?: string; bleed?: number } = {},
) {
  const { maxW = 700, maxH = 620, browserUrl, bleed } = opts;
  const img = bleed
    ? `<img class="shot" src="${b64(image)}" style="position:absolute;left:30px;top:50%;transform:translateY(-50%);width:${bleed}px">`
    : browserUrl
    ? `<div class="browser" style="width:${maxW}px"><div class="top"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url">${browserUrl}</span></div><img src="${b64(image)}" style="display:block;width:100%"></div>`
    : `<img class="shot" src="${b64(image)}" style="max-width:${maxW}px;max-height:${maxH}px">`;
  await render(
    page,
    1280,
    800,
    `<div class="frame" style="width:1280px;height:800px;background:#FFF6E9">
      <div class="blob" style="width:620px;height:620px;right:-140px;bottom:-220px;background:#FFE3B8"></div>
      <div class="blob" style="width:180px;height:180px;right:520px;top:-80px;background:#FFEDD2"></div>
      <div style="position:absolute;left:72px;top:0;bottom:0;width:400px;display:flex;flex-direction:column;justify-content:center">
        <div class="logo" style="height:44px;margin-bottom:40px">${LOGO}</div>
        <h1 style="font-size:46px;margin-bottom:22px">${copy.title}</h1>
        <p style="font-size:21px;color:#5B6472">${copy.sub}</p>
      </div>
      <div style="position:absolute;left:500px;right:50px;top:0;bottom:0;display:flex;align-items:center;justify-content:center">${img}</div>
    </div>`,
    out,
  );
}

/** Capture 1280×800 : deux vues côte à côte (Leo / Emma). */
export async function sideBySideFrame(
  page: Page,
  out: string,
  copy: { title: string; sub: string; left: string; right: string },
  left: Buffer,
  right: Buffer,
) {
  const col = (label: string, image: Buffer) =>
    `<div style="width:540px"><span class="tag">${label}</span>
      <div class="shot" style="width:540px;height:500px;overflow:hidden;position:relative">
        <img src="${b64(image)}" style="display:block;width:540px">
        <div style="position:absolute;left:0;right:0;bottom:0;height:90px;background:linear-gradient(rgba(255,255,255,0),#fff)"></div>
      </div></div>`;
  await render(
    page,
    1280,
    800,
    `<div class="frame" style="width:1280px;height:800px;background:#FFF6E9">
      <div class="blob" style="width:700px;height:700px;left:290px;top:330px;background:#FFE3B8"></div>
      <div style="position:absolute;left:72px;right:72px;top:46px;display:flex;align-items:center;gap:28px">
        <div style="width:54px;height:54px;flex:none">${MARK}</div>
        <div><h1 style="font-size:40px;margin-bottom:6px">${copy.title}</h1>
        <p style="font-size:19px;color:#5B6472">${copy.sub}</p></div>
      </div>
      <div style="position:absolute;left:72px;right:72px;top:210px;display:flex;gap:56px;justify-content:center">
        ${col(copy.left, left)}${col(copy.right, right)}
      </div>
    </div>`,
    out,
  );
}

/** Grande bannière 1400×560 (marquee) et image de partage. */
export async function marquee(page: Page, out: string, copy: { title: string; sub: string }, image: Buffer, w = 1400, h = 560) {
  const scale = h / 560;
  await render(
    page,
    w,
    h,
    `<div class="frame" style="width:${w}px;height:${h}px;background:#1B2738">
      <div class="blob" style="width:${560 * scale}px;height:${560 * scale}px;right:${-60 * scale}px;top:${-120 * scale}px;background:#24344B"></div>
      <div style="position:absolute;left:${80 * scale}px;top:0;bottom:0;width:${560 * scale}px;display:flex;flex-direction:column;justify-content:center">
        <div class="logo" style="height:${60 * scale}px;margin-bottom:${36 * scale}px">${LOGO_REVERSE}</div>
        <h1 style="font-size:${54 * scale}px;color:#fff;margin-bottom:${18 * scale}px">${copy.title}</h1>
        <p style="font-size:${22 * scale}px;color:#C9D2DF">${copy.sub}</p>
      </div>
      <img class="shot" src="${b64(image)}" style="position:absolute;right:${70 * scale}px;top:50%;width:${640 * scale}px;
        transform:translateY(-50%) rotate(-2.5deg)">
    </div>`,
    out,
  );
}

/** Petite vignette 440×280 (non localisable : logo + accroche courte). */
export async function smallTile(page: Page, out: string) {
  await render(
    page,
    440,
    280,
    `<div class="frame" style="width:440px;height:280px;background:#1B2738;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px">
      <div class="blob" style="width:260px;height:260px;right:-90px;bottom:-130px;background:#24344B"></div>
      <div class="logo" style="height:84px;position:relative">${LOGO_REVERSE}</div>
      <p style="position:relative;font-size:22px;font-weight:800;color:#FF9F1C">No spoilers.</p>
    </div>`,
    out,
  );
}
