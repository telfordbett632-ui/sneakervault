# 👟 SneakerVault

A complete full-stack sneaker store with admin dashboard. Zero external dependencies — runs with pure Node.js.

---

## 🚀 Quick Start

```bash
# 1. Navigate to project folder
cd sneakervault

# 2. Start the server (no npm install needed!)
node server.js
```

Then open:
- 🛒 **Store**: http://localhost:3000
- ⚙️ **Admin**: http://localhost:3000/admin

---

## 🔐 Default Login

### Admin Dashboard
| Field    | Value          |
|----------|----------------|
| Username | `admin`        |
| Password | `Admin@1234`   |

**Change your admin password after first login!**

---

## 📁 Project Structure

```
sneakervault/
├── server.js              # Complete backend server
├── sneakervault.db        # Auto-created JSON database
├── package.json
├── public/
│   ├── index.html         # Storefront SPA
│   └── uploads/           # Product images (auto-created)
└── admin/
    └── index.html         # Admin dashboard
```

---

## ✨ Features

### Storefront
- ✅ Animated hero section
- ✅ Product catalog with filters & sort
- ✅ Product detail modal with size selector
- ✅ Shopping cart drawer with qty management
- ✅ Wishlist (requires login)
- ✅ Live search overlay
- ✅ User registration & login
- ✅ Order placement
- ✅ Newsletter signup

### Admin Dashboard
- ✅ Login with admin credentials
- ✅ Dashboard stats (revenue, orders, users, products)
- ✅ Stock level alerts
- ✅ Brand stock chart
- ✅ **Products**: Add, edit, delete, image upload, set price/stock/category
- ✅ **Orders**: View all orders, update status (pending → delivered)
- ✅ **Users**: View all customers, remove accounts

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/products` | List products (with filters) |
| POST | `/api/products` | Add product (admin) |
| PUT | `/api/products/:id` | Edit product (admin) |
| DELETE | `/api/products/:id` | Delete product (admin) |
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Place order |
| PATCH | `/api/orders/:id/status` | Update order status (admin) |
| GET | `/api/users` | List users (admin) |
| DELETE | `/api/users/:id` | Remove user (admin) |
| POST | `/api/wishlist` | Toggle wishlist item |
| GET | `/api/admin/stats` | Dashboard statistics |

---

## 🔒 Security Notes

Before going to production:
1. Set a strong `JWT_SECRET` environment variable:
   ```bash
   JWT_SECRET=your_very_long_random_secret node server.js
   ```
2. Change the default admin password immediately
3. Add HTTPS (use a reverse proxy like Nginx)
4. Consider migrating the JSON DB to a real database like PostgreSQL or MongoDB

---

## 🌐 Deployment

### Heroku / Railway / Render
```bash
# Set environment variables
PORT=3000
JWT_SECRET=your_secret_here

# Start command
node server.js
```

### Self-hosted (PM2)
```bash
npm install -g pm2
pm2 start server.js --name sneakervault
pm2 save
pm2 startup
```
