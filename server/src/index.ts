/**
 * Serveur de synchro Cache-Cadeau. Il ne fait que stocker des blobs chiffrés par foyer :
 * il ne connaît ni les n° de commande, ni les prénoms, ni la clé de déchiffrement.
 *
 *   POST /v1/h/:hid                  crée le foyer (ou vérifie le jeton s'il existe)
 *   GET  /v1/h/:hid/records?since=N  enregistrements modifiés après le curseur N
 *   PUT  /v1/h/:hid/records/:rid     écrit un enregistrement { blob }
 *   DELETE /v1/h/:hid                supprime le foyer et tous ses enregistrements
 *
 * Authentification : `Authorization: Bearer <jeton du foyer>` ; on ne garde que son SHA-256.
 */

export interface Env {
  DB: D1Database;
}

const HID = '[A-Za-z0-9_-]{22}';
const KEY43 = /^[A-Za-z0-9_-]{43}$/;
const ROUTE = new RegExp(`^/v1/h/(${HID})(/records(?:/([A-Za-z0-9_-]{43}))?)?$`);
const MAX_BLOB = 4096;
const MAX_RECORDS = 5000;
const PAGE = 500;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
const text = (status: number, message: string) =>
  new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS } });

async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const url = new URL(req.url);
    const m = ROUTE.exec(url.pathname);
    if (!m) return text(404, 'Introuvable.');
    const hid = m[1]!;
    const isRecords = !!m[2];
    const rid = m[3];

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!KEY43.test(token)) return text(401, 'Jeton manquant.');
    const tokenHash = await sha256(token);

    const household = await env.DB.prepare('SELECT token_hash FROM households WHERE id = ?')
      .bind(hid)
      .first<{ token_hash: string }>();

    if (!isRecords && req.method === 'POST') {
      if (household) return household.token_hash === tokenHash ? json({ ok: true }) : text(409, 'Foyer déjà existant.');
      await env.DB.prepare('INSERT INTO households (id, token_hash, created_at) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING')
        .bind(hid, tokenHash, Date.now())
        .run();
      return json({ ok: true }, 201);
    }

    if (!household) return text(404, 'Foyer inconnu.');
    if (household.token_hash !== tokenHash) return text(401, 'Jeton invalide.');

    // Suppression définitive du foyer et de tous ses enregistrements (droit à l'effacement).
    if (!isRecords && req.method === 'DELETE') {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM records WHERE household_id = ?').bind(hid),
        env.DB.prepare('DELETE FROM households WHERE id = ?').bind(hid),
      ]);
      return json({ ok: true });
    }

    if (isRecords && !rid && req.method === 'GET') {
      const since = Math.max(0, Math.floor(Number(url.searchParams.get('since')) || 0));
      const { results } = await env.DB.prepare(
        'SELECT rid, blob, seq FROM records WHERE household_id = ? AND seq > ? ORDER BY seq LIMIT ?',
      )
        .bind(hid, since, PAGE + 1)
        .all<{ rid: string; blob: string; seq: number }>();
      return json({ records: results.slice(0, PAGE), more: results.length > PAGE });
    }

    if (rid && req.method === 'PUT') {
      const body = (await req.json().catch(() => null)) as { blob?: unknown } | null;
      const blob = body?.blob;
      if (typeof blob !== 'string' || !/^[A-Za-z0-9_-]+$/.test(blob) || blob.length > MAX_BLOB) {
        return text(400, 'Blob invalide.');
      }
      const exists = await env.DB.prepare('SELECT 1 FROM records WHERE household_id = ? AND rid = ?').bind(hid, rid).first();
      if (!exists) {
        const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM records WHERE household_id = ?')
          .bind(hid)
          .first<{ n: number }>();
        if ((count?.n ?? 0) >= MAX_RECORDS) return text(413, 'Trop d’enregistrements pour ce foyer.');
      }
      // REPLACE supprime puis réinsère : la ligne reçoit un nouveau seq, donc elle repart aux autres navigateurs.
      const row = await env.DB.prepare('INSERT OR REPLACE INTO records (household_id, rid, blob) VALUES (?, ?, ?) RETURNING seq')
        .bind(hid, rid, blob)
        .first<{ seq: number }>();
      return json({ seq: row?.seq ?? 0 });
    }

    return text(405, 'Méthode non autorisée.');
  },
} satisfies ExportedHandler<Env>;
