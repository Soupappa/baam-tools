# HANDOFF — BAAM.Tools

## État au 5 octobre 2026

Le dossier initial ne contenait que `operateur-texte.html`. Il possède maintenant un
portail autonome statique, sans framework ni dépendance d'exécution.

Livré localement :

- accueil tech clair, cartes dépliables et liserés propres aux trois types ;
- filtres combinables et URL-adressables par **type** et **thème** ;
- redistribution animée des cartes, avec respect de `prefers-reduced-motion` ;
- contrat JSON et générateur pour `free-webtool`, `tutorial` et `resource` ;
- quinze contenus publics : six BAAM Tools, trois guides complets et six ressources
  externes ; ajout des guides du brief visuel et de la landing page, puis des fiches
  Excalidraw, Penpot, Squoosh et Haikei ;
- previews de cartes flexibles : texte animé, SVG/image, MP4 et iframe locale ;
- aide condensée intégrée à l'Opérateur Texte ;
- page builder locale avec guides par blocs, enregistrement validé et reconstruction ;
- sources BAAM Tools organisées par dossiers dans `tools-src/`, inventaire automatique,
  copie récursive des assets et création depuis un patron graphique commun ;
- mode d'habillage `frame` pour envelopper un HTML autonome dans la coque BAAM sans
  modifier sa source, avec synchronisation du hash entre l'outil et l'URL publique ;
- Color Picker intégré comme deuxième BAAM Tool et conservé comme source autonome ;
- Animateur de logo, Fonds vivants et Convertisseur intégrés en mode `frame` sous
  leurs identifiants stables ; leurs actions « Continuer avec » échangent réellement
  les SVG et les réglages entre les trois routes publiques ;
- système d'opt-in partagé embarqué dans les BAAM Tools : bonus après usage, choix actif
  obligatoire et séparé pour la newsletter, mémoire de déblocage et injection depuis `shared/` ;
- collecte Netlify Forms `bonus` raccordée au build pour les outils natifs et encadrés,
  avec formulaire statique, honeypot, configuration commune et page `/confidentialite/` ;
- registre territorial, graphe, JSON-LD, manifest `/.well-known/baam.json`, sitemap ;
- serveur local déclaré sur le port 8091 ; dépôt public
  `https://github.com/Soupappa/baam-tools`, site Netlify `baam-tools` et origine de
  secours `https://baam-tools.netlify.app/` créés ;
- domaine `tools.baam.pro` déclaré côté Netlify, détection Netlify Forms activée et
  notification `Deploy succeeded` reliée au build hook de BAAM.pro ;
- CNAME Namecheap `tools` → `baam-tools.netlify.app` publié, DNS validé par Netlify,
  certificat HTTPS émis et réponse publique `200 OK` vérifiée sur les deux nœuds ;
- formulaire `bonus` détecté par Netlify Forms et prêt à collecter les inscriptions ;
- registre Tools connecté à la façade racine : 15 actifs importés, trois nouveaux
  outils testés et quatre outils mis en avant dans le carrousel ;
- recette navigateur desktop/mobile et parcours accueil → guide → outil réussis.

Commandes validées : `npm test`, `npm run check`, `npm run build`.

## Reste à faire

1. Effectuer une première soumission réelle et vérifier son arrivée dans
   **Forms → bonus**.
2. Intégrer les prochains BAAM Tools et continuer la sélection éditoriale depuis le
   builder, par lots afin d'économiser les crédits de build.

Ne pas ajouter de CMS généraliste tant que les fiches JSON et le builder local
couvrent le besoin réel.
