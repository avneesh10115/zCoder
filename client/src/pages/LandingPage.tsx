import MainHeading from "../components/MainHeading";
import { TypeAnimation } from "react-type-animation";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import { API_URL } from "../App";
import Loading from "../components/Loading";

const LandingPage = ({
    token,
    id,
}: {
    token: string | null;
    id: string | null;
}) => {
    const [username, setUsername] = useState<string>("");
    const [verified, setVerified] = useState<boolean>(false);
    const [verifiedCertain, setVerifiedCertain] = useState<boolean>(false);
    useEffect(() => {
        if (!id) {
            setVerified(false);
            setVerifiedCertain(true);
        }
        axios
            .get(`${API_URL}/api/accounts/id/${id}`, {
                headers: {
                    Authorization: token,
                },
            })
            .then(({ data }) => {
                setUsername(data.username);
                setVerified(true);
                setVerifiedCertain(true);
            })
            .catch((e: AxiosError) => {
                setVerified(false);
                setVerifiedCertain(true);
            });
    }, []);
    return (
        <div className="text-[14px] overflow-hidden h-screen">
            {verifiedCertain && verified ? (
                <MainHeading
                    data={{
                        username: username,
                        status: "loggedin",
                    }}
                />
            ) : verifiedCertain === true && verified === false ? (
                <MainHeading
                    data={{
                        status: "not-loggedin",
                    }}
                />
            ) : (
                <MainHeading
                    data={{
                        status: "none",
                    }}
                />
            )}
                <div className="w-[100vw] overflow-hidden h-[calc(100vh-60px)] absolute">
  <div className="tech-background absolute top-0 left-0 w-full h-full z-10"></div>
</div>

            {verifiedCertain && verified ? (
                <>
                    <h1 className="absolute text-[38px] md:text-[48px] mx-auto text-center font-bold mt-[100px] z-50 inset-0 top-[100px]">
                        <TypeAnimation
                            sequence={[
                                `Welcome Back ${username}!`,
                                2000,
                                `Looking to solve some intresting problems, ${username}?`,
                                2000,
                                "Let's dive in!",
                            ]}
                            wrapper="span"
                            cursor={true}
                            className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-600 px-[1px]"
                            style={{
                                fontSize: "1em",
                                display: "inline-block",
                                
                            }}
                        />
                    </h1>
                    <p className="absolute md:w-1/2 w-3/4 text-center mx-auto mt-[50px] z-50 inset-0 md:top-[300px] top-[400px]">
                        Explore our Problem List now!
                    </p>
                    <div className="absolute md:top-[450px] top-[550px] left-1/2 -translate-x-1/2 z-50">
                        <Link
                            to="/problemset"
                            className="relative ml-[8px] font-bold inline-block bg-gradient-to-r from-orange-500 to-red-600 rounded-md text-black text-[18px] hover:bg-red-800"
                        >
                            <div className="w-full h-full bg-black text-white py-[6px] px-[16px] rounded-[6px] border border-black hover:bg-[#00000000] hover:border-[#00000000] hover:text-black transition active:bg-red-700">
                                Problem List
                            </div>
                        </Link>
                    </div>
                </>
            ) : verifiedCertain === true && verified === false ? (
                <>
                <div className="relative w-full h-[calc(100vh-60px)]">
  {/* First line of text */}
  <h1
    className="
      absolute 
      top-[100px] 
      left-1/2 
      transform -translate-x-1/2
      text-[38px] md:text-[48px] 
      font-bold 
      z-50
      text-center
    "
  >
    zCoder, Your Coding Companion
  </h1>

  {/* Second line of text, shifted down by 80px */}
  <h1
    className="
      absolute 
      top-[180px] 
      left-1/2 
      transform -translate-x-1/2
      text-[38px] md:text-[48px] 
      font-bold 
      z-50
      text-center
    "
  >
    <TypeAnimation
      sequence={[
        "Learn to Code",
        2000,
        "Solve Coding Challenges",
        2000,
        "Explore New Problems",
        2000,
        "Prepare for Interviews",
        2000,
        "Start Now!",
        5000,
      ]}
      wrapper="span"
      cursor={true}
      repeat={Infinity}
    />
  </h1>
</div>

                    <p className="absolute md:w-1/2 w-3/4 text-center mx-auto mt-[50px] z-50 inset-0 top-[300px]">
                        Attain the apex of your coding potential with
                        zCoder. Develop your skills and
                        ace technical interviews like never before!
                    </p>
                    <div className=" absolute top-[500px] left-1/2 -translate-x-1/2 z-50">
                        <Link
                            to="/signup"
                            className=" relative ml-[8px] font-bold inline-block bg-gradient-to-r from-orange-500 to-red-600 rounded-md text-black text-[18px] hover:bg-red-800"
                        >
                            <div className="w-full h-full bg-black text-white py-[6px] px-[16px] rounded-[6px] border border-black hover:bg-[#00000000] hover:border-[#00000000] hover:text-black transition active:bg-red-700">
                                Dive In
                            </div>
                        </Link>
                    </div>
                </>
            ) : (
                <div className="absolute top-1/2 -translate-x-1/2 left-1/2 -translate-y-1/2 z-[120]">
                    <Loading />
                </div>
            )}
        </div>
    );
};

export default LandingPage;
