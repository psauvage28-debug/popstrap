// Fix: the real photos I added were the "Light Blue" colorway, not "Lan Ba".
// Move them off bracelet-ceramique-lan-ba (back to just its studio photo)
// and onto bracelet-ceramique-light-blue.
const { supabase } = require("../lib/db");

const OLD_IMAGES = [
  "/img/real/lan-ba-a.jpg",
  "/img/real/lan-ba-b.jpg",
  "/img/real/lan-ba-c.jpg",
  "/img/real/lan-ba-d.jpg",
];
const NEW_IMAGES = [
  "/img/real/light-blue-a.jpg",
  "/img/real/light-blue-b.jpg",
  "/img/real/light-blue-c.jpg",
  "/img/real/light-blue-d.jpg",
];

async function run() {
  const { data: lanBa, error: e1 } = await supabase
    .from("products")
    .select("id, gallery")
    .eq("handle", "bracelet-ceramique-lan-ba")
    .maybeSingle();
  if (e1) throw e1;
  const cleanedGallery = (lanBa.gallery || []).filter((img) => !OLD_IMAGES.includes(img));
  const { error: e2 } = await supabase.from("products").update({ gallery: cleanedGallery }).eq("id", lanBa.id);
  if (e2) throw e2;
  console.log(`lan-ba gallery now: ${JSON.stringify(cleanedGallery)}`);

  const { data: lightBlue, error: e3 } = await supabase
    .from("products")
    .select("id, gallery")
    .eq("handle", "bracelet-ceramique-light-blue")
    .maybeSingle();
  if (e3) throw e3;
  if (!lightBlue) throw new Error("bracelet-ceramique-light-blue not found");
  const newGallery = [...(lightBlue.gallery || []), ...NEW_IMAGES];
  const { error: e4 } = await supabase.from("products").update({ gallery: newGallery }).eq("id", lightBlue.id);
  if (e4) throw e4;
  console.log(`light-blue gallery now: ${JSON.stringify(newGallery)}`);
}

run().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
