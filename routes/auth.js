import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "../firebase.js";
import { authenticate } from "../middlewares/authenticate.js";

dotenv.config();

const router = express.Router();
const usersCollection = db.collection("users");

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Current date in a standardized format
export const formatDate = () => new Date().toISOString();

// ✅ Sign up
router.post("/signup", async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const userSnapshot = await usersCollection
      .where("email", "==", email)
      .get();
    if (!userSnapshot.empty) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user object
    const newUser = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      username: `${firstName.toLowerCase()}${lastName.toLowerCase()}`, // Generate username
      createdAt: formatDate(),
      updatedAt: formatDate(),
      userImage:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTA_e9lfWk1kqC3XIQD4snZ0OTa_sQKzpLFVQ&s", // Default image
      bio: "",
      website: "",
    };

    // Store user in Firestore
    const newUserRef = await usersCollection.add(newUser);

    // Generate JWT token
    const token = generateToken(newUserRef.id);

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true, 
      sameSite: "strict", // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user data (excluding password)
    res
      .status(201)
      .json({ userId: newUserRef.id, ...newUser, password: undefined });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Log In
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const userSnapshot = await usersCollection
      .where("email", "==", email)
      .get();
    if (userSnapshot.empty) {
      return res.status(400).json({ message: "User not found" });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(userDoc.id);

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ userId: userDoc.id, ...userData, password: undefined });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get current user
router.get("/me", authenticate, async (req, res) => {
  try {
    const userRef = usersCollection.doc(req.userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userDoc.data();
    res.json({ userId: req.userId, ...userData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Logout (Clears cookie)
router.post("/logout", (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0), // Expire immediately
  });
  res.json({ message: "Logged out successfully" });
});

export default router;
