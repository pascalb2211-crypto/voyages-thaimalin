# Thaï Malin — dépôt unique des guides

```
index.html, manifest.json, service-worker.js, icons/   → le hub « Mon voyage » (la page d'accueil du dépôt)
guides.json                                           → la liste de tous les guides (le hub la lit)
shared/pwa.js, shared/gate.js                         → le code COMMUN à tous les guides (barre du bas, « Aujourd'hui », météo, programme, mot de passe)
guides/<nom>/                                         → un dossier par guide (pages, images, icône, hors-ligne)
tools/new_guide.py                                    → l'outil qui crée un nouveau guide
```

## Mettre en ligne (une seule fois)
1. Crée un dépôt GitHub (par exemple `thaimalin-guides`) avec GitHub Desktop, public.
2. Mets-y tout le contenu de ce dossier, puis Commit et Push.
3. Sur GitHub : Settings → Pages → Branch `main` → Save.
4. Adresse du hub : `https://pascalb2211-crypto.github.io/thaimalin-guides/`
   Adresse d'un guide : `.../thaimalin-guides/guides/laos/`

## Mettre à jour (le plus souvent)
- Une amélioration de la barre, d'« Aujourd'hui », de la météo… : on modifie **un seul fichier** (`shared/pwa.js`) → Commit → Push. Tous les guides sont à jour.
- Une page à changer dans un guide : on remplace son image dans `guides/<nom>/images/`.
- Une page de vente à renseigner : on modifie la ligne du guide dans `guides.json` (champ `sales`).

## Ajouter un guide (destination ou thème)
1. Crée un dossier avec :
   - `guide.json` (copie `tools/exemple-guide.json` et change les réglages),
   - un sous-dossier `images/` avec `page1.png`, `page2.png`…
2. Lance : `python3 tools/new_guide.py chemin/du/dossier`
3. Le guide apparaît dans `guides/<slug>/` et dans `guides.json` (donc dans le hub) : Commit → Push.

Réglages de `guide.json` : `slug` (nom court sans espace), `title`, `short` (texte de l'icône), `country`, `emoji`, `desc`,
`color` (fond de l'icône et de la carte du hub), `prefix` (début du code, ex. `PLAGES-THAILANDE`), `weather` (`Ville:lat,lon;Ville:lat,lon`),
`booking` (`th`, `vn`, `la` ou `kh`, optionnel), `sales` (page de vente), `pages` (titre de chaque page ; `links` = zones cliquables en %).

## Les codes d'accès
- Code d'un guide : `PREFIXE-MM-AAAA` (ex. `LAOS-10-2026`). Il ouvre le hub ET ce guide.
- Code du hub seul : `VOYAGE-MM-AAAA`.
- Un code reste valable le mois en cours et le suivant. Une fois saisi, l'accès reste ouvert 120 jours sur le téléphone.
- Les codes se calculent tout seuls : rien à modifier chaque mois.

## Guides au fonctionnement propre

Les guides `thailande` et `plages-thailande` gardent leur propre code (une seule page, météo en direct pour les plages). Leur code d accès suit la même règle (PREFIX-MM-AAAA, mois en cours ou précédent, 120 jours) et ils sont reliés au hub.
