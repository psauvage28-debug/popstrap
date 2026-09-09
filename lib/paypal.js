const BASE_URL =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal n'est pas configure (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET manquants dans .env)");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const resp = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!resp.ok) throw new Error("Impossible d'obtenir un token PayPal");
  const data = await resp.json();
  return data.access_token;
}

async function createOrder(totalAmount, currency) {
  const accessToken = await getAccessToken();
  const resp = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: totalAmount.toFixed(2),
          },
        },
      ],
    }),
  });

  if (!resp.ok) throw new Error("Impossible de creer la commande PayPal");
  return resp.json();
}

async function captureOrder(orderId) {
  const accessToken = await getAccessToken();
  const resp = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!resp.ok) throw new Error("Impossible de capturer le paiement PayPal");
  return resp.json();
}

module.exports = { createOrder, captureOrder };
