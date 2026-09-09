const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const session = require("express-session");

const { seedIfEmpty } = require("./lib/db");
const shopRoutes = require("./routes/shop");
const adminRoutes = require("./routes/admin");
const checkoutRoutes = require("./routes/checkout");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    // Store en memoire : largement suffisant pour une session admin unique.
    // Un redemarrage du serveur deconnecte l'admin (pas grave, il suffit de se reconnecter).
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8, // 8h
      sameSite: "lax",
    },
  })
);

app.locals.brand = {
  name: "Popstrap",
  tagline: "Bracelets Royal Pop, changes en 5 secondes.",
};

app.use("/", shopRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).render("404", { brand: app.locals.brand });
});

seedIfEmpty()
  .catch((err) => console.error("Erreur d'amorcage des donnees:", err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Popstrap tourne sur http://localhost:${PORT}`);
    });
  });
