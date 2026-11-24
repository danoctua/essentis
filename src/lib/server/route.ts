/**
 * Wraps an API route: heavy modules (firebase-admin, aws4fetch) are imported inside the handler,
 * so a failure there comes back as a readable JSON error instead of a bare 500.
 */
import type { APIRoute } from 'astro';

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export const notConfigured = (what: string) => json(503, { error: `Not configured on this deploy: ${what}.` });

export const route = (fn: (request: Request) => Promise<Response>): APIRoute => async ({ request }) => {
  try {
    return await fn(request);
  } catch (e) {
    console.error(e);
    return json(500, { error: `Server error: ${(e as Error).message ?? String(e)}` });
  }
};
