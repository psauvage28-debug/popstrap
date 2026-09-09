// Panier stocke cote client (localStorage). Les prix affiches sont indicatifs :
// le serveur revalide toujours le prix reel en base au moment du paiement.
const CART_KEY = "popstrap_cart";

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateCartCount();
}

function addToCart(product, qty) {
  const items = readCart();
  const existing = items.find((i) => i.id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    items.push({
      id: product.id,
      title: product.title,
      price_cents: product.price_cents,
      image_url: product.image_url,
      qty,
    });
  }
  writeCart(items);
}

function removeFromCart(id) {
  writeCart(readCart().filter((i) => i.id !== id));
}

function setQty(id, qty) {
  const items = readCart();
  const item = items.find((i) => i.id === id);
  if (item) {
    item.qty = Math.max(1, qty);
    writeCart(items);
  }
}

function cartTotalCents() {
  return readCart().reduce((sum, i) => sum + i.price_cents * i.qty, 0);
}

function formatPrice(cents) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function updateCartCount() {
  const el = document.getElementById("cart-count");
  if (!el) return;
  const count = readCart().reduce((sum, i) => sum + i.qty, 0);
  el.textContent = count;
}

document.addEventListener("DOMContentLoaded", updateCartCount);
