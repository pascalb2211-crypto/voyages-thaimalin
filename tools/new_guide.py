# -*- coding: utf-8 -*-
"""
Création d'un nouveau guide Thaï Malin dans ce dépôt.

Usage :   python3 tools/new_guide.py  CHEMIN/vers/mon-guide
Le dossier « mon-guide » contient :
   guide.json   (les réglages, voir tools/LISEZMOI.md et tools/exemple-guide.json)
   images/      (les pages du guide : page1.png, page2.png… ou les noms indiqués dans guide.json)

Le script crée guides/<slug>/ (pages, hors-ligne, icône, manifeste) et ajoute le guide à guides.json,
donc au hub. Il peut être relancé : il remplace simplement le guide existant.
"""
import json, os, re, shutil, sys, unicodedata
from html import escape
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

def fail(msg):
    print("ERREUR :", msg); sys.exit(1)

def hex2rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def ascii_up(s):
    return re.sub(r'[^A-Z0-9]+', '-', unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().upper()).strip('-')

# ---------------------------------------------------------------- icônes
def make_icons(out, cfg):
    color = hex2rgb(cfg.get('color', '#d35400'))
    lotus = hex2rgb(cfg.get('lotus', '#f6dd8e'))          # doré par défaut
    light, dark = mix(color, (255, 255, 255), 0.18), mix(color, (0, 0, 0), 0.30)
    mask = Image.open(os.path.join(HERE, 'lotus-mask.png')).convert('L')
    font_path = os.path.join(HERE, 'DejaVuSans-Bold.ttf')
    def draw(size, scale=1.0):
        S = 512
        im = Image.new('RGB', (S, S))
        px = im.load()
        for y in range(S):
            c = mix(light, dark, y / (S - 1))
            for x in range(S): px[x, y] = c
        d = ImageDraw.Draw(im)
        im.paste(Image.new('RGB', (S, S), lotus), (0, 0), mask)
        words = (cfg.get('short') or cfg['title'].replace('Mini-guide', '')).upper().strip().split()
        lines = [' '.join(words)] if len(' '.join(words)) <= 9 else [' '.join(words[:len(words)//2 or 1]), ' '.join(words[len(words)//2 or 1:])]
        lines = [l for l in lines if l]
        fs = 78 if len(lines) == 1 else 56
        while True:
            f = ImageFont.truetype(font_path, fs)
            if max(d.textlength(l, font=f) for l in lines) <= 440 or fs <= 28: break
            fs -= 2
        y = 345 if len(lines) == 1 else 312
        for l in lines:
            w = d.textlength(l, font=f); d.text(((S - w) / 2, y), l, font=f, fill=(255, 255, 255)); y += fs + 6
        f2 = ImageFont.truetype(font_path, 30)
        t = 'MINI-GUIDE'; w = d.textlength(t, font=f2); d.text(((S - w) / 2, 462), t, font=f2, fill=lotus)
        if scale != 1.0:                                     # zone de sécurité pour l'icône « maskable »
            inner = im.resize((int(S * scale), int(S * scale)), Image.LANCZOS)
            bg = Image.new('RGB', (S, S), mix(light, dark, 0.5)); bg.paste(inner, ((S - inner.width) // 2, (S - inner.height) // 2)); im = bg
        return im.resize((size, size), Image.LANCZOS)
    os.makedirs(os.path.join(out, 'icons'), exist_ok=True)
    draw(512).save(os.path.join(out, 'icons/icon-512.png'))
    draw(192).save(os.path.join(out, 'icons/icon-192.png'))
    draw(180).save(os.path.join(out, 'icons/apple-touch-icon.png'))
    draw(32).save(os.path.join(out, 'icons/favicon-32.png'))
    draw(512, 0.78).save(os.path.join(out, 'icons/icon-maskable-512.png'))

# ---------------------------------------------------------------- pages
CSS = """  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f1115; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; padding: 24px 0; font-family: 'Segoe UI', Arial, sans-serif; }
  .page { position: relative; width: 100%; max-width: 680px; aspect-ratio: 1024 / 1536; margin: 0 auto; }
  .page img { width: 100%; height: 100%; display: block; object-fit: cover; border-radius: 6px; }
  .zone { position: absolute; display: block; border-radius: 10px; }
  .zone:active { background: #ffffff30; }
  .hotspot { text-decoration: none; display: flex; align-items: center; justify-content: center; font-weight: 700; letter-spacing: .5px; cursor: pointer; border-radius: 50px; font-size: clamp(13px, 2.1vw, 16px); }
  .hotspot:active { transform: scale(.97); }
  .btn-prev { background: rgba(255,255,255,.12); color: #fff; border: 1px solid rgba(255,255,255,.5); }
  .btn-next, .btn-restart { background: linear-gradient(135deg, #d35400, #f0955a); color: #fff; box-shadow: 0 6px 18px rgba(211,84,0,.45); }
  .navbar { display: flex; gap: 12px; width: 100%; max-width: 680px; margin: 14px auto 0; padding: 0 14px; }
  .navbar .hotspot { height: 48px; flex: 1; }
  .navbar .btn-prev { flex: 0 0 auto; min-width: 140px; }"""

def page_html(cfg, n, total, first, title, links, toc, name):
    zones = ''
    for l in links or []:
        href = l.get('href') or ('page%d.html' % l['page'])
        ext = ' target="_blank" rel="noopener"' if l.get('href') else ''
        zones += '  <a class="zone" href="%s"%s aria-label="%s" style="left:%s%%;top:%s%%;width:%s%%;height:%s%%"></a>\n' % (
            escape(href), ext, escape(l.get('label', '')), l['x'], l['y'], l['w'], l['h'])
    prev = '<a href="page%d.html" class="hotspot btn-prev">&#x2190; Pr&#xE9;c&#xE9;dent</a>' % (n - 1) if n > first else ''
    nxt = ('<a href="page%d.html" class="hotspot btn-next">Suivant &#x2192;</a>' % (n + 1)) if n < total else ('<a href="page%d.html" class="hotspot btn-restart">&#x21BA; Recommencer</a>' % first)
    attrs = ['data-nav="pages"']
    if cfg.get('booking'): attrs.append('data-booking="%s"' % cfg['booking'])
    if cfg.get('booking_page'): attrs.append('data-booking-page="%s"' % cfg['booking_page'])
    attrs += ['data-toc="%s"' % escape(toc), 'data-weather="%s"' % escape(cfg.get('weather', '')) if cfg.get('weather') else '',
              'data-first="%d"' % first, 'data-total="%d"' % total, 'data-name="%s"' % escape(name), 'data-slug="%s"' % cfg['slug'],
              'data-country="%s"' % escape(cfg.get('country', ''))]
    if n == first: attrs.append('data-banner="1"')
    attrs = ' '.join(a for a in attrs if a)
    return """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>%s &#x2014; Page %d</title>
<style>
%s
</style>
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#0f1115">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="%s">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
</head>
<body>

<div class="page">
  <img src="images/page%d.webp" alt="%s - %s">
%s</div>
<div class="navbar">
  %s
  %s
</div>

<script src="../../shared/gate.js" data-prefix="%s" data-key="%s" data-title="%s"></script>
<script src="../../shared/pwa.js" %s></script>
</body>
</html>
""" % (escape(name), n, CSS, escape(name), n, escape(name), escape(title), zones, prev, nxt,
       cfg['prefix'], cfg['key'], escape(name), attrs)

SW = """/* Hors-ligne du guide %(name)s : pages en réseau d'abord, images en cache d'abord. */
const CACHE = 'tm-mg-%(slug)s';
const CORE = %(core)s;
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
      try{ const res = await fetch(u, { cache: 'reload' }); if(!res || !res.ok) throw new Error('HTTP ' + (res && res.status)); await cache.put(u, await clean(res)); }
      catch(e){ failed.push(u); }
    }));
    if(failed.length){ throw new Error('Pré-cache incomplet : ' + failed.slice(0, 3).join(', ')); }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.indexOf('tm-mg-%(slug)s') === 0 && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;           // météo, liens externes : réseau seul
  const isImage = /\\.(webp|png|jpg|jpeg|svg)$/i.test(url.pathname);
  if(isImage){
    event.respondWith(caches.open(CACHE).then(async cache => {
      const hit = await cache.match(req);
      const net = fetch(req).then(res => { if(res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      return hit || (await net) || Response.error();
    }));
    return;
  }
  event.respondWith(fetch(req).then(async res => {
    if(res && res.ok){ const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return clean(res);
  }).catch(async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    return hit ? clean(hit) : (req.mode === 'navigate' ? (await caches.match('page1.html')) || Response.error() : Response.error());
  }));
});
"""

def main():
    if len(sys.argv) != 2: fail("Usage : python3 tools/new_guide.py CHEMIN/vers/mon-guide")
    src = os.path.abspath(sys.argv[1])
    try: cfg = json.load(open(os.path.join(src, 'guide.json'), encoding='utf-8'))
    except Exception as e: fail("guide.json introuvable ou invalide : %s" % e)
    for k in ('slug', 'title', 'pages'):
        if k not in cfg: fail("« %s » manque dans guide.json" % k)
    cfg['slug'] = re.sub(r'[^a-z0-9-]+', '-', cfg['slug'].lower()).strip('-')
    cfg.setdefault('country', ''); cfg.setdefault('emoji', '🌴'); cfg.setdefault('desc', ''); cfg.setdefault('color', '#d35400')
    cfg['prefix'] = cfg.get('prefix') or ascii_up(cfg['slug'])
    cfg['key'] = 'tm-mg-%s-unlocked' % cfg['slug']
    name = cfg['title']
    out = os.path.join(ROOT, 'guides', cfg['slug'])
    if os.path.exists(out): shutil.rmtree(out)
    os.makedirs(os.path.join(out, 'images'))
    pages = cfg['pages']; total = len(pages); first = 1
    toc = ';'.join('%d|%s' % (i + 1, p['title'].replace(';', ',').replace('|', '/')) for i, p in enumerate(pages))
    imgdir = os.path.join(src, 'images')
    for i, p in enumerate(pages, 1):
        f = p.get('file')
        if not f:
            cands = [x for x in os.listdir(imgdir) if re.match(r'^page0*%d\.(png|jpe?g|webp)$' % i, x, re.I)]
            if not cands: fail("image de la page %d introuvable (page%d.png/jpg/webp) dans %s" % (i, i, imgdir))
            f = cands[0]
        fp = os.path.join(imgdir, f)
        if not os.path.exists(fp): fail("image introuvable : %s" % fp)
        im = Image.open(fp).convert('RGB')
        if im.width > 1024: im = im.resize((1024, int(im.height * 1024 / im.width)), Image.LANCZOS)
        im.save(os.path.join(out, 'images/page%d.webp' % i), 'WEBP', quality=82, method=6)
        if i == first:
            os.makedirs(os.path.join(ROOT, 'covers'), exist_ok=True)
            th = im.resize((400, int(im.height * 400 / im.width)), Image.LANCZOS)
            th.save(os.path.join(ROOT, 'covers', '%s.webp' % cfg['slug']), 'WEBP', quality=80, method=6)
        open(os.path.join(out, 'page%d.html' % i), 'w', encoding='utf-8').write(page_html(cfg, i, total, first, p['title'], p.get('links'), toc, name))
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write('<!DOCTYPE html>\n<html lang="fr"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0; url=page1.html"><title>%s</title></head><body><p><a href="page1.html">%s</a></p></body></html>\n' % (escape(name), escape(name)))
    json.dump({"id": "./", "name": "%s — Thaï Malin" % name, "short_name": name, "start_url": "./index.html", "scope": "./", "display": "standalone", "orientation": "portrait",
               "background_color": "#0f1115", "theme_color": "#0f1115", "lang": "fr",
               "icons": [{"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"}, {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
                         {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]},
              open(os.path.join(out, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    core = ['./', 'index.html', 'manifest.json', '../../shared/pwa.js', '../../shared/gate.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png']
    core += ['page%d.html' % i for i in range(1, total + 1)] + ['images/page%d.webp' % i for i in range(1, total + 1)]
    open(os.path.join(out, 'service-worker.js'), 'w', encoding='utf-8').write(SW % {'name': name, 'slug': cfg['slug'], 'core': json.dumps(core, indent=2)})
    make_icons(out, cfg)
    gj = os.path.join(ROOT, 'guides.json'); data = json.load(open(gj, encoding='utf-8'))
    entry = {"slug": cfg['slug'], "type": cfg.get('type', 'theme'), "emoji": cfg['emoji'], "title": name, "desc": cfg['desc'], "color": cfg['color'],
             "prefix": cfg['prefix'], "key": cfg['key'], "sales": cfg.get('sales', 'https://thaimalin.fr'), "country": cfg.get('country', '')}
    data['guides'] = [g for g in data['guides'] if g['slug'] != cfg['slug']] + [entry]
    json.dump(data, open(gj, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print("OK : guides/%s créé (%d pages). Code d'accès du mois : %s-MM-AAAA (ex. %s-10-2026)" % (cfg['slug'], total, cfg['prefix'], cfg['prefix']))

main()
