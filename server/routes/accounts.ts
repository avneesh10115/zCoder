// src/routes/accounts.ts

import "dotenv/config";                // ← ensures process.env.* is populated
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Filter from "bad-words";

import UserModel from "../models/user";
import ProblemModel from "../models/problem";
import { existsEmail, existsUsername } from "../utils/utils";
import { authenticateToken } from "../middlewares/token";
import { customCors } from "../middlewares/cors";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "default_secret";
const accounts = express.Router();

// --------------------------------------
// POST /accounts/signup
// --------------------------------------
accounts.post<
  {},
  { id?: string; token?: string; success: boolean; message: string },
  { username: string; email: string; password: string }
>("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1) Required fields check
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields.",
      });
    }

    // 2) Validate email, password, username formats
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    const usernameRegex = /^[a-zA-Z0-9_-]{3,15}$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Email is not valid.",
      });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password is not valid. Must be at least 8 characters and contain a letter and a digit.",
      });
    }

    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        message:
          "Username must be 3–15 characters and may only contain letters, numbers, hyphens, and underscores.",
      });
    }

    // 3) Profanity filter
    const filter = new Filter();
    if (filter.isProfane(username)) {
      return res.status(400).json({
        success: false,
        message: "Username contains inappropriate language.",
      });
    }

    // 4) Check for existing username/email
    if (await existsUsername(username)) {
      return res.status(409).json({
        success: false,
        message: "Username already exists.",
      });
    }
    if (await existsEmail(email)) {
      return res.status(409).json({
        success: false,
        message: "Email already exists.",
      });
    }

    // 5) Hash password and save user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new UserModel({
      username,
      email,
      password: hashedPassword,
    });
    await newUser.save();

    // 6) Retrieve saved user to get its ID
    const savedUser = await UserModel.findOne({ username, email });
    const userId = savedUser ? savedUser.id.toString() : undefined;

    // 7) Sign a JWT payload as an object
    const token = jwt.sign(
      { username, id: userId },
      ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    console.log(`User '${username}' signed up at ${new Date().toISOString()}`);
    return res.status(201).json({
      token,
      id: userId,
      success: true,
      message: "Account created successfully",
    });
  } catch (err) {
    console.error("Error in /signup:", err);
    return res.status(500).json({
      success: false,
      message: "Error creating account",
    });
  }
});

// --------------------------------------
// POST /accounts/login
// --------------------------------------
accounts.post<
  {},
  { id?: string; token?: string; success: boolean; message: string },
  { username_or_email: string; password: string }
>("/login", async (req, res) => {
  const { username_or_email, password } = req.body;
  if (!username_or_email || !password) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  try {
    // 1) Find user by username or email
    const user = await UserModel.findOne({
      $or: [
        { username: username_or_email },
        { email: username_or_email },
      ],
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Username or email doesn’t exist",
      });
    }

    // 2) Compare provided password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(
        `User '${user.username}' failed login (incorrect password) at ${new Date().toISOString()}`
      );
      return res.status(401).json({
        success: false,
        message: "Password incorrect",
      });
    }

    // 3) Sign a JWT payload as an object
    const token = jwt.sign(
      { username: user.username, id: user.id },
      ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    console.log(`User '${user.username}' logged in at ${new Date().toISOString()}`);
    return res.json({
      token,
      id: user.id,
      success: true,
      message: "Logged in successfully",
    });
  } catch (err) {
    console.error("Error in /login:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// --------------------------------------
// POST /accounts/delete/:id  (requires auth)
// --------------------------------------
accounts.post("/delete/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await UserModel.findByIdAndDelete(id);
    return res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (err) {
    console.error("Error in /delete/:id:", err);
    return res.json({
      success: false,
      message: "Error deleting account",
    });
  }
});

// --------------------------------------
// GET /accounts/id/:id  (requires auth)
// --------------------------------------
accounts.get("/id/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json(user);
  } catch (err) {
    console.error("Error in /id/:id:", err);
    return res.status(500).json({ success: false, message: "Error fetching user" });
  }
});

// --------------------------------------
// GET /accounts/:name  (public user profile)
// --------------------------------------
accounts.get("/:name", async (req, res) => {
  const { name } = req.params;
  try {
    const user = await UserModel.findOne({ username: name });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const allProblems = await ProblemModel.find();

    let easyProblems = 0,
      mediumProblems = 0,
      hardProblems = 0;
    let easySolved = 0,
      mediumSolved = 0,
      hardSolved = 0;

    // Count total problems by difficulty and solved counts
    for (const prob of allProblems) {
      const diff = prob.main.difficulty;
      if (diff === "easy") {
        easyProblems++;
        if (user.problems_solved.includes(prob.main.name)) easySolved++;
      } else if (diff === "medium") {
        mediumProblems++;
        if (user.problems_solved.includes(prob.main.name)) mediumSolved++;
      } else {
        hardProblems++;
        if (user.problems_solved.includes(prob.main.name)) hardSolved++;
      }
    }

    const publicUser = {
      username: user.username,
      email: user.email,
      submissions: user.submissions,
      problems_starred: user.problems_starred,
      problems_solved: user.problems_solved,
      easy_problems_count: easyProblems,
      medium_problems_count: mediumProblems,
      hard_problems_count: hardProblems,
      problems_solved_easy: easySolved,
      problems_solved_medium: mediumSolved,
      problems_solved_hard: hardSolved,
      problems_attempted: user.problems_attempted,
      problems_solved_count: user.problems_solved_count,
      rank: user.rank,
      views: user.views,
      solution_count: user.solution_count,
      reputation_count: user.reputation_count,
    };

    return res.json(publicUser);
  } catch (err) {
    console.error("Error in /:name:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default accounts;
