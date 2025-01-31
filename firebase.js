import admin from "firebase-admin";
import dotenv from "dotenv";
import { readFileSync } from "fs";

// Load environment variables
dotenv.config();

// Read service account key (skip this if already initialized)
const serviceAccount = JSON.parse(readFileSync("serviceAccountKey.json", "utf8"));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

// Initialize Firestore
const db = admin.firestore();

export default db;
