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

// GET all posts of a user by userId

router.get("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Reference the posts collection and query by userId
    const postsRef = db.collection("posts");
    const snapshot = await postsRef.where("userId", "==", userId).get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "No posts found for this user" });
    }

    // Extract data from Firestore documents
    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ posts });
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).json({ error: "Internal Server Error" });
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


// DELETE all comments of a post by postId
router.delete("/:postId/comments", async (req, res) => {
  try {
    const { postId } = req.params;

    // Reference the comments collection
    const commentsRef = db.collection("comments");

    // Query to get all comments associated with the postId
    const snapshot = await commentsRef.where("postId", "==", postId).get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "No comments found for this post" });
    }

    // Batch delete all comments
    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    res.status(200).json({ message: "All comments deleted successfully" });
  } catch (error) {
    console.error("Error deleting comments:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Like a post

router.post("/:postId/like", authenticate, async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return res.status(404).json({ error: "Post not found" });
    }

    const postData = postDoc.data();
    let { likedBy, dislikedBy, likeCount } = postData.likes;


    if (likedBy.includes(userId)) {
      // If user already liked the post, remove like
      likedBy = likedBy.filter((id) => id !== userId);
      likeCount--;

      await postRef.update({
        "likes.likedBy": likedBy,
        "likes.likeCount": likeCount
      });

      return res.status(200).json({ 
        message: "Like removed", 
        likes: { likedBy, dislikedBy, likeCount }  // Return updated likes object
      });
    }

    // Remove user from dislikedBy (if previously disliked)
    dislikedBy = dislikedBy.filter((id) => id !== userId);

    likedBy = Array.isArray(likedBy) ? [...likedBy, userId] : [userId];
    likeCount++;

    await postRef.update({
      "likes.likedBy": likedBy,
      "likes.dislikedBy": dislikedBy,
      "likes.likeCount": likeCount
    });

    return res.status(200).json({ 
      message: "Post liked", 
      likes: { likedBy, dislikedBy, likeCount }  // Return updated likes object
    });

  } catch (error) {
    console.error("Error liking post:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


// Dislike a post

router.post("/:postId/dislike", authenticate, async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return res.status(404).json({ error: "Post not found" });
    }

    let { likedBy, dislikedBy, likeCount } = postDoc.data().likes;

    // If user already disliked the post, remove dislike
    if (dislikedBy.includes(userId)) {
      dislikedBy = dislikedBy.filter((id) => id !== userId);

      await postRef.update({
        "likes.dislikedBy": dislikedBy
      });

      return res.status(200).json({ 
        message: "Dislike removed", 
        likes: { likedBy, dislikedBy, likeCount } // Return updated likes object
      });
    }

    // Remove user from likedBy (if they previously liked)
    const wasLiked = likedBy.includes(userId);
    likedBy = likedBy.filter((id) => id !== userId);
    if (wasLiked) likeCount--; // Decrease like count if previously liked

    dislikedBy = Array.isArray(dislikedBy) ? [...dislikedBy, userId] : [userId];

    await postRef.update({
      "likes.likedBy": likedBy,
      "likes.dislikedBy": dislikedBy,
      "likes.likeCount": likeCount
    });

    return res.status(200).json({ 
      message: "Post disliked", 
      likes: { likedBy, dislikedBy, likeCount } // Return updated likes object
    });

  } catch (error) {
    console.error("Error disliking post:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


export default router;
