/* ===================== MINI-GUIDE EN APPLI : installation + hors-ligne =====================
   - Enregistre le service worker (copie des pages pour fonctionner sans internet).
   - Après la saisie du mot de passe : téléchargement automatique des pages du guide
     pour une lecture sans internet (une seule fois, en ligne).
   - Bandeau « Installer » (Android / iPhone) sur la première page.
   Le mot de passe, lui, reste géré par gate.js (inchangé).
============================================================================================ */
(function(){
  'use strict';
  var me = document.currentScript || document.querySelector('script[src*="pwa.js"]');
  var NAME = (me && me.getAttribute('data-name')) || 'Mini-guide';
  var SLUG = (me && me.getAttribute('data-slug')) || 'guide';
  var WANTS_BANNER = !!(me && me.getAttribute('data-banner'));
  var UA = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /android/i.test(UA);
  var isMobile = isIOS || isAndroid;
  var isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var deferred = null;

  function store(k, v){
    try{
      if(v === undefined) return localStorage.getItem(k);
      if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    }catch(e){ return null; }
  }

  var css = [
    '.tmpwa-banner{position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:9500;max-width:520px;margin:0 auto;background:#1a1d24;border:1px solid #d35400;border-radius:16px;padding:14px 16px;display:flex;gap:12px;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,.55);color:#fff;font-family:"Segoe UI",Arial,sans-serif}',
    '.tmpwa-banner img{width:44px;height:44px;border-radius:10px;flex:none}',
    '.tmpwa-banner p{margin:0;flex:1;font-size:14px;line-height:1.35;color:#dcd6d0}',
    '.tmpwa-banner strong{display:block;color:#f0955a;font-size:15px}',
    '.tmpwa-go{background:linear-gradient(135deg,#d35400,#f0955a);color:#fff;border:0;border-radius:24px;padding:10px 16px;font-weight:700;font-size:14px;cursor:pointer;flex:none}',
    '.tmpwa-x{background:none;border:0;color:#aaa;font-size:20px;cursor:pointer;padding:4px 6px;flex:none}',
    '.tmpwa-sheet{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.7);display:flex;align-items:flex-end;justify-content:center;font-family:"Segoe UI",Arial,sans-serif}',
    '.tmpwa-box{background:#1a1d24;border:1px solid #333;border-radius:20px 20px 0 0;padding:24px 22px max(24px,env(safe-area-inset-bottom));max-width:520px;width:100%;color:#fff}',
    '.tmpwa-box h3{margin:0 0 12px;color:#f0955a;font-size:20px}',
    '.tmpwa-box ol{margin:0 0 16px;padding-left:20px;line-height:1.7;color:#dcd6d0}',
    '.tmpwa-box .tmpwa-go{width:100%;padding:12px 24px;font-size:15px}',
    '.tmpwa-chip{position:fixed;top:max(10px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:100001;max-width:92%;background:#1a1d24;border:1px solid #d35400;color:#fff;border-radius:999px;padding:9px 16px;font:600 13px/1.3 "Segoe UI",Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.5);text-align:center}',
    '.tmpwa-chip.ok{border-color:#2e7d4f}'
  ].join('');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- service worker ---------- */
  var swReady = null;
  if('serviceWorker' in navigator){
    /* On cible le service worker DU GUIDE (et non celui du hub, de portée plus large) */
    var regP = new Promise(function(res){
      var go = function(){ navigator.serviceWorker.register('service-worker.js').then(res, function(e){ console.warn('Service worker non enregistré', e); }); };
      if(document.readyState === 'complete') go(); else window.addEventListener('load', go);
    });
    swReady = regP.then(function(reg){
      if(reg.active) return reg;
      var w = reg.installing || reg.waiting;
      if(!w) return navigator.serviceWorker.ready;
      return new Promise(function(res){
        var chk = function(){ if(w.state === 'activated') res(reg); };
        w.addEventListener('statechange', chk); chk();
      });
    });
  }

  /* ---------- installation ---------- */
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault(); deferred = e;
    if(WANTS_BANNER && !locked()) showBanner();
  });
  window.addEventListener('appinstalled', function(){
    deferred = null; var b = document.querySelector('.tmpwa-banner'); if(b) b.remove();
  });

  function sheet(title, steps){
    var wrap = document.createElement('div'); wrap.className = 'tmpwa-sheet';
    var box = document.createElement('div'); box.className = 'tmpwa-box';
    var h = document.createElement('h3'); h.textContent = title; box.appendChild(h);
    var ol = document.createElement('ol');
    steps.forEach(function(t){ var li = document.createElement('li'); li.textContent = t; ol.appendChild(li); });
    box.appendChild(ol);
    var c = document.createElement('button'); c.type = 'button'; c.className = 'tmpwa-go'; c.textContent = 'J’ai compris';
    c.addEventListener('click', function(){ wrap.remove(); });
    wrap.addEventListener('click', function(ev){ if(ev.target === wrap) wrap.remove(); });
    box.appendChild(c); wrap.appendChild(box); document.body.appendChild(wrap);
  }

  function install(){
    if(deferred){
      var d = deferred; deferred = null; d.prompt();
      d.userChoice.then(function(){ var b = document.querySelector('.tmpwa-banner'); if(b) b.remove(); });
      return;
    }
    if(isIOS){
      sheet('Installer le mini-guide sur votre iPhone', [
        'Ouvrez cette page dans Safari.',
        'Touchez l’icône Partager (le carré avec une flèche vers le haut).',
        'Choisissez « Sur l’écran d’accueil », puis touchez « Ajouter ».'
      ]);
    } else {
      sheet('Installer le mini-guide sur votre téléphone', [
        'Ouvrez cette page dans Chrome.',
        'Touchez le menu ⋮ en haut à droite.',
        'Choisissez « Installer l’application » (ou « Ajouter à l’écran d’accueil »).'
      ]);
    }
  }

  function showBanner(){
    if(isStandalone || !isMobile || document.querySelector('.tmpwa-banner')) return;
    var off = parseInt(store('tmpwa_banner_off_' + SLUG) || '0', 10);
    if(off && Date.now() - off < 14 * 24 * 3600 * 1000) return;
    var bar = document.createElement('div'); bar.className = 'tmpwa-banner';
    var img = document.createElement('img'); img.src = 'icons/icon-192.png'; img.alt = '';
    var p = document.createElement('p');
    var s = document.createElement('strong'); s.textContent = 'Installez le mini-guide';
    p.appendChild(s); p.appendChild(document.createTextNode('Utilisable sans internet, depuis votre écran d’accueil.'));
    var go = document.createElement('button'); go.type = 'button'; go.className = 'tmpwa-go'; go.textContent = 'Installer';
    go.addEventListener('click', install);
    var x = document.createElement('button'); x.type = 'button'; x.className = 'tmpwa-x'; x.setAttribute('aria-label', 'Fermer'); x.textContent = '✕';
    x.addEventListener('click', function(){ store('tmpwa_banner_off_' + SLUG, String(Date.now())); bar.remove(); });
    [img, p, go, x].forEach(function(n){ bar.appendChild(n); });
    document.body.appendChild(bar);
  }

  /* ---------- téléchargement hors-ligne (après le mot de passe) ---------- */
  var chip = null;
  function say(text, ok, ms){
    if(!chip){ chip = document.createElement('div'); chip.className = 'tmpwa-chip'; document.body.appendChild(chip); }
    chip.className = 'tmpwa-chip' + (ok ? ' ok' : ''); chip.textContent = text;
    if(ms){ var c = chip; setTimeout(function(){ if(chip === c){ c.remove(); chip = null; } }, ms); }
  }

  function ask(msg, onProgress){
    return swReady.then(function(reg){
      return new Promise(function(resolve, reject){
        var sw = reg.active; if(!sw){ reject(new Error('indisponible')); return; }
        var ch = new MessageChannel();
        ch.port1.onmessage = function(e){
          var m = e.data || {};
          if(m.phase === 'progress' && onProgress) onProgress(m);
          else if(m.phase === 'status' || m.phase === 'done') resolve(m);
          else if(m.phase === 'error') reject(new Error(m.message || 'erreur'));
        };
        sw.postMessage(msg, [ch.port2]);
      });
    });
  }

  var started = false;
  function offlineSetup(){
    if(started || !swReady || isNetworkOff()) return;
    started = true;
    ask({ type: 'STATUS' }).then(function(s){
      if(s.have >= s.total) { return; }
      say('📥 Téléchargement du guide pour le hors-ligne…');
      return ask({ type: 'DOWNLOAD_ALL' }, function(m){
        say('📥 Téléchargement du guide… ' + Math.round(100 * m.done / Math.max(1, m.total)) + ' %');
      }).then(function(r){
        if(r.failed){
          say('Téléchargement incomplet (' + r.failed + ' page(s)). Touchez ici pour réessayer.', false);
          chip.style.cursor = 'pointer'; chip.onclick = function(){ started = false; offlineSetup(); };
        } else {
          say('✓ Guide disponible hors-ligne', true, 4000);
        }
      });
    }).catch(function(){ started = false; if(chip){ chip.remove(); chip = null; } });
  }
  function isNetworkOff(){ return navigator.onLine === false; }

  /* ---------- déverrouillage (gate.js affiche un écran « Accès protégé ») ---------- */
  function locked(){
    var g = document.getElementById('pwGate');          /* guide en une seule page (écran #pwGate masqué par la classe « hidden ») */
    if(g) return !g.classList.contains('hidden');
    return !!document.querySelector('[class*="Gate"]');
  }
  var done = false;
  function onUnlocked(){
    if(done) return; done = true;
    if(WANTS_BANNER){ if(isIOS) showBanner(); else if(deferred) showBanner(); }
    offlineSetup();
  }
  function watch(){
    if(!locked()){ onUnlocked(); return; }
    var mo = new MutationObserver(function(){ if(!locked()){ mo.disconnect(); onUnlocked(); } });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  window.addEventListener('online', function(){ if(done) offlineSetup(); });
  if(document.body) watch(); else document.addEventListener('DOMContentLoaded', watch);
})();

/* ===================== BARRE DE BOUTONS EN BAS (téléphone et tablette) =====================
   Dans le navigateur, rien ne change. Une fois le guide installé, une barre fixe en bas de l'écran
   donne un accès direct : couverture, page précédente / suivante, liste des pages (ou sommaire).
========================================================================================================= */
(function(){
  'use strict';
  var me = document.querySelector('script[src*="pwa.js"]');
  var HUB_URL = new URL('../../', location.href).href;   /* le hub est à la racine du dépôt : guides/<guide>/ → ../../ */
  var MODE = me && me.getAttribute('data-nav');                 /* "pages" = une page HTML par page ; "spa" = guide en une seule page */
  if(!MODE) return;
  if(window.top !== window.self) return;
  var TOTAL = parseInt(me.getAttribute('data-total') || '0', 10);
  var FIRST = parseInt(me.getAttribute('data-first') || '1', 10);   /* 0 si le guide a une couverture page0 */

  function ready(fn){ if(document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function locked(){
    var g = document.getElementById('pwGate');
    if(g) return !g.classList.contains('hidden');
    return !!document.querySelector('[class*="Gate"]');
  }
  var css = '#tmTab{display:none;position:fixed;left:0;right:0;bottom:0;z-index:1500;background:#0d1117f2;border-top:1px solid #ffffff1f;padding:6px 4px max(8px,env(safe-area-inset-bottom));backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:"Segoe UI",Arial,sans-serif}' +
    '#tmTab button{flex:1;min-width:0;border:0;background:none;color:#cfd6dd;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 2px;font:600 10.5px/1.1 "Segoe UI",Arial,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '#tmTab button b{font-size:21px;line-height:1;font-weight:400}#tmTab button:active{background:#ffffff14;border-radius:10px}' +
    '#tmTab button.on{color:#f0955a}#tmTab button[disabled]{opacity:.35}' +
    '#tmTab .mid b{font:800 15px/1 "Segoe UI",Arial,sans-serif;color:#fff;margin-top:3px}' +
    '#tmSheet{position:fixed;inset:0;z-index:1600;background:#000a;display:none;align-items:flex-end;justify-content:center}#tmSheet.open{display:flex}' +
    '#tmSheet .box{width:100%;max-width:560px;max-height:78vh;overflow:auto;background:#161a21;color:#fff;border-radius:20px 20px 0 0;padding:16px 16px max(18px,env(safe-area-inset-bottom));font-family:"Segoe UI",Arial,sans-serif}' +
    '#tmSheet h3{margin:0 0 12px;font-size:16px}#tmSheet .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}' +
    '#tmSheet .grid a,#tmSheet .grid button,#tmSheet .list button{border:1px solid #ffffff2a;background:#ffffff0d;color:#fff;border-radius:12px;padding:12px 0;text-align:center;text-decoration:none;font:700 15px "Segoe UI",Arial,sans-serif;cursor:pointer}' +
    '#tmSheet .book a{display:block;border:1px solid #ffffff2a;background:#ffffff0d;color:#fff;border-radius:12px;padding:12px 16px;text-decoration:none}#tmSheet .book a b{display:block;font-size:15px}#tmSheet .book a small{opacity:.7;font-size:12.5px}#tmSheet .toc button{display:flex;align-items:center;gap:12px;width:100%}#tmSheet .toc .num{flex:0 0 34px;height:34px;border-radius:50%;background:#ffffff1a;display:flex;align-items:center;justify-content:center;font-size:14px}#tmSheet .toc .cur{background:#d3540033;border-color:#d35400}#tmSheet .toc .cur .num{background:#d35400}#tmSheet .toc .addfav{background:#d35400;border-color:#d35400;margin-bottom:6px}#tmSheet .grid .cur{background:#d35400;border-color:#d35400}#tmSheet .list{display:grid;gap:8px}#tmSheet .list button{text-align:left;padding:14px 16px;font-size:15px}' +
    '#tmSheet .tdCard{background:#ffffff0d;border:1px solid #ffffff1f;border-radius:14px;padding:14px;margin-bottom:12px}#tmSheet .tdBig{font-size:22px;font-weight:800;line-height:1.25}#tmSheet .tdSub{opacity:.75;font-size:14px;margin-top:4px}' +
    '#tmSheet .tdRow{display:flex;gap:10px}#tmSheet .tdRow>div{flex:1}#tmSheet .today label{display:block;font-size:12px;font-weight:700;opacity:.85}#tmSheet .today input,#tmSheet .today select{display:block;width:100%;margin-top:5px;padding:11px 10px;border-radius:10px;border:1px solid #ffffff2a;background:#242a33;color:#fff;font:600 15px "Segoe UI",Arial,sans-serif;color-scheme:dark}' +
    '#tmSheet .tdBtn{display:inline-block;padding:11px 14px;border-radius:10px;font:800 14px "Segoe UI",Arial,sans-serif;color:#fff;text-decoration:none;background:linear-gradient(135deg,#d35400,#f0955a);border:0;cursor:pointer}#tmSheet .tdBtn.alt{background:#ffffff1a;border:1px solid #ffffff2a}' +
    '#tmSheet .today button.tdFav{display:inline-block;width:auto;margin:0 6px 6px 0;padding:8px 12px;border-radius:10px;font:700 13px "Segoe UI",Arial,sans-serif;text-align:left}' +
    '#tmSheet .inspGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}#tmSheet .inspCard{display:block;text-decoration:none;color:#fff;border-radius:14px;padding:14px 12px;font-weight:800;font-size:14px;line-height:1.25}#tmSheet .inspCard b{display:block;font-size:26px;font-weight:400;margin-bottom:4px}#tmSheet .inspCard small{display:block;font-weight:600;opacity:.9;margin-top:4px;font-size:11.5px}' +
    '@media(max-width:800px){#tmTab{display:flex}#tmTab.lock{display:none}body.tmHasTab{padding-bottom:calc(84px + env(safe-area-inset-bottom)) !important}body.tmHasTab .zoomBtn{bottom:92px}}';

  function el(tag, attrs, html){ var e = document.createElement(tag); for(var k in attrs||{}) e.setAttribute(k, attrs[k]); if(html != null) e.innerHTML = html; return e; }
  function btn(icon, label, fn, cls){ var b = el('button', { type: 'button', 'class': cls || '' }, '<b>' + icon + '</b>' + label); b.addEventListener('click', fn); return b; }

  function build(){
    if(document.getElementById('tmTab')) return;
    var st = el('style', {}, css); document.head.appendChild(st);
    var bar = el('div', { id: 'tmTab', role: 'navigation', 'aria-label': 'Navigation du guide' });
    var sheet = el('div', { id: 'tmSheet' }); var box = el('div', { 'class': 'box' }); sheet.appendChild(box); document.body.appendChild(sheet);
    sheet.addEventListener('click', function(e){ if(e.target === sheet) sheet.classList.remove('open'); });
    function openSheet(title, node){ box.innerHTML = ''; box.appendChild(el('h3', {}, title)); box.appendChild(node); sheet.classList.add('open'); }

    if(MODE === 'pages'){
      var m = location.pathname.match(/page(\d+)(\.html)?$/); var cur = m ? parseInt(m[1], 10) : FIRST;
      var last = TOTAL || cur;
      var slug = (me.getAttribute('data-slug') || 'guide');
      function url(n){ return 'page' + n + '.html'; }
      var TOC = {}; (me.getAttribute('data-toc') || '').split(';').forEach(function(x){ var i = x.indexOf('|'); if(i > 0) TOC[parseInt(x.slice(0, i), 10)] = x.slice(i + 1); });
      function title(n){ return TOC[n] || ('Page ' + n); }
      var FK = 'tm-fav-' + slug;
      function favs(){ try{ return JSON.parse(localStorage.getItem(FK) || '[]'); }catch(e){ return []; } }
      function saveFavs(a){ try{ localStorage.setItem(FK, JSON.stringify(a)); }catch(e){} }
      function row(n, extra){ var b = el('button', { type: 'button', 'class': n === cur ? 'cur' : '' }, '<span class="num">' + (n === 0 ? '★' : n) + '</span>' + title(n) + (extra || '')); b.addEventListener('click', function(){ location.href = url(n); }); return b; }
      var cover = btn('📕', 'Couverture', function(){ location.href = url(FIRST); });
      var toc = btn('☷', 'Sommaire', function(){
        var l = el('div', { 'class': 'list toc' }); for(var n = FIRST; n <= last; n++) l.appendChild(row(n));
        openSheet('Sommaire', l);
        var c = l.querySelector('.cur'); if(c) setTimeout(function(){ c.scrollIntoView({ block: 'center' }); }, 30);
      });
      /* ---------- « Ajouter cette page à mon programme » (partage le programme du hub : même compte GitHub Pages) ---------- */
      function openPlanAdd(){
        function pad2(n){ return (n < 10 ? '0' : '') + n; }
        function isoD(d){ return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
        function addD(v, n){ var d = new Date(v + 'T00:00:00'); d.setDate(d.getDate() + n); return isoD(d); }
        var dep = ''; var ret = ''; try{ dep = localStorage.getItem('tm-departure') || ''; ret = localStorage.getItem('tm-return') || ''; }catch(e){}
        var days = [], t0 = isoD(new Date());
        if(dep){ var en = (ret && ret >= dep) ? ret : addD(dep, 6); for(var d = dep, k = 0; d <= en && k < 45; d = addD(d, 1), k++) days.push(d); } else { for(var i = 0; i < 7; i++) days.push(addD(t0, i)); }
        var jn = ['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'], mn = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
        var opts = days.map(function(v){ var dd = new Date(v + 'T00:00:00'); return '<option value="' + v + '">' + (dep ? 'Jour ' + (days.indexOf(v) + 1) + ' · ' : '') + jn[dd.getDay()] + ' ' + dd.getDate() + ' ' + mn[dd.getMonth()] + '</option>'; }).join('');
        var l = el('div', { 'class': 'today' });
        l.innerHTML = '<div class="tdCard"><label>Activité<input type="text" id="paT"></label><div style="margin-top:10px"><label>Quel jour ?<select id="paD">' + opts + '</select></label></div><div style="margin-top:10px"><label>Heure (optionnel)<input type="time" id="paH"></label></div><div style="margin-top:14px"><button type="button" class="tdBtn" id="paGo">➕ Ajouter à mon programme</button></div><div class="tdSub" id="paMsg"></div></div>';
        l.querySelector('#paT').value = title(cur);
        if(dep === '') l.querySelector('.tdCard').insertAdjacentHTML('afterbegin', '<div class="tdSub" style="margin-bottom:10px">Astuce : entre tes dates dans « Aujourd’hui » pour voir tes vrais jours.</div>');
        l.querySelector('#paGo').addEventListener('click', function(){
          var t = l.querySelector('#paT').value.trim(); if(!t) return;
          var plan = {}; try{ plan = JSON.parse(localStorage.getItem('tm-hub-plan') || '{}'); }catch(e){}
          var day = l.querySelector('#paD').value; plan[day] = plan[day] || [];
          plan[day].push({ id: Date.now() + '' + Math.floor(Math.random() * 1000), time: l.querySelector('#paH').value, title: t, place: t + (COUNTRY ? ', ' + COUNTRY : ''), note: 'Idée du ' + (me.getAttribute('data-name') || 'guide') });
          try{ localStorage.setItem('tm-hub-plan', JSON.stringify(plan)); }catch(e){ l.querySelector('#paMsg').textContent = 'Impossible d’enregistrer (stockage bloqué).'; return; }
          var m = l.querySelector('#paMsg'); m.innerHTML = '✓ Ajouté. <a href="' + HUB_URL + '" style="color:#f0955a;font-weight:700">Voir mon programme</a>';
        });
        openSheet('Mon programme', l);
      }
      var fav = btn('♡', 'Favoris', function(){
        var l = el('div', { 'class': 'list toc' }); var f = favs(); var on = f.indexOf(cur) >= 0;
        var add = el('button', { type: 'button', 'class': 'addfav' }, on ? '♥ Retirer cette page des favoris' : '♡ Ajouter cette page aux favoris');
        add.addEventListener('click', function(){ var g = favs(); var i = g.indexOf(cur); if(i >= 0) g.splice(i, 1); else g.push(cur); g.sort(function(x, y){ return x - y; }); saveFavs(g); refreshFav(); sheet.classList.remove('open'); });
        l.appendChild(add);
        var pa = el('button', { type: 'button', 'class': 'addfav' }, '🗓️ Ajouter cette page à mon programme'); pa.addEventListener('click', openPlanAdd); l.appendChild(pa);
        if(!f.length) l.appendChild(el('p', { style: 'margin:6px 2px;opacity:.7;font-size:14px' }, 'Aucun favori pour le moment.')); else f.forEach(function(n){ l.appendChild(row(n)); });
        openSheet('Mes favoris', l);
      });
      function refreshFav(){ var on = favs().indexOf(cur) >= 0; var i = fav.querySelector('b'); i.textContent = on ? '♥' : '♡'; fav.classList.toggle('on', on); }
      refreshFav();
      var items = [cover, toc, fav];
      var openWeather = null;
      var WX = me.getAttribute('data-weather');                  /* "Ville:lat,lon;Ville:lat,lon" */
      if(WX){
        openWeather = function(){
          var l = el('div', { 'class': 'wx' }, '<p style="margin:0;opacity:.7">Chargement…</p>'); openSheet('Météo en direct', l);
          var places = WX.split(';').map(function(x){ var a = x.split(':'); var c = a[1].split(','); return { n: a[0], la: c[0], lo: c[1] }; });
          var ico = function(c){ return c === 0 ? '☀️' : c < 3 ? '⛅' : c < 4 ? '☁️' : c < 50 ? '🌫️' : c < 70 ? '🌧️' : c < 80 ? '🌨️' : c < 85 ? '🌦️' : c < 95 ? '🌧️' : '⛈️'; };
          Promise.all(places.map(function(p){
            return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + p.la + '&longitude=' + p.lo + '&current=temperature_2m,weather_code,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3')
              .then(function(r){ return r.json(); }).then(function(d){ p.d = d; return p; });
          })).then(function(r){
            l.innerHTML = r.map(function(p){ var d = p.d, c = d.current, dl = d.daily;
              var days = [0,1,2].map(function(i){ return '<span style="flex:1;text-align:center;font-size:12px;opacity:.85">' + ['Auj.','Demain','Après'][i] + '<br>' + Math.round(dl.temperature_2m_min[i]) + '–' + Math.round(dl.temperature_2m_max[i]) + '°<br>💧' + (dl.precipitation_probability_max[i] || 0) + '%</span>'; }).join('');
              return '<div style="border:1px solid #ffffff2a;background:#ffffff0d;border-radius:14px;padding:12px 14px;margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:16px">' + p.n + '</b><span style="font-size:22px">' + ico(c.weather_code) + ' ' + Math.round(c.temperature_2m) + '°C</span></div><div style="font-size:12px;opacity:.7;margin:2px 0 8px">Humidité ' + c.relative_humidity_2m + '%</div><div style="display:flex;gap:6px">' + days + '</div></div>'; }).join('');
          }).catch(function(){ l.innerHTML = '<p style="margin:0">La météo a besoin d\'une connexion Internet. Réessaie quand tu es en ligne.</p>'; });
        };
      }

      /* ---------- « Aujourd'hui » : statut du voyage, destination du jour, météo, favoris, inspirations ---------- */
      var COUNTRY = me.getAttribute('data-country') || (me.getAttribute('data-name') || '').replace(/^Mini-guide\s*/i, '');
      var PLACES = WX ? WX.split(';').map(function(x){ var a = x.split(':'); var c = a[1].split(','); return { n: a[0], la: c[0], lo: c[1] }; }) : [];
      var INSPIRE = [];                                          /* rempli depuis guides.json (voir plus bas) */
      var INSPIRE_URL = 'https://thaimalin.fr';
      try{ fetch(HUB_URL + 'guides.json').then(function(r){ return r.json(); }).then(function(d){ INSPIRE = (d.guides || []).map(function(g){ return { s: g.slug, e: g.emoji, t: g.title, d: g.desc, c: g.color, u: g.sales || INSPIRE_URL }; }); }).catch(function(){}); }catch(e){}
      function ls(k){ try{ return localStorage.getItem(k) || ''; }catch(e){ return ''; } }
      function lset(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
      function dayDiff(v){ if(!v) return null; var t = new Date(); t.setHours(0,0,0,0); return Math.round((new Date(v + 'T00:00:00') - t) / 86400000); }
      var today = btn('📅', 'Aujourd’hui', function(){
        var dep = ls('tm-departure'), ret = ls('tm-return'), CK = 'tm-city-' + slug;
        var l = el('div', { 'class': 'today' });
        l.appendChild(el('a', { 'class': 'tdBtn', href: HUB_URL, style: 'display:block;text-align:center;margin-bottom:12px' }, '🧭 Mon voyage : vol, documents, programme'));
        var st = el('div', { 'class': 'tdCard' }); l.appendChild(st);
        function status(){
          var dd = dayDiff(dep), dr = dayDiff(ret), big = 'Bienvenue ! 🌺', sub = 'Entre ta date de départ pour suivre ton voyage jour après jour.';
          if(dd !== null){
            if(dd > 1){ big = '🌴 J-' + dd; sub = 'Plus que ' + dd + ' jours avant le départ.'; }
            else if(dd === 1){ big = '🌴 C’est demain !'; sub = 'Dernières vérifications : passeport, visa, assurance, eSIM.'; }
            else if(dr !== null && dr < 0){ big = 'Bon retour ! 🌺'; sub = 'J’espère que ce voyage était magnifique. La suite ? Voir les inspirations plus bas.'; }
            else { var n = 1 - dd; big = '✈️ Jour ' + n + (dr !== null ? ' sur ' + (n + dr) : ''); sub = dr === null ? 'Bon voyage !' : dr === 0 ? 'Dernier jour, profites-en !' : 'Encore ' + dr + ' jour' + (dr > 1 ? 's' : '') + ' sur place.'; }
          }
          st.innerHTML = '<div class="tdBig">' + big + '</div><div class="tdSub">' + sub + '</div>';
        }
        status();
        var dates = el('div', { 'class': 'tdCard tdRow' }, '<div><label>Départ<input type="date" id="tdDep"></label></div><div><label>Retour<input type="date" id="tdRet"></label></div>');
        l.appendChild(dates);
        dates.querySelector('#tdDep').value = dep; dates.querySelector('#tdRet').value = ret;
        dates.addEventListener('input', function(){ dep = dates.querySelector('#tdDep').value; ret = dates.querySelector('#tdRet').value; lset('tm-departure', dep); lset('tm-return', ret); status(); });
        if(PLACES.length){
          var cityBox = el('div', { 'class': 'tdCard' }, '<label>Ma destination du jour<select id="tdCity"></select></label><div class="tdNew" style="display:none;margin-top:10px"><label>Ta ville<input type="text" placeholder="ex. Krabi, Hué, Luang Prabang…" autocomplete="off"></label><div style="margin-top:8px"><button type="button" class="tdBtn tdOk">Rechercher</button></div><div class="tdSub tdErr"></div></div><div class="tdW tdSub">Météo…</div><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><a class="tdBtn" target="_blank" rel="noopener">📍 Y aller (Maps)</a>' + (openWeather ? '<button type="button" class="tdBtn alt">🌤️ Toute la météo</button>' : '') + '</div>');
          l.appendChild(cityBox);
          var sel = cityBox.querySelector('select'), CC = 'tm-city-custom-' + slug, newBox = cityBox.querySelector('.tdNew');
          function customs(){ try{ return JSON.parse(ls(CC) || '[]'); }catch(e){ return []; } }
          function allPlaces(){ return PLACES.concat(customs()); }
          function fillSel(pick){ sel.innerHTML = ''; allPlaces().forEach(function(p){ sel.appendChild(el('option', { value: p.n }, p.n)); }); sel.appendChild(el('option', { value: '__new' }, '✏️ Ajouter ma ville…')); if(pick) sel.value = pick; }
          var saved = ls(CK); fillSel(saved && allPlaces().some(function(p){ return p.n === saved; }) ? saved : null);
          cityBox.querySelector('.tdOk').addEventListener('click', function(){
            var inp = newBox.querySelector('input'), q = inp.value.trim(), er = newBox.querySelector('.tdErr'); if(!q) return; er.textContent = 'Recherche…';
            fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=1&language=fr&format=json').then(function(r){ return r.json(); }).then(function(d){
              var r0 = d.results && d.results[0]; if(!r0){ er.textContent = 'Ville introuvable. Vérifie l’orthographe.'; return; }
              var c = customs(); if(!allPlaces().some(function(p){ return p.n === r0.name; })){ c.push({ n: r0.name, la: r0.latitude, lo: r0.longitude }); lset(CC, JSON.stringify(c.slice(-5))); }
              er.textContent = ''; inp.value = ''; fillSel(r0.name); city();
            }).catch(function(){ er.textContent = 'Il faut une connexion Internet pour chercher une ville.'; });
          });
          newBox.querySelector('input').addEventListener('keydown', function(e){ if(e.key === 'Enter') cityBox.querySelector('.tdOk').click(); });
          var wb = cityBox.querySelector('.alt'); if(wb) wb.addEventListener('click', function(){ openWeather(); });
          var ico = function(c){ return c === 0 ? '☀️' : c < 3 ? '⛅' : c < 4 ? '☁️' : c < 50 ? '🌫️' : c < 70 ? '🌧️' : c < 80 ? '🌨️' : c < 85 ? '🌦️' : c < 95 ? '🌧️' : '⛈️'; };
          function city(){
            if(sel.value === '__new'){ newBox.style.display = 'block'; newBox.querySelector('input').focus(); return; }
            newBox.style.display = 'none';
            var isCustom = !PLACES.some(function(x){ return x.n === sel.value; });
            var p = allPlaces().filter(function(x){ return x.n === sel.value; })[0] || PLACES[0]; lset(CK, p.n);
            cityBox.querySelector('a').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(isCustom ? p.n : p.n + ', ' + COUNTRY);
            var w = cityBox.querySelector('.tdW'); w.textContent = 'Météo en cours de chargement…';
            fetch('https://api.open-meteo.com/v1/forecast?latitude=' + p.la + '&longitude=' + p.lo + '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1')
              .then(function(r){ return r.json(); }).then(function(d){ if(sel.value !== p.n) return; w.innerHTML = '<span style="font-size:24px;font-weight:800;color:#fff">' + ico(d.current.weather_code) + ' ' + Math.round(d.current.temperature_2m) + '°C</span><br>Aujourd’hui : ' + Math.round(d.daily.temperature_2m_min[0]) + '–' + Math.round(d.daily.temperature_2m_max[0]) + '° · 💧 ' + (d.daily.precipitation_probability_max[0] || 0) + '% de pluie'; })
              .catch(function(){ w.textContent = 'La météo a besoin d’une connexion Internet.'; });
          }
          sel.addEventListener('change', city); city();
        }
        var f = favs();
        var fb = el('div', { 'class': 'tdCard' }, '<b>♥ Mes pages favorites</b>'); var fw = el('div', { style: 'margin-top:10px' }); fb.appendChild(fw);
        if(!f.length) fw.appendChild(el('span', { 'class': 'tdSub' }, 'Aucun favori pour l’instant. Ajoute-en avec « ♡ Favoris ».')); else f.forEach(function(n){ var b = el('button', { type: 'button', 'class': 'tdFav' }, n + ' — ' + title(n)); b.addEventListener('click', function(){ location.href = url(n); }); fw.appendChild(b); });
        l.appendChild(fb);
        var ib = el('div', { 'class': 'tdCard' }, '<b>✨ Inspirations — la suite du voyage</b>'); var ig = el('div', { 'class': 'inspGrid' }); ib.appendChild(ig);
        INSPIRE.filter(function(x){ return x.s !== slug; }).forEach(function(x){ ig.appendChild(el('a', { 'class': 'inspCard', href: x.u || INSPIRE_URL, target: '_blank', rel: 'noopener', style: 'background:' + x.c }, '<b>' + x.e + '</b>' + x.t + '<small>' + x.d + '</small>')); });
        l.appendChild(ib);
        openSheet('Aujourd’hui', l);
      });
      items.push(today);
      var BK = me.getAttribute('data-booking');                  /* code pays Booking : vn, la, kh, th */
      if(BK){
        var BP = parseInt(me.getAttribute('data-booking-page') || '0', 10);   /* page « Centre de réservation » du guide, si elle existe */
        var bk = btn('🧳', 'Réserver', function(){
          if(BP){ location.href = url(BP); return; }
          var rows = [
            ['✈️ Vols', 'Comparer et réserver sur Trip.com', 'https://fr.trip.com/?Allianceid=9852508&SID=327644129&trip_sub3=D19106369&locale=fr-fr'],
            ['🏨 Hôtels', 'Hébergements sur Booking.com', 'https://www.dpbolvw.net/click-101855269-12677526?url=' + encodeURIComponent('https://www.booking.com/country/' + BK + '.fr.html')],
            ['🎟️ Activités', 'Excursions et visites sur Klook', 'https://www.klook.com/fr/?aid=129660'],
            ['📶 eSIM', 'Internet dès l’arrivée (Airalo)', 'https://airalo.pxf.io/PzWeQQ'],
            ['📶 eSIM illimitée', 'Holafly, code promo THAIMALIN', 'https://holafly.sjv.io/OYdRjN'],
            ['🛡️ Assurance voyage', 'SafetyWing', 'https://safetywing.com/nomad-insurance?referenceID=26576610&campaign=thai-malin&utm_campaign=thai-malin&utm_source=26576610&utm_medium=Ambassador']];
          var l = el('div', { 'class': 'list book' });
          rows.forEach(function(r){ l.appendChild(el('a', { href: r[2], target: '_blank', rel: 'noopener sponsored' }, '<b>' + r[0] + '</b><small>' + r[1] + '</small>')); });
          openSheet('Réserver mon voyage', l);
        });
        items.push(bk);
      }
      items.push(btn('🧭', 'Mon voyage', function(){ location.href = HUB_URL; }));
      /* PDF : plus dans la barre, mais en fin de guide (dernière page) */
      if(cur === last){
        var endBox = el('div', { style: 'max-width:680px;margin:18px auto 0;padding:0 14px;text-align:center;font-family:"Segoe UI",Arial,sans-serif' });
        var pb = el('button', { type: 'button', style: 'width:100%;padding:15px;border:0;border-radius:14px;background:linear-gradient(135deg,#d35400,#f0955a);color:#fff;font:800 16px "Segoe UI",Arial,sans-serif;cursor:pointer' }, '📥 Enregistrer mon guide en PDF');
        pb.addEventListener('click', function(){ printAll(); });
        endBox.appendChild(pb);
        endBox.appendChild(el('p', { style: 'color:#b9b9b9;font-size:12.5px;line-height:1.5;margin:8px 0 0' }, 'Un menu d’impression s’ouvre : choisis « Enregistrer en PDF ». Cela peut prendre quelques secondes.'));
        var nb = document.querySelector('.navbar'); if(nb && nb.parentNode) nb.parentNode.insertBefore(endBox, nb.nextSibling); else document.body.appendChild(endBox);
      }
      items.forEach(function(b){ bar.appendChild(b); });
    } else {                                                      /* guide en une seule page (fonctions déjà présentes dans index.html) */
      function call(f){ try{ f(); }catch(e){} }
      bar.appendChild(btn('📕', 'Couverture', function(){ call(function(){ tmCoverShow(); }); }));
      bar.appendChild(btn('◀', 'Précédent', function(){ call(function(){ go(page - 1); }); }));
      bar.appendChild(btn('☷', 'Sommaire', function(){ call(function(){ show('summary'); }); }));
      bar.appendChild(btn('▶', 'Suivant', function(){ call(function(){ go(page + 1); }); }));
      bar.appendChild(btn('⋯', 'Outils', function(){
        var l = el('div', { 'class': 'list' });
        [['🔗 Liens utiles', 'links'], ['☑️ Ma checklist', 'checklist'], ['💱 Euro ↔ Baht', 'convert'], ['⏱️ Compte à rebours', 'countdown'], ['❤️ Mes favoris', 'favorites']].forEach(function(x){
          var b = el('button', { type: 'button' }, x[0]); b.addEventListener('click', function(){ sheet.classList.remove('open'); call(function(){ show(x[1]); }); }); l.appendChild(b); });
        var fav = el('button', { type: 'button' }, '♡ Ajouter cette page aux favoris'); fav.addEventListener('click', function(){ sheet.classList.remove('open'); call(function(){ toggleFavorite(); }); }); l.appendChild(fav);
        openSheet('Outils', l);
      }));
    }
    document.body.appendChild(bar); document.body.classList.add('tmHasTab');
  }

  /* Agrandissement : un appui sur une case de la page l'ouvre seule, en grand (zones dans zones.json).
     En dehors d'une case : agrandissement centré sur l'endroit touché. */
  var ZONES = null;
  function loadZones(){
    try{ fetch('zones.json', { cache: 'no-cache' }).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){ ZONES = j; }).catch(function(){}); }catch(e){}
  }
  function zoneAt(n, x, y){
    var zs = (ZONES && ZONES[n]) || []; var best = null, ba = 1e12;
    zs.forEach(function(z){ if(x >= z[0] && x <= z[2] && y >= z[1] && y <= z[3]){ var a = (z[2] - z[0]) * (z[3] - z[1]); if(a < ba){ ba = a; best = z; } } });
    return best;
  }
  function zoomSetup(){
    var img = document.querySelector('.page img'); var mm = location.pathname.match(/page(\d+)(\.html)?$/); if(!img || (mm && parseInt(mm[1], 10) === FIRST)) return;
    var n = mm ? parseInt(mm[1], 10) : 0;
    loadZones();
    var z = el('div', { id: 'tmZoom' }); var zi = el('img', { alt: '' }); var zx = el('button', { type: 'button', 'aria-label': 'Fermer' }, '✕'); z.appendChild(zi); z.appendChild(zx); document.body.appendChild(z);
    var zc = document.createElement('style'); zc.textContent = '#tmZoom{position:fixed;inset:0;z-index:1700;background:#000f;overflow:auto;display:none;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y pinch-zoom}#tmZoom.open{display:block}#tmZoom img{display:block;width:170%;max-width:none;height:auto}#tmZoom button{position:fixed;top:max(12px,env(safe-area-inset-top));right:12px;width:44px;height:44px;border-radius:50%;border:0;background:#000b;color:#fff;font-size:22px;z-index:1}.page img{cursor:zoom-in}'; document.head.appendChild(zc);
    function close(){ z.classList.remove('open'); document.documentElement.style.overflow = ''; }
    zx.addEventListener('click', close); z.addEventListener('click', function(e){ if(e.target === z) close(); });
    img.addEventListener('click', function(e){
      var r = img.getBoundingClientRect(); var fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      var zone = zoneAt(n, fx * 1024, fy * 1536);
      zi.style.width = ''; zi.src = img.currentSrc || img.src; z.classList.add('open'); document.documentElement.style.overflow = 'hidden';
      function place(){
        var VW = z.clientWidth || innerWidth, VH = z.clientHeight || innerHeight;
        if(zone){
          var zw = zone[2] - zone[0], zh = zone[3] - zone[1]; var IW = Math.min(VW * 0.94 / (zw / 1024), VW * 4.5); zi.style.width = IW + 'px';
          var IH = zi.offsetHeight || IW * 1.5;
          z.scrollLeft = Math.max(0, zone[0] / 1024 * IW - VW * 0.03);
          z.scrollTop = Math.max(0, zone[1] / 1536 * IH - Math.max(40, (VH - zh / 1536 * IH) / 2));
        } else {
          z.scrollLeft = Math.max(0, fx * zi.offsetWidth - VW / 2); z.scrollTop = Math.max(0, fy * zi.offsetHeight - VH / 2);
        }
      }
      place(); if(zi.complete) requestAnimationFrame(place); else zi.addEventListener('load', place, { once: true });
    });
    /* petit conseil au premier affichage */
    try{ if(!localStorage.getItem('tm-zone-hint')){ var h = el('div', { id: 'tmHint' }, '💡 Touche une case pour l’agrandir'); var hc = document.createElement('style'); hc.textContent = '#tmHint{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom));transform:translate(-50%,20px);background:#1a1d24;color:#fff;border:1px solid #d35400;border-radius:999px;padding:10px 16px;font:700 14px "Segoe UI",Arial,sans-serif;z-index:1650;opacity:0;pointer-events:none;transition:.4s;white-space:nowrap}#tmHint.on{opacity:1;transform:translate(-50%,0)}'; document.head.appendChild(hc); document.body.appendChild(h); setTimeout(function(){ h.classList.add('on'); }, 1500); setTimeout(function(){ h.classList.remove('on'); localStorage.setItem('tm-zone-hint', '1'); }, 6500); } }catch(e){}
  }

  /* Impression / PDF : toutes les pages du guide, une par feuille A4 */
  function printAll(){
    var old = document.getElementById('tmPrint'); if(old) old.remove();
    var box = el('div', { id: 'tmPrint' }); var imgs = [];
    var cur = document.querySelector('.page img'); var src = cur ? (cur.getAttribute('src') || '') : '';
    var mm = src.match(/^(.*?)page(\d+)(\.\w+)$/); var base = mm ? mm[1] : 'images/'; var ext = mm ? mm[3] : '.webp';
    for(var n = FIRST; n <= (TOTAL || 0); n++){
      var im = new Image(); im.alt = ''; im.src = (n === 0 ? base + 'cover' + ext : base + 'page' + n + ext); box.appendChild(im); imgs.push(im);
    }
    document.body.appendChild(box);
    var st = document.getElementById('tmPrintCss');
    if(!st){ st = document.createElement('style'); st.id = 'tmPrintCss'; st.textContent = '#tmPrint{display:none}@page{size:A4;margin:0}@media print{body>*:not(#tmPrint){display:none!important}#tmPrint{display:block!important}#tmPrint img{display:block;width:198mm;height:297mm;margin:0 auto;object-fit:contain;break-after:page;page-break-after:always}html,body{background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}'; document.head.appendChild(st); }
    Promise.all(imgs.map(function(i){ return i.complete ? 1 : new Promise(function(r){ i.onload = i.onerror = r; }); })).then(function(){ setTimeout(function(){ window.print(); }, 150); });
  }
  function sync(){ var bar = document.getElementById('tmTab'); if(bar) bar.classList.toggle('lock', locked()); }
  ready(function(){
    build(); sync(); if(MODE === 'pages') zoomSetup();
    new MutationObserver(sync).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  });
})();

/* Avertissement : appareil trop ancien pour les images WebP (iOS < 14, anciens navigateurs) */
(function(){var im=new Image();im.onload=function(){if(im.width===1)return;go()};im.onerror=go;im.src='data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';function go(){
 function show(){if(document.getElementById('tmOld'))return;var d=document.createElement('div');d.id='tmOld';
  d.style.cssText='position:fixed;left:0;right:0;top:0;z-index:2147483000;background:#b3261e;color:#fff;font:700 14px/1.4 -apple-system,Segoe UI,Arial,sans-serif;padding:12px 16px;text-align:center;box-shadow:0 4px 16px #0008';
  d.innerHTML='⚠️ Cet appareil est trop ancien pour afficher les images des guides. Mets à jour iOS (version 14 ou plus récente) ou ouvre le guide sur un autre téléphone ou ordinateur. <button type="button" style="margin-left:8px;border:0;border-radius:8px;padding:4px 10px;font:800 13px inherit;background:#fff;color:#b3261e" onclick="this.parentNode.remove()">OK</button>';
  (document.body||document.documentElement).appendChild(d)}
 if(document.body)show();else document.addEventListener('DOMContentLoaded',show)}})();
