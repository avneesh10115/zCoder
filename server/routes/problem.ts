// src/routes/problem.ts

import express, { Request, Response } from "express";
import { writeTestFile } from "../utils/createTest";
import ProblemModel, { DProblem } from "../models/problem";
import UserModel from "../models/user";
import { ThreadModel, CommentModel } from "../models/discussion";
import { authenticateToken } from "../middlewares/token";
import {
  sortByAcceptance,
  sortByDifficulty,
  sortByTitle,
} from "../utils/utils";

const router = express.Router();


// --------------------------------------
// POST /api/problem/all
// --------------------------------------
router.post(
  "/all",
  async (
    req: Request<{}, {}, { id: string }>,
    res: Response<DProblem[] | { success: false; message: string }>
  ) => {
    const { id } = req.body;
    const search = (req.query.search as string) || "";
    const difficulty = (req.query.difficulty as string) || "";
    const acceptance = (req.query.acceptance as string) || "";
    const title = (req.query.title as string) || "";

    try {
      const raw = await ProblemModel.find(
        { "main.name": { $regex: search, $options: "i" } },
        "main.id main.name main.acceptance_rate_count main.difficulty main.like_count main.dislike_count"
      )
        .sort({ "main.id": 1 })
        .lean()
        .exec();

      const sorted = sortByAcceptance(
        acceptance as "asc" | "desc",
        sortByDifficulty(
          difficulty as "asc" | "desc",
          sortByTitle(title as "asc" | "desc", raw)
        )
      );

      const user = await UserModel.findById(id).lean();
      const solved = new Set(user?.problems_solved || []);
      const attempted = new Set(user?.problems_attempted || []);

      const result = sorted.map((p: any) => {
        if (solved.has(p.main.name)) p.main.status = "solved";
        else if (attempted.has(p.main.name)) p.main.status = "attempted";
        return p as DProblem;
      });

      return res.json(result);
    } catch (err) {
      console.error("Error in /all:", err);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }
);

// --------------------------------------
// POST /api/problem/submit/:name
// --------------------------------------
router.post<
  { name: string },
  Submission[],
  { code: string; id: string; problem_name: string; language?: "javascript" | "python" }
>(
  "/submit/:name",
  async (req, res: Response<Submission[]>) => {
    const { name } = req.params;
    const { id, problem_name, code, language = "javascript" } = req.body;
    const langLabel = "JavaScript";
    try {
      const [problemDoc, user] = await Promise.all([
        ProblemModel.findOne({ "main.name": name }).lean(),
        UserModel.findById(id).exec(),
      ]);

      const history = user?.submissions || [];

      if (!problemDoc || !user) {
        return res.json([
          {
            problem_name,
            status: "Wrong Answer",
            error: "User or problem not found",
            time: new Date(),
            runtime: 0,
            language: langLabel,
            memory: 0,
            code_body: code,
            input: null,
            expected_output: null,
            user_output: null,
          },
        ]);
      }

      const result = await writeTestFile(
        code,
        problemDoc.test,
        problemDoc.function_name,
      );
      const stdout = result.stdout;
      if (!stdout) throw new Error("No output from test runner");

      const thisSubmission: Submission = {
        problem_name,
        status: stdout.status,
        error: stdout.error_message ?? null,
        time: new Date(stdout.date),
        runtime: stdout.runtime,
        language: langLabel,
        memory: Math.random() * 80,
        code_body: code,
        input: stdout.input ?? null,
        expected_output: stdout.expected_output ?? null,
        user_output: stdout.user_output ?? null,
      };
      const updated = [thisSubmission, ...history];

      if (stdout.status === "Accepted") {
        if (!user.problems_solved.includes(problem_name)) {
          user.problems_solved.push(problem_name);
          user.problems_solved_count += 1;
        }
      } else {
        if (!user.problems_attempted.includes(problem_name)) {
          user.problems_attempted.push(problem_name);
        }
      }

      user.submissions = updated;
      await user.save();

      return res.json(updated.filter((s) => s.problem_name === problem_name));
    } catch (err) {
      console.error("Error in /submit/:name:", err);

      // fallback runtime‐error
      const runtimeError: Submission = {
        problem_name: req.params.name,
        status: "Runtime Error",
        error: (err as Error).message,
        time: new Date(),
        runtime: 0,
        language: langLabel,
        memory: 0,
        code_body: req.body.code,
        input: null,
        expected_output: null,
        user_output: null,
      };
      const user = await UserModel.findById(req.body.id).exec();
      if (user) {
        user.submissions = [runtimeError, ...(user.submissions || [])];
        if (!user.problems_attempted.includes(runtimeError.problem_name)) {
          user.problems_attempted.push(runtimeError.problem_name);
        }
        await user.save();
      }
      return res.json([runtimeError]);
    }
  }
);

// --------------------------------------
// POST /api/problem/submissions/:name
// --------------------------------------
router.post<
  { name: string },
  Submission[],
  { id: string }
>(
  "/submissions/:name",
  async (req, res: Response<Submission[]>) => {
    const { name } = req.params;
    const { id } = req.body;
    try {
      const user = await UserModel.findById(id).lean();
      if (!user?.submissions) return res.json([]);
      return res.json(user.submissions.filter((s) => s.problem_name === name));
    } catch (err) {
      console.error("Error in /submissions:", err);
      return res.json([]);
    }
  }
);

// --------------------------------------
// POST /api/problem/:name   (fetch one)
// --------------------------------------
router.post(
  "/:name",
  async (
    req: Request<{ name: string }, DProblem | { error: string }, { id?: string }>,
    res: Response<DProblem | { error: string }>
  ) => {
    const { name } = req.params;
    const { id } = req.body;
    try {
      const problemDoc = await ProblemModel.findOne({ "main.name": name }).lean();
      if (!problemDoc) {
        return res.status(404).json({ error: "problem not found" });
      }
      if (id) {
        const user = await UserModel.findById(id).lean();
        if (user?.problems_attempted.includes(name)) problemDoc.main.status = "attempted";
        if (user?.problems_solved.includes(name)) problemDoc.main.status = "solved";
      }
      return res.json(problemDoc);
    } catch (err) {
      console.error("Error in /:name:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// --------------------------------------
// GET /api/problem/:name/editorial
// --------------------------------------
router.get(
  "/:name/editorial",
  async (req: Request<{ name: string }>, res: Response) => {
    const { name } = req.params;
    try {
      const problemDoc = await ProblemModel.findOne({ "main.name": name }).lean();
      if (!problemDoc) return res.status(404).json({ error: "problem not found" });
      return res.json(problemDoc.editorial);
    } catch (err) {
      console.error("Error in /editorial:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// --------------------------------------
// GET /api/problem/:name/discussions
// --------------------------------------
router.get(
  "/:name/discussions",
  async (req: Request<{ name: string }>, res: Response) => {
    const { name } = req.params;
    try {
      const docs = await ThreadModel.find({ problemName: name }).sort({ createdAt: -1 });
      const threads = docs.map((t) => ({
        _id: t._id.toString(),
        title: t.title,
        author: t.authorId,
        createdAt: t.createdAt.toISOString(),
      }));
      return res.json(threads);
    } catch (err) {
      console.error("Error fetching discussions:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// --------------------------------------
// POST /api/problem/:name/discussions
// --------------------------------------
router.post(
  "/:name/discussions",
  authenticateToken,
  async (
    req: Request<{ name: string }, {}, { title: string; body: string }>,
    res: Response
  ) => {
    const { name } = req.params;
    const { title, body } = req.body;
    // our authenticateToken puts decoded payload on req.user
    const authorId = (req as any).user?.username as string;
    try {
      const thread = new ThreadModel({ problemName: name, title, body, authorId });
      await thread.save();
      return res.status(201).json({
        _id: thread._id.toString(),
        title: thread.title,
        author: thread.authorId,
        createdAt: thread.createdAt.toISOString(),
      });
    } catch (err) {
      console.error("Error creating thread:", err);
      return res.status(500).json({ error: "Failed to create thread" });
    }
  }
);

// --------------------------------------
// GET /api/problem/:name/discussions/:threadId
// --------------------------------------
router.get(
  "/:name/discussions/:threadId",
  async (req: Request<{ name: string; threadId: string }>, res: Response) => {
    const { threadId } = req.params;
    try {
      const thread = await ThreadModel.findById(threadId).lean();
      if (!thread) return res.status(404).json({ error: "Thread not found" });
      const comments = await CommentModel.find({ threadId }).sort({ createdAt: 1 }).lean();
      return res.json({ thread, comments });
    } catch (err) {
      console.error("Error fetching thread details:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// --------------------------------------
// POST /api/problem/:name/discussions/:threadId/comments
// --------------------------------------
router.post(
  "/:name/discussions/:threadId/comments",
  authenticateToken,
  async (
    req: Request<{ name: string; threadId: string }, {}, { body: string }>,
    res: Response
  ) => {
    const { threadId } = req.params;
    const { body } = req.body;
    const authorId = (req as any).user?.username as string;
    try {
      const comment = new CommentModel({ threadId, body, authorId });
      await comment.save();
      return res.status(201).json(comment);
    } catch (err) {
      console.error("Error posting comment:", err);
      return res.status(500).json({ error: "Failed to post comment" });
    }
  }
);

export default router;
