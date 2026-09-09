# Popstrap — site e-commerce auto-gere

Site pour la marque Popstrap : boutique publique + panneau d'administration + paiement PayPal et carte bancaire (Stripe).

## Demarrage rapide

```bash
npm install
cp .env.example .env
```

Puis remplis `SUPABASE_URL` et `SUPABASE_SECRET_KEY` dans `.env` (voir `supabase-schema.sql` pour
creer les tables une seule fois dans Supabase, section SQL Editor), et enfin :

```bash
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

Deploiement prevu sur **Render** (plan gratuit) via le fichier `render.yaml` fourni (Blueprint) :
1. Cree un compte sur https://dashboard.render.com (gratuit, "Sign up with GitHub" recommande)
2. New -> Blueprint -> selectionne ce depot -> Apply
3. Renseigne les variables demandees (SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_USERNAME,
   ADMIN_PASSWORD, STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, SITE_URL)
4. Une fois en ligne, pointe ton nom de domaine vers l'URL Render (voir DNS de ton domaine)

## Stack technique

- Node.js + Express (serveur), EJS (pages)
- Supabase (Postgres + stockage photos) pour le catalogue, les commandes et les images uploadees
  depuis l'admin -- gratuit, et les donnees survivent aux redemarrages/redeploiements du serveur
- PayPal Orders API + Stripe Checkout pour le paiement, prix toujours revalides cote serveur
