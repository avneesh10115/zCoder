import React, { useState, useEffect, FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import { API_URL } from '../App';

interface Thread {
  _id: string;
  title: string;
  author: string;
  createdAt: string;
}

interface DiscussionPageProps {
  token: string | null;
  id: string | null;
}

const DiscussionPage: React.FC<DiscussionPageProps> = ({ token, id }) => {
  const { name } = useParams<{ name: string }>();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');

  useEffect(() => {
    if (!name) return;
    axios
      .get<Thread[]>(
        `${API_URL}/api/problem/${encodeURIComponent(name)}/discussions`,
        { headers: { Authorization: token || '' } }
      )
      .then((res) => setThreads(res.data))
      .catch((e: AxiosError) => console.error('Fetch threads error:', e));
  }, [name, token]);

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !token) return;
    axios
      .post<Thread>(
        `${API_URL}/api/problem/${encodeURIComponent(name)}/discussions`,
        { title, body },
        { headers: { Authorization: token } }
      )
      .then((res) => {
        setThreads((prev) => [res.data, ...prev]);
        setTitle('');
        setBody('');
      })
      .catch((e: AxiosError) => console.error('Create thread error:', e));
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Discussions for: {name}
      </h1>

      {token && (
        <form onSubmit={handleCreate} className="mb-8">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Thread title"
            className="w-full p-2 border rounded mb-2"
            required
          />
          <textarea
  value={body}
  onChange={e => setBody(e.target.value)}
  className="w-full p-2 border rounded mb-2 bg-white text-black"
  rows={3}
  required
/>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Start New Thread
          </button>
        </form>
      )}

      <ul>
        {threads.map((thread) => (
          <li key={thread._id} className="mb-6 border-b pb-4">
            <Link
              to={`/problem/${encodeURIComponent(name!)}/discussion/${thread._id}`}
              className="text-lg text-blue-500 hover:underline"
            >
              {thread.title}
            </Link>
            <p className="text-gray-600 text-sm">
              by {thread.author} on {new Date(thread.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
        {threads.length === 0 && (
          <li className="text-gray-500">No discussions yet. Be the first to post!</li>
        )}
      </ul>
    </div>
  );
};

export default DiscussionPage;
