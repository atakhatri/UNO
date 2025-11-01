"use client";

import Link from "next/link";
import { Difficulty } from "../app/local-game/game-types";

interface SinglePlayerMenuProps {
  difficulty: Difficulty;
  setDifficulty: (difficulty: Difficulty) => void;
  loading: boolean;
}

export const SinglePlayerMenu = ({
  difficulty,
  setDifficulty,
  loading,
}: SinglePlayerMenuProps) => {
  return (
    <div className="flex flex-col gap-4 p-4 border border-white/30 rounded-xl">
      <h2 className="text-lg sm:text-xl text-white font-semibold text-center">
        Single Player
      </h2>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <select
          id="difficulty-local"
          className="bg-black/50 text-white rounded-lg px-4 py-2 text-sm sm:text-base border border-white/20 appearance-none w-full sm:w-1/2"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <Link
          href={`/local-game?difficulty=${difficulty}&players=2`}
          passHref
          className="w-full sm:w-1/2"
        >
          <button
            disabled={loading}
            className="w-full px-5 py-2 bg-teal-600/80 text-white rounded-lg text-lg sm:text-xl font-semibold transition-all hover:bg-teal-500/80 hover:scale-105 active:scale-95 disabled:bg-gray-500"
          >
            Play vs Computer
          </button>
        </Link>
      </div>
    </div>
  );
};
