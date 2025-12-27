"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaLock,
  FaStar,
  FaTrophy,
  FaLocationArrow,
} from "react-icons/fa";
import {
  auth,
  onAuthStateChanged,
  getUserDocRef,
  onSnapshot,
  User,
} from "../lib/firebase";
import {
  LEVEL_DEFINITIONS,
  LevelDef,
  getCurrentLevel,
  MAX_LEVEL,
} from "../lib/levels";
import {
  FaLocationPin,
  FaLocationPinLock,
  FaMapLocation,
} from "react-icons/fa6";

interface UserStats {
  xp?: number;
  wins?: number;
  displayName?: string;
}

const LevelTile = ({
  levelDef,
  userXp,
  isCurrentLevel,
}: {
  levelDef: LevelDef;
  userXp: number;
  isCurrentLevel: boolean;
}) => {
  const isUnlocked = userXp >= levelDef.requiredXp;

  const tileStyle = isCurrentLevel
    ? "bg-blue-500/10 border-blue-500/30 scale-105 shadow-lg shadow-blue-500/20"
    : isUnlocked
    ? "bg-yellow-500/10 border-yellow-500/30 opacity-80"
    : "bg-gray-800/50 border-gray-700";

  const textStyle = isCurrentLevel
    ? "text-blue-300"
    : isUnlocked
    ? "text-yellow-300"
    : "text-gray-500";

  return (
    <div
      className={`relative flex flex-col items-center justify-center w-28 h-28 md:w-32 md:h-32 rounded-full border-4 transition-all duration-300 ${tileStyle} ${
        !isUnlocked && "grayscale"
      }`}
    >
      {!isUnlocked && (
        <FaLock className="absolute top-2 right-2 text-gray-600" />
      )}
      <div className={`font-black text-4xl md:text-5xl ${textStyle}`}>
        {levelDef.level}
      </div>
      <div
        className={`text-xs font-semibold uppercase tracking-wider mt-2 ${textStyle}`}
      >
        {levelDef.requiredXp.toLocaleString()} XP
      </div>
      {isUnlocked && (
        <div
          className={`absolute bottom-2 left-2 p-1 ${
            isCurrentLevel ? "bg-blue-500/20" : "bg-yellow-500/20"
          } rounded-full`}
        ></div>
      )}
    </div>
  );
};

export default function LevelsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({ xp: 0, wins: 0 });
  const [loading, setLoading] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Infinite Scroll & Parallax State
  const [range, setRange] = useState<{ min: number; max: number } | null>(null);
  const scrollAdjustmentRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const ROW_HEIGHT = 160;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = getUserDocRef(currentUser.uid);
        const unsubDoc = onSnapshot(userDoc, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserStats({
              xp: data.xp || 0,
              wins: data.wins || 0,
              displayName: data.displayName || "Player",
            });
          }
          setLoading(false);
        });
        return () => unsubDoc();
      } else {
        setLoading(false);
        router.push("/profile"); // Redirect to login if not authenticated
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Initialize visible range when data loads
  useEffect(() => {
    if (!loading && userStats && !range) {
      const currentLevel = getCurrentLevel(userStats.xp || 0);
      setRange({
        min: Math.max(1, currentLevel - 2),
        max: Math.min(MAX_LEVEL, currentLevel + 2),
      });
    }
  }, [loading, userStats, range]);

  // Handle Scroll for Parallax and Infinite Loading
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const currentLevel = getCurrentLevel(userStats.xp || 0);

    const handleScroll = () => {
      if (!range) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const THRESHOLD = 200;

      // Expand Top (Lower Levels) - Trigger when near top
      if (scrollTop < THRESHOLD && range.min > 1) {
        const newMin = Math.max(1, range.min - 2);
        if (newMin < range.min) {
          const addedLevels = range.min - newMin;
          scrollAdjustmentRef.current = addedLevels * ROW_HEIGHT;
          setRange((prev) => (prev ? { ...prev, min: newMin } : null));
        }
      }

      // Expand Bottom (Higher Levels) - Trigger when near bottom
      if (
        scrollTop + clientHeight > scrollHeight - THRESHOLD &&
        range.max < MAX_LEVEL
      ) {
        const newMax = Math.min(MAX_LEVEL, range.max + 2);
        if (newMax > range.max) {
          setRange((prev) => (prev ? { ...prev, max: newMax } : null));
        }
      }

      // Check visibility of current level
      const sortedLevels = LEVEL_DEFINITIONS.filter(
        (l) => l.level >= range.min && l.level <= range.max
      ).sort((a, b) => a.level - b.level);

      const currentIndex = sortedLevels.findIndex(
        (l) => l.level === currentLevel
      );
      if (currentIndex !== -1) {
        const levelY = currentIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
        const isVisible =
          levelY >= scrollTop + 100 && levelY <= scrollTop + clientHeight - 100;
        setShowScrollButton(!isVisible);
      }
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check
    return () => container.removeEventListener("scroll", handleScroll);
  }, [range, ROW_HEIGHT, userStats.xp]);

  // Adjust scroll position to prevent jumping when adding items to the top
  useLayoutEffect(() => {
    if (scrollAdjustmentRef.current !== 0 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop += scrollAdjustmentRef.current;
      scrollAdjustmentRef.current = 0;
    }
  });

  const currentLevel = getCurrentLevel(userStats.xp || 0);
  const xpForNextLevel =
    LEVEL_DEFINITIONS.find((l) => l.level === currentLevel + 1)?.requiredXp ||
    userStats.xp ||
    0;
  const xpForCurrentLevel =
    LEVEL_DEFINITIONS.find((l) => l.level === currentLevel)?.requiredXp || 0;
  const progressToNextLevel =
    xpForNextLevel > xpForCurrentLevel
      ? Math.round(
          (((userStats.xp || 0) - xpForCurrentLevel) /
            (xpForNextLevel - xpForCurrentLevel)) *
            100
        )
      : 100;

  // Calculate visible levels based on dynamic range
  const min = range?.min ?? Math.max(1, currentLevel - 2);
  const max = range?.max ?? Math.min(MAX_LEVEL, currentLevel + 2);

  const visibleLevels = LEVEL_DEFINITIONS.filter(
    (l) => l.level >= min && l.level <= max
  ).sort((a, b) => a.level - b.level); // Ascending order

  // Generate path points for SVG
  const points = visibleLevels.map((l, i) => {
    // Use level for consistent X position regardless of index
    const xPattern = [50, 90, 50, 10, 20, 80]; // Added more patterns for variety
    const x = xPattern[l.level % 4];
    return { x, y: i * ROW_HEIGHT + ROW_HEIGHT / 2 };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x}% ${p.y}` : `${acc} L ${p.x}% ${p.y}`;
  }, "");

  const scrollToCurrentLevel = () => {
    const el = document.getElementById(`level-${currentLevel}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading Player Level...
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 text-white font-sans relative overflow-hidden flex flex-col">
      {/* Parallax Background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "url('/main_bg.png')",
          backgroundSize: "cover",
          backgroundBlendMode: "multiply",
          backgroundColor: "rgba(15, 23, 42, 0.9)",
        }}
      />

      <div className="relative z-20 p-4 md:p-8 pb-0 md:pb-0 max-w-7xl mx-auto w-full shrink-0">
        <button
          onClick={() => router.push("/profile")}
          className="flex items-center text-slate-300 hover:text-white transition-colors mb-6 group"
        >
          <FaArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Profile
        </button>

        <div className="bg-gray-800/50 border border-white/20 rounded-xl p-6 mb-0 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                {userStats.displayName}'s Level
              </h1>
              <div className="flex items-center justify-center md:justify-start gap-4 mt-2 text-slate-300">
                <div className="flex items-center gap-2">
                  <FaTrophy className="text-yellow-400" />
                  <span>{userStats.wins || 0} Wins</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaStar className="text-cyan-400" />
                  <span>{(userStats.xp || 0).toLocaleString()} XP</span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-1/2">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-lg">Level {currentLevel}</span>
                <span className="text-sm text-slate-400">
                  Next: Lvl {currentLevel + 1}
                </span>
              </div>
              <div className="w-full bg-black/30 rounded-full h-6 border border-slate-600">
                <div
                  className="bg-linear-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressToNextLevel}%` }}
                ></div>
              </div>
              <div className="text-center text-xs mt-1 text-slate-400">
                {(userStats.xp || 0).toLocaleString()} /{" "}
                {xpForNextLevel.toLocaleString()} XP
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 w-full [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800/20 [&::-webkit-scrollbar-thumb]:bg-slate-600/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-blue-500/80"
      >
        <div className="p-4 md:p-8 pt-0 md:pt-0 max-w-7xl mx-auto">
          <div
            className="relative w-full max-w-md mx-auto mt-12"
            style={{ height: visibleLevels.length * ROW_HEIGHT }}
          >
            {visibleLevels.map((def, i) => (
              <div
                key={def.level}
                id={`level-${def.level}`}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
                style={{
                  left: `${points[i].x}%`,
                  top: `${points[i].y}px`,
                  zIndex: 10,
                }}
              >
                <LevelTile
                  levelDef={def}
                  userXp={userStats.xp || 0}
                  isCurrentLevel={def.level === currentLevel}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll to Current Level Button */}
      <button
        onClick={scrollToCurrentLevel}
        className={`absolute bottom-8 right-8 z-50 bg-yellow-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-lg transition-all duration-300 transform ${
          showScrollButton
            ? "translate-y-0 opacity-100"
            : "translate-y-20 opacity-0 pointer-events-none"
        }`}
        aria-label="Scroll to current level"
      >
        <FaMapLocation className="w-6 h-6" />
      </button>
    </div>
  );
}
