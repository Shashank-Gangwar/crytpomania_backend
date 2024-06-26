import { app } from "./app.js";
import dotenv from "dotenv";
import { connectDB } from "./db/index.db.js";

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.on("Error before listen", (error) => {
      console.log("Unable to listen:  ", error);
      throw error;
    });

    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port: ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection Failed !!! ", err);
  });
