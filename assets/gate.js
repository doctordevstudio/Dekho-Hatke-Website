/* Dekho Hatke - step gate (shortener-style flow).
 * Runs on blog pages. Inert unless the URL has ?t=<code> AND the backend says the code is valid.
 * Invalid / expired / reused code -> silent redirect to "/" (no timer, no step counter is ever shown).
 * All timing is enforced SERVER SIDE; this file is only the UI.
 */
(function () {
  "use strict";
  var code = new URLSearchParams(location.search).get("t");
  if (!code || !/^[A-Za-z0-9_-]{16,64}$/.test(code)) return;

  var rm = document.createElement("meta"); rm.name = "robots"; rm.content = "noindex,nofollow"; document.head.appendChild(rm);
  var S = null, nonce = "", reached = false, topAt = -1e9, tsToken = "", tsId = null, busy = false;
  var timer = { left: 0, run: false, last: 0, id: 0 };
  var el = {};

  /* ---------------- API (same-origin /api/* -> Cloudflare worker -> backend) ---------------- */
  function api(path, body, tries) {
    tries = tries || 0;
    return fetch("/api/" + path, {
      method: "POST", cache: "no-store", credentials: "same-origin",
      headers: { "content-type": "application/json" }, body: JSON.stringify(body)
    }).then(function (r) {
      if (r.status >= 500 && tries < 8) return wait(1500 + tries * 1500).then(function () { return api(path, body, tries + 1); });
      // a non-JSON reply means the proxy/backend is not set up right (NOT an invalid link)
      return r.json().catch(function () { return { ok: false, err: "config" }; });
    }, function () {
      if (tries < 8) return wait(1500 + tries * 1500).then(function () { return api(path, body, tries + 1); });
      return { ok: false, err: "network" };
    });
  }
  function down(d) { return d.err === "network" || d.err === "upstream" || d.err === "not_configured" || d.err === "config"; }
  function fail() {
    css(); document.documentElement.classList.add("dhg");
    var b = document.createElement("div"); b.id = "dhg-bar";
    b.innerHTML = '<div class="in"><div class="l"><b>Could not connect</b><span id="dhg-msg">The server is waking up or unavailable. Please try again.</span></div>' +
      '<div class="r"><button class="dhg-btn" type="button">Retry</button></div></div>';
    b.querySelector("button").onclick = function () { location.reload(); };
    document.body.appendChild(b);
  }
  function offline() { paint(); el.msg.textContent = "⚠️ Connection problem. Please try again."; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function home() { location.replace("/"); }
  function sig(ev, extra) {
    var o = { wd: navigator.webdriver === true, trusted: ev ? ev.isTrusted !== false : true };
    for (var k in extra) o[k] = extra[k];
    return o;
  }

  /* ---------------- boot ---------------- */
  api("init", { t: code, p: location.pathname }).then(function (d) {
    if (down(d)) return fail();                       // infrastructure problem: show a retry bar
    if (!d.ok) return home();                         // invalid / expired / used link: silent redirect
    if (d.redirect) return location.replace(d.redirect);
    build(); apply(d);
  });

  /* ---------------- UI ---------------- */
  function css() {
    var s = document.createElement("style");
    s.textContent =
      ":root{--dhg-h:68px}" +
      "html.dhg body{padding-top:var(--dhg-h)}" +
      "html.dhg .drawer{top:var(--dhg-h);height:calc(100vh - var(--dhg-h))}" +
      "html.dhg .topbar{top:var(--dhg-h)}html.dhg #progress{top:var(--dhg-h)}html.dhg{scroll-padding-top:calc(var(--dhg-h) + 70px)}" +
      "#dhg-bar{position:fixed;z-index:120;top:0;left:0;right:0;height:var(--dhg-h);background:var(--bg2,#fff);color:var(--text,#14142b);border-bottom:1px solid var(--stroke,rgba(0,0,0,.12));box-shadow:0 6px 24px rgba(0,0,0,.14);font:14px/1.3 var(--font,system-ui,sans-serif)}" +
      "#dhg-bar .in{display:flex;align-items:center;justify-content:space-between;gap:12px;height:calc(var(--dhg-h) - 4px);padding:0 clamp(12px,3vw,28px);max-width:1200px;margin:auto}" +
      "#dhg-bar .l{display:flex;flex-direction:column;gap:3px;min-width:0}#dhg-bar b{font-size:15px}" +
      "#dhg-msg{color:var(--muted,#666);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:13px}" +
      "#dhg-bar .r{display:flex;align-items:center;gap:10px;flex:none}" +
      "#dhg-time{min-width:58px;text-align:center;font:700 18px var(--display,system-ui);padding:7px 12px;border-radius:999px;background:var(--card,#f1f1f8);border:1px solid var(--stroke,rgba(0,0,0,.12));font-variant-numeric:tabular-nums}" +
      ".dhg-btn{cursor:pointer;border:0;border-radius:999px;padding:10px 20px;font-weight:700;font-size:14px;color:#fff;background:var(--grad,linear-gradient(135deg,#8a5cff,#ff4fa3));box-shadow:0 8px 20px rgba(138,92,255,.4)}" +
      ".dhg-btn:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}.dhg-btn.go{background:linear-gradient(135deg,#16c172,#0fa3b1)}" +
      "#dhg-prog{position:absolute;left:0;bottom:0;height:4px;width:0;background:linear-gradient(90deg,#3de0ff,#8a5cff,#ff4fa3);transition:width .25s linear}" +
      "#dhg-bottom{margin:34px 0 10px}#dhg-bottom .c{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;padding:26px 18px;border-radius:22px;border:2px dashed #8a5cff;background:var(--card,#f1f1f8)}" +
      "#dhg-bottom .c b{font-size:18px}#dhg-bottom .c p{margin:0;color:var(--muted,#666)}#dhg-bottom .big{font:700 34px var(--display,system-ui);font-variant-numeric:tabular-nums}#dhg-bottom .dhg-btn{padding:13px 34px;font-size:16px}" +
      "#dhg-done{position:fixed;inset:0;z-index:300;display:grid;place-items:center;padding:20px;background:rgba(10,10,25,.62);backdrop-filter:blur(6px)}" +
      "#dhg-done .c{max-width:420px;width:100%;text-align:center;padding:30px 22px;border-radius:24px;background:var(--bg2,#fff);color:var(--text,#14142b);display:flex;flex-direction:column;gap:12px;align-items:center;box-shadow:0 30px 80px rgba(0,0,0,.5)}" +
      "#dhg-done h2{margin:0;font-size:24px}#dhg-done p{margin:0;color:var(--muted,#666)}" +
      "@media(max-width:560px){:root{--dhg-h:78px}#dhg-bar b{font-size:14px}#dhg-time{min-width:50px;font-size:16px;padding:6px 10px}.dhg-btn{padding:9px 16px}}";
    document.head.appendChild(s);
  }
  function build() {
    css();
    document.documentElement.classList.add("dhg");
    var bar = document.createElement("div");
    bar.id = "dhg-bar";
    bar.innerHTML = '<div class="in"><div class="l"><b id="dhg-title"></b><span id="dhg-msg"></span></div>' +
      '<div class="r"><span id="dhg-time">--</span><button class="dhg-btn" id="dhg-btn" type="button" hidden></button></div></div><i id="dhg-prog"></i>';
    document.body.appendChild(bar);

    var box = document.createElement("section");
    box.id = "dhg-bottom"; box.hidden = true;
    box.innerHTML = '<div class="c"><b id="dhg-btitle"></b><p id="dhg-bmsg"></p><div class="big" id="dhg-btime" hidden></div><div id="dhg-ts"></div>' +
      '<button class="dhg-btn" id="dhg-bbtn" type="button"></button></div>';
    var foot = document.querySelector(".foot");
    if (foot && foot.parentNode) foot.parentNode.insertBefore(box, foot); else document.body.appendChild(box);

    ["title", "msg", "time", "btn", "prog"].forEach(function (k) { el[k] = document.getElementById("dhg-" + k); });
    ["bottom", "btitle", "bmsg", "btime", "ts", "bbtn"].forEach(function (k) { el[k] = document.getElementById("dhg-" + k); });
    el.btn.onclick = onTopBtn; el.bbtn.onclick = onBottomBtn;

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { if (e[0].isIntersecting) reached = true; }, { threshold: 0.6 }).observe(box);
    } else {
      addEventListener("scroll", function () { if (innerHeight + scrollY >= document.documentElement.scrollHeight - 80) reached = true; }, { passive: true });
    }
    document.addEventListener("visibilitychange", function () { if (S) paint(); });
  }

  /* ---------------- state -> UI ---------------- */
  var phase = "";   // top | top_ready | scroll | bottom | verify
  function apply(d) {
    S = d; nonce = d.n; phase = d.phase;
    timer.left = d.remaining;
    if (phase === "top" && timer.left <= 0) phase = "top_ready";
    el.title.textContent = "Complete all " + d.total + " steps";
    startTimer(); paint();
    if (phase === "verify") mountCaptcha();
  }
  function label() { return S.last ? "Generate" : "Verify"; }
  function paint() {
    var hidden = document.hidden, run = phase === "top" || phase === "bottom";
    var step = "Step " + S.step + "/" + S.total + " · ";
    el.btn.hidden = true; el.btn.className = "dhg-btn";
    el.bottom.hidden = !(phase === "scroll" || phase === "bottom" || phase === "verify");
    el.btime.hidden = true; el.bbtn.hidden = true; el.bbtn.className = "dhg-btn";
    el.btitle.textContent = step.replace(" · ", "");

    if (phase === "top") {
      el.msg.textContent = step + (hidden ? "⏸ Timer paused. Stay on this tab." : "Please wait for the timer…");
    } else if (phase === "top_ready") {
      el.msg.textContent = step + "Timer finished. Click Continue.";
      el.btn.hidden = false; el.btn.textContent = "Continue"; el.btn.disabled = busy;
    } else if (phase === "scroll") {
      el.msg.textContent = "👇 Scroll down to the bottom of the page and click on Continue";
      el.bmsg.textContent = "Click Continue to start the final timer for this step.";
      el.bbtn.hidden = false; el.bbtn.textContent = "Continue"; el.bbtn.disabled = busy;
    } else if (phase === "bottom") {
      el.msg.textContent = step + (hidden ? "⏸ Timer paused. Stay on this tab." : "Almost there, please wait…");
      el.bmsg.textContent = hidden ? "Timer paused. Stay on this tab." : "Please wait for the timer to finish…";
      el.btime.hidden = false;
    } else if (phase === "verify") {
      el.msg.textContent = step + (S.last ? "All done! Click Generate." : "Click Verify to continue.");
      el.bmsg.textContent = S.last ? "Click Generate to finish all steps." : "Click Verify to confirm this step.";
      var off = busy || (!!S.turnstile && !tsToken);
      el.btn.hidden = false; el.btn.textContent = label(); el.btn.disabled = off; el.btn.classList.add("go");
      el.bbtn.hidden = false; el.bbtn.textContent = label(); el.bbtn.disabled = off; el.bbtn.classList.add("go");
    }
    tick(true);
  }

  /* ---------------- countdown (pauses while tab is hidden) ---------------- */
  function startTimer() {
    clearInterval(timer.id); timer.last = performance.now();
    timer.id = setInterval(function () {
      var n = performance.now(), dt = (n - timer.last) / 1000; timer.last = n;
      if (document.hidden || (phase !== "top" && phase !== "bottom")) return;
      timer.left = Math.max(0, timer.left - dt);
      if (timer.left <= 0) {
        if (phase === "top") phase = "top_ready";
        else if (phase === "bottom") { phase = "verify"; mountCaptcha(); }
        paint();
      } else tick();
    }, 200);
  }
  function tick(force) {
    var run = phase === "top" || phase === "bottom";
    var t = run ? Math.ceil(timer.left) + "s" : (phase === "top_ready" || phase === "verify" ? "0s" : "--");
    el.time.textContent = t; el.btime.textContent = t;
    var total = phase === "bottom" ? S.bottom : S.top;
    var pct = run ? (1 - timer.left / Math.max(total, 1)) * 100 : (phase === "scroll" ? 100 : (phase === "top_ready" || phase === "verify" ? 100 : 0));
    el.prog.style.width = Math.min(100, Math.max(0, pct)) + "%";
  }

  /* ---------------- actions ---------------- */
  function onTopBtn(e) {
    if (phase === "verify") return doVerify(e);
    if (phase !== "top_ready" || busy) return;
    send("top_click", e);
  }
  function onBottomBtn(e) {
    if (phase === "verify") return doVerify(e);
    if (phase !== "scroll" || busy) return;
    var gap = 1400 - (performance.now() - topAt);      // server needs >1.2s between the two Continue clicks
    if (gap > 0) {
      busy = true; paint();
      return setTimeout(function () { busy = false; send("bottom_click", e, { bottom: reached }); }, gap);
    }
    send("bottom_click", e, { bottom: reached });
  }
  function send(ev, e, extra) {
    busy = true; paint();
    api("event", { t: code, n: nonce, ev: ev, sig: sig(e, extra || {}) }).then(function (d) {
      busy = false;
      if (d.ok) { if (ev === "top_click") topAt = performance.now(); return apply(d); }
      if (d.err === "resync" || d.err === "slow_down") return resync();
      if (down(d)) return offline();
      home();
    });
  }
  function resync() {
    api("init", { t: code, p: location.pathname }).then(function (d) {
      busy = false;
      if (d.ok && d.redirect) return location.replace(d.redirect);
      if (d.ok) return apply(d);
      if (down(d)) return offline();
      home();
    });
  }
  function doVerify(e) {
    if (busy) return;
    busy = true; paint();
    api("verify", { t: code, n: nonce, cf: tsToken, sig: sig(e, {}) }).then(function (d) {
      if (d.ok && d.done) return finish(d);
      if (d.ok && d.next) {
        el.msg.textContent = "✅ Step verified! Opening the next step…";
        return location.assign(d.next);
      }
      busy = false;
      if (d.err === "captcha") { tsToken = ""; if (window.turnstile && tsId !== null) turnstile.reset(tsId); return paint(); }
      if (d.err === "resync" || d.err === "slow_down") return resync();
      if (down(d)) return offline();
      home();
    });
  }

  /* ---------------- optional Cloudflare Turnstile ---------------- */
  function mountCaptcha() {
    if (!S.turnstile || tsId !== null) return;
    function go() {
      tsId = turnstile.render(el.ts, { sitekey: S.turnstile, callback: function (t) { tsToken = t; paint(); },
        "expired-callback": function () { tsToken = ""; paint(); } });
    }
    if (window.turnstile) return go();
    var s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true; s.onload = go; document.head.appendChild(s);
  }

  /* ---------------- finish ---------------- */
  function finish(d) {
    clearInterval(timer.id);
    var o = document.createElement("div");
    o.id = "dhg-done";
    o.innerHTML = '<div class="c"><div style="font-size:54px">🎉</div><h2>All steps verified!</h2>' +
      '<p>Go back to the Telegram bot. A confirmation message has been sent to you.</p></div>';
    var c = o.firstChild;
    if (d.bot) { var a = document.createElement("a"); a.className = "dhg-btn"; a.href = d.bot; a.textContent = "Open Telegram Bot"; c.appendChild(a); }
    var b = document.createElement("a"); b.href = "/"; b.textContent = "Back to home"; b.style.cssText = "color:inherit;opacity:.7;font-size:13px"; c.appendChild(b);
    document.body.appendChild(o);
    el.btn.hidden = true; el.bbtn.hidden = true; el.msg.textContent = "✅ All steps verified";
  }
})();
