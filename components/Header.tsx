"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaUser, FaTrophy, FaIdCard, FaCog, FaStore } from "react-icons/fa";
import { Coins } from "lucide-react";
import type { User } from "firebase/auth";

interface UserProfile {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  friends: string[];
  pendingRequests: string[];
  sentRequests: string[];
  coins?: number;
  points?: number;
  inventory?: string[];
}

interface HeaderProps {
  user: User | null;
  userProfile: UserProfile | null;
  friendsDetails: UserProfile[];
  pendingRequestsDetails: UserProfile[];
  onAuthRequired: () => void;
}

export const Header = ({
  user,
  userProfile,
  friendsDetails,
  pendingRequestsDetails,
  onAuthRequired,
}: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const formatCoins = (coins: number | undefined) => {
    if (coins === undefined) return "0";
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(coins);
  };

  const handleProtectedLinkClick = (path: string) => {
    setIsMenuOpen(false);
    if (!user) {
      onAuthRequired();
    } else {
      router.push(path);
    }
  };

  return (
    <div className="flex justify-between items-center w-full mb-4 sm:mb-6">
      <div className="flex items-center gap-2 bg-gray-900/80 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-yellow-500/50 text-yellow-400 font-bold shadow-lg backdrop-blur-md z-10">
        <Coins className="text-yellow-400" />
        <span>{formatCoins(userProfile?.coins)}</span>
      </div>

      {/* <h1 className="text-5xl sm:text-5xl md:text-6xl font-bold text-white tracking-[0.5rem] sm:tracking-[1rem] -mr-2 sm:-mr-4">
        <span className="heading u">U</span>
        <span className="heading n">N</span>
        <span className="heading o">O</span>
      </h1> */}

      {/* Profile/Menu Section */}
      <div className="relative flex flex-col items-center" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`bg text-white rounded-full transition-transform duration-300 hover:scale-110 focus:outline-none ${
            isMenuOpen ? "settings-open" : "settings-close"
          }`}
          aria-label="Open Settings Menu"
          aria-expanded={isMenuOpen}
        >
          <FaCog className="w-12 h-12 bg-white/20 p-2 rounded-full text-white" />
        </button>

        {/* Dropdown Speed Dial Menu */}
        <div
          className={`absolute top-full mt-4 flex flex-col gap-4 items-center transition-all duration-300 z-50 ${
            isMenuOpen
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          {/* Profile Item */}
          <Link
            href="/profile"
            className="relative group flex items-center justify-center"
            onClick={() => setIsMenuOpen(false)}
          >
            <div className="absolute right-full mr-4 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Profile
            </div>
            <div className="w-11 h-11 bg-white/20 p-2 rounded-full text-white shadow-lg hover:bg-blue-500 hover:scale-110 transition-all flex items-center justify-center border border-white/20">
              <FaUser size={20} />
            </div>
          </Link>

          {/* Achievements Item */}
          <button
            onClick={() => handleProtectedLinkClick("/achievements")}
            className="relative group flex items-center justify-center"
          >
            <div className="absolute right-full mr-4 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Achievements
            </div>
            <div className="w-11 h-11 bg-white/20 p-2 rounded-full text-white shadow-lg hover:bg-yellow-400 hover:scale-110 transition-all flex items-center justify-center border border-white/20">
              <FaTrophy size={20} />
            </div>
          </button>

          {/* Store Item */}
          <button
            onClick={() => handleProtectedLinkClick("/store")}
            className="relative group flex items-center justify-center"
          >
            <div className="absolute right-full mr-4 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Store
            </div>
            <div className="w-11 h-11 bg-white/20 p-2 rounded-full text-white shadow-lg hover:bg-purple-500 hover:scale-110 transition-all flex items-center justify-center border border-white/20">
              <FaStore size={20} />
            </div>
          </button>
        </div>

        {/* New Player Tooltip */}
        {user &&
          userProfile &&
          friendsDetails.length === 0 &&
          pendingRequestsDetails.length === 0 &&
          !isMenuOpen && (
            <div className="absolute top-full right-0 mt-3 mr-2 w-48 bg-blue-600 text-white text-xs rounded-lg p-2 shadow-lg animate-pulse z-10 pointer-events-none">
              <p>Click here to open menu and add friends!</p>
              <div className="absolute bottom-full right-4 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-blue-600"></div>
            </div>
          )}
      </div>
    </div>
  );
};
