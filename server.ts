import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import { createServer } from "http";
import path from "path";
import cors from "cors";

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

  // Socket.io for real-time updates (User asked for it specifically)
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    
    socket.on("join-room", (room) => {
      socket.join(room);
      console.log(`User ${socket.id} joined room ${room}`);
    });

    socket.on("new-order", (order) => {
      // Broadcast to baristas
      io.to("baristas").emit("order-received", order);
    });

    socket.on("order-status-changed", (data) => {
      // Notify customer
      io.to(data.customerId).emit("status-updated", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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

startServer();
