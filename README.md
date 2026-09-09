# Popstrap — site e-commerce auto-gere

Site pour la marque Popstrap : boutique publique + panneau d'administration + paiement PayPal et carte bancaire (Stripe).

## Demarrage rapide

```bash
npm install
cp .env.example .env
npm start
```

Le site tourne sur http://localhost:3000, l'admin sur http://localhost:3000/admin
(identifiant/mot de passe par defaut definis dans `.env` : `ADMIN_USERNAME` / `ADMIN_PASSWORD`).

Des produits de demonstration sont crees automatiquement au premier lancement (tu peux les
supprimer depuis l'admin une fois ton vrai catalogue importe).

## Configurer les paiements

### PayPal (gratuit, pas d'abonnement)
1. Va sur https://developer.paypal.com/dashboard/applications, cree une app.
2. Copie le "Client ID" et le "Secret" dans `.env` (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`).
3. Laisse `PAYPAL_MODE=sandbox` pour tester avec de faux paiements, puis passe a
   `PAYPAL_MODE=live` avec les cles de ton app "Live" quand tu es pret a encaisser reellement.

### Carte bancaire via Stripe (gratuit a l'installation, commission par transaction)
1. Cree un compte sur https://dashboard.stripe.com
2. Dans Developers > API keys, copie la cle publique et la cle secrete dans `.env`
   (`STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`).

Tant que ces cles ne sont pas renseignees, le site fonctionne mais les boutons de paiement
correspondants affichent un message "non configure" plutot que de planter.

## Importer ton catalogue Shopify

Dans ton admin Shopify actuel : **Produits → Exporter → "Tous les produits" → CSV pour Excel,
Numbers ou autres tableurs**. Shopify genere un fichier `products_export.csv`.

Va ensuite dans `/admin/import` sur ton site Popstrap, depose ce fichier : tous tes produits
(nom, description, prix, prix barre, image, stock) sont importes automatiquement. Tu peux relancer
l'import a tout moment pour mettre a jour les prix/stocks sans dupliquer les produits.

## Gerer le site au quotidien

Tout se passe dans `/admin`, sans toucher au code :
- Ajouter / modifier / supprimer un produit (photo, prix, description, stock, visible ou brouillon)
- Voir les dernieres commandes et le total encaisse
- Importer ou re-importer le catalogue Shopify

## Mettre le site en ligne

Ce projet est un serveur Node.js classique (Express + SQLite), il peut etre deploye sur
n'importe quel hebergeur qui supporte Node (Render, Railway, Fly.io, un VPS...). Il te faudra :
- Definir les variables d'environnement de `.env` sur l'hebergeur choisi
- Pointer ton nom de domaine popstrap vers l'hebergeur
- Passer `PAYPAL_MODE=live` avec de vraies cles une fois pret a encaisser

## Stack technique

- Node.js + Express (serveur), EJS (pages), SQLite via better-sqlite3 (catalogue + commandes)
- Pas de dependance a un service tiers payant : SQLite est un simple fichier, aucun abonnement
- PayPal Orders API + Stripe Checkout pour le paiement, prix toujours revalides cote serveur
