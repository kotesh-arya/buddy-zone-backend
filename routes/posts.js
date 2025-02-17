import express from "express";
import db from "../firebase.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = express.Router();

// Get all posts (Public)
router.get("/", async (req, res) => {
  try {
    const postsSnapshot = await db.collection("posts").get();
    const posts = postsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: "Error fetching posts" });
  }
});

// Get a post by ID (Public)
router.get("/:id", async (req, res) => {
  try {
    const postRef = db.collection("posts").doc(req.params.id);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json({ id: postDoc.id, ...postDoc.data() });
  } catch (error) {
    res.status(500).json({ error: "Error fetching post" });
  }
});

// Create a new post (Requires Authentication)
router.post("/", authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    const { uid, email, firstName, lastName, userImage } = req.user;

    const newPost = {
      content,
      likes: {
        likeCount: 0,
        likedBy: [],
        dislikedBy: [],
      },
      username: email,
      firstName: firstName,
      lastName: lastName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
      userImage: userImage || "",
      userId: uid,
    };

    const postRef = await db.collection("posts").add(newPost);
    res.json({ id: postRef.id, ...newPost });
  } catch (error) {
    res.status(500).json({ error: "Error creating post" });
  }
});

// Update a post (Requires Authentication)
router.put("/:id", authenticate, async (req, res) => {
  try {
    const postRef = db.collection("posts").doc(req.params.id);

    // Extract only the 'content' field
    const updatedContent = req.body.postData?.content;

    if (!updatedContent) {
      return res.status(400).json({ error: "Content field is required" });
    }

    await postRef.update({
      content: updatedContent,
      updatedAt: new Date().toISOString(),
    });

    res.json({ message: "Post updated successfully" });
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ error: "Error updating post" });
  }
});

// Delete a post (Requires Authentication)
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const postRef = db.collection("posts").doc(req.params.id);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return res.status(404).json({ message: "Post not found" });
    }
    await postRef.delete();
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting post" });
  }
});

export default router;
