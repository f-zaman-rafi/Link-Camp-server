const admin = require("firebase-admin");

module.exports = (userCollection, requireRole) => async (req, res, next) => {
  // Extract the token from the Authorization header or cookies
  const authHeader =
    req.headers.authorization ||
    req.cookies?.token ||
    req.headers["x-access-token"];
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1] // Extract token after "Bearer"
      : authHeader;

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    // Verify the token using Firebase Admin SDK
    const decoded = await admin.auth().verifyIdToken(token);
    const email = decoded.email || decoded?.claims?.email;

    // Fetch the user from the database using the email from the token
    let user = null;
    if (userCollection && email) {
      user = await userCollection.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });
    }

    // Attach user info to the request object
    req.user = {
      uid: decoded.uid,
      email,
      name: user?.name,
      userType: user?.userType,
      claims: decoded,
    };

    // Role-based access control
    if (requireRole && Array.isArray(requireRole) && requireRole.length) {
      const claimRole = decoded.role || decoded.userType;
      if (claimRole && requireRole.includes(claimRole)) return next();
      if (user && requireRole.includes(user.userType)) return next();
      return res
        .status(403)
        .json({ message: "User does not have required role" });
    }

    // If no specific role check, proceed to the next middleware
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
