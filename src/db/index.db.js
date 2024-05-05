import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/cryptomania`
    );

    console.log(
      `\nMongoDB connected successfuly !! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MongoDB Connection Failed: ", error), process.exit(1);
  }
};

export { connectDB };
