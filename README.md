# BAAM.TOOLS

Portail territorial autonome pour trois formes de contenus :

- `free-webtool` — BAAM Tool gratuit et directement utilisable ;
- `tutorial` — guide HTML structuré avec étapes et champs copiables ;
- `resource` — fiche éditoriale pointant vers une ressource externe.

L'interface reste volontairement claire et légère. Toutes les cartes partagent le
même geste d'ouverture ; leur liseré distingue le type. Les filtres **type × thème**
sont combinables, inscrits dans l'URL et animent la redistribution de la grille.

## Lancer

```text
npm run build
npm run serve
```

Puis ouvrir `http://127.0.0.1:8091/`. Le lanceur Windows `lancer-site.bat` effectue
le build avant d'ouvrir le portail.

## Fabrique de pages

Chaque contenu est une fiche JSON dans `content/`. Le build valide les fiches puis
génère ensemble :

```text
content/*.json
      ↓ scripts/build-portal.js
carte d'accueil + page dédiée + registre Tools + manifest BAAM + sitemap
```

Le builder local est disponible sur `/builder/`. Il ne publie rien : il produit une
fiche JSON à relire puis à déposer dans `content/`. Ce garde-fou conserve le workflow
Git et évite d'introduire un CMS avant qu'il soit utile.

L'Opérateur Texte reste maintenu dans `operateur-texte.html`. Le build le copie vers
`public/baam-tools/operateur-texte/index.html` sans dupliquer sa logique.

## Commandes

```text
npm test        contrat des trois types + contrôle des sorties publiques
npm run check   validation complète sans écriture
npm run build   génération du portail et des registres
npm run serve   serveur statique local, port 8091
```

## Publication

Le site est prêt pour un dépôt GitHub et un déploiement Netlify statique, mais aucun
remote ni déploiement n'est configuré à ce stade. La future chaîne sera :

```text
push Tools → Netlify Tools → hook BAAM.pro → racine
```

Les URLs privées de hooks resteront dans Netlify et ne seront jamais versionnées.
