import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

const allowedOrigins = [
  "http://localhost:5174", // Your local frontend
  "https://storied-bavarois-f9ea67.netlify.app", // Your production frontend
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies and credentials
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS", // Allow specific HTTP methods
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

import router from "./routes/user.routes.js";

app.use("/api/v1/users", router);

export { app };
