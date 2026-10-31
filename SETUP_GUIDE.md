# Dekho Hatke — complete setup guide (panel + bot + website + Shortener)

This zip has two projects:

| Folder | What it is | Where it runs |
|---|---|---|
| `panel/` | Flask backend: admin / seller / reseller panels, license API, Telegram bot, Shortener engine | **Render** (free web service) |
| `website/site/` | Your static website + `_worker.js` (reverse proxy for `/api/*`) + `assets/gate.js` (step page) | **Cloudflare Pages** |

Detailed per-topic docs are in `panel/CLOUDFLARE_SETUP.md`, `panel/SHORTENER_SETUP.md`, `panel/README.md`.

## 0. The big picture — which address does what

| Address | Where it points | Serves |
|---|---|---|
| `dekhohatke.com`, `www` | Cloudflare **Pages** | website; `/api/*` is answered by the Pages worker |
| `drdev.dekhohatke.com` | Render (custom domain #1) | admin `/`, `/login`, `/seller`, `/reseller` |
| `api.dekhohatke.com` | Render (custom domain #2) | customer license API `/api/v1/*` |
| `https://<service>.onrender.com` | Render's own address | Telegram webhooks, `/healthz`, and the Shortener gate calls coming from the Pages worker |

```
visitor ─▶ dekhohatke.com/blog/x/?t=CODE ─▶ gate.js ─▶ dekhohatke.com/api/verify ─▶ Pages worker ─(X-DH-Proxy)─▶ <service>.onrender.com/api/verify
Telegram ──────────────────────────────────────────────────────────────────────────▶ <service>.onrender.com/telegram/…
apps ─▶ api.dekhohatke.com/api/v1/… ─▶ Cloudflare (WAF + origin lock) ─▶ Render
you ─▶ drdev.dekhohatke.com ─▶ Cloudflare (WAF + origin lock) ─▶ Render
```
Render's free plan allows only 2 custom domains → `drdev.` and `api.`. The root domain lives on Pages, and the worker talks to Render's own address, so you need no third domain.

## 1. Firebase
1. Realtime Database → create. Copy the **database URL**.
2. Project settings → Service accounts → *Generate new private key* → keep the JSON.
3. Realtime Database → **Rules** → paste the contents of `panel/database.rules.json` → **Publish**. *(Do this after every update of this project. The Shortener history needs the `sl_links` index to be fast; without it the panel still works, just slower, and logs a warning.)*

## 2. Render (backend)
1. New → Web Service → connect the repo containing `panel/` (or Blueprint with `render.yaml`). Keep **1 gunicorn worker** (already in `render.yaml`).
2. Environment variables:

| Variable | Value |
|---|---|
| `SECRET_KEY` | long random string — keep it fixed |
| `FIREBASE_DB_URL`, `FIREBASE_CREDENTIALS_JSON` | from step 1 (JSON on one line) |
| `BOT_TOKEN` | from @BotFather |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_CHAT_ID` | first admin (+ your Telegram numeric id) |
| `ROOT_DOMAIN` | `dekhohatke.com` |
| `BASE_URL` | `https://<service>.onrender.com` — **Render's own address, never drdev./api.** |
| `ORIGIN_SECRET` | add **later** (step 5) — key is exactly `ORIGIN_SECRET` |
| `PROXY_SECRET` | long random string; must equal the Pages secret (step 4) |
| `SITE_URL` | `https://dekhohatke.com` |
| `TG_API_ID`, `TG_API_HASH` | optional (Telegram account / storage channel) |
| `MIN_UPI_PAYMENT` | optional, default `10` (smallest UPI payment, see §8) |
| `TURNSTILE_SITEKEY`, `TURNSTILE_SECRET` | optional |

3. Deploy, open your bot and send `/start` — it must answer.
4. Settings → **Custom Domains** → add `drdev.dekhohatke.com` and `api.dekhohatke.com`. Note Render's CNAME target (`xxxx.onrender.com`).

## 3. Cloudflare DNS (zone dekhohatke.com)
| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `drdev` | `xxxx.onrender.com` | grey first → orange after Render shows **Verified + certificate issued** |
| CNAME | `api` | `xxxx.onrender.com` | same |
| (root & `www`) | — | created automatically by Pages (step 4) | orange |

Delete any AAAA record on `drdev` / `api`. Do not touch the `@`/`www` records after Pages set them.

## 4. Cloudflare Pages (the website)
1. Workers & Pages → Create → Pages → connect Git (or upload) the `website/` project. Build command empty, **output directory `site`** (when uploading directly, upload the `site` folder).
2. Settings → Variables and Secrets (Production **and** Preview, type *Secret*):
   * `BACKEND_URL` = `https://<service>.onrender.com`
   * `PROXY_SECRET` = the same string as on Render
3. Custom domains → `dekhohatke.com` and `www.dekhohatke.com`. Redeploy once.
4. Check: `https://dekhohatke.com/api/ping` → `{"ok":true,"proxy":"ok",…}`. A 404 = secrets differ; 503 `not_configured` = `BACKEND_URL` missing.

## 5. Cloudflare rules (only for `drdev.` and `api.`)
Follow `panel/CLOUDFLARE_SETUP.md` steps 4–8 exactly. Summary:
1. **Configuration Rule** → `http.host in {"drdev.dekhohatke.com" "api.dekhohatke.com"}` → SSL **Full (strict)**. (Don't change the zone-wide SSL mode.)
2. **Transform Rule → Modify Request Header** → same expression → set `X-Origin-Auth` = secret S. Then on Render add `ORIGIN_SECRET` = S. *(Cloudflare first, Render second.)*
3. **WAF custom rules** (5 on Free): block data-centre ASNs / scripts on `drdev.`, challenge panel page loads, allow only `POST /api/v1/*` on `api.`.
4. **Rate limiting** (1 on Free): `drdev.` 30 requests / 10 s.
5. Leave *Bot Fight Mode* off.

Every expression contains `http.host eq "drdev…"` or `"api…"`, so **nothing here can touch `dekhohatke.com` or `/api/init|event|verify`**. You do **not** need any rule, DNS record or header for the shortener calls.

## 6. Keep-alive (Render free sleeps)
UptimeRobot, HTTP monitor every 5 min on `https://<service>.onrender.com/healthz` (and optionally `/api/health` — both need no secret). A visitor waking a sleeping service waits ~30–50 s once; the worker allows 55 s.

## 7. Shortener — first use
1. Admin panel → ☰ → **🔗 Shortener** → **⚙️ Pages & website**. The 9 blog pages are pre-filled; add more paths when you add articles (each must load `/assets/gate.js`).
2. **Create shorturl**: choose type
   * 🔑 *License key* → then Plans → *Free via short link* → pick it. In the bot, users see the free plan, confirm, open the link, finish pages; the bot sends a notice after each page and the key at the end.
   * ↪️ *Redirect* → copy the link and share it; the last Generate sends visitors to your URL.
3. **All shorturl history** (left tab): today / yesterday / all time / custom range, in-progress, and "where users stop" per page.

## 8. Wallet and UPI minimum
If the user's wallet covers part of a purchase, the rest is requested by UPI only when it is **₹10 or more**. Below that the bot asks the user to pay the full price from the wallet or UPI (a ₹1–₹9 payment request is never created). Change with `MIN_UPI_PAYMENT`; the wallet's minimum deposit can't be set below it either.

## 8b. Bot screens (pictures and messages)
* **Admin:** Settings → **🖼 Bot screens** → open a screen (Welcome, Purchase, Wallet, Refer & Earn, Reseller …) → write the message, upload a picture → Save. Reset brings back the built-in look.
* **Reseller:** the same tab in the reseller panel, for the reseller's own bot only.
* Telegram shows at most 1024 characters under a picture; a longer screen is sent as text without the picture.

## 8c. APK / video not arriving through reseller bots
1. Link the personal Telegram account and set the storage channel (Settings → Channel & account); the main bot must be an admin of the channel (the account adds it for you).
2. Nothing else is needed per file: when a file has no copy in the channel, the main bot posts it there by id and each reseller bot copies it to the customer. The file id must be one the **main bot** gave you (send the file to the main bot).
3. If delivery still fails, the alert in Telegram now shows the exact reason (e.g. "not enough rights", "chat not found").

## 9. Updating later
* Panel: push `panel/` → Render redeploys → publish `database.rules.json` if it changed.
* Website: push `website/` → Pages redeploys.
* New blog article: copy a blog folder, keep the `gate.js` script tag, then add its path in Shortener → Pages & website.

## 10. Troubleshooting
| Symptom | Fix |
|---|---|
| Shortener "All history → Left tab" server error | fixed in this version; also publish `database.rules.json` |
| Gate page shows an error / "not_configured" | Pages `BACKEND_URL` / `PROXY_SECRET` missing; redeploy Pages |
| `/api/ping` 404 | Pages and Render `PROXY_SECRET` differ |
| `drdev.` / `api.` answer 404 for everything | `ORIGIN_SECRET` ≠ Cloudflare header value, or the Transform Rule host expression is wrong — delete `ORIGIN_SECRET` on Render to open again |
| Cloudflare 525/526 | Render certificate not ready (keep grey cloud) or SSL mode not Full (strict) |
| Bot silent | `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`: URL must be `https://<service>.onrender.com/telegram/…`; fix `BASE_URL` |
| Key not sent after finishing | bot blocked by the user, or Telegram error — the app retries 8 times, then alerts the admin |
