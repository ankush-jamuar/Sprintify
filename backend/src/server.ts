import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";
import app from "./app";
import connectDB from "./config/db";
import { setupSockets } from "./sockets";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Build allowed origins for Socket.io (same logic as Express CORS)
const socketOrigins: string[] = [];
if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(",").forEach(u => socketOrigins.push(u.trim()));
}
if (!socketOrigins.includes("http://localhost:5173")) socketOrigins.push("http://localhost:5173");
if (!socketOrigins.includes("http://localhost:5174")) socketOrigins.push("http://localhost:5174");

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: socketOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io); // Attach socket instance to express app for controllers
setupSockets(io);

const startServer = async () => {
  console.log("Groq key loaded:", !!process.env.GROQ_API_KEY);
  const missingEnvVars = [];

  if (!process.env.GROQ_API_KEY) {
    console.warn("⚠️ GROQ_API_KEY missing – AI features disabled.");
  }
  if (!process.env.JWT_SECRET) {
    console.warn("⚠️ JWT_SECRET missing – Authentication might fail or use insecure defaults.");
  }
  if (!process.env.MONGO_URI) {
    console.warn("⚠️ MONGO_URI missing – Database connection might fail.");
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.warn("⚠️ Cloudinary variables missing – File attachments disabled.");
  }
  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_SECRET) {
    console.warn("⚠️ GitHub variables missing – GitHub integration disabled.");
  }

  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
