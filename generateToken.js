const admin = require("firebase-admin");
require("dotenv").config();

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

async function generateCustomToken() {
  const uid = "admin@example.com"; // match email
  const token = await admin.auth().createCustomToken(uid);
  console.log("Custom Token:", token);
}

generateCustomToken();
