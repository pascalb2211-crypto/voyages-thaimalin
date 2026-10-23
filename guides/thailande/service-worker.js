/* ===================== SERVICE WORKER — Mini-guide Thaïlande =====================
   Pages et images du mini-guide conservées sur le téléphone pour une lecture sans internet.
   - Pages : réseau d'abord (toujours à jour en ligne), copie enregistrée en secours.
   - Images : copie enregistrée d'abord, mise à jour discrète en arrière-plan.
   - Le téléchargement complet des images se lance après la saisie du mot de passe.
   Si vous ajoutez une page ou une image NOUVELLE, ajoutez-la aux listes ci-dessous
   (ou relancez l'outil de conversion) pour qu'elle soit aussi téléchargée d'avance.
================================================================================ */
const CACHE = 'tm-mg-thailande';
const CORE = [
  "./",
  "index.html",
  "pwa.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png"
];
const IMAGES = [
  "assets/cover.webp",
  "assets/page-01.webp",
  "assets/page-02.webp",
  "assets/page-03.webp",
  "assets/page-04.webp",
  "assets/page-05.webp",
  "assets/page-06.webp",
  "assets/page-07.webp",
  "assets/page-08.webp",
  "assets/page-09.webp",
  "assets/page-10.webp",
  "assets/page-11.webp",
  "assets/page-12.webp",
  "assets/page-13.webp",
  "assets/page-14.webp",
  "assets/page-15.webp",
  "assets/page-16.webp",
  "assets/page-17.webp",
  "assets/page-18.webp",
  "assets/page-19.webp",
  "assets/page-20.webp",
  "assets/page-21.webp",
  "assets/page-22.webp",
  "assets/page-23.webp",
  "assets/thumbs/thumb-01.webp",
  "assets/thumbs/thumb-02.webp",
  "assets/thumbs/thumb-03.webp",
  "assets/thumbs/thumb-04.webp",
  "assets/thumbs/thumb-05.webp",
  "assets/thumbs/thumb-06.webp",
  "assets/thumbs/thumb-07.webp",
  "assets/thumbs/thumb-08.webp",
  "assets/thumbs/thumb-09.webp",
  "assets/thumbs/thumb-10.webp",
  "assets/thumbs/thumb-11.webp",
  "assets/thumbs/thumb-12.webp",
  "assets/thumbs/thumb-13.webp",
  "assets/thumbs/thumb-14.webp",
  "assets/thumbs/thumb-15.webp",
  "assets/thumbs/thumb-16.webp",
  "assets/thumbs/thumb-17.webp",
  "assets/thumbs/thumb-18.webp",
  "assets/thumbs/thumb-19.webp",
  "assets/thumbs/thumb-20.webp",
  "assets/thumbs/thumb-21.webp",
  "assets/thumbs/thumb-22.webp",
  "assets/thumbs/thumb-23.webp",
  "assets/qr/qr22-1.png",
  "assets/qr/qr22-2.png",
  "assets/qr/qr22-3.png",
  "assets/qr/qr22-4.png",
  "assets/qr/qr22-5.png",
  "assets/qr/qr22-6.png",
  "assets/qr/qr23-1.png",
  "assets/qr/qr23-2.png",
  "assets/qr/qr23-3.png",
  "assets/qr/qr23-4.png",
  "assets/qr/qr23-5.png"
];

async function clean(res){
  if(!res || !res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const failed = [];
    await Promise.all(CORE.map(async u => {
      try{
        const res = await fetch(u, { cache: 'reload' });
        if(!res || !res.ok) throw new Error('HTTP ' + (res && res.status));
        await cache.put(u, await clean(res));
      }catch(e){ failed.push(u); }
    }));
    if(failed.length){ throw new Error('Pré-cache incomplet : ' + failed.slice(0, 3).join(', ')); }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k.indexOf('tm-mg-thailande') === 0 && k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

function scopeRel(url){
  const base = new URL(self.registration.scope).pathname;
  let p = new URL(url).pathname;
  p = p.indexOf(base) === 0 ? p.slice(base.length) : p.replace(/^\//, '');
  return p;
}

async function offlinePage(req){
  let hit = await caches.match(req, { ignoreSearch: true });
  if(!hit){
    let p = scopeRel(req.url).replace(/\/+$/, '');
    const c = !p ? 'index.html' : (/\.[a-z0-9]+$/i.test(p) ? p : p + '.html');
    hit = await caches.match(c, { ignoreSearch: true });
  }
  return hit ? clean(hit) : Response.error();
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;   // météo, taux de change, liens externes : réseau seul

  if(req.mode === 'navigate'){
    event.respondWith(
      fetch(req).then(async res => {
        if(res && res.status === 200 && res.type !== 'opaqueredirect'){
          const copy = await clean(res.clone());
          caches.open(CACHE).then(c => c.put(req, copy));
          return res.redirected ? clean(res) : res;
        }
        return res;
      }).catch(() => offlinePage(req))
    );
    return;
  }

  if(/\.(webp|png|jpe?g|gif|svg|ico)$/i.test(url.pathname)){
    event.respondWith(caches.open(CACHE).then(async cache => {
      const hit = await cache.match(req);
      const net = fetch(req).then(res => { if(res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      return hit || (await net) || Response.error();
    }));
    return;
  }

  event.respondWith(
    fetch(req).then(res => {
      if(res && res.status === 200){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(h => h ? clean(h) : Response.error()))
  );
});

self.addEventListener('message', event => {
  const d = event.data || {};
  const port = event.ports && event.ports[0];
  const say = m => { try{ if(port) port.postMessage(m); }catch(e){} };
  if(d.type === 'STATUS'){
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      let have = 0;
      for(const u of IMAGES){ if(await cache.match(u)) have++; }
      say({ phase: 'status', have, total: IMAGES.length });
    })());
  } else if(d.type === 'DOWNLOAD_ALL'){
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      const todo = [];
      for(const u of IMAGES){ if(!(await cache.match(u))) todo.push(u); }
      let done = 0, failed = 0, i = 0;
      const total = todo.length;
      await Promise.all(Array.from({ length: Math.min(4, total) }, async () => {
        while(i < total){
          const u = todo[i++];
          try{
            const res = await fetch(u, { cache: 'reload' });
            if(!res.ok) throw new Error('HTTP ' + res.status);
            await cache.put(u, res);
          }catch(e){ failed++; }
          say({ phase: 'progress', done: ++done, total });
        }
      }));
      say({ phase: 'done', total, failed });
    })());
  }
});
