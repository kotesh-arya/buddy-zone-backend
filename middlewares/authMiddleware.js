import admin from "firebase-admin";


const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract Bearer token

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      username: decodedToken.email.split("@")[0], // Extract username
      firstName: decodedToken.name?.split(" ")[0] || "User",
      lastName: decodedToken.name?.split(" ")[1] || "",
      userImage: decodedToken.picture || "",
    };
    console.log(req.user, "USER details from auth middleware");

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    res
      .status(403)
      .json({ message: "Unauthorized: Invalid token", error: error.message });
  }
};

export { authMiddleware };
