"use client";

import Link from "next/link";
import { useState } from "react";
import { FaTimes } from "react-icons/fa";

export default function Home() {
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [numPlayers, setNumPlayers] = useState(2);
  const [difficulty, setDifficulty] = useState<string>("easy");

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-24 bg-cover bg-center"
      style={{ backgroundImage: "url('/main_bg.png')" }}
    >
      <div className="relative flex flex-col place-items-center bg-black/30 backdrop-blur-xl border border-white/20 rounded-3xl p-12">
        <h1 className="text-6xl font-bold text-white tracking-[1.5rem] mb-12 -mr-[1.5rem]">
          <span className="heading u">U</span>
          <span className="heading n">N</span>
          <span className="heading o">O</span>
        </h1>

        <button
          onClick={() => setIsHowToPlayOpen(true)}
          className="mb-8 px-6 py-2 bg-white/10 text-white rounded-lg text-md font-semibold transition-all hover:bg-white/20"
        >
          How to Play
        </button>

        <div className="flex flex-col gap-6 w-64">
          <div className="hidden md:flex gap-2 justify-center align-middle">
            <label htmlFor="players" className="text-lg text-white/80 pt-2.5">
              Players:
            </label>
            <select
              id="players"
              className="bg-white/10 text-black rounded-lg px-4 py-3 border border-white/20 appearance-none w-1/2"
              value={numPlayers}
              onChange={(e) => setNumPlayers(Number(e.target.value))}
            >
              <option value={2}>2 Players</option>
              <option value={3}>3 Players</option>
              <option value={4}>4 Players</option>
            </select>
          </div>

          <div className="flex gap-2  justify-center align-middle">
            <label
              htmlFor="difficulty"
              className="text-lg text-white/80 pt-2.5"
            >
              Difficulty
            </label>
            <select
              id="difficulty"
              className="bg-white/10 text-black rounded-lg px-4 py-3 border border-white/20 appearance-none w-1/2"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <Link
            href={`/game?players=${numPlayers}&difficulty=${difficulty}`}
            className="mt-4"
          >
            <button className="w-full px-6 py-4 bg-green-600/80 text-white rounded-lg text-xl font-semibold transition-all hover:bg-green-500/80 hover:scale-105 active:scale-95">
              Start Game
            </button>
          </Link>
        </div>
      </div>

      {isHowToPlayOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-white/20 rounded-xl p-8 text-white shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl font-bold text-white">How to Play UNO</h2>
              <button
                onClick={() => setIsHowToPlayOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Close rules"
              >
                <FaTimes size="1.5rem" />
              </button>
            </div>
            <div className="space-y-6 text-white/90 leading-relaxed">
              <p>
                The goal of UNO is to be the first player to get rid of all your
                cards.
              </p>
              <div>
                <h3 className="text-2xl font-semibold text-white mb-3 border-b border-white/20 pb-2">
                  Gameplay
                </h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    Match the top card of the discard pile by either number,
                    color, or action.
                  </li>
                  <li>
                    For example, if the top card is a red 7, you can play any
                    red card or any color 7.
                  </li>
                  <li>
                    If you don't have a playable card, you must draw a card from
                    the deck.
                  </li>
                  <li>
                    When you have only one card left, click the{" "}
                    <span className="font-bold text-yellow-300">UNO!</span>{" "}
                    button before your turn ends. If you forget and another
                    player catches you, you'll draw two penalty cards!
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-white mb-3 border-b border-white/20 pb-2">
                  Special Cards
                </h3>
                <ul className="space-y-3">
                  <li>
                    <strong className="text-sky-400">Reverse:</strong> Reverses
                    the direction of play.
                  </li>
                  <li>
                    <strong className="text-red-400">Skip:</strong> The next
                    player in line loses their turn.
                  </li>
                  <li>
                    <strong className="text-green-400">Draw Two:</strong> The
                    next player must draw two cards and miss their turn.
                  </li>
                  <li>
                    <strong className="font-bold">Wild:</strong> Allows you to
                    change the current color.
                  </li>
                  <li>
                    <strong className="font-black">Wild Draw Four:</strong>
                    Change the color and force the next player to draw four
                    cards and lose their turn.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
