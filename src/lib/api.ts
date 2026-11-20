/** Client du serveur de synchro (Cloudflare Worker, voir server/). */
import { i18n } from '#i18n';

/** Vide = mode local, sans synchro. Défini dans .env : WXT_API_URL=https://… */
export const API_URL: string = (import.meta.env.WXT_API_URL ?? '').replace(/\/+$/, '');

export interface RemoteRecord {
  rid: string;
  blob: string;
  seq: number;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(method: string, path: string, token: string, body?: unknown): Promise<T> {
  if (!API_URL) throw new ApiError(0, i18n.t('err.syncDisabled'));
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, i18n.t('err.offline'));
  }
  if (!res.ok) {
    throw new ApiError(res.status, i18n.t('err.server', [String(res.status)]));
  }
  return (await res.json()) as T;
}

export const api = {
  createHousehold: (hid: string, token: string) => call<{ ok: true }>('POST', `/v1/h/${hid}`, token),
  deleteHousehold: (hid: string, token: string) => call<{ ok: true }>('DELETE', `/v1/h/${hid}`, token),
  pull: (hid: string, token: string, since: number) =>
    call<{ records: RemoteRecord[]; more: boolean }>('GET', `/v1/h/${hid}/records?since=${since}`, token),
  push: (hid: string, token: string, rid: string, blob: string) =>
    call<{ seq: number }>('PUT', `/v1/h/${hid}/records/${rid}`, token, { blob }),
};
