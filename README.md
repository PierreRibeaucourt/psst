<p align="center"><img src="brand/logo.svg" alt="Psst" height="64"></p>

# Psst for Amazon

Chrome extension that hides Amazon orders from the people who share your Amazon account, so gifts stay a surprise.
Leo hides the gift he bought for Emma; Emma hides the one she bought for Leo. Each sees the whole order history,
except what the other is hiding from them.

Extension Chrome qui cache des commandes Amazon aux personnes qui partagent votre compte : les cadeaux restent une surprise.

- Site : https://pierreribeaucourt.github.io/psst/
- Politique de confidentialité : https://pierreribeaucourt.github.io/psst/privacy.html
- Contact : pierre@ribeaucourt.fr

## Comment ça marche

- `src/entrypoints/orders.content/` : sur les pages de liste (« Vos commandes », recherche), un CSS injecté avant
  l’affichage masque toutes les cartes ; le script les montre une à une, sauf celles cachées à la personne. Une barre Psst
  est ajoutée sous l’en-tête de chaque commande visible (shadow DOM).
- `src/entrypoints/order-page.content.ts` : page d’une commande (détail, suivi, facture, retour, reçu cadeau) : si elle est
  cachée, elle est remplacée par un écran « Pas de spoiler ! ».
- `src/lib/engine.ts` : le service worker, seul à modifier l’état et à parler au serveur.
- `src/lib/crypto.ts` : chiffrement de bout en bout. Le code d’invitation contient le secret du foyer ; le serveur ne reçoit
  que des blobs chiffrés avec des identifiants opaques.
- `src/locales/` : textes anglais (par défaut) et français, choisis selon la langue de Chrome.
- `server/` : Cloudflare Worker + D1, quatre routes, aucun compte utilisateur.

Avant d’afficher une page, l’extension attend une synchro fraîche (2,5 s au plus) : une commande cachée il y a une minute
sur un autre navigateur ne s’affiche jamais, même un instant.

## Développer

```sh
npm install
npm test                       # tests unitaires (lecture du DOM, visibilité, chiffrement)
npm run e2e                    # bout en bout : 2 profils Chromium (FR sur amazon.fr, EN sur amazon.com) + serveur local
npm run build                  # extension de production dans .output/chrome-mv3
npm run zip                    # .output/psst-for-amazon-<version>-chrome.zip pour le Chrome Web Store
npm --prefix server run deploy # migrations D1 + déploiement du Worker
```

Identité et Store :

```sh
npm run brand                  # logos SVG (brand/) à partir de brand/mark.svg et de Nunito Black
npm run icons                  # icônes de l’extension et du Store
npm run store                  # captures et bannières du Store (store/assets/), copiées aussi dans docs/assets/
```

- `brand/charte.html` : charte graphique (logo, couleurs, typographie, ton, rapport à Amazon).
- `store/kit.html` : tout ce qu’il faut saisir dans le tableau de bord du Chrome Web Store, onglet par onglet.
- `docs/` : site GitHub Pages (accueil et politique de confidentialité, FR/EN).

`tests/fixtures/orders.html` est une copie anonymisée de la page « Vos commandes », générée par `npm run fixture` depuis
un export brut `Vos commandes.html` (jamais versionné : noms, adresses). `store/fixtures/orders.en.html` en est une version
traduite façon amazon.com, pour les visuels.

---

Amazon is a trademark of Amazon.com, Inc. or its affiliates. Psst is an independent project, not affiliated with, endorsed
or sponsored by Amazon.
