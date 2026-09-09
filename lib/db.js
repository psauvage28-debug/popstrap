const { createClient } = require("@supabase/supabase-js");
const { CERAMIQUE_COLORS, OYSTER_COLORS } = require("./popstrapColors");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  throw new Error(
    "SUPABASE_URL / SUPABASE_SECRET_KEY manquants dans .env -- voir supabase-schema.sql et le README pour la configuration."
  );
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

async function seedIfEmpty() {
  const { count, error } = await supabase.from("products").select("*", { count: "exact", head: true });
  if (error) throw error;
  if (count > 0) return;

  const samples = [
    {
      handle: "bracelet-ceramique-royal-pop",
      title: "Bracelet Biocéramique Royal POP",
      description:
        "Le mariage de la haute horlogerie et du design contemporain. Biocéramique premium — la matière des plus grandes maisons horlogères. Légère, hypoallergénique, résistante aux rayures. Sa surface mate absorbe la lumière avec une élégance qui ne cherche pas à se montrer. Compatible Royal Pop, pensé pour respecter l'ADN de votre montre tout en lui offrant une seconde vie au poignet.",
      price_cents: 7999,
      compare_at_price_cents: null,
      image_url: CERAMIQUE_COLORS[0].image,
      gallery: CERAMIQUE_COLORS.map((c) => c.image),
      colors: CERAMIQUE_COLORS,
      stock: 999,
      status: "active",
    },
    {
      handle: "bracelet-caouchouc-rosso",
      title: "Bracelet Oyster Royal POP",
      description:
        "Conçue pour ceux qui ne s'arrêtent jamais. Caoutchouc premium texturé. Souple, waterproof, résistant aux chocs. Un maintien parfait au poignet, une légèreté qu'on oublie vite de porter. Compatible Royal Pop, le POPSTRAP donne à votre montre un caractère sport et urbain — en salle, en ville, en week-end.",
      price_cents: 5999,
      compare_at_price_cents: null,
      image_url: OYSTER_COLORS[0].image,
      gallery: OYSTER_COLORS.map((c) => c.image),
      colors: OYSTER_COLORS,
      stock: 999,
      status: "active",
    },
  ];

  const { error: insertError } = await supabase.from("products").insert(samples);
  if (insertError) throw insertError;
}

module.exports = { supabase, seedIfEmpty };
