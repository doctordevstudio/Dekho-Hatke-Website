/* Edit this file only. No build step needed.
   api_base = the step-gate backend on Render. The visitor's browser calls it directly (CORS), so Cloudflare rules on
   dekhohatke.com can never block it. Leave it "" to use the Cloudflare Pages worker instead (/api/* -> _worker.js). */
window.DH={
  name:"Dekho Hatke",
  api_base:"https://dekhohatke.onrender.com", // the step-gate backend (Render). "" = go through the Cloudflare worker (/api/*) instead
  adsense_id:"",   // e.g. ca-pub-1234567890123456 (add after approval)
  ga_id:"",        // e.g. G-XXXXXXXXXX (time on page)
  cf_beacon:""     // Cloudflare Web Analytics token
};
