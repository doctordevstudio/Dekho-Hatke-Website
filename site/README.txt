DEKHO HATKE - static site (HTML/CSS/JS) + Cloudflare reverse proxy (_worker.js).

DEPLOY (Cloudflare Pages): upload/connect this whole folder (the "site" folder is the build output, no build command).
  Settings -> Variables and Secrets (add as Secrets):
     BACKEND_URL   = https://YOUR-SERVICE.onrender.com     (Render's own address, NOT api./drdev.)
     PROXY_SECRET  = same long random string you set on Render (variable PROXY_SECRET)
  The browser only ever calls /api/* on YOUR domain. _worker.js forwards it to Render,
  so the Render URL is never in HTML, JS or the Network tab.

NEW ARTICLE:
 1. Copy a folder in blog/ and rename it; edit title, text, canonical URL.
 2. Keep <script src="/assets/gate.js" defer></script> before </body> (powers the step flow).
 3. Add it to assets/posts.js (search, bookmarks, category) and a card in index.html.
 4. Add its path in the admin panel: Shortener -> "Pages & website" (one path per line) to use it as a step page.
 5. The links are made in the admin panel (Shortener). A visitor opening  /blog/<post>/?t=<code>  runs the steps; license-key
    links come from the Telegram bot, redirect links are shared by you. See SETUP_GUIDE.md in the project root.
