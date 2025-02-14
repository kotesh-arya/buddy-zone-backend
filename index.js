import express from "express";
import cors from "cors";
import dotenv from "dotenv";
// Import route files
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import commentRoutes from "./routes/comments.js";
import authRoutes from "./routes/auth.js";

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
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
