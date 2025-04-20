const jwt = require("jsonwebtoken");

const verifyJWT = (req, res, next) => {
  // get token from cookies
  const token = req.cookies.token;

  // If there's no token, return 401 (unauthorized) error
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  // verify the token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .json({ message: "Invalid token, authorization denied" });
    }
    // Save the decoded user information to the request object
    req.user = decoded;
    next(); // Allow the request to proceed
  });
};
module.exports = verifyJWT;
