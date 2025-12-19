const admin = require("firebase-admin");
require("dotenv").config(); // Load environment variables from .env file
const express = require("express"); // Import Express.js framework
const cors = require("cors"); // Import CORS middleware for handling cross-origin requests
const port = process.env.PORT || 5000; // Define server port, default to 5000
const { MongoClient, ServerApiVersion } = require("mongodb"); // Import MongoDB client and API version
const cookieParser = require("cookie-parser"); // Import middleware for parsing cookies
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

const app = express(); // Create Express application instance
app.use(express.json()); // Middleware to parse JSON request bodies
app.use(cookieParser()); // Middleware to parse cookies

app.use(
  cors({
    origin: ["http://localhost:5173", "https://link-camp.netlify.app"], // Allowed origins for CORS
    credentials: true, // Allow sending and receiving cookies
  })
);

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.okia5sv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    allowed_formats: ["jpg", "png", "jpeg", "webp"], // Allowed image formats
  },
});

// Create Multer instance with Cloudinary storage
const upload = multer({ storage });

// Cookie options for HTTP-only, secure, same-site, and max age
const cookieOption = {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

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

    // store users data to userCollection
    app.post("/users", async (req, res) => {
      const user = req.body;
      const existingUser = await userCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      await userCollection.insertOne(user);

      res.send({
        message: "User created successfully",
        user: { email: user.email },
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
      }
    );

    // get all user data for admin
    app.get(
      "/admin/users",
      verifyFirebaseAuth(userCollection, ["admin"]),
      async (req, res) => {
        const users = await userCollection.find().toArray();
        res.json(users);
      }
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
            { $set: { name } }
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
      }
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
      verifyFirebaseAuth(userCollection),
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
      verifyFirebaseAuth(userCollection),
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

    // official notice post functionality

    app.post(
      "/admin/notice",
      verifyFirebaseAuth(userCollection, ["admin"]),
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
      }
    );

    // get post data

    app.get("/posts", verifyFirebaseAuth(userCollection), async (req, res) => {
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

    app.get(
      "/teacher/announcements",
      verifyFirebaseAuth(userCollection),
      async (req, res) => {
        try {
          // Fetch all announces from announceCollection
          const posts = await announcementCollection.find().toArray();

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
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      }
    );

    // get notice data

    app.get(
      "/admin/notices",
      verifyFirebaseAuth(userCollection),
      async (req, res) => {
        try {
          // Fetch all notice from noticeCollection
          const posts = await noticetCollection.find().toArray();

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
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      }
    );

    // Add or update a vote
    app.post("/votes", verifyFirebaseAuth(userCollection), async (req, res) => {
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
      }
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
      }
    );

    // Get user activity from all collections
    app.get(
      "/user/profile/:email",
      verifyFirebaseAuth(userCollection),
      async (req, res) => {
        const { email } = req.params;

        try {
          // Fetch posts from all collections
          const [posts, announcements, notices] = await Promise.all([
            postCollection.find({ email }).toArray(),
            announcementCollection.find({ email }).toArray(),
            noticetCollection.find({ email }).toArray(),
          ]);

          // Combine all posts into one array
          const allPosts = [...posts, ...announcements, ...notices];

          // Just return the combined posts (without vote functionality)
          res.status(200).json(allPosts);
        } catch (error) {
          console.error("Error fetching user profile data:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      }
    );

    // Delete a post and its related votes and comments
    app.delete(
      "/posts/:postId",
      verifyFirebaseAuth(userCollection),
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
            (result) => result.deletedCount > 0
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
            error.message
          );
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      }
    );

    // Add a comment to any post (post/announcement/notice)
    app.post(
      "/comments",
      verifyFirebaseAuth(userCollection),
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
      }
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
            })
          );

          res.status(200).json(commentsWithUserData);
        } catch (error) {
          console.error("Error fetching comments:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      }
    );

    // Report a post
    app.post(
      "/reports",
      verifyFirebaseAuth(userCollection),
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
            { $inc: { reportCount: 1 } }
          );

          res.status(201).json({ message: "Post reported successfully" });
        } catch (error) {
          console.error("Error reporting post:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      }
    );

    // Get all reported posts for admin
    app.get(
      "/admin/reported-posts",
      verifyFirebaseAuth(userCollection, ["admin"]),
      async (req, res) => {
        try {
          // Get all reports
          const reports = await reportCollection.find().toArray();

          // Get unique post IDs from reports
          const postIds = [...new Set(reports.map((report) => report.postId))];

          // Fetch all posts (from all collections) that have been reported
          const reportedPosts = await Promise.all(
            postIds.map(async (postId) => {
              // Check in each collection
              let post = await postCollection.findOne({
                _id: new ObjectId(postId),
              });
              let collectionType = "post";

              if (!post) {
                post = await announcementCollection.findOne({
                  _id: new ObjectId(postId),
                });
                collectionType = "announcement";
              }

              if (!post) {
                post = await noticetCollection.findOne({
                  _id: new ObjectId(postId),
                });
                collectionType = "notice";
              }

              if (!post) return null;

              // Get reporter details
              const reportDetails = reports.filter((r) => r.postId === postId);
              const reporters = await Promise.all(
                reportDetails.map(async (report) => {
                  const user = await userCollection.findOne({
                    email: report.reportedBy,
                  });
                  return {
                    email: report.reportedBy,
                    name: user?.name,
                    reason: report.reason,
                    reportedAt: report.reportedAt,
                  };
                })
              );

              // Get post author details
              const author = await userCollection.findOne({
                email: post.email,
              });

              return {
                ...post,
                collectionType,
                author: {
                  name: author?.name,
                  email: author?.email,
                  userType: author?.userType,
                },
                reporters,
                reportCount: reportDetails.length,
              };
            })
          );

          // Filter out null posts (if any)
          const validPosts = reportedPosts.filter((post) => post !== null);

          res.status(200).json(validPosts);
        } catch (error) {
          console.error("Error fetching reported posts:", error.message);
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      }
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
            (result) => result.deletedCount > 0
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
      }
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
              { $set: { reportCount: 0 } }
            ),
            announcementCollection.updateOne(
              { _id: new ObjectId(postId) },
              { $set: { reportCount: 0 } }
            ),
            noticetCollection.updateOne(
              { _id: new ObjectId(postId) },
              { $set: { reportCount: 0 } }
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
      }
    );

    // Route to delete a comment
    app.delete(
      "/comments/:commentId",
      verifyFirebaseAuth(userCollection),
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
      }
    );
    //
    //
    //
    //
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
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

app.listen(port, () => {
  console.log(`simple crud is running on port; ${port}`);
});
// module.exports = app;
