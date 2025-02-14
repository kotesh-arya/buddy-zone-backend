import jwt from "jsonwebtoken";


// ✅ Middleware: Verify token
const authenticate = async (req, res, next) => {
  console.log("whole TOKEN", req.headers.authorization);
  try {
    const token = req.headers.authorization?.split(" ")[1];
    console.log("token", token);

    const decodedToken =  jwt.decode(token);
    console.log(decodedToken, "deconded token");
    console.log(
      new Date(decodedToken.exp * 1000).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      })
    );

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    console.log("process.env.JWT_SECRET", process.env.JWT_SECRET);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired token" });
  }
};

export { authenticate };
