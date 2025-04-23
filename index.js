const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const verifyJWT = require("./verifyJWT");
const jsonwebtoken = require("jsonwebtoken");
const verifyAdminJWT = require("./verifyAdminJWT");
const { ObjectId } = require("mongodb");

const app = express();
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

    // store users data to userCollection
    app.post("/users", async (req, res) => {
      const user = req.body;
      const existingUser = await userCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      await userCollection.insertOne(user);

      // generate jwt
      const token = jsonwebtoken.sign(
        { email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });

      res.send({
        message: "User created successfully",
        user: { email: user.email },
      });
    });

    // jwt verify when login
    app.post("/login", async (req, res) => {
      const { email } = req.body;
      try {
        const user = await userCollection.findOne({ email });
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Generate jwt token
        const token = jsonwebtoken.sign(
          { email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
        });
        res.status(200).json({ message: "Login successful", token });
      } catch (error) {
        res.status(500).json({ message: "Server error" });
      }
    });

    // clear cookies when logout
    app.post("/logout", (req, res) => {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
      res.status(200).send({ message: "Logged out successfully" });
    });

    // get user data
    app.get("/user/:email", verifyJWT(userCollection), async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json(user);
    });

    // get all user data for admin
    app.get(
      "/admin/users",
      verifyAdminJWT(userCollection, ["admin"]),
      async (req, res) => {
        const users = await userCollection.find().toArray();
        res.json(users);
      }
    );

    // Update user verification status
    app.patch(
      "/admin/users/:id",
      verifyAdminJWT(userCollection, ["admin"]),
      async (req, res) => {
        const { id } = req.params;
        const { verify } = req.body;

        try {
          // Validate ObjectId
          if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid user ID" });
          }

          // Update user status
          const result = await userCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { verify } }
          );

          if (result.matchedCount === 0) {
            return res.status(404).json({ message: "User not found" });
          }

          res.status(200).json({ message: "User status updated successfully" });
        } catch (error) {
          console.error("Error updating user status:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      }
    );

    //  update user name

    app.patch("/user/name", verifyJWT(userCollection), async (req, res) => {
      const { email } = req.user; // Extract email from the verified token
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }

      try {
        const result = await userCollection.updateOne(
          { email },
          { $set: { name } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "Name updated successfully" });
      } catch (error) {
        console.error("Error updating name:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
      }
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
