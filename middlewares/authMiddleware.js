import admin from "firebase-admin";

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Fetch user details from Firebase Auth
    const userRecord = await admin.auth().getUser(decodedToken.uid);
  req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      username: userRecord.displayName || decodedToken.email.split("@")[0], // Extract username
      firstName: userRecord.displayName?.split(" ")[0] || "User",
      lastName: userRecord.displayName?.split(" ")[1] || "",
      userImage: userRecord.photoURL || "",
    };

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    res
      .status(403)
      .json({ message: "Unauthorized: Invalid token", error: error.message });
  }
};

export { authMiddleware };
