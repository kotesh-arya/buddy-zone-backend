import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
// Import route files
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import commentRoutes from "./routes/comments.js";
import authRoutes from "./routes/auth.js";

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3001;
app.use(cookieParser()); // ✅ Enables cookie parsing
// Middlewares
// ✅ Correct way: Allow all origins dynamically
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin); // Allow specific origins dynamically
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});
app.use(express.json()); // Parse JSON bodies

// Use authentication middleware globally if needed
// app.use(authenticate); // Uncomment this if you want auth for all routes

// Use the routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/posts", postRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
