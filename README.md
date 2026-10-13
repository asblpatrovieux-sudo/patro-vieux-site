# Site de l’ASBL Patro Vieux

Vitrine publique React/Vite de l’ASBL Patro Vieux, prête à être publiée.

## Lancer localement

1. Installer Node.js 20 ou une version plus récente.
2. Ouvrir un terminal dans ce dossier.
3. Exécuter :

```bash
npm install
npm run dev
```

L’adresse locale apparaîtra dans le terminal, généralement `http://localhost:5173`.

## Construire la version de production

```bash
npm run build
```

Le dossier publiable sera créé dans `dist`.

## Publier avec GitHub et Cloudflare Pages

1. Créer un dépôt GitHub privé ou public.
2. Envoyer tous les fichiers de ce dossier dans le dépôt.
3. Dans Cloudflare Pages, choisir « Connect to Git » puis sélectionner le dépôt.
4. Framework preset : `Vite`.
5. Build command : `npm run build`.
6. Build output directory : `dist`.
7. Lancer le déploiement.

## Logo

Le logo est dans `public/logo-patro-vieux.png`.

## Informations à vérifier avant publication

- Confirmer que le numéro public peut être affiché.
- Vérifier l’orthographe officielle de « Preser Thomas ».
- Faire relire les mentions de confidentialité si un vrai formulaire de collecte est ajouté.
- Le formulaire actuel ouvre le logiciel de messagerie du visiteur et ne stocke aucune donnée.

## Futur portail membre

Le bouton « Accès membre » est actuellement informatif. Le portail sécurisé sera ajouté dans une phase ultérieure avec une base de données et une authentification côté serveur.
