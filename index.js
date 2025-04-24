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
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

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

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "linkcamp_uploads",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const upload = multer({ storage });

module.exports = upload;

async function run() {
  try {
    // Connect the client to the server
    await client.connect();

    // collection to store users data
    const userCollection = client.db("linkcamp").collection("users");

    // collection to store posts
    const postCollection = client.db("linkcamp").collection("posts");

    // collection to store posts
    const announcementCollection = client
      .db("linkcamp")
      .collection("announcements");

    // collection to store votes
    const voteCollection = client.db("linkcamp").collection("votes");

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
      const { email } = req.user;
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

    // update user photo

    app.post(
      "/user/upload-photo",
      verifyJWT(userCollection),
      upload.single("photo"),
      async (req, res) => {
        const { email } = req.user; // Extract email from the verified token
        const photoUrl = req.file.path; // Cloudinary URL from the uploaded file

        if (!photoUrl) {
          return res.status(400).json({ message: "Photo upload failed" });
        }

        try {
          const result = await userCollection.updateOne(
            { email },
            { $set: { photo: photoUrl } }
          );

          if (result.matchedCount === 0) {
            return res.status(404).json({ message: "User not found" });
          }

          res
            .status(200)
            .json({ message: "Photo uploaded successfully", photoUrl });
        } catch (error) {
          console.error("Error uploading photo:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      }
    );

    // user post functionality

    app.post(
      "/user/post",
      verifyJWT(userCollection),
      upload.single("photo"),
      async (req, res) => {
        const { email } = req.user;
        const { content } = req.body;
        const photoURL = req.file ? req.file.path : null;

        if (!content && !photoURL) {
          return res
            .status(400)
            .json({ message: "Either content or photo is required" });
        }

        try {
          const post = {
            email,
            content: content || null,
            photo: photoURL || null,
            createdAt: new Date(),
          };
          const result = await postCollection.insertOne(post);

          res.status(201).json({
            message: "Post Created Successfully",
            postId: result.insertedId,
          });
        } catch (error) {
          console.error("Error creating post:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      }
    );

    // announcement post functionality

    app.post(
      "/teacher/announcement",
      verifyJWT(userCollection),
      upload.single("photo"),
      async (req, res) => {
        const { email } = req.user;
        const { content } = req.body;
        const photoURL = req.file ? req.file.path : null;

        if (!content && !photoURL) {
          return res
            .status(400)
            .json({ message: "Either content or photo is required" });
        }

        try {
          const post = {
            email,
            content: content || null,
            photo: photoURL || null,
            createdAt: new Date(),
          };
          const result = await announcementCollection.insertOne(post);

          res.status(201).json({
            message: "announcement Created Successfully",
            postId: result.insertedId,
          });
        } catch (error) {
          console.error("Error creating announcement:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      }
    );

    // get post data

    app.get("/posts", async (req, res) => {
      try {
        // Fetch all posts from postCollection
        const posts = await postCollection.find().toArray();

        // Fetch user data for each post
        const combinedData = await Promise.all(
          posts.map(async (post) => {
            const user = await userCollection.findOne({ email: post.email });

            if (!user) {
              throw new Error(`User not found for email: ${post.email}`);
            }

            return {
              ...post,
              user: {
                name: user.name,
                photo: user.photo,
                user_type: user.userType,
              },
            };
          })
        );

        res.status(200).json(combinedData);
      } catch (error) {
        console.error("Error fetching posts:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    // get announcement data

    app.get("/announcements", async (req, res) => {
      try {
        // Fetch all posts from postCollection
        const posts = await announcementCollection.find().toArray();

        // Fetch user data for each post
        const combinedData = await Promise.all(
          posts.map(async (post) => {
            const user = await userCollection.findOne({ email: post.email });

            if (!user) {
              throw new Error(`User not found for email: ${post.email}`);
            }

            return {
              ...post,
              user: {
                name: user.name,
                photo: user.photo,
                user_type: user.userType,
              },
            };
          })
        );

        res.status(200).json(combinedData);
      } catch (error) {
        console.error("Error fetching posts:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    // Add or update a vote
    app.post("/votes", verifyJWT(userCollection), async (req, res) => {
      const { postId, voteType } = req.body;
      const { email } = req.user;

      try {
        const existingVote = await voteCollection.findOne({
          postId,
          userEmail: email,
        });

        if (existingVote) {
          if (existingVote.voteType === voteType) {
            await voteCollection.deleteOne({ _id: existingVote._id });
            return res.status(200).json({ message: "Vote removed" });
          } else {
            await voteCollection.updateOne(
              { _id: existingVote._id },
              { $set: { voteType } }
            );
            return res.status(200).json({ message: "Vote updated" });
          }
        } else {
          await voteCollection.insertOne({
            postId,
            userEmail: email,
            voteType,
          });
          return res.status(201).json({ message: "Vote added" });
        }
      } catch (error) {
        console.error("Error handling vote:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    // Get all votes
    app.get("/votes", verifyJWT(userCollection), async (req, res) => {
      const { email } = req.user; // Get the user's email from the verified token

      try {
        const votes = await voteCollection.find({ userEmail: email }).toArray(); // Fetch all votes by the user
        res.status(200).json(votes);
      } catch (error) {
        console.error("Error fetching votes:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    // Get total upvotes and downvotes for a post
    app.get("/votes/:postId", async (req, res) => {
      const { postId } = req.params;

      try {
        const upvotes = await voteCollection.countDocuments({
          postId,
          voteType: "upvote",
        });
        const downvotes = await voteCollection.countDocuments({
          postId,
          voteType: "downvote",
        });

        res.status(200).json({ upvotes, downvotes });
      } catch (error) {
        console.error("Error fetching votes:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    // Get total upvotes and downvotes for all posts
    app.get("/voteCounts", async (req, res) => {
      try {
        const voteCounts = await voteCollection
          .aggregate([
            {
              $group: {
                _id: "$postId",
                upvotes: {
                  $sum: { $cond: [{ $eq: ["$voteType", "upvote"] }, 1, 0] },
                },
                downvotes: {
                  $sum: { $cond: [{ $eq: ["$voteType", "downvote"] }, 1, 0] },
                },
              },
            },
          ])
          .toArray();

        res.status(200).json(voteCounts);
      } catch (error) {
        console.error("Error fetching vote counts:", error.message);
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
