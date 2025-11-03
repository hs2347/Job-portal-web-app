import mongoose from "mongoose";

// We create a "cached" spot to hold our connection
// so we don't have to connect every single time.
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDB() {
  // If we already have a connection, use it!
  if (cached.conn) {
    console.log("Using existing database connection.");
    return cached.conn;
  }

  // If we don't have a connection, let's make one.
  if (!cached.promise) {
    const MONGODB_URL = process.env.MONGODB_URL;

    if (!MONGODB_URL) {
      throw new Error(
        "Please define the MONGODB_URL environment variable inside .env.local"
      );
    }

    cached.promise = mongoose
      .connect(MONGODB_URL, {
        bufferCommands: false,
      })
      .then((mongoose) => {
        console.log("New database connection successful!");
        return mongoose;
      });
  }

  // Wait for the connection to finish and save it
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("Database connection failed:", e);
    throw e;
  }

  return cached.conn;
}

export default connectToDB;