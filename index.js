const admin = require("firebase-admin");
require("dotenv").config(); // Load environment variables from .env file
const express = require("express"); // Import Express.js framework
const cors = require("cors"); // Import CORS middleware for handling cross-origin requests
const port = process.env.PORT || 5001; // Define server port, default to 5000
const { MongoClient, ServerApiVersion } = require("mongodb"); // Import MongoDB client and API version
// const cookieParser = require("cookie-parser"); // Import middleware for parsing cookies
const { ObjectId } = require("mongodb"); // Import ObjectId for MongoDB object IDs
const multer = require("multer"); // Import middleware for handling file uploads
const cloudinary = require("cloudinary").v2; // Import Cloudinary SDK for cloud media management
const { CloudinaryStorage } = require("multer-storage-cloudinary"); // Import Cloudinary storage engine for Multer
const verifyFirebaseAuth = require("./verifyFirebaseAuth");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const app = express();
app.use(express.json());
// app.use(cookieParser());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://link-camp.netlify.app",
      "http://localhost:8081",
    ],
    credentials: true,
  }),
);

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sgxrfxf.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with Stable API version settings
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Configure Cloudinary credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "linkcamp_uploads", // Cloudinary folder for uploads
    allowed_formats: ["jpg", "png", "jpeg", "webp", "avif"], // Allowed image formats
  },
});

// Create Multer instance with Cloudinary storage
const upload = multer({ storage });

// // Cookie options for HTTP-only, secure, same-site, and max age
// const cookieOption = {
//   httpOnly: true,
//   secure: false,
//   sameSite: "lax",
//   maxAge: 7 * 24 * 60 * 60 * 1000,
// };

// module.exports = upload;

async function connectToDatabase() {
  try {
    // Connect the client to the server
    // await client.connect();

    // collection to store users data
    const userCollection = client.db("linkcamp").collection("users");

    // collection to store posts
    const postCollection = client.db("linkcamp").collection("posts");

    // collection to store announcements
    const announcementCollection = client
      .db("linkcamp")
      .collection("announcements");

    // collection to store official-notice
    const noticetCollection = client.db("linkcamp").collection("notices");

    // collection to store votes
    const voteCollection = client.db("linkcamp").collection("votes");

    // collection to store comments
    const commentCollection = client.db("linkcamp").collection("comments");

    // collection to store reports
    const reportCollection = client.db("linkcamp").collection("reports");

    // collection to store comment reports
    const commentReportCollection = client
      .db("linkcamp")
      .collection("commentReports");

    // Initialize router
    const router = express.Router();

    // Route to fetch user details by email
    // router.get(
    //   "/user/:email",
    //   verifyFirebaseAuth(userCollection),
    //   async (req, res) => {
    //     const email = req.params.email;

    //     // Fetch user from the database
    //     const user = await userCollection.findOne({ email });

    //     // Return 404 if user not found
    //     if (!user) {
    //       return res.status(404).json({ message: "User not found" });
    //     }

    //     // Respond with the user data
    //     res.status(200).json(user);
    //   }
    // );

    // Mount router to API path
    app.use("/api", router);

    // store users data to userCollection
    app.post("/users", upload.single("photo"), async (req, res) => {
      const user = req.body;
      const existingUser = await userCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const photoUrl = req.file?.path || "";

      const userDoc = {
        ...user,
        photo: photoUrl,
      };

      await userCollection.insertOne(userDoc);

      res.send({
        message: "User created successfully",
        user: { email: user.email, photo: photoUrl },
      });
    });

    app.post("/login", async (req, res) => {
      const { email } = req.body;
      try {
        const user = await userCollection.findOne({ email });
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        res
          .status(200)
          .json({ message: "User exists, proceed with Firebase login" });
      } catch (error) {
        res.status(500).json({ message: "Server error" });
      }
    });

    app.post("/logout", (req, res) => {
      res.status(200).send({ message: "Logged out successfully" });
    });

    // get user data
    app.get(
      "/user/:email",
      verifyFirebaseAuth(userCollection),
      async (req, res) => {
        const email = req.params.email;
        const user = await userCollection.findOne({ email });
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
      },
    );

    // get all user data for admin
    app.get(
      "/admin/users",
      verifyFirebaseAuth(userCollection, ["admin"]),
      async (req, res) => {
        const {
          role,
          verify,
          page = 1,
          limit = 20,
          sort = "name_asc",
        } = req.query;

        const filter = {};
        if (role) filter.userType = role;
        if (verify) filter.verify = verify;

        const sortDir = sort === "name_desc" ? -1 : 1;

        const skip = (Number(page) - 1) * Number(limit);

        const users = await userCollection
          .find(filter)
          .sort({ name: sortDir })
          .skip(skip)
          .limit(Number(limit))
          .toArray();

        const total = await userCollection.countDocuments(filter);

        res.json({ items: users, total });
      },
    );

    app.get(
      "/admin/users/:id",
      verifyFirebaseAuth(userCollection, ["admin"]),
      async (req, res) => {
        const { id } = req.params;
        if (!ObjectId.isValid(id))
          return res.status(400).json({ message: "Invalid ID" });

        const user = await userCollection.findOne({ _id: new ObjectId(id) });
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json(user);
      },
    );

    // Update user verification status
    app.patch(
      "/admin/users/:id",
      verifyFirebaseAuth(userCollection, ["admin"]),
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
            { $set: { verify } },
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
      },
    );

    //  update user name

    app.patch(
      "/user/name",
      verifyFirebaseAuth(userCollection),
      async (req, res) => {
        const { email } = req.user;
        const { name } = req.body;

        if (!name) {
          return res.status(400).json({ message: "Name is required" });
        }

        try {
          const result = await userCollection.updateOne(
            { email },
            { $set: { name } },
          );

          if (result.matchedCount === 0) {
            return res.status(404).json({ message: "User not found" });
          }

          res.status(200).json({ message: "Name updated successfully" });
        } catch (error) {
          console.error("Error updating name:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // update user photo

    app.post(
      "/user/upload-photo",
      verifyFirebaseAuth(userCollection),
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
            { $set: { photo: photoUrl } },
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
      },
    );

    // Update full user profile (name, gender, userType, etc.)
    app.patch(
      "/user/profile",
      verifyFirebaseAuth(userCollection),
      upload.single("photo"),
      async (req, res) => {
        const { email } = req.user;

        const { name, gender, userType, user_id, department, session, verify } =
          req.body;

        const photoUrl = req.file?.path || null;

        const update = {};
        if (name) update.name = name;
        if (gender) update.gender = gender;
        if (userType) update.userType = userType;
        if (user_id !== undefined) update.user_id = user_id;
        if (department !== undefined) update.department = department;
        if (session !== undefined) update.session = session;
        if (verify !== undefined) update.verify = verify;
        if (photoUrl) update.photo = photoUrl;

        if (Object.keys(update).length === 0) {
          return res.status(400).json({ message: "No fields to update" });
        }

        try {
          const result = await userCollection.updateOne(
            { email },
            { $set: update },
          );

          if (result.matchedCount === 0) {
            return res.status(404).json({ message: "User not found" });
          }

          const updatedUser = await userCollection.findOne({ email });
          res
            .status(200)
            .json({ message: "Profile updated", user: updatedUser });
        } catch (error) {
          console.error("Error updating profile:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // user post functionality

    app.post(
      "/user/post",
      verifyFirebaseAuth(userCollection, null, { requireApproved: true }),
      upload.single("photo"),
      async (req, res) => {
        const { email } = req.user;
        const { content, postType } = req.body;
        let { repostOf } = req.body;
        const photoURL = req.file ? req.file.path : null;

        if (!content && !photoURL && !repostOf) {
          return res
            .status(400)
            .json({ message: "Either content or photo is required" });
        }

        if (repostOf) {
          try {
            const target = await postCollection.findOne({
              _id: new ObjectId(repostOf),
            });
            if (target) {
              const rootId = target.repostOf ? target.repostOf : target._id;
              repostOf = rootId.toString();
            }
          } catch (err) {
            console.error("Error processing repost:", err.message);
          }
        }

        try {
          const post = {
            email,
            content: content || null,
            photo: photoURL || null,
            postType: postType || "general",
            repostOf: repostOf || null,
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
      },
    );

    // announcement post functionality

    app.post(
      "/teacher/announcement",
      verifyFirebaseAuth(userCollection, ["teacher"], {
        requireApproved: true,
      }),
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
      },
    );

    // official notice post functionality

    app.post(
      "/admin/notice",
      verifyFirebaseAuth(userCollection, ["admin"], { requireApproved: true }),
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
          const result = await noticetCollection.insertOne(post);

          res.status(201).json({
            message: "notice Created Successfully",
            postId: result.insertedId,
          });
        } catch (error) {
          console.error("Error creating notice:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // get post data

    app.get("/posts", verifyFirebaseAuth(userCollection), async (req, res) => {
      try {
        // Fetch all posts from postCollection
        const posts = await postCollection.find().sort({ createdAt: -1 }).toArray();

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
          }),
        );

        res.status(200).json(combinedData);
      } catch (error) {
        console.error("Error fetching posts:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    // get single post data
    app.get(
      "/posts/:postId",
      verifyFirebaseAuth(userCollection),
      async (req, res) => {
        const { postId } = req.params;

        if (!ObjectId.isValid(postId)) {
          return res.status(400).json({ message: "Invalid post ID" });
        }

        try {
          const collections = [
            postCollection,
            announcementCollection,
            noticetCollection,
          ];
          let found = null;

          for (const col of collections) {
            const post = await col.findOne({ _id: new ObjectId(postId) });
            if (post) {
              found = post;
              break;
            }
          }

          if (!found)
            return res.status(404).json({ message: "Post not found" });

          res.status(200).json(found);
        } catch (error) {
          console.error("Error fetching post:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // update post data
    app.patch(
      "/posts/:postId",
      verifyFirebaseAuth(userCollection, null, { requireApproved: true }),
      upload.single("photo"),
      async (req, res) => {
        const { postId } = req.params;
        const { email } = req.user;
        const { content } = req.body;
        const removePhoto = req.body.removePhoto === "true";
        const photoURL = req.file ? req.file.path : null;

        if (!ObjectId.isValid(postId)) {
          return res.status(400).json({ message: "Invalid post ID" });
        }

        try {
          const collections = [
            postCollection,
            announcementCollection,
            noticetCollection,
          ];
          let targetCol = null;
          let post = null;

          for (const col of collections) {
            const found = await col.findOne({ _id: new ObjectId(postId) });
            if (found) {
              post = found;
              targetCol = col;
              break;
            }
          }

          if (!post || !targetCol) {
            return res.status(404).json({ message: "Post not found" });
          }

          const userDoc = await userCollection.findOne({ email });
          if (post.email !== email && userDoc?.userType !== "admin") {
            return res
              .status(403)
              .json({ message: "Unauthorized to edit this post" });
          }

          const update = {
            content: content?.trim() || null,
            updatedAt: new Date(),
          };

          if (removePhoto) update.photo = null;
          if (photoURL) update.photo = photoURL;

          await targetCol.updateOne(
            { _id: new ObjectId(postId) },
            { $set: update },
          );

          res.status(200).json({ message: "Post updated successfully" });
        } catch (error) {
          console.error("Error updating post:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // delete post data
    app.delete(
      "/posts/:postId",
      verifyFirebaseAuth(userCollection, null, { requireApproved: true }),
      async (req, res) => {
        const { postId } = req.params;
        const { email } = req.user;

        try {
          if (!ObjectId.isValid(postId)) {
            return res.status(400).json({ message: "Invalid post ID" });
          }

          const collections = [
            postCollection,
            announcementCollection,
            noticetCollection,
          ];
          let targetCol = null;
          let post = null;

          for (const col of collections) {
            const found = await col.findOne({ _id: new ObjectId(postId) });
            if (found) {
              post = found;
              targetCol = col;
              break;
            }
          }

          if (!post || !targetCol) {
            return res.status(404).json({ message: "Post not found" });
          }

          const userDoc = await userCollection.findOne({ email });
          if (post.email !== email && userDoc?.userType !== "admin") {
            return res
              .status(403)
              .json({ message: "Unauthorized to delete this post" });
          }

          await voteCollection.deleteMany({ postId });
          await commentCollection.deleteMany({ postId });
          await reportCollection.deleteMany({ postId });

          await targetCol.deleteOne({ _id: new ObjectId(postId) });

          res.status(200).json({
            message: "Post, votes, and comments deleted successfully",
          });
        } catch (error) {
          console.error("Error deleting post:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // get announcement data

    app.get(
      "/teacher/announcements",
      verifyFirebaseAuth(userCollection),
      async (req, res) => {
        try {
          // Fetch all announces from announceCollection
          const posts = await announcementCollection.find().sort({ createdAt: -1 }).toArray();

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
            }),
          );

          res.status(200).json(combinedData);
        } catch (error) {
          console.error("Error fetching posts:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // get notice data

    app.get(
      "/admin/notices",
      verifyFirebaseAuth(userCollection),
      async (req, res) => {
        try {
          // Fetch all notice from noticeCollection
          const posts = await noticetCollection.find().sort({ createdAt: -1 }).toArray();

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
            }),
          );

          res.status(200).json(combinedData);
        } catch (error) {
          console.error("Error fetching posts:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // Add or update a vote
    app.post(
      "/votes",
      verifyFirebaseAuth(userCollection, null, { requireApproved: true }),
      async (req, res) => {
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
                { $set: { voteType } },
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
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // Get all votes
    app.get("/votes", verifyFirebaseAuth(userCollection), async (req, res) => {
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
    app.get(
      "/votes/:postId",
      verifyFirebaseAuth(userCollection),
      async (req, res) => {
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
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // Get total upvotes and downvotes for all posts
    app.get(
      "/voteCounts",
      verifyFirebaseAuth(userCollection),
      async (req, res) => {
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
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // Get total comments count for all posts
    app.get(
      "/commentCounts",
      verifyFirebaseAuth(userCollection),
      async (req, res) => {
        try {
          const counts = await commentCollection
            .aggregate([{ $group: { _id: "$postId", count: { $sum: 1 } } }])
            .toArray();

          res.status(200).json(counts);
        } catch (error) {
          console.error("Error fetching comment counts:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // Get total repost count for all posts
    app.get(
      "/repostCounts",
      verifyFirebaseAuth(userCollection),
      async (req, res) => {
        try {
          const counts = await postCollection
            .aggregate([
              { $match: { repostOf: { $exists: true, $ne: null } } },
              { $group: { _id: "$repostOf", count: { $sum: 1 } } },
            ])
            .toArray();

          res.status(200).json(counts);
        } catch (error) {
          console.error("Error fetching repost counts:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // Get user activity from all collections (with original repost data)
    app.get(
      "/user/profile/:email",
      verifyFirebaseAuth(userCollection),
      async (req, res) => {
        const { email } = req.params;

        try {
          const [posts, announcements, notices] = await Promise.all([
            postCollection.find({ email }).sort({ createdAt: -1 }).toArray(),
            announcementCollection.find({ email }).sort({ createdAt: -1 }).toArray(),
            noticetCollection.find({ email }).sort({ createdAt: -1 }).toArray(),
          ]);

          const allPosts = [...posts, ...announcements, ...notices];

          const repostIds = [
            ...new Set(allPosts.map((p) => p.repostOf).filter(Boolean)),
          ];
          const repostObjectIds = repostIds
            .filter(ObjectId.isValid)
            .map((id) => new ObjectId(id));

          const [postRoots, annRoots, noticeRoots] = repostObjectIds.length
            ? await Promise.all([
                postCollection
                  .find({ _id: { $in: repostObjectIds } })
                  .toArray(),
                announcementCollection
                  .find({ _id: { $in: repostObjectIds } })
                  .toArray(),
                noticetCollection
                  .find({ _id: { $in: repostObjectIds } })
                  .toArray(),
              ])
            : [[], [], []];

          const originals = [...postRoots, ...annRoots, ...noticeRoots];
          const originalMap = {};
          originals.forEach((p) => {
            originalMap[p._id.toString()] = p;
          });

          const emails = new Set(allPosts.map((p) => p.email));
          originals.forEach((p) => p.email && emails.add(p.email));
          const users = await userCollection
            .find({ email: { $in: [...emails] } })
            .toArray();
          const userMap = {};
          users.forEach((u) => {
            userMap[u.email] = u;
          });

          const withUser = (post) => {
            const u = userMap[post.email];
            return {
              ...post,
              user: u
                ? { name: u.name, photo: u.photo, user_type: u.userType }
                : undefined,
            };
          };

          const combined = allPosts.map((p) => {
            const base = withUser(p);
            if (p.repostOf && originalMap[p.repostOf]) {
              return {
                ...base,
                originalPost: withUser(originalMap[p.repostOf]),
              };
            }
            return base;
          }).sort((a, b) => {
            const aTime = new Date(a.createdAt || 0).getTime();
            const bTime = new Date(b.createdAt || 0).getTime();
            return bTime - aTime;
          });

          res.status(200).json(combined);
        } catch (error) {
          console.error("Error fetching user profile data:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // Delete a post and its related votes and comments
    app.delete(
      "/posts/:postId",
      verifyFirebaseAuth(userCollection, null, { requireApproved: true }),
      async (req, res) => {
        const { postId } = req.params;

        try {
          // Delete related votes first
          await voteCollection.deleteMany({ postId });

          // Delete related comments too
          await commentCollection.deleteMany({ postId });

          // Delete related comments too
          await reportCollection.deleteMany({ postId });

          // Then delete the post from the respective collection (posts, announcements, or notices)
          const deleteResult = await Promise.all([
            postCollection.deleteOne({ _id: new ObjectId(postId) }),
            announcementCollection.deleteOne({ _id: new ObjectId(postId) }),
            noticetCollection.deleteOne({ _id: new ObjectId(postId) }),
          ]);

          // Check if a post was deleted
          const deleted = deleteResult.some(
            (result) => result.deletedCount > 0,
          );

          if (deleted) {
            res.status(200).json({
              message: "Post, votes, and comments deleted successfully",
            });
          } else {
            res.status(404).json({ message: "Post not found" });
          }
        } catch (error) {
          console.error(
            "Error deleting post, votes, and comments:",
            error.message,
          );
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // Add a comment to any post (post/announcement/notice)
    app.post(
      "/comments",
      verifyFirebaseAuth(userCollection, null, { requireApproved: true }),
      async (req, res) => {
        const { email } = req.user;
        const { postId, content } = req.body;

        if (!content || !postId) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        try {
          const comment = {
            postId,
            email,
            content,
            createdAt: new Date(),
          };

          const result = await commentCollection.insertOne(comment);

          res.status(201).json({
            message: "Comment added successfully",
            commentId: result.insertedId,
          });
        } catch (error) {
          console.error("Error adding comment:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // Get comments for a specific post
    app.get(
      "/comments/:postId",
      verifyFirebaseAuth(userCollection),
      async (req, res) => {
        const { postId } = req.params;

        try {
          const comments = await commentCollection
            .find({ postId })
            .sort({ createdAt: 1 })
            .toArray();

          // Fetch user details for each comment
          const commentsWithUserData = await Promise.all(
            comments.map(async (comment) => {
              const user = await userCollection.findOne({
                email: comment.email,
              });
              return {
                ...comment,
                user: {
                  name: user?.name,
                  photo: user?.photo,
                  user_type: user?.userType,
                },
              };
            }),
          );

          res.status(200).json(commentsWithUserData);
        } catch (error) {
          console.error("Error fetching comments:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // Update a comment
    app.patch(
      "/comments/:commentId",
      verifyFirebaseAuth(userCollection, null, { requireApproved: true }),
      async (req, res) => {
        const { commentId } = req.params;
        const { email } = req.user;
        const { content } = req.body;

        if (!content || !content.trim()) {
          return res.status(400).json({ message: "Content is required" });
        }

        if (!ObjectId.isValid(commentId)) {
          return res.status(400).json({ message: "Invalid comment ID" });
        }

        try {
          const comment = await commentCollection.findOne({
            _id: new ObjectId(commentId),
          });

          if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
          }

          const user = await userCollection.findOne({ email });
          if (comment.email !== email && user?.userType !== "admin") {
            return res
              .status(403)
              .json({ message: "Unauthorized to edit this comment" });
          }

          await commentCollection.updateOne(
            { _id: new ObjectId(commentId) },
            { $set: { content: content.trim(), editedAt: new Date() } },
          );

          res.json({ message: "Comment updated successfully" });
        } catch (error) {
          console.error("Error updating comment:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // Report a post
    app.post(
      "/reports",
      verifyFirebaseAuth(userCollection, null, { requireApproved: true }),
      async (req, res) => {
        const { email } = req.user;
        const { postId, reason } = req.body;

        if (!postId) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        try {
          // Check if user already reported this post
          const existingReport = await reportCollection.findOne({
            postId,
            reportedBy: email,
          });

          if (existingReport) {
            return res
              .status(400)
              .json({ message: "You have already reported this post" });
          }

          const report = {
            postId,
            reportedBy: email,
            reason: reason || "No reason provided",
            reportedAt: new Date(),
          };

          await reportCollection.insertOne(report);

          // Determine which collection contains this post
          let collection;
          if (await postCollection.findOne({ _id: new ObjectId(postId) })) {
            collection = postCollection;
          } else if (
            await announcementCollection.findOne({ _id: new ObjectId(postId) })
          ) {
            collection = announcementCollection;
          } else if (
            await noticetCollection.findOne({ _id: new ObjectId(postId) })
          ) {
            collection = noticetCollection;
          } else {
            return res.status(404).json({ message: "Post not found" });
          }

          // Increment report count
          await collection.updateOne(
            { _id: new ObjectId(postId) },
            { $inc: { reportCount: 1 } },
          );

          res.status(201).json({ message: "Post reported successfully" });
        } catch (error) {
          console.error("Error reporting post:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // Report a comment
    app.post(
      "/comment-reports",
      verifyFirebaseAuth(userCollection, null, { requireApproved: true }),
      async (req, res) => {
        const { email } = req.user;
        const { commentId, reason } = req.body;

        if (!commentId) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        if (!ObjectId.isValid(commentId)) {
          return res.status(400).json({ message: "Invalid comment ID" });
        }

        try {
          const comment = await commentCollection.findOne({
            _id: new ObjectId(commentId),
          });

          if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
          }

          const existingReport = await commentReportCollection.findOne({
            commentId,
            reportedBy: email,
          });

          if (existingReport) {
            return res
              .status(400)
              .json({ message: "You already reported this comment" });
          }

          await commentReportCollection.insertOne({
            commentId,
            postId: comment.postId || null,
            reportedBy: email,
            reason: reason || "No reason provided",
            reportedAt: new Date(),
          });

          res.status(201).json({ message: "Comment reported successfully" });
        } catch (error) {
          console.error("Error reporting comment:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // Get all reported posts for admin
    app.get(
      "/admin/reported-posts",
      verifyFirebaseAuth(userCollection, ["admin"]),
      async (req, res) => {
        try {
          const { page = 1, limit = 20, postId } = req.query;

          const reports = await reportCollection.find().toArray();

          const grouped = {};
          for (const r of reports) {
            if (!grouped[r.postId]) {
              grouped[r.postId] = { count: 0, latest: r.reportedAt };
            }
            grouped[r.postId].count += 1;
            if (r.reportedAt > grouped[r.postId].latest)
              grouped[r.postId].latest = r.reportedAt;
          }

          let postIds = Object.keys(grouped);
          if (postId) postIds = postIds.filter((id) => id === postId);

          postIds.sort(
            (a, b) =>
              new Date(grouped[b].latest).getTime() -
              new Date(grouped[a].latest).getTime(),
          );

          const total = postIds.length;
          const skip = (Number(page) - 1) * Number(limit);
          const pageIds = postIds.slice(skip, skip + Number(limit));

          const objectIds = pageIds
            .filter(ObjectId.isValid)
            .map((id) => new ObjectId(id));

          const [posts, anns, notices] = await Promise.all([
            postCollection.find({ _id: { $in: objectIds } }).toArray(),
            announcementCollection.find({ _id: { $in: objectIds } }).toArray(),
            noticetCollection.find({ _id: { $in: objectIds } }).toArray(),
          ]);

          const all = [...posts, ...anns, ...notices];

          const users = await userCollection
            .find({ email: { $in: all.map((p) => p.email) } })
            .toArray();
          const userMap = {};
          users.forEach((u) => (userMap[u.email] = u));

          const items = all.map((p) => ({
            ...p,
            reportCount: grouped[p._id.toString()]?.count || 0,
            user: userMap[p.email]
              ? {
                  name: userMap[p.email].name,
                  userType: userMap[p.email].userType,
                }
              : null,
          }));

          res.json({ items, total });
        } catch (error) {
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // Get all reported comments for admin
    app.get(
      "/admin/reported-comments",
      verifyFirebaseAuth(userCollection, ["admin"]),
      async (req, res) => {
        try {
          const { page = 1, limit = 20, commentId } = req.query;

          const reports = await commentReportCollection.find().toArray();

          const grouped = {};
          for (const r of reports) {
            if (!grouped[r.commentId]) {
              grouped[r.commentId] = {
                count: 0,
                latest: r.reportedAt,
                postId: r.postId,
              };
            }
            grouped[r.commentId].count += 1;
            if (r.reportedAt > grouped[r.commentId].latest)
              grouped[r.commentId].latest = r.reportedAt;
          }

          let commentIds = Object.keys(grouped);
          if (commentId)
            commentIds = commentIds.filter((id) => id === commentId);

          commentIds.sort(
            (a, b) =>
              new Date(grouped[b].latest).getTime() -
              new Date(grouped[a].latest).getTime(),
          );

          const total = commentIds.length;
          const skip = (Number(page) - 1) * Number(limit);
          const pageIds = commentIds.slice(skip, skip + Number(limit));
          const objectIds = pageIds
            .filter(ObjectId.isValid)
            .map((id) => new ObjectId(id));

          const comments = await commentCollection
            .find({ _id: { $in: objectIds } })
            .toArray();

          const postIds = [
            ...new Set(comments.map((c) => c.postId).filter(Boolean)),
          ];
          const postObjIds = postIds
            .filter(ObjectId.isValid)
            .map((id) => new ObjectId(id));

          const [posts, anns, notices] = await Promise.all([
            postCollection.find({ _id: { $in: postObjIds } }).toArray(),
            announcementCollection.find({ _id: { $in: postObjIds } }).toArray(),
            noticetCollection.find({ _id: { $in: postObjIds } }).toArray(),
          ]);
          const postMap = {};
          [...posts, ...anns, ...notices].forEach(
            (p) => (postMap[p._id.toString()] = p),
          );

          const users = await userCollection
            .find({ email: { $in: comments.map((c) => c.email) } })
            .toArray();
          const userMap = {};
          users.forEach((u) => (userMap[u.email] = u));

          const items = comments.map((c) => ({
            ...c,
            reportCount: grouped[c._id.toString()]?.count || 0,
            post: postMap[c.postId] || null,
            user: userMap[c.email]
              ? {
                  name: userMap[c.email].name,
                  userType: userMap[c.email].userType,
                }
              : null,
          }));

          res.json({ items, total });
        } catch (error) {
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // Admin endpoint to delete a reported post
    app.delete(
      "/admin/reported-posts/:postId",
      verifyFirebaseAuth(userCollection, ["admin"]),
      async (req, res) => {
        const { postId } = req.params;

        try {
          // First delete all reports for this post
          await reportCollection.deleteMany({ postId });

          // Then delete the post (your existing delete logic)
          const deleteResult = await Promise.all([
            postCollection.deleteOne({ _id: new ObjectId(postId) }),
            announcementCollection.deleteOne({ _id: new ObjectId(postId) }),
            noticetCollection.deleteOne({ _id: new ObjectId(postId) }),
          ]);

          // Also delete related votes and comments
          await Promise.all([
            voteCollection.deleteMany({ postId }),
            commentCollection.deleteMany({ postId }),
          ]);

          const deleted = deleteResult.some(
            (result) => result.deletedCount > 0,
          );

          if (deleted) {
            res.status(200).json({
              message: "Post and all related data deleted successfully",
            });
          } else {
            res.status(404).json({ message: "Post not found" });
          }
        } catch (error) {
          console.error("Error deleting reported post:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // Admin endpoint to dismiss reports for a post
    app.delete(
      "/admin/reported-posts/:postId/dismiss",
      verifyFirebaseAuth(userCollection, ["admin"]),
      async (req, res) => {
        const { postId } = req.params;

        try {
          // Delete all reports for this post
          const result = await reportCollection.deleteMany({ postId });

          // Reset report count in the original post
          await Promise.all([
            postCollection.updateOne(
              { _id: new ObjectId(postId) },
              { $set: { reportCount: 0 } },
            ),
            announcementCollection.updateOne(
              { _id: new ObjectId(postId) },
              { $set: { reportCount: 0 } },
            ),
            noticetCollection.updateOne(
              { _id: new ObjectId(postId) },
              { $set: { reportCount: 0 } },
            ),
          ]);

          res.status(200).json({
            message: "Reports dismissed successfully",
            deletedCount: result.deletedCount,
          });
        } catch (error) {
          console.error("Error dismissing reports:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    // Route to delete a comment
    app.delete(
      "/comments/:commentId",
      verifyFirebaseAuth(userCollection, null, { requireApproved: true }),
      async (req, res) => {
        const { commentId } = req.params;
        const { email } = req.user; // Get user email from JWT

        try {
          // Validate ObjectId
          if (!ObjectId.isValid(commentId)) {
            return res.status(400).json({ message: "Invalid comment ID" });
          }

          // Find the comment
          const comment = await commentCollection.findOne({
            _id: new ObjectId(commentId),
          });

          if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
          }

          // Check if the user deleting is the comment author or an admin
          const user = await userCollection.findOne({ email });
          if (comment.email !== email && user.userType !== "admin") {
            return res.status(403).json({
              message: "Unauthorized to delete this comment",
            });
          }

          // Delete the comment
          const result = await commentCollection.deleteOne({
            _id: new ObjectId(commentId),
          });

          if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Comment not found" });
          }

          res.json({ message: "Comment deleted successfully" });
        } catch (error) {
          console.error("Error deleting comment:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    //Route to delete a comment by admin
    app.delete(
      "/admin/reported-comments/:commentId",
      verifyFirebaseAuth(userCollection, ["admin"]),
      async (req, res) => {
        const { commentId } = req.params;
        if (!ObjectId.isValid(commentId))
          return res.status(400).json({ message: "Invalid comment ID" });

        await commentReportCollection.deleteMany({ commentId });
        await commentCollection.deleteOne({ _id: new ObjectId(commentId) });

        res.json({ message: "Comment and reports deleted" });
      },
    );

    app.delete(
      "/admin/reported-comments/:commentId/dismiss",
      verifyFirebaseAuth(userCollection, ["admin"]),
      async (req, res) => {
        const { commentId } = req.params;
        await commentReportCollection.deleteMany({ commentId });
        res.json({ message: "Comment reports dismissed" });
      },
    );

    //
    //
    //
    //
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
// run().catch(console.dir);

// Initiate the connection to MongoDB
connectToDatabase();

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <style>
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color:rgb(0, 0, 0);
            font-family: Arial, sans-serif;
          }
          .container {
            text-align: center;
            background-color: #ffcc00;
            padding: 40px;
            border: 2px solid #000;
            border-radius: 10px;
            box-shadow: 0 0 25px rgb(255, 0, 0);
          }
          h1 {
            font-size: 2em;
            color: #333;
          }
          p {
            font-size: 1.2em;
            color: #333;
          }
          a {
            color:rgb(255, 0, 0);
            text-decoration: none;
            font-weight: bold;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚨 Whoa, looks like you accidentally stumbled into the server side!</h1>
          <p>Don't worry, it's safe here... but head back to the campus home at 
          <a href="https://link-camp.netlify.app" target="_blank">LinkCamp</a> to catch up with the campus buzz! 😎📚</p>
        </div>
      </body>
    </html>
  `);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`simple crud is running on port ${port}`);
});
// module.exports = app;
