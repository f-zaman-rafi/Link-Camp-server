const admin = require("firebase-admin");

module.exports = (userCollection, requireRole) => async (req, res, next) => {
  // Extract the token from the Authorization header or cookies
  const authHeader =
    req.headers.authorization ||
    req.cookies?.token || // Token from cookies if available
    req.headers["x-access-token"]; // Fallback header for token

  // If no token is provided, send a 401 Unauthorized response
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1] // Extract token after "Bearer "
      : authHeader;

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    // Verify the token using Firebase Admin SDK
    const decoded = await admin.auth().verifyIdToken(token);
    const email = decoded.email || decoded?.claims?.email; // Extract email from decoded token

    // Fetch the user from the database using the email from the token
    let user = null;
    if (userCollection && email) {
      user = await userCollection.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" }); // Return 404 if user doesn't exist
    }

    // Attach user info to the request object for later use in other routes
    req.user = {
      uid: decoded.uid,
      email,
      name: user?.name,
      userType: user?.userType,
      claims: decoded,
    };

    // Role-based access control (optional)
    if (requireRole && Array.isArray(requireRole) && requireRole.length) {
      const claimRole = decoded.role || decoded.userType; // Check the role from the token
      if (claimRole && requireRole.includes(claimRole)) return next(); // Allow if role from token matches
      if (user && requireRole.includes(user.userType)) return next(); // Allow if user role in DB matches
      return res
        .status(403)
        .json({ message: "User does not have required role" }); // Forbidden if role doesn't match
    }

    // If no specific role check, proceed to the next middleware
    next();
  } catch (err) {
    // If the token is invalid or expired, send a 401 Unauthorized response
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
