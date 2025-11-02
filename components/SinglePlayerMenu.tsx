"use client";

import Link from "next/link";

interface SinglePlayerMenuProps {
  loading: boolean;
}

export const SinglePlayerMenu = ({ loading }: SinglePlayerMenuProps) => {
  return (
    <div className="flex flex-col gap-4 p-4 border border-white/30 rounded-xl">
      <h2 className="text-lg sm:text-xl text-white font-semibold text-center">
        Single Player
      </h2>
      <Link href={`/local-game?difficulty=easy&players=2`} passHref>
        <button
          disabled={loading}
          className="w-full px-5 py-2 bg-teal-600/80 text-white rounded-lg text-lg sm:text-xl font-semibold transition-all hover:bg-teal-500/80 hover:scale-105 active:scale-95 disabled:bg-gray-500"
        >
          Play vs Computer
        </button>
      </Link>
    </div>
  );
};
