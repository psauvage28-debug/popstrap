// Round 2 fix:
// - 9-10 real photos were wrongly on Blaue Acht -> move to Orenji Hachi (ceramique)
// - 15-16 real photos are the true Blaue Acht (ceramique)
// - 21-22 real photos are Green Eight, Oyster collection
const { supabase } = require("../lib/db");

async function setGallery(handle, images) {
  const { data: product, error } = await supabase.from("products").select("id, gallery").eq("handle", handle).maybeSingle();
  if (error) throw error;
  if (!product) throw new Error(`Product not found: ${handle}`);
  const gallery = [...images];
  const { error: updateError } = await supabase.from("products").update({ gallery }).eq("id", product.id);
  if (updateError) throw updateError;
  console.log(`OK: ${handle} -> ${JSON.stringify(gallery)}`);
}

async function appendGallery(handle, newImages) {
  const { data: product, error } = await supabase.from("products").select("id, gallery").eq("handle", handle).maybeSingle();
  if (error) throw error;
  if (!product) throw new Error(`Product not found: ${handle}`);
  const gallery = [...(product.gallery || []), ...newImages];
  const { error: updateError } = await supabase.from("products").update({ gallery }).eq("id", product.id);
  if (updateError) throw updateError;
  console.log(`OK: ${handle} -> ${JSON.stringify(gallery)}`);
}

async function run() {
  // Blaue Acht (ceramique): reset to studio photo + the true 15-16 photos
  await setGallery("bracelet-ceramique-blaue-acht", [
    "/img/colors/ceramique-blaue-acht.jpg",
    "/img/real/blaue-acht-a.jpg",
    "/img/real/blaue-acht-b.jpg",
  ]);

  // Orenji Hachi (ceramique): append the 9-10 photos (renamed)
  await appendGallery("bracelet-ceramique-orenji-hachi", [
    "/img/real/orenji-hachi-a.jpg",
    "/img/real/orenji-hachi-b.jpg",
  ]);

  // Green Eight (Oyster): append the 21-22 photos
  await appendGallery("bracelet-oyster-green-eight", [
    "/img/real/oyster-green-eight-a.jpg",
    "/img/real/oyster-green-eight-b.jpg",
  ]);
}

run().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
