const express = require("express");
const multer = require("multer");
const { supabase } = require("../lib/db");
const { requireAdmin } = require("../lib/authMiddleware");
const { parseShopifyCsv } = require("../lib/shopifyImport");

const router = express.Router();

const STORAGE_BUCKET = "product-images";

// Les photos uploadees dans l'admin partent en memoire puis sont envoyees vers le
// stockage Supabase (survit aux redeploiements, contrairement au disque du serveur).
const imageUpload = multer({
  storage: multer.memoryStorage(),
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

router.get("/", async (req, res, next) => {
  try {
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (productsError) throw productsError;

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (ordersError) throw ordersError;

    const { data: paidOrders, error: paidError } = await supabase
      .from("orders")
      .select("total_cents")
      .eq("status", "paid");
    if (paidError) throw paidError;
    const revenueCents = (paidOrders || []).reduce((sum, o) => sum + o.total_cents, 0);

    res.render("admin/dashboard", { products: products || [], orders: orders || [], revenueCents });
  } catch (err) {
    next(err);
  }
});

router.get("/produits/nouveau", (req, res) => {
  res.render("admin/product-form", { product: null, error: null });
});

router.get("/produits/:id/modifier", async (req, res, next) => {
  try {
    const { data: product, error } = await supabase.from("products").select("*").eq("id", req.params.id).maybeSingle();
    if (error) throw error;
    if (!product) return res.redirect("/admin");
    product.colors_text = colorsToText(product.colors || []);
    product.gallery_text = (product.gallery || []).join("\n");
    res.render("admin/product-form", { product, error: null });
  } catch (err) {
    next(err);
  }
});

router.post("/produits/nouveau", imageUpload.single("image_file"), (req, res, next) => {
  saveProduct(req, res, next, null);
});

router.post("/produits/:id/modifier", imageUpload.single("image_file"), (req, res, next) => {
  saveProduct(req, res, next, req.params.id);
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

async function uploadProductImage(file) {
  const ext = file.originalname.split(".").pop().toLowerCase();
  const filename = `product-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(filename, file.buffer, {
    contentType: file.mimetype,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

async function saveProduct(req, res, next, id) {
  try {
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

    const finalImage = req.file ? await uploadProductImage(req.file) : image_url || "";
    const priceCents = Math.round(parseFloat(String(price).replace(",", ".")) * 100);
    const compareCents = compare_at_price ? Math.round(parseFloat(String(compare_at_price).replace(",", ".")) * 100) : null;
    const colors = parseColorsText(colors_text);
    const gallery = parseGalleryText(gallery_text);

    const row = {
      title,
      description: description || "",
      price_cents: priceCents,
      compare_at_price_cents: compareCents,
      image_url: finalImage,
      colors,
      gallery,
      stock: parseInt(stock, 10) || 0,
      status: status || "active",
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { error } = await supabase.from("products").update(row).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("products").insert({ ...row, handle: `${handle}-${Date.now().toString(36)}` });
      if (error) throw error;
    }

    res.redirect("/admin");
  } catch (err) {
    next(err);
  }
}

router.post("/produits/:id/supprimer", async (req, res, next) => {
  try {
    const { error } = await supabase.from("products").delete().eq("id", req.params.id);
    if (error) throw error;
    res.redirect("/admin");
  } catch (err) {
    next(err);
  }
});

router.get("/import", (req, res) => {
  res.render("admin/import", { result: null, error: null });
});

router.post("/import", csvUpload.single("csv_file"), async (req, res) => {
  try {
    if (!req.file) throw new Error("Choisis un fichier CSV a importer.");
    const csvText = req.file.buffer.toString("utf-8");
    const products = parseShopifyCsv(csvText);

    const { error } = await supabase.from("products").upsert(products, { onConflict: "handle" });
    if (error) throw error;

    res.render("admin/import", { result: { count: products.length }, error: null });
  } catch (err) {
    res.render("admin/import", { result: null, error: err.message });
  }
});

module.exports = router;
