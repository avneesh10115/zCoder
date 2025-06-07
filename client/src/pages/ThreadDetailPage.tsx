// ---------------- client/src/pages/ThreadDetailPage.tsx ----------------
import React, { useState, useEffect, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import { API_URL } from '../App';

interface Thread { _id: string; title: string; body: string; authorId: string; createdAt: string; }
interface Comment { _id: string; body: string; authorId: string; createdAt: string; }

const ThreadDetailPage: React.FC<{ token: string | null; id: string | null }> = ({ token, id }) => {
  const { name, threadId } = useParams();
  const [thread, setThread] = useState<Thread | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState<string>('');

  useEffect(() => {
    if (!threadId || !name) return;
    axios.get(`${API_URL}/api/problem/${encodeURIComponent(name)}/discussions/${threadId}`)
      .then(res => {
        setThread(res.data.thread);
        setComments(res.data.comments);
      })
      .catch((e: AxiosError) => console.error(e));
  }, [name, threadId]);

  const handleComment = (e: FormEvent) => {
    e.preventDefault();
    if (!token || !threadId || !name) return;
    axios.post(
      `${API_URL}/api/problem/${encodeURIComponent(name)}/discussions/${threadId}/comments`,
      { body },
      { headers: { Authorization: token } }
    )
    .then(res => {
      setComments(prev => [...prev, res.data]);
      setBody('');
    })
    .catch((e: AxiosError) => console.error(e));
  };

  if (!thread) return <div>Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{thread.title}</h1>
      <p className="mb-4 text-gray-700">{thread.body}</p>
      <div className="border-t pt-4">
        <h2 className="text-xl font-semibold mb-2">Comments</h2>
        {comments.map(c => (
          <div key={c._id} className="mb-3">
            <p className="text-gray-800">{c.body}</p>
            <p className="text-gray-500 text-sm">by {c.authorId} on {new Date(c.createdAt).toLocaleString()}</p>
          </div>
        ))}
        {token && (
          <form onSubmit={handleComment} className="mt-4">
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              className="w-full p-2 border rounded mb-2"
              rows={3}
              required
            />
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">
              Post Comment
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ThreadDetailPage;
