(function(){
var $=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};
var P=window.POSTS||[],DH=window.DH||{};
function get(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
function set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
// theme
$("#themeBtn").onclick=function(){var t=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=t;try{localStorage.setItem("dh-theme",t)}catch(e){}};
// drawer
var dr=$("#drawer"),sc=$("#scrim");function tog(o){dr.classList.toggle("open",o);sc.classList.toggle("show",o)}
$("#menuBtn").onclick=function(){tog(true)};sc.onclick=function(){tog(false)};
// active nav
var path=location.pathname;$$("#nav a").forEach(function(a){var h=a.getAttribute("data-path");if(h.indexOf("#")<0&&(h===path||(h!=="/"&&path.indexOf(h)===0)))a.classList.add("active")});
// search
var q=$("#q"),box=$("#results");
function find(t){t=t.toLowerCase();return P.filter(function(p){return(p.title+" "+p.desc+" "+p.tech.join(" ")).toLowerCase().indexOf(t)>-1}).slice(0,6)}
q.oninput=function(){var v=q.value.trim();if(v.length<2){box.hidden=true;return}var r=find(v);
box.innerHTML=r.length?r.map(function(p){return'<a href="'+p.url+'">'+p.title+'<small>'+p.desc+'</small></a>'}).join(""):'<a href="/#latest">No match. Browse all articles<small>Try a language such as Python or Flutter</small></a>';box.hidden=false};
document.addEventListener("click",function(e){if(!e.target.closest(".search-wrap"))box.hidden=true});
var qs=new URLSearchParams(location.search).get("q");if(qs){q.value=qs;q.oninput()}
// bookmarks
function sync(){var b=get("dh-bm",[]);$$(".bm").forEach(function(x){x.setAttribute("aria-pressed",b.indexOf(x.dataset.slug)>-1)})}
document.addEventListener("click",function(e){var x=e.target.closest(".bm");if(!x)return;var b=get("dh-bm",[]),i=b.indexOf(x.dataset.slug);i>-1?b.splice(i,1):b.push(x.dataset.slug);set("dh-bm",b);sync();if($("#bmlist"))renderBm()});
sync();
function renderBm(){var b=get("dh-bm",[]),l=$("#bmlist");l.innerHTML="";P.filter(function(p){return b.indexOf(p.slug)>-1}).forEach(function(p){
var d=document.createElement("article");d.className="card post";d.innerHTML='<a class="cover c'+p.c+'" href="'+p.url+'"><span>🔖</span></a><div class="pbody"><h3><a href="'+p.url+'">'+p.title+'</a></h3><p class="muted">'+p.desc+'</p><div class="row between tiny muted"><span>'+p.mins+' min read</span><button class="bm" data-slug="'+p.slug+'" aria-pressed="true">🔖</button></div></div>';l.appendChild(d)});
$("#bmempty").hidden=l.children.length>0}
if($("#bmlist"))renderBm();
// tech filter
var f=$("#filters");if(f)f.onclick=function(e){var b=e.target.closest("[data-f]");if(!b)return;$$("[data-f]",f).forEach(function(x){x.classList.toggle("on",x===b)});
$$("#posts .post").forEach(function(c){c.hidden=b.dataset.f!=="all"&&c.dataset.tech.split(",").indexOf(b.dataset.f)<0})};
// reading progress
var pr=$("#progress"),art=$(".article");if(art)addEventListener("scroll",function(){var r=art.getBoundingClientRect(),h=art.offsetHeight-innerHeight;pr.style.width=Math.max(0,Math.min(100,-r.top/Math.max(h,1)*100))+"%"},{passive:true});
// tools
function out(id,t){$(id).textContent=t}
if($("#jfmt")){
$("#jfmt").onclick=function(){try{out("#jout",JSON.stringify(JSON.parse($("#jin").value),null,2))}catch(e){out("#jout","Invalid JSON: "+e.message)}};
$("#jmin").onclick=function(){try{out("#jout",JSON.stringify(JSON.parse($("#jin").value)))}catch(e){out("#jout","Invalid JSON: "+e.message)}};
$("#benc").onclick=function(){try{out("#bout",btoa(String.fromCharCode.apply(null,new TextEncoder().encode($("#bin").value))))}catch(e){out("#bout","Could not encode.")}};
$("#bdec").onclick=function(){try{out("#bout",new TextDecoder().decode(Uint8Array.from(atob($("#bin").value.trim()),function(c){return c.charCodeAt(0)})))}catch(e){out("#bout","Not valid Base64.")}};
$("#ping").onclick=function(){var s=$("#pst"),t=Date.now();s.textContent="Checking…";out("#pout","Waking the service if it is asleep…");
fetch(DH.render_url.replace(/\/$/,"")+"/health",{cache:"no-store"}).then(function(r){return r.text().then(function(b){s.textContent=r.ok?"Online":"Error "+r.status;out("#pout",(Date.now()-t)+" ms\n"+b.slice(0,500))})}).catch(function(e){s.textContent="Offline";out("#pout","Request failed. Check render_url and that CORS is enabled on the service.")})}}
})();
// optional analytics/ads loaded from config.js
(function(){var D=window.DH||{};function s(src,a){var e=document.createElement("script");e.async=true;e.src=src;for(var k in a)e.setAttribute(k,a[k]);document.head.appendChild(e)}
if(D.ga_id){s("https://www.googletagmanager.com/gtag/js?id="+D.ga_id);window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag("js",new Date());gtag("config",D.ga_id)}
if(D.cf_beacon)s("https://static.cloudflareinsights.com/beacon.min.js",{defer:"","data-cf-beacon":JSON.stringify({token:D.cf_beacon})});
if(D.adsense_id)s("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="+D.adsense_id,{crossorigin:"anonymous"})})();
