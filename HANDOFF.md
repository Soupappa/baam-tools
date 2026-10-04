# HANDOFF — BAAM.Tools

## État au 4 octobre 2026

Le dossier initial ne contenait que `operateur-texte.html`. Il possède maintenant un
portail autonome statique, sans framework ni dépendance d'exécution.

Livré localement :

- accueil tech clair, cartes dépliables et liserés propres aux trois types ;
- filtres combinables et URL-adressables par **type** et **thème** ;
- redistribution animée des cartes, avec respect de `prefers-reduced-motion` ;
- contrat JSON et générateur pour `free-webtool`, `tutorial` et `resource` ;
- quatre contenus réels : Opérateur Texte, guide BAAM du motion par Claude,
  fiche Skillry Opus 5.5 Videos et fiche SVGOMG ;
- previews de cartes flexibles : texte animé, SVG/image, MP4 et iframe locale ;
- aide condensée intégrée à l'Opérateur Texte ;
- page builder locale avec guides par blocs, enregistrement validé et reconstruction ;
- registre territorial, graphe, JSON-LD, manifest `/.well-known/baam.json`, sitemap ;
- serveur local déclaré sur le port 8091 et configuration Netlify prête ;
- recette navigateur desktop/mobile et parcours accueil → guide → outil réussis.

Commandes validées : `npm test`, `npm run check`, `npm run build`.

## Reste à faire

1. Faire valider la direction visuelle et les libellés par Antoine.
2. Ajouter les prochains contenus réels depuis le builder et affiner le guide modèle.
3. Créer le dépôt GitHub distant sans pousser avant le lot de publication choisi.
4. Créer le site Netlify, ajouter `tools.baam.pro` et son CNAME Namecheap.
5. Ajouter Tools à `data/territory.sources.json` dans BAAM.pro, puis configurer la
   cascade Tools → BAAM.pro.
6. Contrôler le registre public et la carte Tools dans la façade racine.

Ne pas ajouter de CMS généraliste tant que les fiches JSON et le builder local
couvrent le besoin réel.
