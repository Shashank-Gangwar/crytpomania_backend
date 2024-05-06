import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin:
      "http://localhost:5173" ||
      "https://66391cca98b79f0008df9f46--storied-bavarois-f9ea67.netlify.app/",
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

import router from "./routes/user.routes.js";

app.use("/api/v1/users", router);

export { app };
