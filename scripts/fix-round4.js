// Fix: 3-way mixup in Oyster real photos.
// 25-26 (was Orenji Hachi) -> Blaue Acht
// 31 (was Lan Ba) -> Orenji Hachi
// 34-35 (was Blaue Acht) -> Lan Ba
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
  await setGallery("bracelet-oyster-blaue-acht", [
    "/img/colors/oyster-blaue-acht.jpg",
    "/img/real/oyster-blaue-acht-a.jpg",
    "/img/real/oyster-blaue-acht-b.jpg",
  ]);
  await setGallery("bracelet-oyster-orenji-hachi", [
    "/img/colors/oyster-orenji-hachi.jpg",
    "/img/real/oyster-orenji-hachi-a.jpg",
  ]);
  await setGallery("bracelet-oyster-lan-ba", [
    "/img/colors/oyster-lan-ba.jpg",
    "/img/real/oyster-lan-ba-a.jpg",
    "/img/real/oyster-lan-ba-b.jpg",
  ]);
}

run().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
