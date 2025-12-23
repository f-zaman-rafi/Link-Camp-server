const admin = require("firebase-admin");

module.exports = (userCollection, requireRole) => async (req, res, next) => {
  // Step 1: Get the token from the Authorization header
  const authHeader =
    req.headers.authorization ||
    req.cookies?.token || // You can also use cookies if you're sending the token via cookies
    req.headers["x-access-token"]; // Another common header to use for tokens

  // Step 2: Extract token from the header
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1] // Extract token after "Bearer"
      : authHeader;

  // Step 3: If no token, return 401 Unauthorized
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    // Step 4: Verify the token with Firebase Admin SDK
    const decoded = await admin.auth().verifyIdToken(token);
    const email = decoded.email || decoded?.claims?.email; // Extract email from decoded token

    // Step 5: Check if the user exists in the database
    let user = null;
    if (userCollection && email) {
      user = await userCollection.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });
    }

    // Step 6: Attach user info to the request object for later use
    req.user = {
      uid: decoded.uid,
      email,
      name: user?.name,
      userType: user?.userType,
      claims: decoded,
    };

    // Step 7: Role-based access check (optional)
    if (requireRole && Array.isArray(requireRole) && requireRole.length) {
      const claimRole = decoded.role || decoded.userType;
      if (claimRole && requireRole.includes(claimRole)) return next(); // Allow if role matches
      if (user && requireRole.includes(user.userType)) return next(); // Allow if user role matches in DB
      return res
        .status(403)
        .json({ message: "User does not have required role" });
    }

    // If no specific role is required, just proceed
    next();
  } catch (err) {
    // Step 8: If token is invalid or expired
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
