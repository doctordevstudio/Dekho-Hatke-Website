DEKHO HATKE - static site (HTML/CSS/JS) + Cloudflare reverse proxy (_worker.js).

DEPLOY (Cloudflare Pages): upload/connect this whole folder.
  Settings -> Variables and Secrets (add as Secrets):
     BACKEND_URL   = https://YOUR-SERVICE.onrender.com
     PROXY_SECRET  = same long random string you set on Render
  The browser only ever calls /api/* on YOUR domain. _worker.js forwards it to Render,
  so the Render URL is never in HTML, JS or the Network tab.

NEW ARTICLE:
 1. Copy a folder in blog/ and rename it; edit title, text, canonical URL.
 2. Keep <script src="/assets/gate.js" defer></script> before </body> (powers the step flow).
 3. Add it to assets/posts.js (search, bookmarks, category) and a card in index.html.
 4. Add its path to BLOG_PAGES in backend/main.py to use it as a step page.
