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
//     : JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT.replace(/\\n/g, '\n'));

const serviceAccount = JSON.parse(
  readFileSync("serviceAccountKey.json", "utf8")
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Initialize Firestore
const db = admin.firestore();

export default db;
