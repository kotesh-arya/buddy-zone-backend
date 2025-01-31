import express from "express";

const router = express.Router();

let posts = [
  { id: 1, title: "First Post", content: "This is my first post", userId: 1 },
];

router.get("/", (req, res) => res.json(posts));
router.get("/:id", (req, res) => {
  const post = posts.find((p) => p.id === parseInt(req.params.id));
  post ? res.json(post) : res.status(404).json({ message: "Post not found" });
});
router.post("/", (req, res) => {
  const newPost = { id: posts.length + 1, ...req.body };
  posts.push(newPost);
  res.status(201).json(newPost);
});
router.put("/:id", (req, res) => {
  const post = posts.find((p) => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ message: "Post not found" });
  Object.assign(post, req.body);
  res.json(post);
});
router.delete("/:id", (req, res) => {
  posts = posts.filter((p) => p.id !== parseInt(req.params.id));
  res.json({ message: "Post deleted successfully" });
});

export default router;
