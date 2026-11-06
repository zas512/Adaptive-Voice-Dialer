import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import Phone from "./Phone";
import { FaServer } from "react-icons/fa6";
import { FaUser } from "react-icons/fa";
import { useState } from "react";
import { CircleX } from "lucide-react";

const MyPhone = () => {
  const isPhoneOpen = useSelector(
    (state: RootState) => state.phone.isPhoneOpen
  );
  const user = useSelector((state: RootState) => state.auth);
  const [isUserRegistered, setIsUserRegistered] = useState(true);
  const [isSipConnected, setIsSipConnected] = useState(true);

  return (
    <div
      className={`shadow-lg w-96 h-[600px] flex bg-primary flex-col justify-between rounded-xl border-8 border-primary absolute bottom-24 right-6 z-10 ${
        !isPhoneOpen && "hidden"
      }`}
    >
      {/* Phone header */}
      <section className="flex justify-between items-center px-4 py-2 bg-black rounded-t-xl shadow-md">
        <p className="text-sm">
          User : <span className="font-semibold">{user.name ?? ""}</span>
        </p>
        <p className="text-sm">
          ID : <span className="font-semibold">{user.id ?? ""}</span>
        </p>
        <div className="flex gap-2 items-center">
          <FaUser
            size={15}
            className={isUserRegistered ? "text-green-500" : "text-red-500"}
          />
          <FaServer
            size={15}
            className={isSipConnected ? "text-green-500" : "text-red-500"}
          />
        </div>
      </section>
      {/* Phone screen */}
      <section className="bg-black size-full">
        {user.id && user.domain && user.secret ? (
          <Phone
            id={user.id ?? 0}
            userName={user.name ?? ""}
            domain={user.domain ?? ""}
            password={user.secret ?? ""}
            port={user.port ?? 0}
            setIsUserRegistered={setIsUserRegistered}
            setIsSipConnected={setIsSipConnected}
          />
        ) : (
          <div className="flex flex-col justify-center items-center bg-white bg-opacity-25 backdrop-blur-xl size-full">
            <CircleX size={50} className="text-red-500" />
            <p className="mt-4 text-2xl font-bold">
              ID, Domain or Secret Invalid!
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default MyPhone;
