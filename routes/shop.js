const express = require("express");
const { supabase } = require("../lib/db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.render("home", { products });
  } catch (err) {
    next(err);
  }
});

router.get("/produit/:handle", async (req, res, next) => {
  try {
    const { data: product, error } = await supabase
      .from("products")
      .select("*")
      .eq("handle", req.params.handle)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    if (!product) return res.status(404).render("404", { brand: req.app.locals.brand });

    const { data: others, error: othersError } = await supabase
      .from("products")
      .select("*")
      .eq("status", "active")
      .neq("id", product.id)
      .limit(3);
    if (othersError) throw othersError;

    res.render("product", { product, others: others || [] });
  } catch (err) {
    next(err);
  }
});

router.get("/panier", (req, res) => {
  res.render("cart");
});

module.exports = router;
