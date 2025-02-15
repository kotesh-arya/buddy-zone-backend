import jwt from "jsonwebtoken";

// ✅ Middleware: Verify token from cookies
const authenticate = async (req, res, next) => {
  try {
    // Extract token from cookies
    const token = req.cookies?.token;
    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }


    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user details to request object
    req.user = {
      uid: decoded.userId,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      userImage: decoded.userImage,
    };

    next();
  } catch (error) {
    return res
      .status(403)
      .json({ message: "Invalid or expired token", error: error.message });
  }
};

export { authenticate };
