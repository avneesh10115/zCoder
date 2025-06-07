import { Types } from "mongoose";
import UserModel from "../models/user";
import { Document } from "mongoose";
import { DProblem } from "../models/problem";

export async function existsUsername(username: string) {
    const user = await UserModel.findOne({ username: username });
    return !(user == null);
}

export async function existsEmail(email: string) {
    const user = await UserModel.findOne({ email: email });
    return !(user == null);
}

// /utils/utils.ts

export type Sort = "asc" | "desc" | "";

export function sortByTitle<
  T extends { main: { id: number } }
>(order: Sort, arr: T[]): T[] {
  if (order === "") return arr;
  return arr.sort((a, b) =>
    order === "asc" ? a.main.id - b.main.id : b.main.id - a.main.id
  );
}

export function sortByDifficulty<
  T extends { main: { difficulty: string } }
>(order: Sort, arr: T[]): T[] {
  if (order === "") return arr;
  return arr.sort((a, b) =>
    order === "asc"
      ? a.main.difficulty.localeCompare(b.main.difficulty)
      : b.main.difficulty.localeCompare(a.main.difficulty)
  );
}

export function sortByAcceptance<
  T extends { main: { acceptance_rate_count: number } }
>(order: Sort, arr: T[]): T[] {
  if (order === "") return arr;
  return arr.sort((a, b) =>
    order === "asc"
      ? a.main.acceptance_rate_count - b.main.acceptance_rate_count
      : b.main.acceptance_rate_count - a.main.acceptance_rate_count
  );
}
