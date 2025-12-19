const admin = require("firebase-admin");

module.exports = (userCollection, requireRole) => async (req, res, next) => {
  const authHeader =
    req.headers.authorization ||
    req.cookies?.token ||
    req.headers["x-access-token"];
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const email = decoded.email || decoded?.claims?.email;

    let user = null;
    if (userCollection && email) {
      user = await userCollection.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });
    }

    req.user = {
      uid: decoded.uid,
      email,
      name: user?.name,
      userType: user?.userType,
      claims: decoded,
    };

    if (requireRole && Array.isArray(requireRole) && requireRole.length) {
      // Prefer custom claim first, then DB userType
      const claimRole = decoded.role || decoded.userType;
      if (claimRole && requireRole.includes(claimRole)) return next();
      if (user && requireRole.includes(user.userType)) return next();
      return res
        .status(403)
        .json({ message: "User does not have required role" });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
