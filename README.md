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

Les BAAM Tools riches vivent chacun dans `tools-src/<identifiant>/`. Le builder inventorie
les dossiers contenant un `index.html` ainsi que les HTML autonomes placés à la racine,
permet d'en choisir un et sait créer un nouveau
dossier depuis `_template`. Le patron fournit le shell commun BAAM — topbar, retour,
tokens, contrôles et responsive — puis laisse libres la scène et la logique. Le build
copie récursivement tout le dossier vers `public/baam-tools/<identifiant>/`, y compris
CSS, JavaScript, images, polices ou vidéos locales.

Pour une source HTML nue, le mode **Coque BAAM autour de la source** produit une page
encadrante et isole l'outil dans une iframe locale. Le hash de l'outil est synchronisé
avec l'URL publique pour conserver les liens partageables. Le mode **source déjà
habillée** publie la source directement, utile pour les outils créés depuis le patron.

L'Opérateur Texte utilise déjà ce format dans `tools-src/operateur-texte/`.

## Continuer avec un autre outil

Les six BAAM Tools partagent aussi le contrat `BAAM-LINK` documenté dans
`shared/README.md`. Une palette ou un SVG produit dans un outil peut être transmis au
suivant par la rangée **Continuer avec** : le résultat reste dans le navigateur, n’est
jamais envoyé à un serveur et expire après quinze minutes. Les routes publiques
`/baam-tools/<identifiant>/` sont stables ; ne pas renommer leurs identifiants sans
mettre à jour le catalogue partagé.

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

## Collecte des bonus

Le build publie un formulaire Netlify Forms statique nommé `bonus` et injecte
automatiquement `/leads-config.js` dans chaque BAAM Tool, qu'il soit natif ou encadré.
Les outils envoient l'adresse, le choix newsletter, l'outil, le bonus et la page. Le
formulaire impose un choix actif entre recevoir les prochains contenus BAAM ou obtenir
seulement le bonus ; aucune option n'est présélectionnée. La page
`/confidentialite/` décrit le traitement et le stockage local fonctionnel.

Après le premier déploiement, activer **Forms → Form detection** dans Netlify puis
redéployer. Les soumissions sont ensuite visibles dans **Forms → bonus**. Ne contacter
à des fins éditoriales que les lignes dont `newsletter` vaut `oui`.

## Flux éditorial conseillé

1. Lancer `lancer-site.bat`, puis ouvrir `/builder/`.
2. Pour un outil, choisir un dossier existant ou cliquer **Créer depuis le patron BAAM**.
3. Éditer son `index.html`, `style.css` et `app.js`, puis rafraîchir les sources.
4. Écrire la fiche et sélectionner son aperçu de carte.
5. Pour un guide, ajouter puis réordonner les blocs nécessaires.
6. Enregistrer et reconstruire, puis contrôler la carte et la page générée.
7. Committer les contenus validés localement ; pousser uniquement avec le prochain lot.
