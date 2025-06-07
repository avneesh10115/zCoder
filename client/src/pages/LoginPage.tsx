// src/pages/LoginPage.tsx

import axios, { AxiosError } from "axios";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../App";
import Loading from "../components/Loading";

interface LoginData {
  token: string;
  setTokenFunction: (token: string) => void;
  id: string;
  setIdFunction: (id: string) => void;
}

const LoginPage = ({ Data }: { Data: LoginData }) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setMessage("");
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/accounts/login`,
        {
          username_or_email: usernameOrEmail,
          password: password,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const data = response.data as {
        token: string;
        id: string;
        success: boolean;
        message: string;
      };

      if (!data.success) {
        setMessage(data.message);
        setIsLoading(false);
        return;
      }

      // 1) Store token & id via callbacks
      Data.setTokenFunction(data.token);
      Data.setIdFunction(data.id);

      // 2) Also configure axios to include the token on future requests
      axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;

      setIsLoading(false);
      navigate("/problemset");
    } catch (err) {
      setIsLoading(false);

      // If server responded with JSON, show its message
      if (axios.isAxiosError(err) && err.response?.data) {
        const serverData = err.response.data as { success: boolean; message: string };
        setMessage(serverData.message || "Login failed");
      } else {
        setMessage("Network or server error. Please try again.");
      }
    }
  };

  return (
    <>
      <Link to={"/"}>
        <div
          id="logo-cont"
          className="inline-block relative text-[24px] left-1/2 -translate-x-1/2 font-bold italic mx-auto mt-[12px]"
        >
          <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 px-[1px]">
            z
          </span>
          <span>Coder</span>
        </div>
      </Link>

      <div className="min-h-fit w-[300px] mx-auto text-[14px]">
        <div className="relative bg-black shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-[34px] font-bold mb-[30px] text-center mt-[60px]">
            Log In
          </h2>

          <div className="mb-4">
            <input
              className="appearance-none border w-full py-2 px-3 placeholder:text-text_2 focus:placeholder:text-orange-500 bg-black rounded border-borders leading-tight focus:outline-none focus:border-orange-500"
              type="text"
              placeholder="Username or Email"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <input
              className="appearance-none border w-full py-2 px-3 placeholder:text-text_2 focus:placeholder:text-orange-500 bg-black rounded border-borders leading-tight focus:outline-none focus:border-orange-500"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              className="bg-orange-500 hover:bg-red-600 text-black font-bold py-[6px] px-4 rounded focus:outline-none focus:shadow-outline w-full transition"
              type="button"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-full block h-[21px]">
                  <div className="absolute left-1/2 -translate-x-1/2">
                    <Loading />
                  </div>
                </div>
              ) : (
                "Login"
              )}
            </button>
          </div>

          <div className="flex items-center justify-between mt-[20px]">
            <span className="text-text_2">Don’t have an account? </span>
            <Link to="/signup" className="text-orange-500 hover:text-red-600">
              Signup
            </Link>
          </div>

          <div className="text-center mt-[20px] text-red-600 w-full overflow-hidden">
            {message}
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
