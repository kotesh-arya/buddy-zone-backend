import express from "express";
import db from "../firebase.js";
import createUser from "../models/userModel.js";
import { Timestamp } from "firebase-admin/firestore";

const router = express.Router();
const usersCollection = db.collection("users");

// 🔹 Get all users
router.get("/", async (req, res) => {
  try {
    const snapshot = await usersCollection.get();
    if (snapshot.empty) {
      return res.status(404).json({ message: "No users found" });
    }

    const users = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to retrieve users", details: error.message });
  }
});

// 🔹 Get a user by userId
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const userDoc = await usersCollection.doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ _id: userDoc.id, ...userDoc.data() });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to retrieve user", details: error.message });
  }
});

// 🔹 Create a new user
router.post("/", async (req, res) => {
  try {
    const newUser = createUser(req.body);

    // Add new document with auto-generated ID
    const docRef = await usersCollection.add(newUser);

    res.status(201).json({ id: docRef.id, ...newUser });
  } catch (error) {
    res
      .status(400)
      .json({ error: "Invalid user data", details: error.message });
  }
});

// 🔹 Update/Edit an existing user
router.put("/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const userDoc = usersCollection.doc(userId);
    const doc = await userDoc.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedData = {
      ...req.body,
      updatedAt: Timestamp.now(),
    };

    await userDoc.set(updatedData, { merge: true });

    res.json({ message: "User updated successfully", updatedData });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to update user", details: error.message });
  }
});

// 🔹 Get all bookmarks for a user
router.get("/:userId/bookmarks", async (req, res) => {
  try {
    const { userId } = req.params;
    const userDoc = await usersCollection.doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    const bookmarks = userData.bookmarks || []; // Default to empty array if no bookmarks exist

    res.json({ bookmarks });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to retrieve bookmarks", details: error.message });
  }
});

// 🔹 Add a post to a user's bookmarks
router.post("/:userId/bookmark/:postId", async (req, res) => {
  try {
    const { userId, postId } = req.params;

    const userDocRef = usersCollection.doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get existing bookmarks or create an empty array
    const userData = userDoc.data();
    const bookmarks = userData.bookmarks || [];

    if (bookmarks.includes(postId)) {
      return res.status(400).json({ message: "Post is already bookmarked" });
    }

    // Add postId to bookmarks array
    await userDocRef.update({
      bookmarks: [...bookmarks, postId],
    });

    res.status(200).json({
      message: "Post bookmarked successfully",
      bookmarks: [...bookmarks, postId],
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to bookmark post", details: error.message });
  }
});

// 🔹 Remove a post from a user's bookmarks
router.post("/:userId/remove-bookmark/:postId", async (req, res) => {
  try {
    const { userId, postId } = req.params;

    const userDocRef = usersCollection.doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    const bookmarks = userData.bookmarks || [];

    if (!bookmarks.includes(postId)) {
      return res.status(400).json({ message: "Post is not bookmarked" });
    }

    // Remove postId from bookmarks array
    const updatedBookmarks = bookmarks.filter((id) => id !== postId);

    await userDocRef.update({
      bookmarks: updatedBookmarks,
    });

    res.status(200).json({
      message: "Post removed from bookmarks",
      bookmarks: updatedBookmarks,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to remove bookmark", details: error.message });
  }
});

// 🔹 Follow a user
router.post("/:userId/follow/:followUserId", async (req, res) => {
  try {
    const { userId, followUserId } = req.params;

    if (userId === followUserId) {
      return res.status(400).json({ error: "You cannot follow yourself." });
    }

    const userRef = usersCollection.doc(userId);
    const followUserRef = usersCollection.doc(followUserId);

    const [userDoc, followUserDoc] = await Promise.all([
      userRef.get(),
      followUserRef.get(),
    ]);

    if (!userDoc.exists || !followUserDoc.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userDoc.data();
    const followUserData = followUserDoc.data();

    const isFollowing = userData.following?.includes(followUserId);

    if (isFollowing) {
      return res.status(400).json({ error: "User is already being followed." });
    }

    // Update the following list of the current user
    await userRef.update({
      following: [...(userData.following || []), followUserId],
    });

    // Update the followers list of the user being followed
    await followUserRef.update({
      followers: [...(followUserData.followers || []), userId],
    });

    res.status(200).json({ message: "User followed successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to follow user", details: error.message });
  }
});

// 🔹 Unfollow a user
router.post("/:userId/unfollow/:unfollowUserId", async (req, res) => {
  try {
    const { userId, unfollowUserId } = req.params;

    if (userId === unfollowUserId) {
      return res.status(400).json({ error: "You cannot unfollow yourself." });
    }

    const userRef = usersCollection.doc(userId);
    const unfollowUserRef = usersCollection.doc(unfollowUserId);

    const [userDoc, unfollowUserDoc] = await Promise.all([
      userRef.get(),
      unfollowUserRef.get(),
    ]);

    if (!userDoc.exists || !unfollowUserDoc.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userDoc.data();
    const unfollowUserData = unfollowUserDoc.data();

    const isFollowing = userData.following?.includes(unfollowUserId);

    if (!isFollowing) {
      return res.status(400).json({ error: "User is not being followed." });
    }

    // Remove the unfollowed user from following list
    await userRef.update({
      following: userData.following.filter((id) => id !== unfollowUserId),
    });

    // Remove the user from the unfollowed user's followers list
    await unfollowUserRef.update({
      followers: unfollowUserData.followers.filter((id) => id !== userId),
    });

    res.status(200).json({ message: "User unfollowed successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to unfollow user", details: error.message });
  }
});

export default router;
