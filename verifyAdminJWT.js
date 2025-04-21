const jwt = require("jsonwebtoken");

const verifyAdminJWT =
  (userCollection, requireRole) => async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
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

        // Check if user has the required role (can be one role or multiple)
        if (requireRole && !requireRole.includes(user.userType)) {
          return res
            .status(403)
            .json({
              message:
                "User does not have the required role to access this resource",
            });
        }

        req.user = decoded; // Store decoded user in the request
        next(); // Proceed to the next middleware or route handler
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    });
  };

module.exports = verifyAdminJWT;
