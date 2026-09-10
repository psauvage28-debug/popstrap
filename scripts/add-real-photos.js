// One-off script: append real customer-style photos to the gallery of the
// 8 ceramique products confirmed with the user so far.
const { supabase } = require("../lib/db");

const ADDITIONS = {
  "bracelet-ceramique-lan-ba": ["/img/real/lan-ba-a.jpg", "/img/real/lan-ba-b.jpg", "/img/real/lan-ba-c.jpg", "/img/real/lan-ba-d.jpg"],
  "bracelet-ceramique-otg-roz-jaune": ["/img/real/otg-roz-jaune-a.jpg", "/img/real/otg-roz-jaune-b.jpg"],
  "bracelet-ceramique-otg-roz-rose": ["/img/real/otg-roz-rose-a.jpg", "/img/real/otg-roz-rose-b.jpg"],
  "bracelet-ceramique-blaue-acht": ["/img/real/blaue-acht-a.jpg", "/img/real/blaue-acht-b.jpg"],
  "bracelet-ceramique-otto-rosso": ["/img/real/otto-rosso-a.jpg", "/img/real/otto-rosso-b.jpg"],
  "bracelet-ceramique-huit-blanc": ["/img/real/huit-blanc-a.jpg", "/img/real/huit-blanc-b.jpg"],
  "bracelet-ceramique-ocho-negro": ["/img/real/ocho-negro-a.jpg", "/img/real/ocho-negro-b.jpg"],
  "bracelet-ceramique-green-eight": ["/img/real/green-eight-a.jpg", "/img/real/green-eight-b.jpg"],
};

async function run() {
  for (const [handle, newImages] of Object.entries(ADDITIONS)) {
    const { data: product, error } = await supabase.from("products").select("id, gallery").eq("handle", handle).maybeSingle();
    if (error) throw error;
    if (!product) {
      console.log(`SKIP (not found): ${handle}`);
      continue;
    }
    const gallery = [...(product.gallery || []), ...newImages];
    const { error: updateError } = await supabase.from("products").update({ gallery }).eq("id", product.id);
    if (updateError) throw updateError;
    console.log(`OK: ${handle} -> ${gallery.length} images`);
  }
}

run().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
