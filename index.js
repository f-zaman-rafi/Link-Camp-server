const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const verifyJWT = require("./verifyJWT");
const jsonwebtoken = require("jsonwebtoken");
const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173", // or your frontend URL
    credentials: true,
  })
);

//
//
//
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.okia5sv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
//
//
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();

    const userCollection = client.db("linkcamp").collection("users");
    //
    //
    // store users data to userCollection
    app.post("/users", async (req, res) => {
      const user = req.body;

      // hash the password
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Replace plain password with hashed one
      user.password = hashedPassword;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    //
    //
    // verify users via jwt
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      // authenticate user
      const user = await userCollection.findOne({ email });

      if (!user) {
        return res.status(401).send("Invalid credentials");
      }

      // compare hashed password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).send("Invalid credentials");
      }

      // Generate a JWT token
      const token = jsonwebtoken.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // set the token in an HTTP-only cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 3600 * 1000,
      });
      res.status(200).send({ message: "Logged in Successfully" });
    });

    // get user data
    app.get("/user", verifyJWT, async (req, res) => {
      const userId = req.user.id;

      const user = await userCollection.findOne({ _id: userId });
      if (!user) {
        return res.status(404).json({ message: "user not found" });
      }
      res.status(200).json(user);
    });

    //
    //
    //
    //
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Simple crud is running");
});

app.listen(port, () => {
  console.log(`simple crud is running on port; ${port}`);
});
