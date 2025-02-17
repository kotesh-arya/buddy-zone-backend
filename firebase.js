import admin from "firebase-admin";
import dotenv from "dotenv";
import { readFileSync } from "fs";

// Load environment variables
dotenv.config();
console.log("current environment", process.env.ENVIRONMENT);

// Read service account key (skip this if already initialized)
// const serviceAccount =
//   process.env.ENVIRONMENT === "dev"
//     ? JSON.parse(readFileSync("serviceAccountKey.json", "utf8"))
//     : JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT.replace(/\\n/g, "\n"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      projectId: process.env.FIREBASE_PROJECT_ID,
    }),
  });
}

// Initialize Firestore
const db = admin.firestore();

export default db;
