// Fix: photos 3-4 (medium blue, bicolor accents) are Lan Ba ceramique,
// not Light Blue. Move them off Light Blue's gallery and onto Lan Ba's.
const { supabase } = require("../lib/db");

async function setGallery(handle, images) {
  const { data: product, error } = await supabase.from("products").select("id, gallery").eq("handle", handle).maybeSingle();
  if (error) throw error;
  if (!product) throw new Error(`Product not found: ${handle}`);
  const { error: updateError } = await supabase.from("products").update({ gallery: images }).eq("id", product.id);
  if (updateError) throw updateError;
  console.log(`OK: ${handle} -> ${JSON.stringify(images)}`);
}

async function run() {
  await setGallery("bracelet-ceramique-light-blue", [
    "/img/colors/ceramique-light-blue.jpg",
    "/img/real/light-blue-a.jpg",
    "/img/real/light-blue-b.jpg",
  ]);
  await setGallery("bracelet-ceramique-lan-ba", [
    "/img/colors/ceramique-lan-ba.jpg",
    "/img/real/lan-ba-a.jpg",
    "/img/real/lan-ba-b.jpg",
  ]);
}

run().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
