import { useEffect, useRef, useState } from "react";
import { UA, WebSocketInterface } from "jssip";
import _ from "lodash";
import ringing from "./ringing.mp3";
import { MdCallEnd, MdPhoneInTalk, MdPause, MdPlayArrow } from "react-icons/md";
import { BiTransferAlt } from "react-icons/bi";
import { BsMicMuteFill, BsMicFill } from "react-icons/bs";
import { FaUser } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { insertReport } from "../../lib/reportApi";
import { CallAlertState, PhoneProps } from "../../types/phoneTypes";
import { CircleX } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../redux/store";
import toast from "react-hot-toast";
import { resetOutsideCall } from "../../redux/phoneSlice";
import FollowPopUp from "../../components/customers/FollowPopUp";
import Dialog from "../../components/ui/Dialog";


const Phone = ({
  id,
  userName,
  domain,
  password,
  port,
  setIsUserRegistered,
  setIsSipConnected,
}: PhoneProps) => {
  // State declarations
  const [sipDial, setSipDial] = useState<UA | null>(null);
  const [callAlert, setCallAlert] = useState<Partial<CallAlertState>>({});
  const [activeCall, setActiveCall] = useState<any>(null);
  const [queueCalls, setQueueCalls] = useState<any>(null);
  const [dialPhoneNumber, setDialPhoneNumber] = useState<string>("");
  const [isTransferVisible, setIsTransferVisible] = useState<boolean>(false);
  const [transferNumber, setTransferNumber] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState<string>("00:00");
  const [serverConnected, setServerConnected] = useState<boolean>(false);
  const [userConnected, setUserConnected] = useState<boolean>(false);
  const outsideCallDial = useSelector((state: RootState) => state.phone);
  const [nciValue, setNciValue] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [block, setBlock] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [project, setProject] = useState<string>("");
  const [dueAmount, setDueAmount] = useState<number>(0);
  const [dueMonth, setDueMonth] = useState<string>("");
  const dispatch = useDispatch();
  const [showFollowUpPopup, setShowFollowUpPopup] = useState<boolean>(false);
  const [cdrResponse , setCdrResponse] = useState<boolean>(false);

  // Refs
  const phoneAudioRef = useRef<HTMLAudioElement>(null);
  const ringer = useRef<HTMLAudioElement>(null);

  // WebSocket configuration
  const configuration = {
    traceSip: true,
    register: true,
    hackIpInContact: true,
    hackWssInTransport: true,
    register_expires: 3600,
    displayName: userName,
    authorizationUser: id,
    wsServers: `wss://${domain}:${port}/ws`,
    rtcpMuxPolicy: "negotiate",
    uri: `sip:${id}@${domain}`,
    password: password,
  };

  // Function to handle event logging
  // const logEvent = (eventType: string, data: any) => {
  //   if (import.meta.env.VITE_NODE_ENV === "development") {
  //     console.log(`[Event: ${eventType}]`, data);
  //   }
  // };
  
  useEffect(() => {
    if (outsideCallDial.phone !== "" && outsideCallDial.phone !== undefined) {
      setClientName(outsideCallDial.customerName);
      setNciValue(outsideCallDial.nci);
      setBlock(outsideCallDial.block);
      setSize(outsideCallDial.size);
      setProject(outsideCallDial.project);
      setDueAmount(outsideCallDial.dueAmount);
      setDueMonth(outsideCallDial.dueMonth);
      callPhoneNumber(outsideCallDial.phone);
    }
  }, [outsideCallDial]);


  useEffect(() => {
    console.log("clientName", clientName);
    console.log("nciValue", nciValue);
    console.log("block", block);
    console.log("size", size);
    console.log("project", project);
    console.log("dueAmount", dueAmount);
    console.log("dueMonth", dueMonth);
  }, [clientName, nciValue, block, size, project, dueAmount, dueMonth]);

  // Calculate call duration
  useEffect(() => {
    let durationInterval = null;
    if (callStartTime) {
      durationInterval = setInterval(() => {
        const now = Date.now();
        const diffInSeconds = Math.floor((now - callStartTime) / 1000);
        const minutes = Math.floor(diffInSeconds / 60)
          .toString()
          .padStart(2, "0");
        const seconds = (diffInSeconds % 60).toString().padStart(2, "0");
        setCallDuration(`${minutes}:${seconds}`);
      }, 1000);
    }
    return () => {
      if (durationInterval) {
        clearInterval(durationInterval);
      }
    };
  }, [callStartTime]);

  // Register WebRTC event handlers
  const registerWebrtcEvent = (call: any) => {
    const eventsToHandle = [
      "peerconnection",
      "connecting",
      "sending",
      "progress",
      "accepted",
      "newDTMF",
      "newInfo",
      "hold",
      "unhold",
      "muted",
      "unmuted",
      "reinvite",
      "update",
      "refer",
      "replaces",
      "sdp",
      "icecandidate",
      "getusermediafailed",
      "ended",
      "failed",
      "confirmed",
    ];
    _.forEach(eventsToHandle, (eventType) => {
      call.on(eventType, (data: any) => {
        // logEvent(eventType, data);
        handleSessionEvent(eventType, data, call);
      });
    });
  };

  // Handle session events
  const handleSessionEvent = (eventType: string, data: any, call: any) => {
    switch (eventType) {
      case "accepted":
        setCallAlert((prevState) => ({
          ...prevState,
          status: "connected",
        }));
        setCallStartTime(Date.now());
        break;
      case "failed":
        handleCallFailed(data, call);
        break;
      case "ended":
        handleCallEnd(data, call);
        break;
      default:
        break;
    }
  };

  const handleCallFailed = (data: any, call: any) => {
    const currentCall = JSON.parse(localStorage.getItem("liveCall") ?? "{}");
    if (currentCall) {
      const { originator, cause } = data;
      currentCall.hangupBy =
        originator === "remote" ? call?.remote_identity?.uri?.user : id;
      currentCall.status = "call_failed";
      currentCall.cause = cause || "NO_ANSWER";
      emitCallLogs(currentCall);
      localStorage.removeItem("liveCall");
      callDisconnect();
    }
  };

  const toggleMute = () => {
    if (activeCall) {
      if (isMuted) {
        activeCall.unmute({ audio: true });
        setIsMuted(false);
      } else {
        activeCall.mute({ audio: true });
        setIsMuted(true);
      }
    }
  };

  const transferCall = (targetURI: string) => {
    if (activeCall && targetURI) {
      activeCall.sendRefer(`sip:${targetURI}@${domain}`, {
        eventHandlers: {
          succeeded: () => {
            setCallAlert((prevState) => ({
              ...prevState,
              status: "call_transferred",
              cause: "call_transferred",
            }));
            setIsTransferVisible(false);
            setTransferNumber("");
          },
          failed: () => {
            setCallAlert((prevState) => ({
              ...prevState,
              status: "transfer_failed",
              cause: "transfer_failed",
            }));
          },
        },
      });
    }
  };

  // Function to emit call log to backend

  useEffect(() => {
    if (outsideCallDial.phone !== "" && outsideCallDial.phone !== undefined) {
      sessionStorage.setItem("customerInfo", JSON.stringify(outsideCallDial));
      console.log("outsideCallDial", outsideCallDial);
    }
  }, [outsideCallDial]);


  const handleFollowUp = () => {
    setShowFollowUpPopup(true);
  }

  const emitCallLogs = async (callData: CallAlertState) => {
    const customerInfo = JSON.parse(sessionStorage.getItem("customerInfo") || "{}");
    callData = {
      ...callData,
      customerName: customerInfo.customerName,
      nci: customerInfo.nci,
      block: customerInfo.block,
      size: customerInfo.size,
      project: customerInfo.project,
      dueAmount: customerInfo.dueAmount,
      dueMonth: customerInfo.dueMonth,
    };
    try {
      handleFollowUp();
      console.log("callData to be inserted", callData);
      const response = await insertReport(callData);
      console.log("log1122 CRD response", response);
      if(response.data){
        setCdrResponse(true);
        setTimeout(() => {
          dispatch(resetOutsideCall());
          setClientName("");
          setNciValue("");
          setBlock("");
          setSize("");
          setProject("");
          setDueAmount(0);
          setDueMonth("");
        }, 10000);
      }
    } catch (error) {
      console.error("Error emitting call logs:", error);
      toast.error("Error emitting call logs");
      setShowFollowUpPopup(false);
    } finally {

    }
  };

  // Handle call end scenarios
  const handleCallEnd = (data: any, call: any) => {
    const currentCall = JSON.parse(localStorage.getItem("liveCall") ?? "{}");
    if (currentCall) {
      console.log("usama currentCall", currentCall);
      const { originator, cause } = data;
      currentCall.hangupBy =
        originator === "remote" ? call?.remote_identity?.uri?.user : id;
      currentCall.status = "call_ended";
      currentCall.cause = cause || "ANSWER";
      emitCallLogs(currentCall);
      localStorage.removeItem("liveCall");
      callDisconnect();
    }
  };

  // Function to disconnect the call
  const callDisconnect = () => {
    setActiveCall(null);
    setQueueCalls(null);
    setCallAlert({});
  };

  // Handle accept call
  const acceptHandle = () => {
    if (queueCalls) {
      stopRing();
      queueCalls.answer({
        mediaConstraints: {
          audio: true,
        },
      });
      setCallAlert((prevState) => ({
        ...prevState,
        status: "connected",
        cause: "call_accepted",
      }));
      connectAudio(queueCalls);
    } else {
      callDisconnect();
    }
  };

  // Handle reject call
  const rejectHandle = () => {
    if (queueCalls) {
      queueCalls.terminate();
      setCallAlert((prevState) => ({
        ...prevState,
        hangupBy: id.toString(),
      }));
      callDisconnect();
    } else {
      callDisconnect();
    }
  };

  // Function to connect audio
  const connectAudio = (call: any) => {
    if (phoneAudioRef.current) {
      call.connection.addEventListener("track", (event: any) => {
        if (event.track.kind === "audio") {
          phoneAudioRef.current!.srcObject = event.streams[0];
          phoneAudioRef.current!.play();
        }
      });
    } else {
      callDisconnect();
    }
  };

  // Handle dialing a phone number
  const callPhoneNumber = async (phoneNumber: string) => {
    if (sipDial) {
      const options = {
        mediaConstraints: {
          audio: true,
        },
      };
      try {
        sipDial.call(`sip:${phoneNumber}@${domain}`, options);
      } catch (error) {
        toast.error("Phone number not allowed!");
      }
    } else {
      toast.error("Error calling phone number.");
    }
  };

  // Handle dialing event
  const dialPhoneNumberHandle = () => {
    callPhoneNumber(dialPhoneNumber);
  };

  // Function to play the ringtone
  const playRing = () => {
    if (ringer.current) {
      ringer.current.currentTime = 0;
      ringer.current.play();
    }
  };

  // Function to stop the ringtone
  const stopRing = () => {
    if (ringer.current) {
      ringer.current.currentTime = 0;
      ringer.current.pause();
    }
  };

  // UseEffect to initialize SIP connection
  useEffect(() => {
    if (id && domain && password && port) {
      const socket = new WebSocketInterface(`wss://${domain}:${port}/ws`);
      const sip = new UA({ ...configuration, sockets: [socket] });

      sip.on("connected", () => {
        setIsSipConnected(true);
        setIsUserRegistered(false);
        setServerConnected(true);
        setUserConnected(false);
      });

      sip.on("disconnected", () => {
        setIsSipConnected(false);
        setIsUserRegistered(false);
        setServerConnected(false);
        setUserConnected(false);
      });

      sip.on("registered", () => {
        setIsUserRegistered(true);
        setIsSipConnected(true);
        setServerConnected(true);
        setUserConnected(true);
      });

      sip.on("registrationFailed", () => {
        setIsUserRegistered(false);
        setIsSipConnected(true);
        setServerConnected(true);
        setUserConnected(false);
      });

      sip.on("newRTCSession", (e: any) => {
        const { session: call } = e;
        const newCallAlert: Partial<CallAlertState> = {
          sessionId:
            call.direction === "incoming"
              ? call._request.headers["Sip-Caller-Id"][0].raw
              : call?._request?.call_id,
          phoneNumber: call?.remote_identity?.uri?.user,
          direction: call.direction,
          cause: "",
          status: "ringing",
          hangupBy: "",
          userId: id,
          user_name: userName,
        };

        if (call.direction === "incoming") {
          playRing();
          setCallAlert(newCallAlert);
        } else {
          setCallAlert(newCallAlert);
          connectAudio(call);
        }

        localStorage.setItem("liveCall", JSON.stringify(newCallAlert));
        setActiveCall(call);
        setQueueCalls(call);
        registerWebrtcEvent(call);
      });

      sip.start();
      setSipDial(sip);
    }
  }, [id, domain, password, port]);


  return (
    <div className="z-10 w-full h-full">
      <audio
        id="audioOnline"
        ref={phoneAudioRef}
        preload="auto"
        style={{ width: "100%", height: "100px" }}
      >
        <track kind="captions" />
      </audio>
      <audio preload="auto" ref={ringer}>
        <source src={ringing} type="audio/mpeg" />
        <track kind="captions" />
      </audio>
      <div className="flex flex-col justify-center p-6 h-[450px]">
        {/* Dial screen */}
        {callAlert.status && callAlert.status !== "connected" && (
          <div className="flex flex-col gap-6 justify-between items-center h-full">
            <section>
              <div className="flex relative justify-center items-center rounded-full size-44">
                <FaUser size="70" />
                <div className="flex absolute inset-0 justify-center items-center rounded-full animate-pulse bg-primary -z-10 size-44"></div>
              </div>
              <p className="mt-4 text-center text-md">
                {callAlert.direction === "incoming" &&
                  callAlert.status === "ringing"
                  ? "Incoming Call"
                  : "Dialing..."}
              </p>
              <p className="text-xl font-bold text-center">
                {outsideCallDial.isPhoneHidden
                  ? "********"
                  : callAlert.phoneNumber}
              </p>
            </section>
            {callAlert.direction === "incoming" &&
              callAlert.status === "ringing" ? (
              <section className="flex justify-around w-full">
                <button
                  className="flex justify-center items-center bg-green-500 rounded-full size-12 hover:bg-green-600"
                  onClick={acceptHandle}
                >
                  <MdPhoneInTalk size={24} />
                </button>
                <button
                  className="flex justify-center items-center bg-red-500 rounded-full size-12 hover:bg-red-600"
                  onClick={rejectHandle}
                >
                  <MdCallEnd size={24} />
                </button>
              </section>
            ) : (
              <button
                className="flex justify-center items-center bg-red-500 rounded-full size-12 hover:bg-red-600"
                onClick={rejectHandle}
                type="button"
              >
                <MdCallEnd size={24} />
              </button>
            )}
          </div>
        )}
        {/* Call connected */}
        {callAlert.status === "connected" && (
          <div className="flex flex-col gap-6 justify-between items-center h-full">
            <section>
              <div className="flex relative justify-center items-center rounded-full size-44">
                <FaUser size="70" />
                <div className="flex absolute inset-0 justify-center items-center rounded-full animate-pulse bg-primary -z-10 size-44"></div>
              </div>
              {/* Call duration */}
              <p className="mt-2 text-lg font-semibold text-center">
                {callDuration}
              </p>
              <p className="text-xl font-bold text-center">
                {outsideCallDial.isPhoneHidden
                  ? "********"
                  : callAlert.phoneNumber}
              </p>
            </section>
            <section className="flex justify-around w-full">
              <button
                className={`flex items-center justify-center size-12 rounded-full ${callAlert.isHold
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-yellow-500 hover:bg-yellow-600"
                  }`}
                onClick={() => {
                  setCallAlert((prevState) => ({
                    ...prevState,
                    isHold: !callAlert.isHold,
                  }));
                  if (callAlert.isHold) {
                    activeCall?.unhold();
                  } else {
                    activeCall?.hold();
                  }
                }}
              >
                {callAlert.isHold ? (
                  <MdPlayArrow size={24} />
                ) : (
                  <MdPause size={24} />
                )}
              </button>
              {/* Mute button */}
              <button
                className={`flex items-center justify-center size-12 rounded-full ${isMuted
                    ? "bg-gray-600 hover:bg-gray-700"
                    : "bg-green-500 hover:bg-green-600"
                  }`}
                onClick={toggleMute}
              >
                {isMuted ? (
                  <BsMicFill size={24} />
                ) : (
                  <BsMicMuteFill size={24} />
                )}
              </button>
              {/* Transfer Button */}
              <button
                className="flex justify-center items-center bg-blue-500 rounded-full size-12 hover:bg-blue-600"
                onClick={() => setIsTransferVisible(!isTransferVisible)}
                type="button"
              >
                <BiTransferAlt size={24} />
              </button>
              <button
                className="flex justify-center items-center bg-red-500 rounded-full size-12 hover:bg-red-600"
                onClick={rejectHandle}
                type="button"
              >
                <MdCallEnd size={24} />
              </button>
            </section>
            {/* Transfer Input Field */}
            {isTransferVisible && (
              <div className="flex flex-col gap-4 items-center w-full">
                <input
                  className="p-2 w-full h-12 bg-transparent rounded-md border border-gray-700 outline-none"
                  value={transferNumber}
                  placeholder="Enter Transfer Number"
                  onChange={(e) => setTransferNumber(e.target.value)}
                />
                <button
                  className="px-4 py-2 bg-green-500 rounded-lg hover:bg-green-600"
                  onClick={() => transferCall(transferNumber)}
                  type="button"
                >
                  Transfer Call
                </button>
              </div>
            )}
          </div>
        )}
        {/* Dial pad */}
        {serverConnected && userConnected ? (
          Object.keys(callAlert).length === 0 ? (
            <section className="flex flex-col gap-6 justify-end items-center h-full">
              <div className="flex items-center px-4 w-full rounded-xl border border-gray-700 bg-primary">
                <input
                  className="w-full h-12 bg-transparent rounded-md outline-none disabled:cursor-not-allowed"
                  autoFocus
                  value={dialPhoneNumber}
                  disabled={!serverConnected || !userConnected}
                  placeholder="Enter Phone Number"
                  onChange={(e) => {
                    const onlyNumbers = e.target.value.replace(/[^0-9+]/g, "");
                    setDialPhoneNumber(onlyNumbers);
                  }}
                />
                {dialPhoneNumber && (
                  <IoClose
                    size="25"
                    className="cursor-pointer hover:text-red-500"
                    onClick={() => {
                      setDialPhoneNumber("");
                    }}
                  />
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  "1",
                  "2",
                  "3",
                  "4",
                  "5",
                  "6",
                  "7",
                  "8",
                  "9",
                  "+",
                  "0",
                  "#",
                ].map((digit) => (
                  <button
                    key={digit}
                    className="px-6 py-4 font-bold rounded-full border border-gray-700 duration-300 ease-in-out bg-primary hover:bg-blue-950 focus:outline-none"
                    onClick={() => setDialPhoneNumber((prev) => prev + digit)}
                  >
                    <p className="text-xl">{digit}</p>
                  </button>
                ))}
              </div>
              <button
                className="px-4 w-20 h-12 bg-green-500 rounded-xl cursor-pointer hover:bg-green-600 disabled:bg-green-900 disabled:cursor-not-allowed"
                onClick={dialPhoneNumberHandle}
                type="button"
                disabled={!serverConnected || !userConnected}
              >
                Dial
              </button>
            </section>
          ) : null
        ) : (
          <div className="flex flex-col justify-center items-center size-full">
            <CircleX size={50} className="text-red-500" />
            <p className="mt-4 text-2xl font-bold">Network Not Available!</p>
          </div>
        )}
      </div>
      {showFollowUpPopup && (
        <Dialog
          open={showFollowUpPopup}
          onClose={() => setShowFollowUpPopup(false)}
          maxWidth="100%"
        >
          <FollowPopUp
            onClose={() => setShowFollowUpPopup(false)}
            selectedNci={nciValue}
            userId={id}
            cdrResponse={cdrResponse}
            allowClose={false}
          />
        </Dialog>
      )}
    </div>
  );
};

export default Phone;
