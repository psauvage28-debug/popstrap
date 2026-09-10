// Restructure le catalogue : remplace les 2 produits "combo" (avec nuancier interne)
// par 18 produits individuels (un par coloris), ranges dans deux catalogues
// ("ceramique" / "oyster"). Usage : node scripts/create-collections.js
require("dotenv").config();
const { supabase } = require("../lib/db");
const { CERAMIQUE_COLORS, OYSTER_COLORS } = require("../lib/popstrapColors");

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const CERAMIQUE_DESC =
  "Le mariage de la haute horlogerie et du design contemporain. Biocéramique premium — la matière des plus grandes maisons horlogères. Légère, hypoallergénique, résistante aux rayures. Sa surface mate absorbe la lumière avec une élégance qui ne cherche pas à se montrer. Compatible Royal Pop, pensé pour respecter l'ADN de votre montre tout en lui offrant une seconde vie au poignet.";

const OYSTER_DESC =
  "Conçue pour ceux qui ne s'arrêtent jamais. Caoutchouc premium texturé. Souple, waterproof, résistant aux chocs. Un maintien parfait au poignet, une légèreté qu'on oublie vite de porter. Compatible Royal Pop, le POPSTRAP donne à votre montre un caractère sport et urbain — en salle, en ville, en week-end.";

function buildProducts(colors, { collection, titleBase, priceCents, baseDesc, handlePrefix }) {
  return colors.map((c) => ({
    handle: `${handlePrefix}-${slugify(c.name)}`,
    title: `${titleBase} — ${c.name}`,
    description: `${c.flavor}\n\n${baseDesc}`,
    price_cents: priceCents,
    compare_at_price_cents: null,
    image_url: c.image,
    gallery: [c.image],
    colors: [c],
    collection,
    stock: 999,
    status: "active",
  }));
}

async function run() {
  const ceramiqueProducts = buildProducts(CERAMIQUE_COLORS, {
    collection: "ceramique",
    titleBase: "Bracelet Biocéramique Royal POP",
    priceCents: 7999,
    baseDesc: CERAMIQUE_DESC,
    handlePrefix: "bracelet-ceramique",
  });

  const oysterProducts = buildProducts(OYSTER_COLORS, {
    collection: "oyster",
    titleBase: "Bracelet Oyster Royal POP",
    priceCents: 5999,
    baseDesc: OYSTER_DESC,
    handlePrefix: "bracelet-oyster",
  });

  const allProducts = [...ceramiqueProducts, ...oysterProducts];

  // Supprime les 2 anciens produits "combo" s'ils existent encore.
  const { error: delError } = await supabase
    .from("products")
    .delete()
    .in("handle", ["bracelet-ceramique-royal-pop", "bracelet-caouchouc-rosso"]);
  if (delError) console.warn("Suppression anciens produits:", delError.message);

  const { data, error } = await supabase.from("products").upsert(allProducts, { onConflict: "handle" }).select("id, handle");
  if (error) throw error;

  console.log(`${data.length} produits crees/mis a jour :`);
  data.forEach((p) => console.log(" -", p.handle));
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("ERREUR:", err.message);
    process.exit(1);
  });
