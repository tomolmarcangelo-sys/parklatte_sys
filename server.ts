import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import { createServer } from "http";
import path from "path";
import cors from "cors";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Database Connection
const dbConfig: any = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "your_password",
  database: process.env.DB_NAME || "coffee_shop",
  port: parseInt(process.env.DB_PORT || "3306"),
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false // Common for managed DBs like Aiven/DigitalOcean
  } : undefined
};

let pool: mysql.Pool;

try {
  pool = mysql.createPool(dbConfig);
  console.log("Connected to MySQL (Pool created)");
} catch (err) {
  console.error("MySQL connection error:", err);
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Authentication Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user && req.user.role === 'Admin') {
      next();
    } else {
      res.status(403).json({ error: "Unauthorized: Requester must be an administrator" });
    }
  };

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    try {
      // Check if this is the first user
      const [userCount]: any = await pool.execute("SELECT COUNT(*) as count FROM users");
      const role = userCount[0].count === 0 ? "Admin" : "Customer";

      const hashedPassword = await bcrypt.hash(password, 10);
      const id = Date.now().toString();
      await pool.execute(
        "INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)",
        [id, name, email, hashedPassword, role]
      );
      const token = jwt.sign({ id, email, role: role }, JWT_SECRET);
      res.json({ token, user: { id, name, email, role: role } });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const [rows]: any = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
      const user = rows[0];
      if (!user) return res.status(400).json({ error: "User not found" });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(400).json({ error: "Invalid password" });

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    try {
      const [rows]: any = await pool.execute("SELECT id, name, email, role FROM users WHERE id = ?", [req.user.id]);
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Menu Routes
  app.get("/api/menu", async (req, res) => {
    try {
      const [rows] = await pool.execute("SELECT * FROM menu_items");
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/customizations", async (req, res) => {
    try {
      const [rows] = await pool.execute("SELECT * FROM customization_options");
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Order Routes
  app.post("/api/orders", authenticateToken, async (req: any, res) => {
    const { customerId, customerName, items, totalPrice } = req.body;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const orderId = Date.now().toString();
      
      await connection.execute(
        "INSERT INTO orders (id, customerId, customerName, totalPrice, status) VALUES (?, ?, ?, ?, ?)",
        [orderId, customerId, customerName, totalPrice, "Pending"]
      );

      for (const item of items) {
        const [result]: any = await connection.execute(
          "INSERT INTO order_items (orderId, productId, name, price) VALUES (?, ?, ?, ?)",
          [orderId, item.productId, item.name, item.price]
        );
        const orderItemId = result.insertId;

        if (item.customizations) {
          for (const cust of item.customizations) {
            await connection.execute(
              "INSERT INTO order_item_customizations (orderItemId, name, price) VALUES (?, ?, ?)",
              [orderItemId, cust.name, cust.price]
            );
          }
        }
      }

      await connection.commit();
      
      const newOrder = { id: orderId, customerId, customerName, items, totalPrice, status: "Pending", timestamp: new Date().toISOString() };
      io.to("baristas").emit("order-received", newOrder);
      
      res.json(newOrder);
    } catch (err: any) {
      await connection.rollback();
      res.status(500).json({ error: err.message });
    } finally {
      connection.release();
    }
  });

  app.get("/api/orders", authenticateToken, async (req: any, res) => {
    try {
      let query = "SELECT * FROM orders";
      let params = [];
      if (req.user.role === "Customer") {
        query += " WHERE customerId = ?";
        params.push(req.user.id);
      }
      query += " ORDER BY timestamp DESC";
      
      const [orders]: any = await pool.execute(query, params);
      
      // For simplicity, we're not joining items here, but a real app would
      for (const order of orders) {
        const [items]: any = await pool.execute("SELECT * FROM order_items WHERE orderId = ?", [order.id]);
        for (const item of items) {
          const [custs]: any = await pool.execute("SELECT name, price FROM order_item_customizations WHERE orderItemId = ?", [item.id]);
          item.customizations = custs;
        }
        order.items = items;
      }
      
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/orders/:id", authenticateToken, async (req: any, res) => {
    const { status } = req.body;
    try {
      await pool.execute("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id]);
      const [rows]: any = await pool.execute("SELECT * FROM orders WHERE id = ?", [req.params.id]);
      const order = rows[0];
      
      io.to(order.customerId).emit("status-updated", { id: order.id, status });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Menu Management
  app.post("/api/admin/menu", authenticateToken, isAdmin, async (req, res) => {
    const { name, price, category, imageUrl, available } = req.body;
    try {
      const id = uuidv4();
      await pool.execute(
        "INSERT INTO menu_items (id, name, price, category, imageUrl, available) VALUES (?, ?, ?, ?, ?, ?)",
        [id, name, price, category, imageUrl || null, available ?? true]
      );
      io.emit('menu-updated');
      res.status(201).json({ id, name, price, category, imageUrl, available });
    } catch (error) {
      res.status(500).json({ error: "Failed to add item" });
    }
  });

  app.delete("/api/admin/menu/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      await pool.execute("DELETE FROM menu_items WHERE id = ?", [req.params.id]);
      io.emit('menu-updated');
      res.json({ message: "Item deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // Admin User Management
  app.get("/api/admin/users", authenticateToken, isAdmin, async (req, res) => {
    try {
      const [rows]: any = await pool.execute("SELECT id as uid, name, email, role FROM users");
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:uid/role", authenticateToken, isAdmin, async (req, res) => {
    const { role } = req.body;
    try {
      await pool.execute("UPDATE users SET role = ? WHERE id = ?", [role, req.params.uid]);
      res.json({ message: "Role updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  // Admin Customization Management
  app.post("/api/admin/customizations", authenticateToken, isAdmin, async (req, res) => {
    const { name, additionalPrice, stockLevel, threshold } = req.body;
    try {
      const id = uuidv4();
      await pool.execute(
        "INSERT INTO customization_options (id, name, additionalPrice, stockLevel, threshold) VALUES (?, ?, ?, ?, ?)",
        [id, name, additionalPrice, stockLevel, threshold]
      );
      res.status(201).json({ id, name, additionalPrice, stockLevel, threshold });
    } catch (error) {
      res.status(500).json({ error: "Failed to add customization" });
    }
  });

  // Socket.io
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    socket.on("join-room", (room) => {
      socket.join(room);
    });
    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
