import express from "express";
import db from "../firebase.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = express.Router();

// Get all comments (Public)
router.get("/", async (req, res) => {
    try {
        const commentsSnapshot = await db.collection("comments").get();
        const comments = commentsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: "Error fetching comments" });
    }
});

// Get comments by postId (Public)
router.get("/post/:postId", async (req, res) => {
    try {
        const commentsSnapshot = await db
            .collection("comments")
            .where("postId", "==", req.params.postId)
            .get();

        const comments = commentsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: "Error fetching comments for the post" });
    }
});

// Get a single comment by commentId (Public)
router.get("/:id", async (req, res) => {
    try {
        const commentRef = db.collection("comments").doc(req.params.id);
        const commentDoc = await commentRef.get();

        if (!commentDoc.exists) {
            return res.status(404).json({ message: "Comment not found" });
        }

        res.json({ id: commentDoc.id, ...commentDoc.data() });
    } catch (error) {
        res.status(500).json({ error: "Error fetching comment" });
    }
});

// Add a new comment (Requires Authentication)
router.post("/", authenticate, async (req, res) => {
    try {
        const { postId, text } = req.body;
        const { uid, email, firstName, lastName, userImage } = req.user;

        if (!postId || !text) {
            return res.status(400).json({ error: "Post ID and text are required" });
        }

        const newComment = {
            postId,
            text,
            username: email,
            firstName: firstName,
            lastName: lastName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userImage: userImage || "",
            userId: uid,
            votes: {
                upvotedBy: [],
                downvotedBy: []
            }
        };

        const commentRef = await db.collection("comments").add(newComment);
        res.json({ id: commentRef.id, ...newComment });
    } catch (error) {
        res.status(500).json({ error: "Error adding comment" });
    }
});

// Update a comment (Requires Authentication)
router.put("/:id", authenticate, async (req, res) => {
    try {
        const commentRef = db.collection("comments").doc(req.params.id);
        const commentDoc = await commentRef.get();

        if (!commentDoc.exists) {
            return res.status(404).json({ message: "Comment not found" });
        }

        // Ensure the user updating is the owner of the comment
        if (commentDoc.data().userId !== req.user.uid) {
            return res.status(403).json({ error: "Unauthorized to edit this comment" });
        }

        const updatedText = req.body.text;
        if (!updatedText) {
            return res.status(400).json({ error: "Text field is required" });
        }

        await commentRef.update({
            text: updatedText,
            updatedAt: new Date().toISOString(),
        });

        res.json({ message: "Comment updated successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error updating comment" });
    }
});

/**
 * Upvote a comment: Adds or removes the userId from the upVotedBy array
 */
router.post("/:id/upvote", authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { uid } = req.user;
        
        const commentRef = db.collection("comments").doc(id);
        const commentDoc = await commentRef.get();

        if (!commentDoc.exists) {
            return res.status(404).json({ error: "Comment not found" });
        }

        const commentData = commentDoc.data();
        const upVotedBy = commentData.votes?.upVotedBy || [];
        const downvotedBy = commentData.votes?.downvotedBy || [];

        if (upVotedBy.includes(uid)) {
            // Remove user from upVotedBy array (toggle)
            await commentRef.update({
                "votes.upVotedBy": upVotedBy.filter(userId => userId !== uid)
            });
            return res.json({ message: "Upvote removed" });
        } else {
            // Add user to upVotedBy and remove from downvotedBy (if exists)
            await commentRef.update({
                "votes.upVotedBy": [...upVotedBy, uid],
                "votes.downvotedBy": downvotedBy.filter(userId => userId !== uid)
            });
            return res.json({ message: "Upvoted successfully" });
        }
    } catch (error) {
        res.status(500).json({ error: "Error upvoting comment" });
    }
});

/**
 * Downvote a comment: Adds or removes the userId from the downvotedBy array
 */
router.post("/:id/downvote", authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { uid } = req.user;

        const commentRef = db.collection("comments").doc(id);
        const commentDoc = await commentRef.get();

        if (!commentDoc.exists) {
            return res.status(404).json({ error: "Comment not found" });
        }

        const commentData = commentDoc.data();
        const upVotedBy = commentData.votes?.upVotedBy || [];
        const downvotedBy = commentData.votes?.downvotedBy || [];

        if (downvotedBy.includes(uid)) {
            // Remove user from downvotedBy array (toggle)
            await commentRef.update({
                "votes.downvotedBy": downvotedBy.filter(userId => userId !== uid)
            });
            return res.json({ message: "Downvote removed" });
        } else {
            // Add user to downvotedBy and remove from upVotedBy (if exists)
            await commentRef.update({
                "votes.downvotedBy": [...downvotedBy, uid],
                "votes.upVotedBy": upVotedBy.filter(userId => userId !== uid)
            });
            return res.json({ message: "Downvoted successfully" });
        }
    } catch (error) {
        res.status(500).json({ error: "Error downvoting comment" });
    }
});

// Delete a comment (Requires Authentication)
router.delete("/:id", authenticate, async (req, res) => {
    try {
        const commentRef = db.collection("comments").doc(req.params.id);
        const commentDoc = await commentRef.get();

        if (!commentDoc.exists) {
            return res.status(404).json({ message: "Comment not found" });
        }

        // Ensure the user deleting is the owner of the comment
        if (commentDoc.data().userId !== req.user.uid) {
            return res.status(403).json({ error: "Unauthorized to delete this comment" });
        }

        await commentRef.delete();
        res.json({ message: "Comment deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error deleting comment" });
    }
});



export default router;
