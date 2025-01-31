import { Timestamp } from "firebase-admin/firestore";

const createUser = ({
  firstname,
  lastname,
  username,
  userImage = "",
  bio = "",
  website = "",
}) => {
  if (
    typeof firstname !== "string" ||
    typeof lastname !== "string" ||
    typeof username !== "string"
  ) {
    throw new Error("firstname, lastname, and username must be strings.");
  }
  if (userImage && typeof userImage !== "string") {
    throw new Error("userImage must be a string.");
  }
  if (bio && typeof bio !== "string") {
    throw new Error("bio must be a string.");
  }
  if (website && typeof website !== "string") {
    throw new Error("website must be a string.");
  }

  return {
    firstname,
    lastname,
    username,
    userImage,
    bio,
    website,
    createdAt: Timestamp.now(), // Firestore timestamp for user creation
  };
};

export default createUser;
