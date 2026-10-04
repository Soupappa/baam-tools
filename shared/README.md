# shared — les blocs communs des BAAM Tools

Deux blocs sont partagés. Chaque tool en embarque une **copie identique** (les tools restent
autonomes, un seul fichier) ; on ne modifie jamais une copie, seulement la source, puis :

```bash
node shared/inject.js
```

(`node shared/inject-optin.js` marche toujours : c'est l'ancien nom, il fait la même chose.)

| Bloc | Source | Tools |
|---|---|---|
| `BAAM-OPTIN` | `baam-optin.js` | tous |
| `BAAM-ENGINE` | `baam-engine.js` | animateur-logo, fonds-vivants, operateur-texte |
| `BAAM-LINK` | `baam-link.js` | animateur-logo, color-picker, convertisseur, fonds-vivants, operateur-texte |

Pour un nouveau tool : placer le repère `/*@BAAM-OPTIN@*/` ou `/*@BAAM-ENGINE@*/` dans son
script, l'ajouter à la liste du bloc dans `BLOCKS` (`inject.js`), puis relancer le script.

## BAAM-ENGINE — le moteur BAAM

`baam-engine.js` : 4 axes → 10 paramètres BAAM → runtime → image à l'instant t → filtre SVG.
Pur et déterministe, sans IA. Il expose :

- `macroToBaam(macro)`, `resolveRuntime(op, baam)` — la chaîne de calcul ;
- `OPERATORS` (souffle, mirage, fulguration), chacun avec `frame(rt, t, D)` → l'image à
  l'instant t. Avec `D` (secondes), tous les mouvements se calent sur une boucle parfaite ;
- `baamFilterPrims(p, src)` — les primitives de filtre d'une image figée (PNG, vidéo) ;
- `baamSmil(opId, R, src)` — le même opérateur en SMIL, pour le SVG animé exporté
  (durées calées sur l'aperçu vivant) → `{ prims, move }` ;
- `baamApplier({ turb, disp, blur, move })` — pose une image sur le filtre vivant de l'aperçu ;
- `baamPad(R)` — la marge de la région du filtre.

Corriger ou ajouter un opérateur ici le corrige partout après `node shared/inject.js`.

Avec `D`, `baamSmil` rend chaque durée diviseur exact de `D` (au centième) : le SVG animé boucle
en `D` secondes, et le convertisseur le détecte. `BAAM_LOOP` donne la boucle naturelle de chaque
opérateur (Souffle 12 s, Mirage et Fulguration 6 s).

## BAAM-LINK — la passerelle entre tools (contrat de module)

Chaque tool se déclare avec `BaamLink.init({ id, anchor, offers, accepts })` :

- `offers` : ce qu'il produit — `palette` → `{ colors, base }`, `svg` → `{ svg, name }`.
  Une offre est une fonction, ou `{ get, to:[ids] }` pour limiter les destinations ;
- `accepts` : ce qu'il sait recevoir, avec la fonction qui le charge.

Une rangée discrète « Continuer avec » apparaît sous `anchor`, avec les tools qui acceptent ce
que celui-ci offre. Le clic dépose le résultat dans le navigateur (`localStorage`, clé
`baam.tools.handoff`, consommée à l'arrivée, valable 15 min) et ouvre l'autre tool.

| Depuis | Offre | Vers |
|---|---|---|
| Color Picker | palette | Opérateur Texte (couleur du mot), Animateur (teinte), Fonds vivants (encre + fond) |
| Opérateur Texte, Animateur, Fonds vivants | SVG animé, boucle calée | Convertisseur (GIF, MP4, PNG, favicon, sprites) |
| Convertisseur | SVG chargé | Animateur de logo |

Le catalogue (`CATALOG` dans `baam-link.js`) déclare ce que chaque tool accepte : un nouveau tool
s'y ajoute en une ligne. `BaamLink.pair(palette)` tire d'une palette deux couleurs lisibles ensemble.

**Pour l'intégration (Codex)** : les liens visent `/baam-tools/<id>/`, avec les ids
`operateur-texte`, `color-picker`, `animateur-logo`, `fonds-vivants`, `convertisseur`, `mindmap`
— à garder pour les fiches `content/*.json`. En mode `frame`, le clic change la page entière
(fenêtre parente, même domaine). Autre adresse : `window.BAAM_LINKS = { urls:{ "<id>":"…" } }`.
En local (`file://`), les liens visent les fichiers voisins.

## BAAM-OPTIN — opt-in et vidéo

`baam-optin.js` contient deux modules :

- **`BaamOptin`** — la carte discrète qui apparaît *après* l'usage, le CTA vers l'univers
  BAAM concerné, la fenêtre « bonus contre e-mail » (choix newsletter actif, séparé et
  sans option présélectionnée),
  la mémoire du déblocage (une seule fois pour tous les tools) et l'envoi du lead ;
- **`BaamVideo`** — l'enregistreur vidéo (MP4, ou WebM selon le navigateur) et son panneau.

Un nouveau tool appelle ensuite `BaamOptin.init({...})`. Dans `BaamVideo.panel`, `svgAt`
reçoit `(t, dw, dh, prep, D)` : `D` est la durée de la vidéo, à passer à `frame(rt, t, D)`
pour une vidéo qui boucle sans couture.

## Brancher la collecte d'e-mails — Netlify Forms (choix du 04/10)

Tant que rien n'est configuré, aucun e-mail n'est envoyé (le bonus se débloque quand même).

**1. Déclarer le formulaire.** Netlify ne détecte que les formulaires présents dans un HTML
statique publié. Ajouter ce formulaire caché dans une page générée de `public/`
(par exemple l'accueil) :

```html
<form name="bonus" data-netlify="true" netlify-honeypot="bot-field" hidden>
  <input name="bot-field">
  <input name="email" type="email">
  <input name="newsletter">
  <input name="tool">
  <input name="bonus">
  <input name="page">
</form>
```

**2. Activer l'envoi.** Dans la coque qui encadre les tools (le bloc lit aussi la page parente)
ou dans chaque page de tool :

```html
<script>
  window.BAAM_LEADS = { netlifyForm: "bonus", privacyUrl: "https://tools.baam.pro/confidentialite/" };
</script>
```

Le bloc envoie alors un `POST` `application/x-www-form-urlencoded` vers `/` avec
`form-name=bonus`, `email`, `newsletter` (`oui` / `non`), `tool`, `bonus`, `page`.

**3. Côté Netlify.** Les envois apparaissent dans *Site → Forms → bonus*, exportables en CSV ;
activer une notification par e-mail. L'offre gratuite couvre 100 envois par mois.

**4. Avant la mise en ligne.** Le portail génère déjà la configuration commune et la page
`/confidentialite/`. Activer la détection des formulaires dans Netlify puis redéployer.
Seuls les contacts avec `newsletter = oui` peuvent recevoir des e-mails marketing.

**Plus tard (Brevo, Supabase…)** : remplacer par
`window.BAAM_LEADS = { endpoint: "/.netlify/functions/lead", privacyUrl: "…" }`.
Le bloc envoie alors le JSON `{ email, newsletter, tool, bonus, page, at }`. Une petite
fonction Netlify garde la clé d'API côté serveur et pousse le contact dans la liste.
