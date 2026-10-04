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

Le builder local est disponible sur `/builder/`. Il gère les champs communs, les
previews de carte (`text`, `svg`, `image`, `video`, `iframe`) et un guide composé de
blocs réordonnables : introduction, section, étapes, prompt copiable, checklist,
encadré et liens. Depuis le serveur local, **Enregistrer + reconstruire** valide la
fiche, la crée dans `content/` et régénère le portail. Une fiche existante n'est jamais
écrasée. Le téléchargement JSON reste disponible comme solution de repli.

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

## Flux éditorial conseillé

1. Lancer `lancer-site.bat`, puis ouvrir `/builder/`.
2. Choisir le type, écrire la fiche et sélectionner son aperçu de carte.
3. Pour un guide, ajouter puis réordonner les blocs nécessaires.
4. Enregistrer et reconstruire, puis contrôler la carte et la page générée.
5. Committer les contenus validés localement ; pousser uniquement avec le prochain lot.
