// Protection par mot de passe commune à tous les guides.
// Réglée par la balise <script> : data-prefix (ex. LAOS), data-key (clé de mémorisation), data-title (nom du guide).
// Mot de passe calcule automatiquement chaque mois, aucune action manuelle necessaire.
// Format : LAOS-MM-AAAA (ex. LAOS-10-2026 pour octobre 2026, LAOS-11-2026 pour novembre...).
// A donner par email a chaque acheteur du mois.
(function () {
  var me = document.currentScript;
  var PREFIX = (me && me.getAttribute('data-prefix')) || 'GUIDE';
  var KEY = (me && me.getAttribute('data-key')) || ('tm-mg-' + PREFIX.toLowerCase() + '-unlocked');
  var TITLE = (me && me.getAttribute('data-title')) || 'Mini-guide Thaï Malin';
  function getExpectedPassword(back) {
    var d = new Date();
    d = new Date(d.getFullYear(), d.getMonth() - (back || 0), 1);
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    return PREFIX + '-' + mm + '-' + d.getFullYear();
  }
  // Un code reste valable le mois en cours et le mois suivant. Une fois saisi, l'accès reste ouvert 120 jours sur l'appareil.
  var VALID_DAYS = 120;
  function normalizePw(s) {
    return String(s).toLowerCase().replace(/[\s-]/g, '');
  }

  var saved = localStorage.getItem(KEY);
  var ts = parseInt(localStorage.getItem(KEY + '-ts') || '0', 10);
  if (saved && (normalizePw(saved) === normalizePw(getExpectedPassword()) || (ts && Date.now() - ts < VALID_DAYS * 86400000))) {
    return; // accès encore valable, rien à faire
  }

  function buildGate() {
    var style = document.createElement('style');
    style.textContent =
      '.tmGuideGate{position:fixed;inset:0;background:#0f1115;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;font-family:"Segoe UI",Arial,sans-serif;}' +
      '.tmGuideGate .box{background:#1a1d24;border:1px solid rgba(211,84,0,0.35);border-radius:18px;padding:32px 28px;max-width:360px;width:100%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.5);}' +
      '.tmGuideGate h2{color:#fff;font-size:1.3rem;margin:0 0 10px 0;}' +
      '.tmGuideGate p{color:#b9b9b9;font-size:0.92rem;line-height:1.5;margin:0 0 20px 0;}' +
      '.tmGuideGate input{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:#242424;color:#fff;font-size:1rem;margin-bottom:12px;text-align:center;}' +
      '.tmGuideGate button{width:100%;padding:13px;border:none;border-radius:10px;background:linear-gradient(135deg,#d35400,#f0955a);color:#fff;font-weight:700;font-size:1rem;cursor:pointer;}' +
      '.tmGuideGate .err{color:#ff8a8a;font-size:0.85rem;margin-top:10px;display:none;}';
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.className = 'tmGuideGate';

    var box = document.createElement('div');
    box.className = 'box';

    var h2 = document.createElement('h2');
    h2.textContent = 'Acces protege';

    var p = document.createElement('p');
    p.textContent = 'Entrez le mot de passe recu par email apres votre achat.';

    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Mot de passe';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Valider';

    var err = document.createElement('div');
    err.className = 'err';
    err.textContent = 'Mot de passe incorrect.';

    box.appendChild(h2);
    box.appendChild(p);
    box.appendChild(input);
    box.appendChild(btn);
    box.appendChild(err);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function tryUnlock() {
      var v = normalizePw(input.value);
      if (v === normalizePw(getExpectedPassword()) || v === normalizePw(getExpectedPassword(1))) {
        localStorage.setItem(KEY, getExpectedPassword());
        localStorage.setItem(KEY + '-ts', String(Date.now()));
        overlay.remove();
      } else {
        err.style.display = 'block';
      }
    }

    btn.addEventListener('click', tryUnlock);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { tryUnlock(); }
    });
  }

  if (document.body) {
    buildGate();
  } else {
    document.addEventListener('DOMContentLoaded', buildGate);
  }
})();
