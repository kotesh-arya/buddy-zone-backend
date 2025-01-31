import express from "express";

const router = express.Router();

let comments = [{ id: 1, postId: 1, userId: 1, text: "Nice post!" }];

router.get("/", (req, res) => res.json(comments));
router.get("/post/:postId", (req, res) => {
    const postComments = comments.filter(c => c.postId === parseInt(req.params.postId));
    res.json(postComments);
});
router.get("/:id", (req, res) => {
    const comment = comments.find(c => c.id === parseInt(req.params.id));
    comment ? res.json(comment) : res.status(404).json({ message: "Comment not found" });
});
router.post("/", (req, res) => {
    const newComment = { id: comments.length + 1, ...req.body };
    comments.push(newComment);
    res.status(201).json(newComment);
});
router.put("/:id", (req, res) => {
    const comment = comments.find(c => c.id === parseInt(req.params.id));
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    Object.assign(comment, req.body);
    res.json(comment);
});
router.delete("/:id", (req, res) => {
    comments = comments.filter(c => c.id !== parseInt(req.params.id));
    res.json({ message: "Comment deleted successfully" });
});

export default router;
