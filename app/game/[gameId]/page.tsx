"use client";

import { FaCog, FaTimes } from "react-icons/fa";
import { CardComponent } from "@/app/Card";
import { useRouter, useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  Color,
  Card,
  cardBackDesigns,
  difficultyDisplay,
} from "../../game/game-types";
import { useMultiplayerUnoGame } from "./useMultiplayerUnoGame";

function Game() {
  const router = useRouter();
  const params = useParams();
  const gameId = Array.isArray(params.gameId)
    ? params.gameId[0]
    : params.gameId;

  // === Core Game State and Logic from Hook ===
  const { game, userId, error, startGame, playCard, drawCard, selectColor } =
    useMultiplayerUnoGame(gameId);
  // ===========================================

  // === UI-Only State ===
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cardBack, setCardBack] =
    useState<keyof typeof cardBackDesigns>("default");
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  // Effect to clear local messages
  useEffect(() => {
    if (localMessage) {
      const timer = setTimeout(() => {
        setLocalMessage(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [localMessage]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-8">
        <h2 className="text-3xl text-red-500 mb-4">Error</h2>
        <p className="text-xl mb-6">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-xl font-semibold"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (!game || !userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        Loading game...
      </div>
    );
  }

  // --- Derived State ---
  const player = game.players.find((p) => p.uid === userId);
  const opponents = game.players.filter((p) => p.uid !== userId);
  const topOfDiscard = game.discardPile[game.discardPile.length - 1];
  const isPlayerTurn =
    game.status === "playing" &&
    game.players[game.currentPlayerIndex].uid === userId;
  const isHost = game.hostId === userId;

  // Check if we are waiting for the current player to pick a color
  const isColorPickerOpen =
    isPlayerTurn && topOfDiscard.color === "black" && game.chosenColor === null;

  const handlePlayCard = (card: Card, index: number) => {
    if (!isPlayerTurn) {
      setLocalMessage("It's not your turn!");
      return;
    }
    playCard(card, index);
  };

  const handleDrawCard = () => {
    if (!isPlayerTurn) {
      setLocalMessage("It's not your turn!");
      return;
    }
    drawCard();
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden">
      {/* Header: Game ID & Settings */}
      <div className="absolute top-4 left-4 z-30 bg-black/30 p-3 rounded-lg">
        <span className="font-bold text-lg">Game ID:</span>
        <span className="ml-2 font-mono text-xl text-yellow-300">
          {game.gameId}
        </span>
      </div>

      <div className="absolute top-4 right-4 z-30">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Open settings"
        >
          <FaCog size="1.5rem" />
        </button>
      </div>

      {/* Opponents' Hands */}
      <div className="w-full flex justify-around">
        {opponents.map((opponent) => (
          <div key={opponent.id} className="flex flex-col items-center">
            <h2
              className={`text-xl font-bold mb-2 text-center transition-all ${
                game.players[game.currentPlayerIndex].id === opponent.id
                  ? "text-yellow-300 scale-110"
                  : "text-white/50"
              }`}
            >
              {opponent.name} ({opponent.hand.length})
            </h2>
            {/* Simple hand display for opponents */}
            <div className="flex justify-center h-28 items-center">
              <div
                className={`w-16 h-24 ${cardBackDesigns[cardBack]} rounded-md flex items-center justify-center border-2 border-black shadow-md`}
              >
                <span className="font-bold text-2xl text-white">
                  {opponent.hand.length}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Game Table */}
      <div className="flex items-end justify-center gap-8 my-8">
        {/* Deck */}
        <div className="flex flex-col items-center">
          <p className="mb-2 font-semibold">Deck ({game.deck.length})</p>
          <div
            className={`w-20 h-28 ${
              cardBackDesigns[cardBack]
            } rounded-lg border-2 border-black ${
              isPlayerTurn ? "cursor-pointer hover:scale-105" : "opacity-70"
            } transition-transform flex items-center justify-center`}
            onClick={handleDrawCard}
          ></div>
        </div>

        {/* Turn Info */}
        <div className="flex flex-col items-center text-center pb-4 w-48">
          <div className="text-xl font-semibold">
            {game.status === "waiting"
              ? "Waiting..."
              : game.status === "finished"
              ? "Game Over!"
              : `${game.players[game.currentPlayerIndex].name}'s Turn`}
          </div>
        </div>

        {/* Discard Pile */}
        <div className="flex flex-col items-center">
          <p className="mb-2 font-semibold">Discard Pile</p>
          {topOfDiscard && (
            <CardComponent card={topOfDiscard} className="animate-pop-in" />
          )}
          {game.chosenColor && (
            <div
              className={`w-20 h-4 mt-2 rounded ${
                {
                  red: "bg-red-500",
                  green: "bg-green-500",
                  blue: "bg-blue-500",
                  yellow: "bg-yellow-400",
                }[game.chosenColor]
              }`}
            ></div>
          )}
        </div>
      </div>

      {/* Game Status / Start Button */}
      {game.status === "waiting" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-black/70 p-8 rounded-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Waiting for Players...</h2>
          <p className="text-lg mb-4">
            Share Game ID:{" "}
            <span className="text-yellow-300 font-bold">{game.gameId}</span>
          </p>
          <p className="text-white/80 mb-6">
            Players: {game.players.map((p) => p.name).join(", ")}
          </p>
          {isHost && (
            <button
              onClick={startGame}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-xl font-semibold"
            >
              Start Game ({game.players.length}/4)
            </button>
          )}
          {!isHost && (
            <p className="text-lg">
              Waiting for host ({game.hostId}) to start...
            </p>
          )}
        </div>
      )}

      {/* Player's Hand */}
      <div className="w-full">
        <h2
          className={`text-2xl font-bold mb-4 text-center transition-all ${
            isPlayerTurn ? "text-yellow-300 scale-110" : "text-white"
          }`}
        >
          Your Hand ({player?.hand.length})
        </h2>
        <div className="relative flex justify-center items-center">
          <div className="flex justify-center gap-2 flex-wrap min-h-32 items-center">
            {player?.hand.map((card, index) => (
              <CardComponent
                key={`${card.color}-${card.value}-${index}`}
                card={card}
                onClick={() => handlePlayCard(card, index)}
                className={!isPlayerTurn ? "opacity-70" : ""}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Winner Modal */}
      {game.status === "finished" && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-white/10 border border-white/20 rounded-xl p-8 text-center shadow-2xl">
            <h2 className="text-4xl font-bold mb-4">
              {game.winnerId === userId
                ? "You Won! 🎉"
                : `${
                    game.players.find((p) => p.uid === game.winnerId)?.name
                  } Won!`}
            </h2>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push("/")}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg text-xl font-semibold"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Message Popup */}
      {(game.gameMessage || localMessage) && (
        <div className="absolute top-1/2 left-1/2 -translate-y-1/2 z-50 ml-48">
          <div className="bg-black/60 backdrop-blur-md text-white font-bold text-4xl px-8 py-6 rounded-2xl shadow-2xl animate-pop-in">
            {localMessage || game.gameMessage}
          </div>
        </div>
      )}

      {/* Settings Modal (Simplified) */}
      {isSettingsOpen && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-2">
          <div className="bg-gray-800 border border-white/20 rounded-xl p-6 text-white shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Settings</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 rounded-full hover:bg-white/10"
                aria-label="Close settings"
              >
                <FaTimes size="1.25rem" />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Card Back Design</h3>
                {/* ... card back selection UI (unchanged) ... */}
              </div>
              <div className=" pt-4">
                <button
                  onClick={() => router.push("/")}
                  className="w-full px-6 py-3 bg-red-600/80 hover:bg-red-700/80 rounded-lg text-lg font-semibold"
                >
                  Leave Game
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Color Picker Modal */}
      {isColorPickerOpen && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 border border-white/20 rounded-xl p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-bold mb-6">Choose a color</h2>
            <div className="flex gap-4">
              <button
                onClick={() => selectColor("red")}
                className="w-24 h-24 rounded-full bg-red-500 hover:scale-110 transition-transform"
              ></button>
              <button
                onClick={() => selectColor("green")}
                className="w-24 h-24 rounded-full bg-green-500 hover:scale-110 transition-transform"
              ></button>
              <button
                onClick={() => selectColor("blue")}
                className="w-24 h-24 rounded-full bg-blue-500 hover:scale-110 transition-transform"
              ></button>
              <button
                onClick={() => selectColor("yellow")}
                className="w-24 h-24 rounded-full bg-yellow-400 hover:scale-110 transition-transform"
              ></button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Suspense wrapper remains the same
export default function GamePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Game />
    </Suspense>
  );
}
