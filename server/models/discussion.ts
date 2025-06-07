import mongoose, { Document } from 'mongoose';

export interface Comment extends Document {
  threadId: mongoose.Types.ObjectId;
  authorId: string;
  body: string;
  createdAt: Date;
}
export const CommentSchema = new mongoose.Schema<Comment>({
  threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true },
  authorId: { type: String, required: false },
  body: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export interface Thread extends Document {
  problemName: string;
  title: string;
  authorId: string;
  body: string;
  createdAt: Date;
}
export const ThreadSchema = new mongoose.Schema<Thread>({
  problemName: { type: String, required: true },
  title: { type: String, required: true },
  authorId: { type: String, required: false }, // Optional, can be set later
  body: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const ThreadModel = mongoose.model<Thread>('Thread', ThreadSchema);
export const CommentModel = mongoose.model<Comment>('Comment', CommentSchema);
