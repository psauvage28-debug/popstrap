// Script ponctuel : applique les vraies photos/couleurs Popstrap aux produits deja importes.
// Chaque coloris a sa propre photo (voir lib/popstrapColors.js) ; la galerie = toutes les photos
// couleur dans l'ordre, l'image principale = la premiere couleur (Huit Blanc).
// Usage : node scripts/apply-brand-content.js
const db = require("../lib/db");
const { CERAMIQUE_COLORS, OYSTER_COLORS } = require("../lib/popstrapColors");

const updates = [
  {
    handle: "bracelet-ceramique-royal-pop",
    colors: CERAMIQUE_COLORS,
  },
  {
    handle: "bracelet-caouchouc-rosso",
    colors: OYSTER_COLORS,
  },
];

const stmt = db.prepare(
  "UPDATE products SET image_url = ?, gallery = ?, colors = ?, updated_at = CURRENT_TIMESTAMP WHERE handle = ?"
);

for (const u of updates) {
  const gallery = u.colors.map((c) => c.image);
  const info = stmt.run(u.colors[0].image, JSON.stringify(gallery), JSON.stringify(u.colors), u.handle);
  console.log(u.handle, "->", info.changes, "ligne(s) mise(s) a jour");
}
