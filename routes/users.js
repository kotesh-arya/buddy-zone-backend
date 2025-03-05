import express from "express";
import db from "../firebase.js";
import createUser from "../models/userModel.js";
import { Timestamp } from "firebase-admin/firestore";
import { authenticate } from "../middlewares/authenticate.js";

const router = express.Router();
const usersCollection = db.collection("users");

// 🔹 Get all users
router.get("/", async (req, res) => {
  try {
    const snapshot = await usersCollection.get();
    if (snapshot.empty) {
      return res.status(404).json({ message: "No users found" });
    }

    const users = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to retrieve users", details: error.message });
  }
});
router.get("/suggestions", authenticate, async (req, res) => {
  try {
    const snapshot = await usersCollection
      .where("isFollowed", "==", false) // Filter users who are not followed
      .limit(4) // Limit results to 4 users
      .get();

    let users = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));

    // Remove the current user from the list
    users = users.filter((user) => user._id !== req.user.uid);


    const currentUserRef = usersCollection.doc(req.user.uid);
    const currentUserSnapshot = await currentUserRef.get();

    if (!currentUserSnapshot.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentUserData = currentUserSnapshot.data();

    res.json({
      users,
      followingUsers: currentUserData.followingUsers || [],
      followersUsers: currentUserData.followersUsers || [],
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to retrieve suggested users",
      details: error.message,
    });
  }
});





// // 🔹 Get a user by userId
// router.get("/:userId", async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const userDoc = await usersCollection.doc(userId).get();

//     if (!userDoc.exists) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     res.json({ _id: userDoc.id, ...userDoc.data() });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ error: "Failed to retrieve user", details: error.message });
//   }
// });

// // 🔹 Create a new user
// router.post("/", async (req, res) => {
//   try {
//     const newUser = createUser(req.body);

//     // Add new document with auto-generated ID
//     const docRef = await usersCollection.add(newUser);

//     res.status(201).json({ id: docRef.id, ...newUser });
//   } catch (error) {
//     res
//       .status(400)
//       .json({ error: "Invalid user data", details: error.message });
//   }
// });

// 🔹 Update/Edit an existing user
router.put("/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const userDoc = usersCollection.doc(userId);
    const doc = await userDoc.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedData = {
      ...req.body.userData,
      updatedAt: Timestamp.now(),
    };
    console.log("to be updated data ", updatedData);
    await userDoc.set(updatedData, { merge: true });

    // Fetch the updated user data
    const updatedUser = await userDoc.get();

    res.json({
      message: "User updated successfully",
      user: { userId: updatedUser.id, ...updatedUser.data() },
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to update user", details: error.message });
  }
});



// 🔹 Follow a user
router.post("/follow/:followUserId", authenticate, async (req, res) => {
  try {
    const { followUserId } = req.params; // User to be followed
    const followerId = req.user.uid; // Current authenticated user
    console.log("follower Id(current user Id)", followerId);
    if (followUserId === followerId) {
      return res.status(400).json({ error: "You cannot follow yourself." });
    }

    const userRef = usersCollection.doc(followerId); // Current user
    const followUserRef = usersCollection.doc(followUserId); // User to be followed

    const [userDoc, followUserDoc] = await Promise.all([
      userRef.get(),
      followUserRef.get(),
    ]);

    if (!userDoc.exists || !followUserDoc.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userDoc.data();
    const followUserData = followUserDoc.data();

    if (userData.following?.includes(followUserId)) {
      return res.status(400).json({ error: "User is already being followed." });
    }

    // Update following list of the current user
    const updatedFollowing = [...(userData.following || []), followUserId];
    await userRef.update({ following: updatedFollowing });

    // Update followers list of the user being followed
    const updatedFollowers = [...(followUserData.followers || []), followerId];
    await followUserRef.update({ followers: updatedFollowers });

    res.status(200).json({
      message: "User followed successfully.",
      updatedFollowing,
      updatedFollowers,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to follow user",
      details: error.message,
    });
  }
});


// 🔹 Unfollow a user
router.post("/unfollow/:unfollowUserId", authenticate, async (req, res) => {
  try {
    const { unfollowUserId } = req.params;
    const userId = req.user.uid; // Current authenticated user

    if (userId === unfollowUserId) {
      return res.status(400).json({ error: "You cannot unfollow yourself." });
    }

    const userRef = usersCollection.doc(userId);
    const unfollowUserRef = usersCollection.doc(unfollowUserId);

    const [userDoc, unfollowUserDoc] = await Promise.all([
      userRef.get(),
      unfollowUserRef.get(),
    ]);

    if (!userDoc.exists || !unfollowUserDoc.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userDoc.data();
    const unfollowUserData = unfollowUserDoc.data();

    if (!userData.following?.includes(unfollowUserId)) {
      return res.status(400).json({ error: "User is not being followed." });
    }

    // Remove user from following list
    const updatedFollowing = userData.following.filter((id) => id !== unfollowUserId);
    await userRef.update({ following: updatedFollowing });

    // Remove user from unfollowed user's followers list
    const updatedFollowers = unfollowUserData.followers.filter((id) => id !== userId);
    await unfollowUserRef.update({ followers: updatedFollowers });

    res.status(200).json({
      message: "User unfollowed successfully.",
      updatedFollowing,
      updatedFollowers,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to unfollow user",
      details: error.message,
    });
  }
});


export default router;
