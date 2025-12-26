"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaLock, FaTrophy, FaSearch } from "react-icons/fa";
import {
  auth,
  onAuthStateChanged,
  getUserDocRef,
  onSnapshot,
  User,
} from "../lib/firebase";
import {
  ACHIEVEMENTS_LIST,
  AchievementDef,
  getProgress,
} from "../lib/achievements";

// --- SVG & CARD COMPONENTS (Internal to this page for styling) ---

const CardGradients = () => (
  <defs>
    <linearGradient id="grad-bronze-frame" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#8B5A2B" />
      <stop offset="50%" stopColor="#CD7F32" />
      <stop offset="100%" stopColor="#8B5A2B" />
    </linearGradient>
    <linearGradient id="grad-bronze-bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#4A3015" />
      <stop offset="100%" stopColor="#2A1B0A" />
    </linearGradient>

    <linearGradient id="grad-silver-frame" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#7F8C8D" />
      <stop offset="50%" stopColor="#ECF0F1" />
      <stop offset="100%" stopColor="#7F8C8D" />
    </linearGradient>
    <linearGradient id="grad-silver-bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#2C3E50" />
      <stop offset="100%" stopColor="#1A252F" />
    </linearGradient>

    <linearGradient id="grad-gold-frame" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#B8860B" />
      <stop offset="30%" stopColor="#FFD700" />
      <stop offset="70%" stopColor="#FFD700" />
      <stop offset="100%" stopColor="#B8860B" />
    </linearGradient>
    <linearGradient id="grad-gold-bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#553C05" />
      <stop offset="100%" stopColor="#291D02" />
    </linearGradient>

    <linearGradient
      id="grad-prestigious-frame"
      x1="0%"
      y1="0%"
      x2="100%"
      y2="100%"
    >
      <stop offset="0%" stopColor="#8B0000" />
      <stop offset="50%" stopColor="#FF0000" />
      <stop offset="100%" stopColor="#8B0000" />
    </linearGradient>
    <linearGradient id="grad-prestigious-bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#330000" />
      <stop offset="100%" stopColor="#1A0000" />
    </linearGradient>

    <filter id="shadow">
      <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.5" />
    </filter>
  </defs>
);

const AchievementCard = ({
  def,
  currentProgress,
  unlocked,
}: {
  def: AchievementDef;
  currentProgress: number;
  unlocked: boolean;
}) => {
  const { title, description, tier, icon: Icon, maxProgress, image } = def;

  // Config
  const config = {
    bronze: {
      frame: "url(#grad-bronze-frame)",
      bg: "url(#grad-bronze-bg)",
      accent: "#CD7F32",
      textColor: "#CD7F32",
    },
    silver: {
      frame: "url(#grad-silver-frame)",
      bg: "url(#grad-silver-bg)",
      accent: "#ECF0F1",
      textColor: "#BDC3C7",
    },
    gold: {
      frame: "url(#grad-gold-frame)",
      bg: "url(#grad-gold-bg)",
      accent: "#FFD700",
      textColor: "#FFD700",
    },
    prestigious: {
      frame: "url(#grad-prestigious-frame)",
      bg: "url(#grad-prestigious-bg)",
      accent: "#FF0000",
      textColor: "#FF4444",
    },
  };
  const style = config[tier];

  // Calculate Bar Width
  const progressPercentage = Math.min(currentProgress / maxProgress, 1);
  const barWidth = progressPercentage * 180;

  return (
    <div
      className={`relative group w-full max-w-[280px] transition-all duration-300 transform hover:scale-105 ${
        unlocked ? "opacity-100" : "grayscale"
      }`}
      style={{ aspectRatio: "3/4" }}
    >
      <svg
        viewBox="0 0 300 400"
        className="w-full h-full drop-shadow-xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <CardGradients />

        {/* Frame */}
        <rect
          x="10"
          y="10"
          width="280"
          height="380"
          rx="20"
          fill={style.frame}
          filter="url(#shadow)"
        />
        <rect x="20" y="20" width="260" height="360" rx="15" fill={style.bg} />
        <rect
          x="30"
          y="30"
          width="240"
          height="340"
          rx="10"
          fill="none"
          stroke={style.accent}
          strokeWidth="2"
          strokeOpacity="0.3"
        />

        {/* Icon Hexagon */}
        <path
          d="M150 50 L200 80 L200 130 L150 160 L100 130 L100 80 Z"
          fill={style.frame}
          stroke={style.bg}
          strokeWidth="4"
        />

        {/* Title */}
        <foreignObject x="40" y="170" width="220" height="40">
          <div className="flex items-center justify-center h-full">
            <h3
              className="text-lg font-bold uppercase tracking-wider text-center"
              style={{
                color: style.textColor,
                textShadow: "0px 2px 4px rgba(0,0,0,0.8)",
              }}
            >
              {title}
            </h3>
          </div>
        </foreignObject>
        <path
          d="M80 215 L220 215"
          stroke={style.accent}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Description */}
        <foreignObject x="40" y="230" width="220" height="80">
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-center font-medium leading-tight text-gray-300 px-2">
              {description}
            </p>
          </div>
        </foreignObject>

        {/* Progress Bar */}
        <rect
          x="60"
          y="325"
          width="180"
          height="24"
          rx="12"
          fill="rgba(0,0,0,0.5)"
        />
        <rect
          x="60"
          y="325"
          width={barWidth}
          height="24"
          rx="12"
          fill={style.frame}
        />
        <foreignObject x="60" y="325" width="180" height="24">
          <div className="flex items-center justify-center h-full">
            <span
              className={`text-xs font-bold ${
                unlocked ? "text-black" : "text-white"
              } drop-shadow-md tracking-widest`}
            >
              {currentProgress} / {maxProgress}
            </span>
          </div>
        </foreignObject>
      </svg>

      {/* Overlay Icon/Image */}
      <div className="absolute top-[27.5%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-lg pointer-events-none">
        {image ? (
          <div className="w-16 h-16 flex items-center justify-center overflow-hidden rounded-full">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <Icon
            size={48}
            strokeWidth={1.5}
            color={
              tier === "silver"
                ? "#2C3E50"
                : tier === "prestigious"
                ? "#330000"
                : "#4A3015"
            }
            fill={
              tier === "gold"
                ? "#FFD700"
                : tier === "prestigious"
                ? "#FF0000"
                : "none"
            }
            className={
              tier === "gold" || tier === "prestigious" ? "animate-pulse" : ""
            }
          />
        )}
      </div>

      {/* Lock Overlay */}
      {!unlocked && (
        <div className="absolute top-3 right-3">
          <div className="bg-gray-900 p-2 rounded-full border border-gray-600 shadow-xl">
            <FaLock className="text-gray-400 w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  );
};

export default function AchievementsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userAchievements, setUserAchievements] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");
  const [tierFilter, setTierFilter] = useState<
    "all" | "bronze" | "silver" | "gold" | "prestigious"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  const statusStyles = {
    all: "bg-sky-500 text-white",
    unlocked: "bg-green-500 text-white",
    locked: "bg-slate-600 text-white",
  };

  const tierStyles = {
    all: "bg-indigo-500 text-white",
    bronze: "bg-[#CD7F32] text-amber-950",
    silver: "bg-[#ECF0F1] text-slate-800",
    gold: "bg-[#FFD700] text-yellow-900",
    prestigious: "bg-[#FF0000] text-white",
  };

  // Auth & Data Fetching
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Listen to user document for real-time achievement updates
        const userDoc = getUserDocRef(currentUser.uid);
        const unsubDoc = onSnapshot(userDoc, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Expecting data.achievements = { "conq-1": 5, "wild-1": 0 }
            setUserAchievements(data.achievements || {});
          }
          setLoading(false);
        });
        return () => unsubDoc();
      } else {
        setLoading(false);
        // Redirect if not logged in? Or just show empty.
        // router.push('/');
      }
    });
    return () => unsubscribe();
  }, []);

  // Filter Logic
  const processedList = ACHIEVEMENTS_LIST.map((ach) => {
    const current = userAchievements[ach.id] || 0;
    const unlocked = current >= ach.maxProgress;
    return { ...ach, current, unlocked };
  });

  const filteredList = processedList.filter((ach) => {
    const matchesStatus =
      filter === "all" ||
      (filter === "unlocked" && ach.unlocked) ||
      (filter === "locked" && !ach.unlocked);

    const matchesTier = tierFilter === "all" || ach.tier === tierFilter;

    const matchesSearch =
      ach.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ach.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesTier && matchesSearch;
  });

  // Stats
  const unlockedCount = processedList.filter((a) => a.unlocked).length;
  const totalCount = processedList.length;
  const percentage = Math.round((unlockedCount / totalCount) * 100);

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading Hall of Fame...
      </div>
    );

  return (
    <div
      className="min-h-screen bg-slate-900 text-white p-4 md:p-8 font-sans selection:bg-yellow-500 selection:text-black"
      style={{
        backgroundImage: "url('/main_bg.png')",
        backgroundSize: "cover",
        backgroundBlendMode: "multiply",
        backgroundColor: "rgba(15, 23, 42, 0.9)",
      }}
    >
      {/* Navigation */}
      <div className="max-w-7xl mx-auto mb-8">
        <button
          onClick={() => router.push("/")}
          className="flex items-center text-slate-300 hover:text-white transition-colors mb-6 group"
        >
          <FaArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />{" "}
          Back to Home
        </button>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-r from-yellow-400 via-orange-500 to-red-500 mb-2">
              HALL OF FAME
            </h1>
            <p className="text-slate-300 text-lg">
              {user?.displayName
                ? `${user.displayName}'s Collection`
                : "Your Collection"}
            </p>
          </div>

          {/* Stats Circle */}
          <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-xl flex items-center gap-6">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-700"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="text-yellow-500 transition-all duration-1000 ease-out"
                  strokeDasharray={`${percentage}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
              </svg>
              <span className="absolute text-sm font-bold">{percentage}%</span>
            </div>
            <div>
              <div className="text-sm text-slate-400 uppercase tracking-widest font-semibold">
                Total Score
              </div>
              <div className="text-2xl font-bold text-white">
                {unlockedCount} / {totalCount}{" "}
                <span className="text-sm font-normal text-slate-500">
                  Unlocked
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="mt-8 space-y-6">
          {/* Search Bar */}
          <div className="relative max-w-md">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search achievements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all backdrop-blur-sm"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            {/* Status Filter */}
            <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl w-fit backdrop-blur-sm border border-slate-700/50">
              {(["all", "unlocked", "locked"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-6 py-2 rounded-lg text-sm font-bold uppercase transition-all duration-200 ${
                    filter === f
                      ? `${statusStyles[f]} shadow-lg scale-105`
                      : "text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Tier Filter */}
            <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl w-fit max-w-full backdrop-blur-sm border border-slate-700/50 overflow-x-auto no-scrollbar">
              {(
                ["all", "bronze", "silver", "gold", "prestigious"] as const
              ).map((t) => (
                <button
                  key={t}
                  onClick={() => setTierFilter(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold uppercase whitespace-nowrap transition-all duration-200 ${
                    tierFilter === t
                      ? `${tierStyles[t]} shadow-lg scale-105`
                      : "text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 md:gap-8 justify-items-center">
        {filteredList.map((ach) => (
          <AchievementCard
            key={ach.id}
            def={ach}
            currentProgress={ach.current}
            unlocked={ach.unlocked}
          />
        ))}

        {filteredList.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-500">
            <FaTrophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-xl font-medium">No achievements found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
