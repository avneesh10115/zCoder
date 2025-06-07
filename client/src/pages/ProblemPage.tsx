import React, { SetStateAction, useEffect, useRef, useState, FormEvent } from "react";
import ReactCodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import axios from "axios";
import { useNavigate, useParams, Link } from "react-router-dom";
import ProblemNavbar from "../components/ProblemNavbar";
import ProblemDescription from "../components/ProblemDescription";
import Editorial from "../components/Editorial";
import MainHeading from "../components/MainHeading";
import Submissions from "../components/Submissions";
import Loading from "../components/Loading";
import { API_URL } from "../App";

// Supported editor languages
type SupportedLanguage = "javascript" | "python";

interface ProblemPageProps {
  data?: ProblemPageData;
  token: string | null;
  id: string | null;
}

// Discussion thread shape
interface Thread {
  _id: string;
  title: string;
  author: string;
  createdAt: string;
}

const ProblemPage: React.FC<ProblemPageProps> = ({ data, token, id }) => {
  const [username, setUsername] = useState<string>("");
  const [initCode, setInitCode] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>("javascript");
  const [isSubmitLoading, setIsSubmitLoading] = useState<boolean>(false);
  const [editorial, setEditorial] = useState<string>("");
  const [submissionData, setSubmissionData] = useState<Submission[]>();
  const [problemDescriptionData, setProblemDescriptionData] = useState<DescriptionData>();
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Discussion state
  const [threads, setThreads] = useState<Thread[]>([]);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newBody, setNewBody] = useState<string>("");
  const [creatingThread, setCreatingThread] = useState<boolean>(false);
  const [threadError, setThreadError] = useState<string>("");

  const explanationRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { name } = useParams<{ name: string }>();
  const activeNavOption = data?.activeNavOption || "description";

  // Fetch online user data and problem details
  useEffect(() => {
    if (!name || !id) return;
    // load problem
    axios
      .post(`${API_URL}/api/problem/${encodeURIComponent(name)}`, { id })
      .then(({ data }) => {
        const main = (data as any).main;
        setProblemDescriptionData(main as DescriptionData);
        const codeBody = main.code_body || {};
        setInitCode(codeBody[currentLang] || "");
      })
      .catch(console.error);

    // load user info
    if (token) {
      axios
        .get(`${API_URL}/api/accounts/id/${id}`, { headers: { Authorization: token } })
        .then(({ data }) => setUsername(data.username))
        .catch(() => navigate("/sorry"));
    }

    // load submissions
    axios
      .post<{}, { data: Submission[] }, { id: string }>(
        `${API_URL}/api/problem/submissions/${encodeURIComponent(name)}`,
        { id }
      )
      .then(({ data }) => {
        if (data.length) setCode(data[0].code_body || initCode);
        setSubmissionData(data);
      })
      .catch(console.error);
  }, [name, id, token, currentLang, navigate]);

  // Load editorial when selected
  useEffect(() => {
    if (activeNavOption !== "editorial" || !name) return;
    axios
      .get(`${API_URL}/api/problem/${encodeURIComponent(name)}/editorial`)
      .then(({ data }) => setEditorial((data as any).editorial_body))
      .catch(console.error);
  }, [activeNavOption, name]);

  // Load discussion threads when selected
  useEffect(() => {
    if (activeNavOption !== "discussion" || !name) return;
    axios
      .get<Thread[]>(
        `${API_URL}/api/problem/${encodeURIComponent(name)}/discussions`,
        { headers: token ? { Authorization: token } : {} }
      )
      .then(({ data }) => setThreads(data))
      .catch(console.error);
  }, [activeNavOption, name, token]);

  // Create a new discussion thread
  const handleCreateThread = async (e: FormEvent) => {
    e.preventDefault();
    setThreadError("");
    if (!token || !name) {
      setThreadError("You must be logged in to post.");
      return;
    }
    if (!newTitle.trim() || !newBody.trim()) {
      setThreadError("Title and message cannot be empty.");
      return;
    }
    setCreatingThread(true);
    try {
      const { data: thread } = await axios.post<Thread>(
        `${API_URL}/api/problem/${encodeURIComponent(name)}/discussions`,
        { title: newTitle, body: newBody },
        { headers: { Authorization: token } }
      );
      setThreads(prev => [thread, ...prev]);
      setNewTitle("");
      setNewBody("");
    } catch (err: any) {
      if (axios.isAxiosError(err)) setThreadError(err.response?.data?.message || "Failed to create thread.");
      else setThreadError("Failed to create thread.");
    } finally {
      setCreatingThread(false);
    }
  };

  // Submit code
  const submitCode = () => {
    setIsSubmitLoading(true);
    if (!id || !name) return;
    axios
      .post<{}, { data: Submission[] }, { code: string; id: string; problem_name: string }>(
        `${API_URL}/api/problem/submit/${encodeURIComponent(name)}`,
        { code, id, problem_name: name }
      )
      .then(({ data }) => {
        setIsSubmitted(true);
        setSubmissionData(data);
        navigate(`/problem/${encodeURIComponent(name)}/submissions`);
      })
      .catch(console.error)
      .finally(() => setIsSubmitLoading(false));
  };

  return (
    <>
      <MainHeading data={{ items: [{ text: "Problem List", link_path: "/problemset" }], username }} />
      <div className="h-[calc(100vh-60px)] overflow-hidden bg-black">
        <div className="relative flex h-full w-full mt-2">

          {/* Left pane */}
          <div ref={explanationRef} className="h-full w-1/2 bg-black border border-borders rounded-lg overflow-hidden">
            <ProblemNavbar data={{ problem_name: name!, nav_option_name: activeNavOption }} />
            <div className="overflow-auto p-4">
              {activeNavOption === "description" && problemDescriptionData ? (
                <ProblemDescription data={problemDescriptionData} />
              ) : activeNavOption === "description" ? (
                <Loading For="pDescription" />
              ) : activeNavOption === "editorial" ? (
                editorial ? <Editorial data={editorial} /> : <Loading For="pEditorial" />
              ) : activeNavOption === "discussion" ? (
                <>  
                  {threadError && <p className="text-red-600 mb-2">{threadError}</p>}
                  {token && (
                    <form onSubmit={handleCreateThread} className="mb-4">
                      <input
  type="text"
  value={newTitle}
  onChange={e => setNewTitle(e.target.value)}
  placeholder="Thread title"
  className="w-full p-2 border rounded mb-2 text-black"
  required
/>
<textarea
  value={newBody}
  onChange={e => setNewBody(e.target.value)}
  placeholder="Your message"
  rows={4}
  className="w-full p-2 border rounded mb-2 text-black"
  required
/>

                      <button
                        type="submit"
                        disabled={creatingThread}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        {creatingThread ? 'Posting...' : 'Start New Thread'}
                      </button>
                    </form>
                  )}
                  <ul>
                    {threads.map(thread => (
                      <li key={thread._id} className="mb-4 border-b pb-2">
                        <Link
                          to={`/problem/${encodeURIComponent(name!)}/discussions/${thread._id}`}
                          className="text-lg text-blue-500 hover:underline"
                        >
                          {thread.title}
                        </Link>
                        <p className="text-gray-600 text-sm">
                          by Anonymous on {new Date(thread.createdAt).toLocaleString()}
                        </p>
                      </li>
                    ))}
                    {threads.length === 0 && <p>No discussions yet.</p>}
                  </ul>
                </>
              ) : (
                <Submissions data={{ submissions_list: submissionData || [], is_submitted: isSubmitted }} />
              )}
            </div>
          </div>

          {/* Right pane */}
          <div className="flex flex-col flex-grow ml-2">
            <div className="flex items-center mb-2">
              <span className="text-white mr-2">Language:</span>
              <select
                value={currentLang}
                onChange={e => setCurrentLang(e.target.value as SupportedLanguage)}
                className="bg-black text-white border border-borders rounded p-1"
              >
                <option value="javascript">JavaScript</option>
              </select>
            </div>
            <div className="flex-grow bg-black border border-borders rounded-lg overflow-hidden">
              <ReactCodeMirror
                value={code || initCode}
                extensions={[javascript()!]}
                theme={tokyoNight}
                onChange={setCode}
                height="100%"
                width="100%"
              />
            </div>
            <div className="flex justify-end mt-2">
              <button
                onClick={submitCode}
                disabled={isSubmitLoading}
                className="bg-green-500 hover:bg-green-600 text-black font-bold py-2 px-4 rounded"
              >
                {isSubmitLoading ? <Loading /> : "Submit"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProblemPage;
