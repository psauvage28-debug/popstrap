const express = require("express");
const { supabase } = require("../lib/db");
const paypal = require("../lib/paypal");

const router = express.Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return require("stripe")(process.env.STRIPE_SECRET_KEY);
}

// Recalcule le panier cote serveur a partir de la base (jamais confiance dans les prix envoyes par le client).
async function priceCart(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Panier vide");
  }

  const ids = items.map((i) => i.id).filter((id) => id !== undefined && id !== null);
  const { data: products, error } = await supabase.from("products").select("*").in("id", ids).eq("status", "active");
  if (error) throw error;
  const productsById = new Map((products || []).map((p) => [p.id, p]));

  let totalCents = 0;
  let currency = "EUR";
  const lines = [];

  for (const item of items) {
    const qty = Math.max(1, Math.min(50, parseInt(item.qty, 10) || 1));
    const product = productsById.get(item.id);
    if (!product) continue;
    currency = product.currency || currency;
    totalCents += product.price_cents * qty;
    lines.push({
      id: product.id,
      title: product.title,
      qty,
      price_cents: product.price_cents,
    });
  }

  if (lines.length === 0) throw new Error("Panier vide");
  return { totalCents, currency, lines };
}

router.get("/", (req, res) => {
  const config = {
    paypalClientId: process.env.PAYPAL_CLIENT_ID || "",
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  };
  res.render("checkout", { config });
});

router.post("/paypal/create-order", async (req, res) => {
  try {
    const { totalCents, currency } = await priceCart(req.body.items);
    const order = await paypal.createOrder(totalCents / 100, currency);
    res.json({ id: order.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/paypal/capture-order", async (req, res) => {
  try {
    const { orderID, items } = req.body;
    const { totalCents, currency, lines } = await priceCart(items);
    const capture = await paypal.captureOrder(orderID);
    const shipping = capture?.purchase_units?.[0]?.shipping || null;

    const { error } = await supabase.from("orders").insert({
      provider: "paypal",
      provider_ref: orderID,
      customer_email: capture?.payer?.email_address || null,
      total_cents: totalCents,
      currency,
      status: "paid",
      items_json: lines,
      shipping_address: shipping
        ? {
            name: shipping.name?.full_name || null,
            line1: shipping.address?.address_line_1 || null,
            line2: shipping.address?.address_line_2 || null,
            postal_code: shipping.address?.postal_code || null,
            city: shipping.address?.admin_area_2 || null,
            country: shipping.address?.country_code || null,
          }
        : null,
    });
    if (error) throw error;

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/stripe/create-session", async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe n'est pas configure (STRIPE_SECRET_KEY manquant dans .env)");

    const { totalCents, currency, lines } = await priceCart(req.body.items);
    const siteUrl = process.env.SITE_URL || `${req.protocol}://${req.get("host")}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lines.map((l) => ({
        price_data: {
          currency: currency.toLowerCase(),
          product_data: { name: l.title },
          unit_amount: l.price_cents,
        },
        quantity: l.qty,
      })),
      // Indispensable pour un produit physique : sans ca, Stripe encaisse mais on n'a aucune adresse ou livrer.
      // A elargir si Popstrap livre au-dela de la France metropolitaine (voir /livraison-retours).
      shipping_address_collection: { allowed_countries: ["FR"] },
      phone_number_collection: { enabled: true },
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/panier`,
    });

    const { error } = await supabase.from("orders").insert({
      provider: "stripe",
      provider_ref: session.id,
      total_cents: totalCents,
      currency,
      status: "pending",
      items_json: lines,
    });
    if (error) throw error;

    res.json({ url: session.url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Marque une commande Stripe comme payee et enregistre l'adresse de livraison.
// Idempotent : appele a la fois par la redirection client (/success) et par le
// webhook Stripe (source de verite -- fonctionne meme si le client ferme l'onglet).
async function markStripeSessionPaid(session) {
  if (session.payment_status !== "paid") return;

  const shippingDetails = session.shipping_details || session.customer_details;
  const address = shippingDetails?.address;

  await supabase
    .from("orders")
    .update({
      status: "paid",
      customer_email: session.customer_details?.email || null,
      shipping_address: address
        ? {
            name: shippingDetails.name || null,
            line1: address.line1 || null,
            line2: address.line2 || null,
            postal_code: address.postal_code || null,
            city: address.city || null,
            country: address.country || null,
            phone: session.customer_details?.phone || null,
          }
        : null,
    })
    .eq("provider_ref", session.id);
}

router.get("/success", async (req, res) => {
  try {
    const stripe = getStripe();
    const sessionId = req.query.session_id;
    if (stripe && sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      await markStripeSessionPaid(session);
    }
  } catch (err) {
    // On affiche quand meme la page de succes ; l'echec est rattrape par le webhook Stripe.
    console.error("Erreur verification Stripe (redirection client):", err.message);
  }
  res.render("checkout-success");
});

// Webhook Stripe : monte AVANT express.json() dans server.js (signature verifiee sur le corps brut).
async function stripeWebhookHandler(req, res) {
  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send("Webhook non configure");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Signature webhook Stripe invalide:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      // La session du webhook contient deja shipping_details, mais on la recharge pour etre certain d'avoir payment_status a jour.
      const fullSession = await stripe.checkout.sessions.retrieve(session.id);
      await markStripeSessionPaid(fullSession);
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Erreur traitement webhook Stripe:", err.message);
    res.status(500).send("Erreur serveur");
  }
}

module.exports = router;
module.exports.stripeWebhookHandler = stripeWebhookHandler;
