const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// DATA_DIR permet de pointer la base vers un disque persistant en production
// (ex: Render). En local, sans DATA_DIR defini, tout reste dans ./db comme avant.
const dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "db");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "popstrap.sqlite3");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    handle TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    price_cents INTEGER NOT NULL DEFAULT 0,
    compare_at_price_cents INTEGER,
    currency TEXT NOT NULL DEFAULT 'EUR',
    image_url TEXT DEFAULT '',
    gallery TEXT DEFAULT '[]',
    colors TEXT DEFAULT '[]',
    stock INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    provider_ref TEXT,
    customer_email TEXT,
    total_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    status TEXT NOT NULL DEFAULT 'pending',
    items_json TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Migration douce pour les bases creees avant l'ajout des colonnes gallery/colors.
const existingColumns = db.prepare("PRAGMA table_info(products)").all().map((c) => c.name);
if (!existingColumns.includes("gallery")) {
  db.exec("ALTER TABLE products ADD COLUMN gallery TEXT DEFAULT '[]'");
}
if (!existingColumns.includes("colors")) {
  db.exec("ALTER TABLE products ADD COLUMN colors TEXT DEFAULT '[]'");
}

function seedIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
  if (count > 0) return;

  const { CERAMIQUE_COLORS, OYSTER_COLORS } = require("./popstrapColors");

  const insert = db.prepare(`
    INSERT INTO products (handle, title, description, price_cents, compare_at_price_cents, image_url, gallery, colors, stock, status)
    VALUES (@handle, @title, @description, @price_cents, @compare_at_price_cents, @image_url, @gallery, @colors, @stock, @status)
  `);

  const samples = [
    {
      handle: "bracelet-ceramique-royal-pop",
      title: "Bracelet Biocéramique Royal POP",
      description: "Le mariage de la haute horlogerie et du design contemporain. Biocéramique premium — la matière des plus grandes maisons horlogères. Légère, hypoallergénique, résistante aux rayures. Sa surface mate absorbe la lumière avec une élégance qui ne cherche pas à se montrer. Compatible Royal Pop, pensé pour respecter l'ADN de votre montre tout en lui offrant une seconde vie au poignet. Échange sans outil. Cinq secondes. Pas une de plus.",
      price_cents: 7999,
      compare_at_price_cents: null,
      image_url: CERAMIQUE_COLORS[0].image,
      gallery: JSON.stringify(CERAMIQUE_COLORS.map((c) => c.image)),
      colors: JSON.stringify(CERAMIQUE_COLORS),
      stock: 999,
      status: "active",
    },
    {
      handle: "bracelet-caouchouc-rosso",
      title: "Bracelet Oyster Royal POP",
      description: "Conçue pour ceux qui ne s'arrêtent jamais. Caoutchouc premium texturé. Souple, waterproof, résistant aux chocs. Un maintien parfait au poignet, une légèreté qu'on oublie vite de porter. Compatible Royal Pop, le POPSTRAP donne à votre montre un caractère sport et urbain — en salle, en ville, en week-end. Il ne vous lâche pas. Vous non plus.",
      price_cents: 5999,
      compare_at_price_cents: null,
      image_url: OYSTER_COLORS[0].image,
      gallery: JSON.stringify(OYSTER_COLORS.map((c) => c.image)),
      colors: JSON.stringify(OYSTER_COLORS),
      stock: 999,
      status: "active",
    },
  ];

  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });
  insertMany(samples);
}

seedIfEmpty();

module.exports = db;
