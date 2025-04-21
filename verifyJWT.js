const jwt = require("jsonwebtoken");

const verifyJWT = (userCollection) => async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    const user = await userCollection.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Token expired, please log in again" });
    }
    return res
      .status(403)
      .json({ message: "Invalid token, authorization denied" });
  }
};

module.exports = verifyJWT;
