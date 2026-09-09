const { parse } = require("csv-parse/sync");

function centsFromPrice(value) {
  const n = parseFloat(String(value).replace(",", "."));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

// Parse un export produits Shopify (Admin > Produits > Exporter > CSV pour Excel, Numbers, ou autres tableurs).
// Un produit Shopify peut occuper plusieurs lignes (une par variante) : on regroupe par "Handle"
// et on ne garde que la premiere variante de chaque produit pour rester simple.
function parseShopifyCsv(csvText) {
  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  // Les exports Shopify recents n'incluent plus toujours "Variant Inventory Qty"
  // (l'inventaire multi-entrepot vit ailleurs). Si la colonne est absente du fichier,
  // impossible de savoir le vrai stock : on ne met pas 0 (ce qui afficherait "rupture
  // de stock" a tort), on part d'un stock par defaut a ajuster ensuite dans l'admin.
  const hasInventoryColumn = rows.length > 0 && "Variant Inventory Qty" in rows[0];
  const DEFAULT_STOCK_WHEN_UNKNOWN = 999;

  const byHandle = new Map();

  for (const row of rows) {
    const handle = (row["Handle"] || "").trim();
    if (!handle) continue;

    if (!byHandle.has(handle)) {
      byHandle.set(handle, {
        handle,
        title: row["Title"] || handle,
        description: stripHtml(row["Body (HTML)"] || ""),
        price_cents: 0,
        compare_at_price_cents: null,
        image_url: "",
        stock: hasInventoryColumn ? 0 : DEFAULT_STOCK_WHEN_UNKNOWN,
        status: (row["Status"] || "active").toLowerCase() === "active" ? "active" : "draft",
      });
    }

    const product = byHandle.get(handle);

    if (row["Variant Price"] && !product.price_cents) {
      product.price_cents = centsFromPrice(row["Variant Price"]);
    }
    if (row["Variant Compare At Price"] && !product.compare_at_price_cents) {
      const c = centsFromPrice(row["Variant Compare At Price"]);
      if (c > 0) product.compare_at_price_cents = c;
    }
    if (row["Variant Inventory Qty"]) {
      const qty = parseInt(row["Variant Inventory Qty"], 10);
      if (!Number.isNaN(qty)) product.stock += qty;
    }
    if (row["Image Src"] && !product.image_url) {
      product.image_url = row["Image Src"].trim();
    }
  }

  return Array.from(byHandle.values()).filter((p) => p.title);
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

module.exports = { parseShopifyCsv };
