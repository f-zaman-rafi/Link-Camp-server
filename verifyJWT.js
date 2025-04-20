const jwt = require("jsonwebtoken");

const verifyJWT = (userCollection) => async (req, res, next) => {
  // Get token from cookies
  const token = req.cookies.token;

  // If there's no token, return 401 (unauthorized) error
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .json({ message: "Invalid token, authorization denied" });
    }

    try {
      const user = await userCollection.findOne({ email: decoded.email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      req.user = decoded; // Attach user info to the request
      next(); // Allow the request to proceed
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
};

module.exports = verifyJWT;
