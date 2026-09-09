const express = require("express");
const db = require("../lib/db");

const router = express.Router();

router.get("/", (req, res) => {
  const products = db
    .prepare("SELECT * FROM products WHERE status = 'active' ORDER BY created_at DESC")
    .all();
  res.render("home", { products });
});

router.get("/produit/:handle", (req, res) => {
  const product = db
    .prepare("SELECT * FROM products WHERE handle = ? AND status = 'active'")
    .get(req.params.handle);
  if (!product) return res.status(404).render("404", { brand: req.app.locals.brand });

  const others = db
    .prepare("SELECT * FROM products WHERE status = 'active' AND id != ? ORDER BY RANDOM() LIMIT 3")
    .all(product.id);

  res.render("product", { product, others });
});

router.get("/panier", (req, res) => {
  res.render("cart");
});

module.exports = router;
