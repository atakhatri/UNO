"use client";

import Link from "next/link";
import { FaUser } from "react-icons/fa";
import type { User } from "firebase/auth";

// Define User Profile type to be used in props
interface UserProfile {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  friends: string[];
  pendingRequests: string[];
  sentRequests: string[];
}

interface HeaderProps {
  user: User | null;
  userProfile: UserProfile | null;
  friendsDetails: UserProfile[];
  pendingRequestsDetails: UserProfile[]; // Keep for notification logic
}

export const Header = ({
  user,
  userProfile,
  friendsDetails,
  pendingRequestsDetails,
}: HeaderProps) => {
  return (
    <div className="flex justify-between items-center w-full mb-4 sm:mb-6">
      <h1 className="text-5xl sm:text-5xl md:text-6xl font-bold text-white tracking-[0.5rem] sm:tracking-[1rem] -mr-[0.5rem] sm:-mr-[1rem]">
        <span className="heading u">U</span>
        <span className="heading n">N</span>
        <span className="heading o">O</span>
      </h1>
      <div className="relative">
        <Link
          href="/profile"
          className="pt-4 bg text-white rounded-full transition-al"
          aria-label="Open Profile"
        >
          <FaUser className="w-12 h-12 bg-white/20 p-2 rounded-full text-white" />
        </Link>
        {user &&
          userProfile &&
          friendsDetails.length === 0 &&
          pendingRequestsDetails.length === 0 && (
            <div className="absolute top-full right-0 mt-3 mr-2 w-48 bg-blue-600 text-white text-xs rounded-lg p-2 shadow-lg animate-pulse z-10 pointer-events-none">
              <p>Click here to open the friends tab and add some friends!</p>
              <div className="absolute bottom-full right-4 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-blue-600"></div>
            </div>
          )}
      </div>
    </div>
  );
};
