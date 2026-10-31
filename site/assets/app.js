(function(){
"use strict";
var $=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};
var P=window.POSTS||[],DH=window.DH||{};
var BM='<svg viewBox="0 0 24 24" class="bmi" aria-hidden="true"><path d="M6.5 3h11a1.5 1.5 0 0 1 1.5 1.5V21l-7-4.4L5 21V4.5A1.5 1.5 0 0 1 6.5 3z"/></svg>';
var CATE={Apps:"📱",Website:"🌐",Automation:"⚙️",Bot:"🤖",Scrapper:"🕷️"};
function get(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
function set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function toast(m){var t=document.createElement("div");t.className="toast";t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.classList.add("out")},1700);setTimeout(function(){t.remove()},2100)}

/* theme (default = day) */
var tb=$("#themeBtn");
if(tb)tb.onclick=function(){var t=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=t;try{localStorage.setItem("dh-theme",t)}catch(e){}};

/* drawer */
var dr=$("#drawer"),sc=$("#scrim"),mb=$("#menuBtn");
function tog(o){if(dr)dr.classList.toggle("open",o);if(sc)sc.classList.toggle("show",o)}
if(mb)mb.onclick=function(){tog(true)};if(sc)sc.onclick=function(){tog(false)};

/* active nav (links without data-path, e.g. social links, are skipped safely) */
var path=location.pathname;
$$("#nav a").forEach(function(a){var h=a.getAttribute("data-path");if(!h||h.indexOf("#")>-1)return;if(h===path||(h!=="/"&&path.indexOf(h)===0))a.classList.add("active")});

/* search */
var q=$("#q"),box=$("#results");
function find(t){t=t.toLowerCase();return P.filter(function(p){return(p.title+" "+p.desc+" "+p.tech.join(" ")+" "+p.cat).toLowerCase().indexOf(t)>-1}).slice(0,6)}
function showResults(){
  var v=q.value.trim();
  if(v.length<2){box.hidden=true;return}
  var r=find(v);
  box.innerHTML=r.length?r.map(function(p){return'<a href="'+p.url+'">'+esc(p.title)+'<small>'+esc(p.cat)+' · '+esc(p.desc)+'</small></a>'}).join(""):'<a href="/#latest">No match. Browse all articles<small>Try Python, Android, Bot or Scrapper</small></a>';
  box.hidden=false}
if(q&&box){
  q.addEventListener("input",showResults);
  q.addEventListener("focus",showResults);
  q.addEventListener("keydown",function(e){if(e.key==="Enter"){var a=$("a",box);if(a&&!box.hidden){location.href=a.getAttribute("href")}}if(e.key==="Escape")box.hidden=true});
  document.addEventListener("click",function(e){if(!e.target.closest(".search-wrap"))box.hidden=true});
  var qs=new URLSearchParams(location.search).get("q");if(qs){q.value=qs;showResults()}
}

/* bookmarks (saved in this browser's localStorage) */
function sync(){var b=get("dh-bm",[]);$$(".bm").forEach(function(x){var on=b.indexOf(x.dataset.slug)>-1;x.setAttribute("aria-pressed",on);var t=$(".bm-t",x);if(t)t.textContent=on?"Bookmarked":"Bookmark"})}
document.addEventListener("click",function(e){
  var x=e.target.closest(".bm");if(!x||!x.dataset.slug)return;
  var b=get("dh-bm",[]),i=b.indexOf(x.dataset.slug);
  if(i>-1){b.splice(i,1);toast("Removed from bookmarks")}else{b.push(x.dataset.slug);toast("Saved to bookmarks")}
  set("dh-bm",b);sync();if($("#bmlist"))renderBm()});
function cardHTML(p){return'<article class="card post" data-cat="'+p.cat+'"><a class="cover c'+p.c+'" href="'+p.url+'">'+(p.img?'<img src="'+(p.thumb||p.img)+'" alt="" width="720" height="378" loading="lazy" decoding="async">':'<span>'+p.e+'</span>')+'</a><div class="pbody"><div class="row"><span class="chip">'+(CATE[p.cat]||"")+" "+p.cat+'</span></div><h3><a href="'+p.url+'">'+esc(p.title)+'</a></h3><p class="muted">'+esc(p.desc)+'</p><div class="row between tiny muted"><span>'+p.date+" · "+p.mins+' min read</span><button class="bm" data-slug="'+p.slug+'" aria-label="Bookmark" aria-pressed="true">'+BM+'</button></div></div></article>'}
function renderBm(){var b=get("dh-bm",[]),l=$("#bmlist");l.innerHTML=P.filter(function(p){return b.indexOf(p.slug)>-1}).map(cardHTML).join("");$("#bmempty").hidden=l.children.length>0;sync()}
if($("#bmlist"))renderBm();else sync();

/* category tabs: All / Apps / Website / Automation / Bot / Scrapper */
var f=$("#filters");
if(f)f.addEventListener("click",function(e){
  var b=e.target.closest("[data-cat]");if(!b)return;
  var cat=b.dataset.cat,n=0;
  $$("[data-cat]",f).forEach(function(x){var on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-selected",on)});
  $$("#posts .post").forEach(function(c){var show=cat==="all"||c.dataset.cat===cat;c.hidden=!show;if(show)n++});
  var no=$("#noposts");if(no)no.hidden=n>0});

/* share (never shares the private ?t= step link: uses the canonical URL) */
var sb=$("#shareBtn");
function canon(){var l=$('link[rel="canonical"]');return l?l.href:location.origin+location.pathname}
function shareMenu(d){
  var u=encodeURIComponent(d.url),t=encodeURIComponent(d.title),m=document.createElement("div");m.className="sharemenu";
  m.innerHTML='<div class="sheet"><b>Share this article</b><div class="shgrid"><a target="_blank" rel="noopener" href="https://wa.me/?text='+t+"%20"+u+'">WhatsApp</a><a target="_blank" rel="noopener" href="https://t.me/share/url?url='+u+"&text="+t+'">Telegram</a><a target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?url='+u+"&text="+t+'">X</a><a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u='+u+'">Facebook</a><button type="button" data-copy>Copy link</button></div><button type="button" class="btn" data-close>Close</button></div>';
  m.addEventListener("click",function(e){
    if(e.target===m||e.target.closest("[data-close]"))m.remove();
    if(e.target.closest("[data-copy]")){copy(d.url);m.remove()}});
  document.body.appendChild(m)}
function copy(txt){
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){toast("Link copied")},function(){toast("Copy failed")})}
  else{var a=document.createElement("textarea");a.value=txt;document.body.appendChild(a);a.select();try{document.execCommand("copy");toast("Link copied")}catch(e){toast("Copy failed")}a.remove()}}
if(sb)sb.onclick=function(){
  var d={title:document.title.replace(/ \| Dekho Hatke$/,""),text:"Read this on Dekho Hatke",url:canon()};
  if(navigator.share){navigator.share(d).catch(function(){})}else shareMenu(d)};

/* reading progress */
var pr=$("#progress"),art=$(".article");
if(pr&&art)addEventListener("scroll",function(){var r=art.getBoundingClientRect(),h=art.offsetHeight-innerHeight;pr.style.width=Math.max(0,Math.min(100,-r.top/Math.max(h,1)*100))+"%"},{passive:true});

/* tools page */
function out(id,t){var e=$(id);if(e)e.textContent=t}
if($("#jfmt")){
$("#jfmt").onclick=function(){try{out("#jout",JSON.stringify(JSON.parse($("#jin").value),null,2))}catch(e){out("#jout","Invalid JSON: "+e.message)}};
$("#jmin").onclick=function(){try{out("#jout",JSON.stringify(JSON.parse($("#jin").value)))}catch(e){out("#jout","Invalid JSON: "+e.message)}};
$("#benc").onclick=function(){try{out("#bout",btoa(String.fromCharCode.apply(null,new TextEncoder().encode($("#bin").value))))}catch(e){out("#bout","Could not encode.")}};
$("#bdec").onclick=function(){try{out("#bout",new TextDecoder().decode(Uint8Array.from(atob($("#bin").value.trim()),function(c){return c.charCodeAt(0)})))}catch(e){out("#bout","Not valid Base64.")}};
$("#ping").onclick=function(){var s=$("#pst"),t=Date.now();s.textContent="Checking…";out("#pout","Waking the service if it is asleep…");
fetch("/api/health",{cache:"no-store"}).then(function(r){return r.text().then(function(b){s.textContent=r.ok?"Online":"Error "+r.status;out("#pout",(Date.now()-t)+" ms\n"+b.slice(0,500))})}).catch(function(){s.textContent="Offline";out("#pout","Request failed.")})}}
})();

/* optional analytics/ads loaded from config.js */
(function(){var D=window.DH||{};function s(src,a){var e=document.createElement("script");e.async=true;e.src=src;for(var k in a)e.setAttribute(k,a[k]);document.head.appendChild(e)}
if(D.ga_id){s("https://www.googletagmanager.com/gtag/js?id="+D.ga_id);window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag("js",new Date());gtag("config",D.ga_id)}
if(D.cf_beacon)s("https://static.cloudflareinsights.com/beacon.min.js",{defer:"","data-cf-beacon":JSON.stringify({token:D.cf_beacon})});
if(D.adsense_id)s("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="+D.adsense_id,{crossorigin:"anonymous"})})();

/* v3: layout toggle for card grids, and copy / download buttons for code blocks */
(function(){
"use strict";
var $$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};
function toast(m){var t=document.createElement("div");t.className="toast";t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.classList.add("out")},1700);setTimeout(function(){t.remove()},2100)}

var KEY="dh-grid",btns=$$(".gridbtn");
function cols(g){var v=getComputedStyle(g).gridTemplateColumns;return v&&v!=="none"?v.split(" ").length:1}
function grids(){return btns.map(function(b){return document.querySelector(b.getAttribute("data-grid"))}).filter(Boolean)}
function syncIcons(){btns.forEach(function(b){var g=document.querySelector(b.getAttribute("data-grid"));if(g)b.setAttribute("data-next",cols(g)>1?"1":"2")})}
function apply(m){grids().forEach(function(g){g.classList.remove("view-1","view-2");g.classList.add("view-"+m)});syncIcons()}
if(btns.length){
  var saved=null;try{saved=localStorage.getItem(KEY)}catch(e){}
  if(saved==="1"||saved==="2")apply(saved);else syncIcons();
  btns.forEach(function(b){b.addEventListener("click",function(){
    var m=b.getAttribute("data-next")==="1"?"1":"2";apply(m);try{localStorage.setItem(KEY,m)}catch(e){}})});
  var rt;addEventListener("resize",function(){clearTimeout(rt);rt=setTimeout(syncIcons,150)},{passive:true});
}

var EXT={python:"py",javascript:"js",java:"java",cpp:"cpp",bash:"sh",xml:"xml",yaml:"yml",html:"html",groovy:"gradle",text:"txt"};
var ICO={copy:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/></svg>',
dl:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11"/><path d="M7.5 11 12 15.5 16.5 11"/><path d="M5 19.5h14"/></svg>',
ok:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5"/></svg>'};
function copyText(t,done){
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){done(true)},function(){done(false)})}
  else{var a=document.createElement("textarea");a.value=t;a.setAttribute("readonly","");a.style.cssText="position:fixed;opacity:0";document.body.appendChild(a);a.select();var ok=false;try{ok=document.execCommand("copy")}catch(e){}a.remove();done(ok)}}
$$(".prose pre").forEach(function(pre,i){
  if(pre.parentNode.classList.contains("codebox"))return;
  var lang=pre.getAttribute("data-lang")||"text";
  var box=document.createElement("div");box.className="codebox";
  var bar=document.createElement("div");bar.className="codebar";
  bar.innerHTML='<span>'+lang+'</span><span class="codebtns"><button type="button" class="codebtn" data-act="copy" aria-label="Copy code" title="Copy code">'+ICO.copy+'</button><button type="button" class="codebtn" data-act="dl" aria-label="Download code" title="Download code">'+ICO.dl+'</button></span>';
  pre.parentNode.insertBefore(box,pre);box.appendChild(bar);box.appendChild(pre);
  bar.addEventListener("click",function(e){
    var b=e.target.closest(".codebtn");if(!b)return;
    var txt=pre.textContent.replace(/\n$/,"");
    if(b.getAttribute("data-act")==="copy"){
      copyText(txt,function(ok){toast(ok?"Code copied":"Copy failed");if(ok){b.classList.add("ok");b.innerHTML=ICO.ok;setTimeout(function(){b.classList.remove("ok");b.innerHTML=ICO.copy},1600)}});
    }else{
      var name="dekho-hatke-"+lang+"-"+(i+1)+"."+(EXT[lang]||"txt");
      var url=URL.createObjectURL(new Blob([txt+"\n"],{type:"text/plain;charset=utf-8"}));
      var a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
      setTimeout(function(){URL.revokeObjectURL(url)},1500);toast("Downloading "+name);
    }
  });
});
})();
