const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../lib/db");
const { requireAdmin } = require("../lib/authMiddleware");
const { parseShopifyCsv } = require("../lib/shopifyImport");

const router = express.Router();

// Meme logique que lib/db.js : en production (Render), UPLOADS_DIR pointe vers le disque
// persistant pour que les photos ajoutees via l'admin survivent aux redeploiements.
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "..", "public", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `product-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype);
    cb(ok ? null : new Error("Format d'image non supporte"), ok);
  },
});

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/login", (req, res) => {
  res.render("admin/login", { error: null });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }
  res.render("admin/login", { error: "Identifiants incorrects." });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

router.use(requireAdmin);

router.get("/", (req, res) => {
  const products = db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
  const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 20").all();
  const revenueCents = db
    .prepare("SELECT COALESCE(SUM(total_cents),0) AS total FROM orders WHERE status = 'paid'")
    .get().total;
  res.render("admin/dashboard", { products, orders, revenueCents });
});

router.get("/produits/nouveau", (req, res) => {
  res.render("admin/product-form", { product: null, error: null });
});

router.get("/produits/:id/modifier", (req, res) => {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!product) return res.redirect("/admin");
  product.colors_text = colorsToText(JSON.parse(product.colors || "[]"));
  product.gallery_text = JSON.parse(product.gallery || "[]").join("\n");
  res.render("admin/product-form", { product, error: null });
});

router.post("/produits/nouveau", imageUpload.single("image_file"), (req, res) => {
  saveProduct(req, res, null);
});

router.post("/produits/:id/modifier", imageUpload.single("image_file"), (req, res) => {
  saveProduct(req, res, req.params.id);
});

// "Nom|#hexcode|/img/photo.jpg" par ligne (la photo est optionnelle) -> [{name, hex, image}, ...]
function parseColorsText(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, hex, image] = line.split("|").map((s) => (s || "").trim());
      return { name: name || "", hex: hex || "#999999", image: image || "" };
    })
    .filter((c) => c.name);
}

function colorsToText(colors) {
  return (colors || []).map((c) => `${c.name}|${c.hex}${c.image ? "|" + c.image : ""}`).join("\n");
}

// Une URL d'image par ligne -> ["...", "..."]
function parseGalleryText(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function saveProduct(req, res, id) {
  const { title, description, price, compare_at_price, image_url, stock, status, colors_text, gallery_text } = req.body;

  if (!title || !price) {
    return res.render("admin/product-form", {
      product: { id, title, description, price, compare_at_price, image_url, stock, status, colors_text, gallery_text },
      error: "Le nom et le prix sont obligatoires.",
    });
  }

  const handle = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const finalImage = req.file ? `/uploads/${req.file.filename}` : (image_url || "");
  const priceCents = Math.round(parseFloat(String(price).replace(",", ".")) * 100);
  const compareCents = compare_at_price
    ? Math.round(parseFloat(String(compare_at_price).replace(",", ".")) * 100)
    : null;
  const colorsJson = JSON.stringify(parseColorsText(colors_text));
  const galleryJson = JSON.stringify(parseGalleryText(gallery_text));

  if (id) {
    db.prepare(
      `UPDATE products SET title=?, description=?, price_cents=?, compare_at_price_cents=?, image_url=?, colors=?, gallery=?, stock=?, status=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`
    ).run(title, description || "", priceCents, compareCents, finalImage, colorsJson, galleryJson, parseInt(stock, 10) || 0, status || "active", id);
  } else {
    db.prepare(
      `INSERT INTO products (handle, title, description, price_cents, compare_at_price_cents, image_url, colors, gallery, stock, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      `${handle}-${Date.now().toString(36)}`,
      title,
      description || "",
      priceCents,
      compareCents,
      finalImage,
      colorsJson,
      galleryJson,
      parseInt(stock, 10) || 0,
      status || "active"
    );
  }

  res.redirect("/admin");
}

router.post("/produits/:id/supprimer", (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.redirect("/admin");
});

router.get("/import", (req, res) => {
  res.render("admin/import", { result: null, error: null });
});

router.post("/import", csvUpload.single("csv_file"), (req, res) => {
  try {
    if (!req.file) throw new Error("Choisis un fichier CSV a importer.");
    const csvText = req.file.buffer.toString("utf-8");
    const products = parseShopifyCsv(csvText);

    const upsert = db.prepare(`
      INSERT INTO products (handle, title, description, price_cents, compare_at_price_cents, image_url, stock, status)
      VALUES (@handle, @title, @description, @price_cents, @compare_at_price_cents, @image_url, @stock, @status)
      ON CONFLICT(handle) DO UPDATE SET
        title=excluded.title,
        description=excluded.description,
        price_cents=excluded.price_cents,
        compare_at_price_cents=excluded.compare_at_price_cents,
        image_url=excluded.image_url,
        stock=excluded.stock,
        status=excluded.status,
        updated_at=CURRENT_TIMESTAMP
    `);

    const importMany = db.transaction((rows) => {
      for (const p of rows) upsert.run(p);
    });
    importMany(products);

    res.render("admin/import", { result: { count: products.length }, error: null });
  } catch (err) {
    res.render("admin/import", { result: null, error: err.message });
  }
});

module.exports = router;
