# shared — le bloc commun BAAM-OPTIN

`baam-optin.js` contient deux modules utilisés par tous les BAAM Tools :

- **`BaamOptin`** — la carte discrète qui apparaît *après* l'usage, le CTA vers l'univers
  BAAM concerné, la fenêtre « bonus contre e-mail » (choix newsletter actif, séparé et
  sans option présélectionnée),
  la mémoire du déblocage (une seule fois pour tous les tools) et l'envoi du lead ;
- **`BaamVideo`** — l'enregistreur vidéo (MP4, ou WebM selon le navigateur) et son panneau.

Chaque tool en embarque une **copie identique** : les tools restent autonomes (un fichier).

## Mettre à jour le bloc

1. Modifier **uniquement** `shared/baam-optin.js`.
2. Lancer `node shared/inject-optin.js` : il remplace le bloc dans chaque tool
   (`animateur-logo.html`, `color-picker.html`, `mindmap.html`, `convertisseur.html`,
   `tools-src/operateur-texte/index.html`).
3. Pour un nouveau tool : placer le repère `/*@BAAM-OPTIN@*/` dans son script, l'ajouter à la
   liste `TOOLS` du script d'injection, puis appeler `BaamOptin.init({...})`.

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
