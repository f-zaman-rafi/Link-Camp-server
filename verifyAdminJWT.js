const jwt = require("jsonwebtoken");

const verifyRoleJWT =
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

        // check if user has the require role
        if (requireRole && user.userType !== requireRole) {
          return res.status(403).json({ message: "Insufficient permissions" });
        }
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    });
  };

module.exports = verifyRoleJWT;
