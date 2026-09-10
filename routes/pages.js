const express = require("express");
const { supabase } = require("../lib/db");

const router = express.Router();

router.get("/mentions-legales", (req, res) => res.render("mentions-legales"));
router.get("/cgv", (req, res) => res.render("cgv"));
router.get("/confidentialite", (req, res) => res.render("confidentialite"));
router.get("/livraison-retours", (req, res) => res.render("livraison-retours"));
router.get("/contact", (req, res) => res.render("contact"));

router.get("/sitemap.xml", async (req, res, next) => {
  try {
    const { data: products, error } = await supabase.from("products").select("handle").eq("status", "active");
    if (error) throw error;

    const base = req.app.locals.siteUrl;
    const staticUrls = ["/", "/collections", "/mentions-legales", "/cgv", "/confidentialite", "/livraison-retours", "/contact"];
    const productUrls = (products || []).map((p) => `/produit/${p.handle}`);

    const urls = [...staticUrls, ...productUrls]
      .map((u) => `  <url><loc>${base}${u}</loc></url>`)
      .join("\n");

    res.type("application/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
