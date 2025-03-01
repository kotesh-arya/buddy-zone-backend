import express from "express";
import db from "../firebase.js";
import { authenticate } from "../middlewares/authenticate.js";
import admin from "firebase-admin";

const router = express.Router();

// Add a post to bookmarks (Requires Authentication)
router.post("/:userId/:postId", authenticate, async (req, res) => {
    try {
        const { userId, postId } = req.params;
        const timestamp = admin.firestore.Timestamp.now();

        const bookmarkRef = db.collection("bookmarks").doc(userId);
        const doc = await bookmarkRef.get();

        const newBookmark = { postId, bookmarkedAt: timestamp, bookmarkedBy: userId };

        if (doc.exists) {
            await bookmarkRef.update({
                posts: admin.firestore.FieldValue.arrayUnion(newBookmark),
                updatedAt: timestamp,
            });
        } else {
            await bookmarkRef.set({
                userId,
                posts: [newBookmark],
                createdAt: timestamp,
                updatedAt: timestamp,
            });
        }

        // Fetch all bookmarks of all users
        const allBookmarksSnapshot = await db.collection("bookmarks").get();
        let allBookmarks = {};
        allBookmarksSnapshot.forEach(doc => {
            allBookmarks[doc.id] = doc.data().posts;
        });

        res.status(200).json({
            message: "Post bookmarked successfully",
            userBookmarks: doc.exists ? [...doc.data().posts, newBookmark] : [newBookmark],
            allBookmarks,  // Send bookmarks of all users
        });
    } catch (error) {
        console.error("Error bookmarking post:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});



router.delete("/:userId/:postId", authenticate, async (req, res) => {
    try {
        const { userId, postId } = req.params;
        const timestamp = admin.firestore.Timestamp.now();

        const bookmarkRef = db.collection("bookmarks").doc(userId);
        const doc = await bookmarkRef.get();

        if (!doc.exists || !doc.data().posts.length) {
            return res.status(404).json({ message: "No bookmarks found for this user" });
        }

        const updatedPosts = doc.data().posts.filter((bookmark) => bookmark.postId !== postId);

        await bookmarkRef.update({
            posts: updatedPosts,
            updatedAt: timestamp,
        });

        // Fetch all bookmarks of all users
        const allBookmarksSnapshot = await db.collection("bookmarks").get();
        let allBookmarks = {};
        allBookmarksSnapshot.forEach(doc => {
            allBookmarks[doc.id] = doc.data().posts;
        });

        res.status(200).json({
            message: "Post removed from bookmarks",
            userBookmarks: updatedPosts,
            allBookmarks,  // Send updated bookmarks of all users
        });
    } catch (error) {
        console.error("Error removing bookmark:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// Get all bookmarked posts of a user along with all bookmarks (Requires Authentication)
router.get("/:userId", authenticate, async (req, res) => {
    try {
        const { userId } = req.params;

        // Fetch the current user's bookmarks
        const userBookmarkRef = db.collection("bookmarks").doc(userId);
        const userDoc = await userBookmarkRef.get();

        const userBookmarks = userDoc.exists ? userDoc.data().posts || [] : [];

        // Fetch all bookmarks
        const allBookmarksSnapshot = await db.collection("bookmarks").get();
        let allBookmarks = {};

        allBookmarksSnapshot.forEach(doc => {
            allBookmarks[doc.id] = doc.data().posts || [];
        });

        res.status(200).json({ 
            userBookmarks,  // Bookmarks of the requested user
            allBookmarks    // All bookmarks grouped by userId
        });
    } catch (error) {
        console.error("Error fetching bookmarks:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});




export default router;
