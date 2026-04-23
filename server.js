/**
 * SneakerVault — Backend Server
 * MongoDB + Express | Auto-creates "sneakervault" database on startup
 */

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const app = express();
const PORT = 3000;

const MONGO_URI = "mongodb+srv://telfordbett632_db_user:<db_password>@cluster0.qcrjyfe.mongodb.net/sneakervault?retryWrites=true&w=majority";
const DB_NAME = "sneakervault";          // ← This is the database that will be created
const JWT_SECRET = "sneakervault_super_secret_key_2026";

const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,         // reflect request origin — allows file:// and any localhost port
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOADS_DIR));

// Serve static files (index.html, admin.html) from the same folder as server.js
app.use(express.static(path.join(__dirname)));

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// ─── DATABASE CONNECTION ──────────────────────────────────────────────────────
const client = new MongoClient(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
});
let db;

async function connectDB() {
  await client.connect();

  // Using client.db(DB_NAME) CREATES the database in MongoDB the first time
  // data is inserted — MongoDB doesn't create it until the first write.
  db = client.db(DB_NAME);

  console.log(`✅ Connected to MongoDB`);
  console.log(`📦 Database: "${DB_NAME}" (created on first data write)`);

  // Create indexes for performance and uniqueness
  await createIndexes();

  // Seed initial data if collections are empty
  await seedIfEmpty();
}

async function createIndexes() {
  // Users: unique email and username
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex({ username: 1 }, { unique: true });

  // Products: text search index
  await db.collection("products").createIndex(
    { name: "text", brand: "text", description: "text" },
    { name: "product_search" }
  );
  await db.collection("products").createIndex({ category: 1 });
  await db.collection("products").createIndex({ newRelease: 1 });
  await db.collection("products").createIndex({ createdAt: -1 });

  // Orders: by user
  await db.collection("orders").createIndex({ userId: 1 });
  await db.collection("orders").createIndex({ createdAt: -1 });

  console.log("📑 Database indexes created");
}

// ─── SEED DATA ────────────────────────────────────────────────────────────────
async function seedIfEmpty() {
  // ── Always ensure admin account exists, regardless of product seeding ────────
  const adminExists = await db.collection("users").findOne({ role: "admin" });
  if (!adminExists) {
    const hashed = await bcrypt.hash("Admin@1234", 10);
    await db.collection("users").insertOne({
      firstName: "Admin",
      lastName: "User",
      username: "admin",
      email: "admin@sneakervault.com",
      password: hashed,
      role: "admin",
      wishlist: [],
      createdAt: new Date(),
    });
    console.log("✅ Default admin created — username: admin | password: Admin@1234");
    console.log("   ⚠️  Please change the admin password after first login!");
  } else {
    console.log("👤 Admin account already exists — skipping admin seed");
  }

  // ── Seed products only if the collection is empty ────────────────────────────
  const count = await db.collection("products").countDocuments();
  if (count > 0) {
    console.log(`📦 Products collection already has ${count} items — skipping product seed`);
    return;
  }

  console.log("🌱 Seeding initial product data into sneakervault...");

  const products = [
    {
      name: "Air Max 270",
      brand: "Nike",
      price: 150,
      originalPrice: 180,
      category: "men",
      stock: 24,
      sizes: ["7", "8", "9", "10", "11", "12"],
      image: "",
      description:
        "The Nike Air Max 270 delivers visible cushioning under every step. Updated details and the large Air unit make it an everyday essential.",
      newRelease: false,
      createdAt: new Date(),
    },
    {
      name: "Ultraboost 22",
      brand: "Adidas",
      price: 190,
      originalPrice: 190,
      category: "men",
      stock: 18,
      sizes: ["7", "8", "9", "10", "11"],
      image: "",
      description:
        "Experience incredible energy return with every stride. The Ultraboost 22 is built for runners who demand performance and style.",
      newRelease: true,
      createdAt: new Date(),
    },
    {
      name: "Chuck Taylor All Star",
      brand: "Converse",
      price: 65,
      originalPrice: 65,
      category: "unisex",
      stock: 50,
      sizes: ["5", "6", "7", "8", "9", "10", "11", "12"],
      image: "",
      description:
        "The iconic Chuck Taylor All Star has been a cultural staple for decades. Classic canvas upper with the signature rubber sole.",
      newRelease: false,
      createdAt: new Date(),
    },
    {
      name: "990v5",
      brand: "New Balance",
      price: 185,
      originalPrice: 185,
      category: "women",
      stock: 12,
      sizes: ["6", "7", "8", "9", "10"],
      image: "",
      description:
        "Made in USA. The 990v5 combines premium materials with ENCAP midsole technology for exceptional comfort and support.",
      newRelease: true,
      createdAt: new Date(),
    },
    {
      name: "Classic Leather",
      brand: "Reebok",
      price: 80,
      originalPrice: 100,
      category: "women",
      stock: 30,
      sizes: ["5", "6", "7", "8", "9"],
      image: "",
      description:
        "The Reebok Classic Leather is a timeless sneaker with a soft leather upper and die-cut EVA midsole for lightweight cushioning.",
      newRelease: false,
      createdAt: new Date(),
    },
    {
      name: "Dunk Low Retro",
      brand: "Nike",
      price: 110,
      originalPrice: 110,
      category: "unisex",
      stock: 8,
      sizes: ["7", "8", "9", "10", "11", "12"],
      image: "",
      description:
        "Originally designed for the hardwood, the Nike Dunk Low Retro returns with crisp leather and classic colour-blocking.",
      newRelease: true,
      createdAt: new Date(),
    },
    {
      name: "Forum Low",
      brand: "Adidas",
      price: 90,
      originalPrice: 120,
      category: "men",
      stock: 20,
      sizes: ["8", "9", "10", "11", "12"],
      image: "",
      description:
        "The Adidas Forum Low brings back the iconic basketball sneaker from the 80s with bold styling and a modern fit.",
      newRelease: false,
      createdAt: new Date(),
    },
    {
      name: "Gel-Kayano 29",
      brand: "ASICS",
      price: 160,
      originalPrice: 160,
      category: "women",
      stock: 15,
      sizes: ["6", "7", "8", "9", "10"],
      image: "",
      description:
        "The ASICS Gel-Kayano 29 provides exceptional stability and cushioning for long-distance runs and all-day comfort.",
      newRelease: true,
      createdAt: new Date(),
    },
  ];

  const result = await db.collection("products").insertMany(products);
  console.log(`✅ Seeded ${result.insertedCount} products into sneakervault.products`);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function formatProduct(p) {
  return { ...p, id: p._id.toString() };
}

function formatUser(u) {
  const { password, ...safe } = u;
  return { ...safe, id: u._id.toString() };
}

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized — no token provided" });
  }
  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Access denied — admin only" });
  }
  next();
}

// ─── ROUTES: AUTH ─────────────────────────────────────────────────────────────

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check if username or email already taken
    const exists = await db.collection("users").findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { username: username.toLowerCase().trim() },
      ],
    });
    if (exists) {
      return res.status(400).json({
        error: exists.email === email.toLowerCase().trim()
          ? "Email is already registered"
          : "Username is already taken",
      });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = {
      firstName: (firstName || "").trim(),
      lastName: (lastName || "").trim(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      role: "customer",
      wishlist: [],
      createdAt: new Date(),
    };

    const result = await db.collection("users").insertOne(user);
    const token = jwt.sign(
      { id: result.insertedId.toString(), role: "customer" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: result.insertedId.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        role: user.role,
        wishlist: [],
      },
    });
  } catch (e) {
    console.error("Register error:", e.message);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username/email and password are required" });
    }

    // Allow login with either username or email
    const user = await db.collection("users").findOne({
      $or: [
        { username: username.toLowerCase().trim() },
        { email: username.toLowerCase().trim() },
      ],
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id.toString(),
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username,
        email: user.email,
        role: user.role,
        wishlist: user.wishlist || [],
      },
    });
  } catch (e) {
    console.error("Login error:", e.message);
    res.status(500).json({ error: "Server error during login" });
  }
});

// Get current user (validates token on page load)
app.get("/api/auth/me", auth, async (req, res) => {
  try {
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(req.user.id) }, { projection: { password: 0 } });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      user: {
        id: user._id.toString(),
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username,
        email: user.email,
        role: user.role,
        wishlist: user.wishlist || [],
      },
    });
  } catch (e) {
    console.error("Auth/me error:", e.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── ROUTES: PRODUCTS ─────────────────────────────────────────────────────────

// GET all products (with optional filters)
app.get("/api/products", async (req, res) => {
  try {
    const { category, sort, search, newRelease } = req.query;

    const query = {};
    if (category && category !== "all") query.category = category;
    if (newRelease === "true") query.newRelease = true;
    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: "i" };
    }

    let sortObj = { createdAt: -1 };
    if (sort === "price_asc") sortObj = { price: 1 };
    else if (sort === "price_desc") sortObj = { price: -1 };
    else if (sort === "newest") sortObj = { createdAt: -1 };

    const raw = await db.collection("products").find(query).sort(sortObj).toArray();
    const products = raw.map(formatProduct);

    res.json({ products, total: products.length });
  } catch (e) {
    console.error("GET products error:", e.message);
    res.status(500).json({ error: "Server error fetching products" });
  }
});

// GET single product by ID
app.get("/api/products/:id", async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID format" });
    }
    const p = await db.collection("products").findOne({ _id: new ObjectId(req.params.id) });
    if (!p) return res.status(404).json({ error: "Product not found" });
    res.json({ product: formatProduct(p) });
  } catch (e) {
    console.error("GET product error:", e.message);
    res.status(500).json({ error: "Server error" });
  }
});

// CREATE product (admin only, with optional image upload)
app.post("/api/products", auth, adminOnly, upload.single("image"), async (req, res) => {
  try {
    const body = req.body;

    if (!body.name || !body.price) {
      return res.status(400).json({ error: "Product name and price are required" });
    }

    let sizesArray = [];
    if (body.sizes) {
      try {
        sizesArray = typeof body.sizes === "string" ? JSON.parse(body.sizes) : body.sizes;
      } catch {
        sizesArray = body.sizes.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    let colorsArray = [];
    if (body.colors) {
      try {
        colorsArray = typeof body.colors === "string" ? JSON.parse(body.colors) : body.colors;
      } catch {
        colorsArray = body.colors.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    const product = {
      name: body.name.trim(),
      price: Number(body.price),
      originalPrice: Number(body.originalPrice || body.price),
      brand: (body.brand || "").trim(),
      category: body.category || "unisex",
      stock: Number(body.stock || 0),
      sizes: sizesArray,
      colors: colorsArray,
      description: (body.description || "").trim(),
      image: req.file ? `/uploads/${req.file.filename}` : (body.image || ""),
      featured: body.featured === "true" || body.featured === true,
      newRelease: body.newRelease === "true" || body.newRelease === true,
      createdAt: new Date(),
    };

    const result = await db.collection("products").insertOne(product);
    console.log(`✅ Product created: ${product.name} (ID: ${result.insertedId})`);
    res.status(201).json({ product: formatProduct({ ...product, _id: result.insertedId }) });
  } catch (e) {
    console.error("POST product error:", e.message);
    res.status(500).json({ error: "Server error creating product" });
  }
});

// UPDATE product (admin only)
app.put("/api/products/:id", auth, adminOnly, upload.single("image"), async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const updates = { ...req.body };

    // Parse numeric fields
    if (updates.price) updates.price = Number(updates.price);
    if (updates.originalPrice) updates.originalPrice = Number(updates.originalPrice);
    if (updates.stock) updates.stock = Number(updates.stock);
    if (updates.newRelease !== undefined) {
      updates.newRelease = updates.newRelease === "true" || updates.newRelease === true;
    }
    if (updates.sizes && typeof updates.sizes === "string") {
      try { updates.sizes = JSON.parse(updates.sizes); }
      catch { updates.sizes = updates.sizes.split(",").map((s) => s.trim()).filter(Boolean); }
    }
    if (updates.colors && typeof updates.colors === "string") {
      try { updates.colors = JSON.parse(updates.colors); }
      catch { updates.colors = updates.colors.split(",").map((s) => s.trim()).filter(Boolean); }
    }
    if (updates.featured !== undefined) {
      updates.featured = updates.featured === "true" || updates.featured === true;
    }

    // If new image was uploaded, set image path
    if (req.file) updates.image = `/uploads/${req.file.filename}`;

    // Remove the _id field if accidentally included
    delete updates._id;
    delete updates.id;

    const result = await db.collection("products").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const updated = await db.collection("products").findOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, product: formatProduct(updated) });
  } catch (e) {
    console.error("PUT product error:", e.message);
    res.status(500).json({ error: "Server error updating product" });
  }
});

// DELETE product (admin only)
app.delete("/api/products/:id", auth, adminOnly, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    const result = await db.collection("products").deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    console.log(`🗑️  Product deleted: ${req.params.id}`);
    res.json({ success: true });
  } catch (e) {
    console.error("DELETE product error:", e.message);
    res.status(500).json({ error: "Server error deleting product" });
  }
});

// ─── ROUTES: WISHLIST ─────────────────────────────────────────────────────────

// Toggle wishlist item (add if not present, remove if present)
app.post("/api/wishlist", auth, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: "productId is required" });

    const user = await db.collection("users").findOne({ _id: new ObjectId(req.user.id) });
    if (!user) return res.status(404).json({ error: "User not found" });

    const wishlist = user.wishlist || [];
    const updated = wishlist.includes(productId)
      ? wishlist.filter((id) => id !== productId)
      : [...wishlist, productId];

    await db.collection("users").updateOne(
      { _id: new ObjectId(req.user.id) },
      { $set: { wishlist: updated } }
    );

    res.json({ wishlist: updated });
  } catch (e) {
    console.error("Wishlist toggle error:", e.message);
    res.status(500).json({ error: "Server error updating wishlist" });
  }
});

// GET wishlist with full product data
app.get("/api/wishlist", auth, async (req, res) => {
  try {
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(req.user.id) }, { projection: { wishlist: 1 } });

    const wishlist = user?.wishlist || [];

    let products = [];
    if (wishlist.length > 0) {
      const validIds = wishlist.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
      const raw = await db
        .collection("products")
        .find({ _id: { $in: validIds } })
        .toArray();
      products = raw.map(formatProduct);
    }

    res.json({ wishlist, products });
  } catch (e) {
    console.error("GET wishlist error:", e.message);
    res.status(500).json({ error: "Server error fetching wishlist" });
  }
});

// ─── ROUTES: ORDERS ───────────────────────────────────────────────────────────

// GET orders (admin sees all, customer sees their own)
app.get("/api/orders", auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== "admin") {
      query = { userId: req.user.id };
    }
    const orders = await db
      .collection("orders")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Add string id to each order
    const formatted = orders.map((o) => ({ ...o, id: o._id.toString() }));
    res.json({ orders: formatted });
  } catch (e) {
    console.error("GET orders error:", e.message);
    res.status(500).json({ error: "Server error fetching orders" });
  }
});

// CREATE order
app.post("/api/orders", auth, async (req, res) => {
  try {
    if (!req.body.items || !req.body.items.length) {
      return res.status(400).json({ error: "Order must contain at least one item" });
    }

    const order = {
      userId: req.user.id,
      items: req.body.items,
      total: Number(req.body.total) || 0,
      shippingAddress: req.body.shippingAddress || {},
      paymentMethod: req.body.paymentMethod || "card",
      status: "pending",
      createdAt: new Date(),
    };

    const result = await db.collection("orders").insertOne(order);
    console.log(`✅ Order placed by user ${req.user.id} — total: $${order.total}`);
    res.status(201).json({ order: { ...order, id: result.insertedId.toString(), _id: result.insertedId } });
  } catch (e) {
    console.error("POST order error:", e.message);
    res.status(500).json({ error: "Server error placing order" });
  }
});

// UPDATE order status (admin only)
app.put("/api/orders/:id/status", auth, adminOnly, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(", ")}` });
    }

    const result = await db.collection("orders").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: req.body.status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ success: true });
  } catch (e) {
    console.error("PUT order status error:", e.message);
    res.status(500).json({ error: "Server error updating order" });
  }
});

// ─── ROUTES: USERS (ADMIN) ────────────────────────────────────────────────────

// GET all users (admin only)
app.get("/api/users", auth, adminOnly, async (req, res) => {
  try {
    const users = await db
      .collection("users")
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    const formatted = users.map((u) => ({ ...u, id: u._id.toString() }));
    res.json({ users: formatted });
  } catch (e) {
    console.error("GET users error:", e.message);
    res.status(500).json({ error: "Server error fetching users" });
  }
});

// DELETE user (admin only)
app.delete("/api/users/:id", auth, adminOnly, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    // Prevent deleting yourself
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: "You cannot delete your own admin account" });
    }
    const result = await db.collection("users").deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ success: true });
  } catch (e) {
    console.error("DELETE user error:", e.message);
    res.status(500).json({ error: "Server error deleting user" });
  }
});

// UPDATE admin credentials (admin only — change own username and/or password)
app.put("/api/admin/credentials", auth, adminOnly, async (req, res) => {
  try {
    const { newUsername, currentPassword, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ error: "Current password is required" });
    }

    const admin = await db.collection("users").findOne({ _id: new ObjectId(req.user.id) });
    if (!admin) return res.status(404).json({ error: "Admin user not found" });

    const passwordMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const updates = {};

    if (newUsername && newUsername.trim() && newUsername.trim() !== admin.username) {
      const taken = await db.collection("users").findOne({
        username: newUsername.toLowerCase().trim(),
        _id: { $ne: new ObjectId(req.user.id) },
      });
      if (taken) return res.status(400).json({ error: "Username is already taken" });
      updates.username = newUsername.toLowerCase().trim();
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }
      updates.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No changes provided" });
    }

    await db.collection("users").updateOne(
      { _id: new ObjectId(req.user.id) },
      { $set: updates }
    );

    const updated = await db.collection("users").findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { password: 0 } }
    );

    console.log(`✅ Admin credentials updated for: ${admin.username}`);
    res.json({ success: true, user: formatUser(updated) });
  } catch (e) {
    console.error("PUT admin credentials error:", e.message);
    res.status(500).json({ error: "Server error updating credentials" });
  }
});

// ─── ROUTES: DASHBOARD STATS (ADMIN) ─────────────────────────────────────────
app.get("/api/admin/stats", auth, adminOnly, async (req, res) => {
  try {
    const [totalProducts, totalUsers, totalOrders, ordersArr] = await Promise.all([
      db.collection("products").countDocuments(),
      db.collection("users").countDocuments({ role: "customer" }),
      db.collection("orders").countDocuments(),
      db.collection("orders").find().toArray(),
    ]);

    const totalRevenue = ordersArr
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const recentOrders = ordersArr
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map((o) => ({ ...o, id: o._id.toString() }));

    res.json({
      totalProducts,
      totalUsers,
      totalOrders,
      totalRevenue: totalRevenue.toFixed(2),
      recentOrders,
    });
  } catch (e) {
    console.error("Admin stats error:", e.message);
    res.status(500).json({ error: "Server error fetching stats" });
  }
});

// ─── SERVE ADMIN PAGE ─────────────────────────────────────────────────────────
app.get("/admin", (req, res) => {
  const adminPath = path.join(__dirname, "admin.html");
  if (fs.existsSync(adminPath)) {
    res.sendFile(adminPath);
  } else {
    res.status(404).send("<h2>admin.html not found. Make sure it is in the same folder as server.js</h2>");
  }
});

// ─── CATCH-ALL: Serve index.html for all other routes ─────────────────────────
// NOTE: Express v4 with path-to-regexp v8+ (Node 18+) requires '/*splat' instead of '*'
// Using a regex-based catch-all to be compatible with all versions of Express v4
app.get(/(.*)/, (req, res) => {
  // Don't catch API routes — those 404 on their own
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  const indexPath = path.join(__dirname, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: "index.html not found" });
  }
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log("");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`🚀  SneakerVault server running!`);
      console.log(`🌐  Store:   http://localhost:${PORT}`);
      console.log(`🛠️   Admin:   http://localhost:${PORT}/admin`);
      console.log(`📦  DB:      mongodb://127.0.0.1:27017/${DB_NAME}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    });
  })
  .catch((err) => {
    console.error("");
    console.error("❌ Failed to connect to MongoDB!");
    console.error("   Make sure MongoDB is running: mongod --dbpath /data/db");
    console.error("   Error:", err.message);
    process.exit(1);
  });
