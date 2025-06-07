// You’re mixing CommonJS and ES modules here. 
// It works at runtime if your tsconfig / build environment allows interop,
// but in pure TS you would normally write:
//    import "dotenv/config";
// instead of require("dotenv").config().
require("dotenv").config();

import express from "express";
import cors from "cors";
import router from "./routes/index";       // make sure this points to a TS-exported router
import mongoose from "mongoose";
import { customCors } from "./middlewares/cors";


// Pull MONGODB_URI from the environment or fall back to local Mongo
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/leet";
console.log("Connecting to MongoDB at:", MONGODB_URI);

// You should pass at least the “useNewUrlParser” and “useUnifiedTopology” options
// so you don’t get deprecation warnings. Also, it’s better to await the connection
// or catch a rejected promise, in case the URI is bad.
mongoose
  .connect(MONGODB_URI, {
    // (Since Mongoose 6, these are defaults, but it’s still common to specify them.)
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as mongoose.ConnectOptions)
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

export const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("✅ Connected to MongoDB");
});

const app = express();
// On most hosts (including Render, Heroku, etc.), the port will be provided in process.env.PORT.
// Falling back to 80 is fine for local dev, but you might prefer 3000 or 5000 locally if that’s your convention.
const PORT = Number(process.env.PORT) || 80;

// If you have a custom CORS implementation, you can use that. Otherwise, you can uncomment the line below.
// app.use(cors());
app.use(customCors);

// For JSON‐body parsing:
app.use(express.json());

// Mount your “/api” router.  Make sure “router” is something like:
//   const router = express.Router();
//   router.get("/health", (req, res) => res.json({ ok: true }));
//   export default router;
// 
// Then a client can call GET /api/health and your router will handle it.
app.use("/api", router);

// Only start listening if this file was invoked directly (i.e. `node dist/server.js`).
// This is important if you ever import / require this app in another module (for tests, for example).
if (require.main === module) {
  app.listen(PORT, () => console.log(`🎧 Listening on port ${PORT}`));
}

// You might also export “app” in case you want to write integration tests like:
//   import request from "supertest";
//   import { app } from "../server";
//   test("GET /api/health returns 200", async () => { ... });
export default app;
