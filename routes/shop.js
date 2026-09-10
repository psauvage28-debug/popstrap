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

    // Vitrine : un apercu (pas tout le catalogue) -- le catalogue complet vit sur /collections.
    const all = products || [];
    const ceramique = all.filter((p) => p.collection === "ceramique");
    const oyster = all.filter((p) => p.collection === "oyster");
    const featured = [...ceramique.slice(0, 4), ...oyster.slice(0, 4)];

    res.render("home", { products: all, featured, ceramique, oyster });
  } catch (err) {
    next(err);
  }
});

router.get("/collections", async (req, res, next) => {
  try {
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "active")
      .order("title", { ascending: true });
    if (error) throw error;

    const all = products || [];
    res.render("collections", {
      ceramique: all.filter((p) => p.collection === "ceramique"),
      oyster: all.filter((p) => p.collection === "oyster"),
      autres: all.filter((p) => p.collection !== "ceramique" && p.collection !== "oyster"),
    });
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

    let othersQuery = supabase.from("products").select("*").eq("status", "active").neq("id", product.id);
    othersQuery = product.collection ? othersQuery.eq("collection", product.collection) : othersQuery.limit(3);
    const { data: others, error: othersError } = await othersQuery;
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
