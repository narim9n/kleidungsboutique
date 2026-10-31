
"use strict";
// ==== HIER ANPASSEN ====
// Öffentlicher Drop: ab dieser Zeit läuft der Countdown ab. Danach lädt die Seite alle 10 Sekunden nach, ob die
// öffentliche Version (drop.json ohne Passwort) hochgeladen wurde, und öffnet sich dann für alle. Leer = kein Countdown.
// Beispiel: "2026-11-15T18:00:00+01:00"  (Jahr-Monat-Tag, Uhrzeit, Zeitzone)
const DROP_AT = "";
// Nur Anzeige auf der Seite. Muss zu den Versandarten passen, die du in Stripe angelegt hast.
const SHIP_INFO = {de:6.19, eu:14.49};
// Produkte, Collections und Passwort stecken verschlüsselt in drop.json (nicht hier im Code).
// =======================


const $ = id => document.getElementById(id);
const eur = n => new Intl.NumberFormat("en-IE",{style:"currency",currency:"EUR"}).format(n);

let COLLECTIONS = [], PRODUCTS = [], activeCol = "";
function renderGrid(){
  const base = activeCol==="all" ? PRODUCTS : PRODUCTS.filter(p=>p.collection===activeCol);
  const list = [...base].sort((a,b)=>(a.sold?1:0)-(b.sold?1:0));   // verkaufte Teile ans Ende
  $("colTitle").textContent = activeCol==="all" ? "All pieces" : COLLECTIONS.find(c=>c.id===activeCol).name;
  $("grid").innerHTML = list.length ? list.map(p=>{
    const h = p.images[p.hoverImg!==undefined ? p.hoverImg : 1];
    return `<button class="t${p.sold?" sold":""}" data-open="${p.id}" aria-label="${p.name}, ${p.sold?"sold":eur(p.price)}" title="${p.name}">
      <img class="m" src="${p.images[0]}" alt="">${p.images.length>1?`<img class="h" src="${h}" alt="">`:""}${p.sold?'<span class="soldtag">Sold</span>':''}
    </button>`;}).join("") : '<p class="hint">Nothing here yet.</p>';
}
function renderMenu(){
  const n = id => id==="all" ? PRODUCTS.length : PRODUCTS.filter(p=>p.collection===id).length;
  $("cMenu").innerHTML = [{id:"all",name:"All pieces"},...COLLECTIONS].map(c=>
    `<li role="option" data-c="${c.id}" aria-selected="${c.id===activeCol}"><span>${c.name}</span><span class="n">${n(c.id)}</span></li>`).join("");
}
function setCollection(id){ activeCol = id; renderGrid(); renderMenu(); closeMenu(); }
function openMenu(){ $("cMenu").hidden = false; $("cBtn").setAttribute("aria-expanded","true"); }
function closeMenu(){ $("cMenu").hidden = true; $("cBtn").setAttribute("aria-expanded","false"); }
$("cBtn").addEventListener("click",e=>{ e.stopPropagation(); $("cMenu").hidden ? openMenu() : closeMenu(); });
$("cMenu").addEventListener("click",e=>{ const li = e.target.closest("[data-c]"); if(li) setCollection(li.dataset.c); });
document.addEventListener("click",e=>{ if(!e.target.closest(".cd")) closeMenu(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape" && !$("cMenu").hidden){ closeMenu(); e.preventDefault(); $("cBtn").focus(); } });

function buyHTML(p){
  if(p.sold) return '<button class="btn" disabled>Sold</button>';
  if(!p.buyUrl) return '<button class="btn" disabled>Opens soon</button>';
  return `<a class="btn buy" href="${p.buyUrl}" rel="noopener">Buy now</a>`;
}
function productHTML(p){
  return `
  <article class="product" data-pid="${p.id}">
    <div class="gallery"><button class="fs" aria-label="View full screen"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
      <img class="main" id="main-${p.id}" src="${p.images[0]}" alt="${p.name}">
      <div class="thumbs">${p.images.map((u,i)=>`<button data-g="${p.id}" data-src="${u}" data-i="${i}" class="${i?"":"on"}" aria-label="Photo ${i+1}"><img src="${u}" alt=""></button>`).join("")}</div>
    </div>
    <div class="info">
      <h2 style="margin:0">${p.name}</h2>
      <p class="hint" style="margin-top:4px">${p.meta}</p>
      <span class="tag${p.sold?" soldout":""}">${p.sold?"Sold · one of a kind":"Unique piece · only 1 available"}</span>
      <div class="price${p.sold?" was":""}">${eur(p.price)}</div>
      <ul class="details">${p.details.map(d=>`<li>${d}</li>`).join("")}</ul>
      ${buyHTML(p)}
      <ul class="trust">
        <li>Secure checkout by Stripe</li>
        <li>Shipping with DHL. Germany ${eur(SHIP_INFO.de)}, EU ${eur(SHIP_INFO.eu)}, pickup in Frankfurt free. You choose at checkout.</li>
        <li>14-day right of withdrawal. <a href="widerruf.html">Details</a></li>
      </ul>
      <button class="linkbtn" data-share="${p.id}">Share this piece</button>
    </div>
    <div class="buybar"><div class="bb-info"><b>${eur(p.price)}</b><small>${p.sold?"Sold":"Unique piece"}</small></div>${buyHTML(p)}</div>
  </article>`;
}

const isUnlocked = () => document.documentElement.classList.contains("unlocked");
let lastFocus = null;
async function shareProduct(id,btn){
  const p = PRODUCTS.find(x=>x.id===id), url = location.origin + location.pathname + "#" + id;
  if(navigator.share){
    try{ await navigator.share({title:p.name+" – narimanghanai", text:p.name, url}); return; }
    catch(e){ if(e.name==="AbortError") return; }
  }
  try{ await navigator.clipboard.writeText(url); const t = btn.textContent; btn.textContent = "Link copied"; setTimeout(()=>btn.textContent=t,1800); }
  catch(e){ prompt("Copy this link", url); }
}
const bgInert = on => document.querySelectorAll("header,main,footer").forEach(e=>on ? e.setAttribute("inert","") : e.removeAttribute("inert"));
function openProduct(id){
  const p = PRODUCTS.find(x=>x.id===id); if(!p) return;
  $("pmBody").innerHTML = productHTML(p); cur[id] = 0;
  lastFocus = document.activeElement;
  $("pm").hidden = false; document.body.classList.add("noscroll"); $("pm").querySelector(".pm-box").scrollTop = 0;
  bgInert(true); $("pmX").focus();
  try{ history.replaceState(null,"","#"+id); }catch(e){}
}
function closeProduct(){
  $("pm").hidden = true; document.body.classList.remove("noscroll");
  if(isUnlocked()) bgInert(false);
  if(lastFocus && lastFocus.focus) lastFocus.focus();
  try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){}
}
$("grid").addEventListener("click",e=>{ const t = e.target.closest("[data-open]"); if(t) openProduct(t.dataset.open); });
$("pmX").onclick = closeProduct;
$("pm").addEventListener("click",e=>{
  if(e.target===$("pm")){ closeProduct(); return; }
  const t = e.target.closest("[data-g]");
  if(t){ $("main-"+t.dataset.g).src = t.querySelector("img").src;
    t.parentElement.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===t)); cur[t.dataset.g] = +t.dataset.i; return; }
  const sh = e.target.closest("[data-share]"); if(sh){ shareProduct(sh.dataset.share, sh); return; }
  const mm = e.target.closest(".main,.fs");
  if(mm){ const pid = mm.closest(".product").dataset.pid; lbOpen(PRODUCTS.find(x=>x.id===pid).images, cur[pid]||0); }
});

const cur = {};
const lb = $("lb"), lbImg = $("lbImg");
let lbList = [], lbI = 0, z = 1, tx = 0, ty = 0, down = false, moved = false, sx = 0, sy = 0, stx = 0, sty = 0;
function apply(){ lbImg.style.transform = `translate(${tx}px,${ty}px) scale(${z})`; lbImg.style.cursor = z>1 ? "grab" : "zoom-in"; }
function resetZoom(){ z = 1; tx = ty = 0; apply(); }
function lbShow(i){
  lbI = (i + lbList.length) % lbList.length; lbImg.src = lbList[lbI];
  $("lbDots").querySelectorAll("button").forEach((d,k)=>d.classList.toggle("on",k===lbI));
  resetZoom();
}
function lbOpen(list,i){
  lbList = list; lb.classList.toggle("single", list.length<2);
  $("lbDots").innerHTML = list.map((_,k)=>`<button data-d="${k}" aria-label="Photo ${k+1}"></button>`).join("");
  lb.hidden = false; document.body.classList.add("noscroll"); lbShow(i); lb.focus();
}
function lbClose(){
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  lb.hidden = true; if($("pm").hidden) document.body.classList.remove("noscroll");
}
function toggleFull(){
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  else lb.requestFullscreen().catch(()=>{});
}
if(document.fullscreenEnabled) $("lbF").hidden = false;
$("lbF").onclick = toggleFull; $("lbX").onclick = lbClose;
$("lbP").onclick = () => lbShow(lbI-1); $("lbN").onclick = () => lbShow(lbI+1);
$("lbDots").addEventListener("click",e=>{ const d = e.target.closest("[data-d]"); if(d) lbShow(+d.dataset.d); });
lb.addEventListener("click",e=>{ if(e.target===lb) lbClose(); });
document.addEventListener("fullscreenchange",()=>{ if(!document.fullscreenElement && !lb.hidden) lbImg.focus?.(); });
lbImg.addEventListener("pointerdown",e=>{ down = true; moved = false; sx = e.clientX; sy = e.clientY; stx = tx; sty = ty; lbImg.style.transition = "none"; lbImg.setPointerCapture(e.pointerId); });
lbImg.addEventListener("pointermove",e=>{
  if(!down) return;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if(Math.abs(dx)+Math.abs(dy) > 6) moved = true;
  if(z>1){ tx = stx+dx; ty = sty+dy; apply(); }
});
lbImg.addEventListener("pointerup",e=>{
  down = false; lbImg.style.transition = "transform .2s";
  const dx = e.clientX - sx;
  if(!moved){
    if(z>1){ resetZoom(); }
    else{ const r = lbImg.getBoundingClientRect(); z = 2.5;
      tx = -(e.clientX-(r.left+r.width/2))*(z-1); ty = -(e.clientY-(r.top+r.height/2))*(z-1); apply(); }
  }else if(z===1 && Math.abs(dx)>50){ lbShow(lbI + (dx<0 ? 1 : -1)); }
});
document.addEventListener("keydown",e=>{
  if(lb.hidden) return;
  if(e.key==="Escape" && !document.fullscreenElement){ lbClose(); e.preventDefault(); }
  if(e.key==="ArrowLeft") lbShow(lbI-1);
  if(e.key==="ArrowRight") lbShow(lbI+1);
  if(e.key==="f" || e.key==="F") toggleFull();
});

$("y").textContent = new Date().getFullYear();
document.addEventListener("keydown",e=>{ if(e.key==="Escape" && !e.defaultPrevented && !$("pm").hidden) closeProduct(); });

/* Einlass-Bildschirm: die Produktdaten liegen verschlüsselt in drop.json (AES-256-GCM, Schlüssel aus dem Passwort) */
const lockInert = bgInert;
function initShop(data){
  COLLECTIONS = data.collections || []; PRODUCTS = data.products || [];
  activeCol = COLLECTIONS.length ? COLLECTIONS[0].id : "all";
  renderGrid(); renderMenu();
}
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function decryptDrop(file, password){
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({name:"PBKDF2", salt:b64(file.salt), iterations:file.iter, hash:"SHA-256"}, km, {name:"AES-GCM", length:256}, false, ["decrypt"]);
  const buf = await crypto.subtle.decrypt({name:"AES-GCM", iv:b64(file.iv)}, key, b64(file.data));
  return JSON.parse(new TextDecoder().decode(buf));
}
const loadDrop = () => fetch("drop.json",{cache:"no-store"}).then(r=>{ if(!r.ok) throw new Error("load"); return r.json(); });
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let dropFile = null, attempts = 0, busy = false;
const dropReady = loadDrop().then(f=>{ dropFile = f; return f; }).catch(()=>null);
const setMsg = (t,err) => { $("gateMsg").textContent = t; $("gateMsg").classList.toggle("err",!!err); };

function grant(){
  const g = $("gate"), html = document.documentElement;
  if(g.classList.contains("granted")) return;
  g.classList.add("granted");                         // 1) Häkchen, Gold, "Welcome"
  $("gatePw").disabled = true; $("gatePw").blur();
  setMsg("Welcome"); $("gateCount").hidden = true;
  g.querySelector(".gate-field button").innerHTML = '<svg viewBox="0 0 24 24"><path class="chk" d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  lockInert(false);
  setTimeout(()=>{ html.classList.add("reveal"); g.classList.add("lift"); }, 700);   // 2) Vorhang hebt sich
  setTimeout(()=>{
    html.classList.add("unlocked");                   // 3) Gate weg
    if(location.hash.length>1) openProduct(decodeURIComponent(location.hash.slice(1)));
  }, 700 + 1300);
}
function wrong(){
  setMsg("Wrong password. Wait for the drop.", true);
  const row = $("gateRow"); row.classList.remove("shake"); void row.offsetWidth; row.classList.add("shake");
  $("gatePw").value = ""; $("gatePw").focus();
}
$("gateForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const pw = $("gatePw").value.trim();
  if(!pw || busy) return;
  if(!window.crypto || !crypto.subtle){ setMsg("This browser cannot open the shop. Please use https.", true); return; }
  busy = true; setMsg("Checking …");
  const f = dropFile || await dropReady;
  if(!f){ setMsg("Could not load the drop. Please reload.", true); busy = false; return; }
  try{
    initShop(f.public ? f : await decryptDrop(f, pw));
    grant();
  }catch(err){
    attempts++; await sleep(Math.min(250*attempts*attempts, 4000)); wrong();
  }
  busy = false;
});
$("gatePw").addEventListener("input",()=>setMsg("Fall Collection 26"));
$("gateImg").addEventListener("error",()=>{ $("gateImg").style.display = "none"; });

/* Start: ist drop.json öffentlich (nach dem Drop), öffnet sich der Shop ohne Passwort */
dropReady.then(f=>{
  if(f && f.public){ initShop(f); document.documentElement.classList.add("unlocked"); if(location.hash.length>1) openProduct(decodeURIComponent(location.hash.slice(1))); return; }
  lockInert(true); setTimeout(()=>$("gatePw").focus(),300);
  if(!f) setMsg("Could not load the drop. Please reload.", true);
});

/* Countdown bis zum öffentlichen Drop */
const dropTime = DROP_AT ? Date.parse(DROP_AT) : NaN;
if(!isNaN(dropTime)){
  const pad = n => String(n).padStart(2,"0");
  let timer;
  const tick = () => {
    const left = dropTime - Date.now();
    if(left <= 0){
      clearInterval(timer); $("gateCount").textContent = "The drop is live";
      const poll = setInterval(async ()=>{
        try{ const f = await loadDrop(); if(f.public){ clearInterval(poll); dropFile = f; initShop(f); grant(); } }catch(e){}
      }, 10000);
      return;
    }
    const d = Math.floor(left/864e5), h = Math.floor(left%864e5/36e5), m = Math.floor(left%36e5/6e4), sec = Math.floor(left%6e4/1e3);
    $("gateCount").textContent = `Public drop in ${d ? d+"d " : ""}${pad(h)}:${pad(m)}:${pad(sec)}`;
  };
  $("gateCount").hidden = false; tick(); timer = setInterval(tick,1000);
}
