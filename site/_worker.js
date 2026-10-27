/**
 * Dekho Hatke - reverse proxy for the Render backend.
 *
 * Browser calls  https://YOUR-SITE.com/api/...   (same origin)
 * This worker forwards to BACKEND_URL (secret env var), so the Render URL
 * never appears in HTML, JS or the browser Network tab.
 *
 * Cloudflare env vars (Settings -> Variables and Secrets):
 *   BACKEND_URL   https://your-service.onrender.com      (secret)
 *   PROXY_SECRET  same value as PROXY_SECRET on Render   (secret)
 *
 * Works as a Pages "advanced mode" worker (_worker.js) and as a Workers `main`.
 */
const ROUTES = {
  "/api/init": ["POST"],
  "/api/event": ["POST"],
  "/api/verify": ["POST"],
  "/api/health": ["GET", "HEAD"],
  "/api/ping": ["GET"], // diagnostic: proves worker -> backend -> PROXY_SECRET all match
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

async function proxy(request, env, url) {
  const allowed = ROUTES[url.pathname];
  if (!allowed) return json({ ok: false }, 404);
  if (!allowed.includes(request.method)) return json({ ok: false }, 405);
  if (!env.BACKEND_URL) return json({ ok: false, err: "not_configured" }, 503);

  let body;
  if (request.method === "POST") {
    // same-origin only (blocks other sites calling your API from a browser)
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).host !== url.host) return json({ ok: false }, 403);
    body = await request.text();
    if (body.length > 4096) return json({ ok: false }, 413);
  }

  const headers = new Headers({
    "content-type": "application/json",
    "x-dh-proxy": env.PROXY_SECRET || "",
    "x-dh-ip": request.headers.get("cf-connecting-ip") || "",
  });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55000); // Render free cold start can take ~50s
  try {
    const target = new URL(url.pathname, env.BACKEND_URL);
    const r = await fetch(target.toString(), {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      signal: ctrl.signal,
    });
    // pass through ONLY body + status; drop every upstream header (hides Render fingerprints)
    return new Response(request.method === "HEAD" ? null : await r.text(), {
      status: r.status,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (e) {
    return json({ ok: false, err: "upstream" }, 502);
  } finally {
    clearTimeout(timer);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return proxy(request, env, url);
    return env.ASSETS.fetch(request);
  },
};
