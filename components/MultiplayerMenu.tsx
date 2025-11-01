"use client";

import type { User } from "firebase/auth";

interface MultiplayerMenuProps {
  loading: boolean;
  user: User | null;
  gameIdToJoin: string;
  setGameIdToJoin: (value: string) => void;
  handleCreateGame: () => void;
  handleJoinGame: () => void;
}

export const MultiplayerMenu = ({
  loading,
  user,
  gameIdToJoin,
  setGameIdToJoin,
  handleCreateGame,
  handleJoinGame,
}: MultiplayerMenuProps) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-5">
      {/* Create Game */}
      <div className="flex flex-col gap-4 p-4 border border-white/30 rounded-xl flex-1">
        <h2 className="text-lg sm:text-xl text-white font-semibold text-center">
          Create Online Game
        </h2>
        <button
          onClick={handleCreateGame}
          disabled={loading || !user}
          className="w-full px-6 py-3 bg-green-600/80 text-white rounded-lg text-xl font-semibold transition-all hover:bg-green-500/80 hover:scale-105 active:scale-95 disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
          title={!user ? "Please log in first" : ""}
        >
          {loading ? "Creating..." : "Create Game"}
        </button>
      </div>

      {/* Join Game */}
      <div className="flex flex-col gap-4 p-4 border border-white/30 rounded-xl flex-1">
        <h2 className="text-lg sm:text-xl text-white font-semibold text-center">
          Join Online Game
        </h2>
        <input
          id="gameIdInput"
          type="text"
          placeholder="Enter 6-digit Game ID"
          maxLength={6}
          value={gameIdToJoin}
          onChange={(e) =>
            setGameIdToJoin(e.target.value.replace(/[^0-9]/g, ""))
          }
          className="w-full px-4 py-3 bg-white/10 text-white placeholder-white/50 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-[0.2em] transition-all"
        />
        <button
          onClick={handleJoinGame}
          disabled={loading || !user || gameIdToJoin.length !== 6}
          className="w-full px-6 py-3 bg-blue-600/80 text-white rounded-lg text-xl font-semibold transition-all hover:bg-blue-500/80 hover:scale-105 active:scale-95 disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
          title={
            !user
              ? "Please log in first"
              : gameIdToJoin.length !== 6
              ? "Enter a 6-digit Game ID"
              : ""
          }
        >
          {loading ? "Joining..." : "Join Game"}
        </button>
      </div>
    </div>
  );
};
