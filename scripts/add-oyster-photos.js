// Append real photos to the remaining 6 Oyster products (Green Eight was
// already handled in fix-round2.js).
const { supabase } = require("../lib/db");

const ADDITIONS = {
  "bracelet-oyster-ocho-negro": ["/img/real/oyster-ocho-negro-a.jpg", "/img/real/oyster-ocho-negro-b.jpg"],
  "bracelet-oyster-orenji-hachi": ["/img/real/oyster-orenji-hachi-a.jpg", "/img/real/oyster-orenji-hachi-b.jpg"],
  "bracelet-oyster-huit-blanc": ["/img/real/oyster-huit-blanc-a.jpg", "/img/real/oyster-huit-blanc-b.jpg"],
  "bracelet-oyster-otto-rosso": ["/img/real/oyster-otto-rosso-a.jpg", "/img/real/oyster-otto-rosso-b.jpg"],
  "bracelet-oyster-lan-ba": ["/img/real/oyster-lan-ba-a.jpg"],
  "bracelet-oyster-otg-roz-rose": ["/img/real/oyster-otg-roz-rose-a.jpg", "/img/real/oyster-otg-roz-rose-b.jpg"],
  "bracelet-oyster-blaue-acht": ["/img/real/oyster-blaue-acht-a.jpg", "/img/real/oyster-blaue-acht-b.jpg"],
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
