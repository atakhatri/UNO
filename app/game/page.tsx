"use client";

import { FaCog, FaTimes } from "react-icons/fa";
import { CardComponent } from "../Card";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Difficulty, cardBackDesigns, difficultyDisplay } from "./game-types";
import { useUnoGame } from "./useUnoGame";

function Game() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Setup game parameters from URL
  const difficulty = (searchParams.get("difficulty") as Difficulty) || "medium";
  const numPlayers = parseInt(searchParams.get("players") || "2", 10);

  // === Core Game State and Logic from Hook ===
  const {
    players,
    topOfDiscard,
    currentPlayerIndex,
    winner,
    isColorPickerOpen,
    isUnoState,
    playerCalledUno,
    gameMessage,
    animatedCard,
    isPlayerTurn,
    playCard,
    drawCard,
    callUno,
    selectColor,
    startGame,
    setGameMessage,
  } = useUnoGame(numPlayers, difficulty);
  // ===========================================

  // === UI-Only State ===
  const [timeLeft, setTimeLeft] = useState(45);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cardBack, setCardBack] =
    useState<keyof typeof cardBackDesigns>("default");
  const turnNumber = useRef(0); // Use ref to track turn changes

  // Effect to reset turn timer
  useEffect(() => {
    // Only reset timer when the player *index* actually changes
    setTimeLeft(45);
    turnNumber.current += 1;
  }, [currentPlayerIndex]);

  // Effect for the turn timer countdown
  useEffect(() => {
    if (winner) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [winner]); // This timer runs continuously

  // Effect to handle running out of time
  useEffect(() => {
    if (timeLeft <= 0 && !winner) {
      if (isPlayerTurn) {
        setGameMessage("Time's up! Drawing a card.");
        drawCard(); // Force player to draw
      }
      // For computer, the computerTurnLogic will just run
      // We just need to reset the timer for the next player
      setTimeLeft(45);
    }
  }, [timeLeft, winner, isPlayerTurn, drawCard, setGameMessage]);

  // Effect to clear game messages after a delay
  useEffect(() => {
    if (gameMessage) {
      const timer = setTimeout(() => {
        setGameMessage(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameMessage, setGameMessage]);

  const player = players[0];
  const opponents = players.slice(1);
  if (!player) return null; // Still loading

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden">
      {/* Settings Button */}
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
            <h2 className="text-xl font-bold mb-2 text-center text-white/50">
              Player {opponent.id + 1} ({opponent.hand.length})
            </h2>
            <div className="hidden md:relative md:flex justify-center h-28 items-center">
              {opponent.hand.map((_, index) => (
                <div
                  key={index}
                  className={`absolute w-16 h-24 ${cardBackDesigns[cardBack]} rounded-md border-2 border-black shadow-md`}
                  style={{
                    transform: `translateX(${
                      (index - opponent.hand.length / 2) * 20
                    }px)`,
                  }}
                ></div>
              ))}
            </div>
            <div
              className={`md:hidden w-16 h-24 ${cardBackDesigns[cardBack]} rounded-md flex items-center justify-center border-2 border-black shadow-md`}
            ></div>
          </div>
        ))}
      </div>

      {/* Game Table */}
      <div className="flex items-end justify-center gap-8 my-8">
        {/* Deck */}
        <div className="flex flex-col items-center">
          <p className="mb-2 font-semibold">Deck</p>
          <div
            className={`w-20 h-28 ${cardBackDesigns[cardBack]} rounded-lg border-2 border-black cursor-pointer hover:scale-105 transition-transform flex items-center justify-center`}
            onClick={drawCard} // Use handler from hook
          ></div>
        </div>

        {/* Timer and Turn Info */}
        <div className="flex flex-col items-center text-center pb-4">
          <div className="text-5xl font-mono font-bold">{timeLeft}s</div>
          <div className="text-xl font-semibold">
            {isPlayerTurn
              ? "Your Turn"
              : `Player ${currentPlayerIndex + 1}'s Turn`}
          </div>
        </div>

        {/* Discard Pile */}
        <div className="flex flex-col items-center">
          <p className="mb-2 font-semibold">Discard Pile</p>
          {topOfDiscard && (
            <CardComponent card={topOfDiscard} className="animate-pop-in" />
          )}
        </div>
      </div>

      {/* Player's Hand */}
      <div className="w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Your Hand ({player.hand.length})
        </h2>
        <div className="relative flex justify-center items-center">
          {/* UNO Button */}
          {player.hand.length === 2 && !playerCalledUno && (
            <button
              onClick={callUno} // Use handler from hook
              className="absolute -top-16 z-10 px-8 py-4 bg-yellow-400 text-black font-bold text-2xl rounded-full shadow-lg animate-pulse hover:scale-110 transition-transform"
            >
              UNO!
            </button>
          )}
          <div className="flex justify-center gap-2 flex-wrap min-h-32 items-center">
            {player.hand.map((card, index) => (
              <CardComponent
                key={`${card.color}-${card.value}-${index}`}
                card={card}
                onClick={() => playCard(card, index)} // Use handler from hook
                className="animate-fade-in-up"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Winner Modal */}
      {winner && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-white/10 border border-white/20 rounded-xl p-8 text-center shadow-2xl">
            <h2 className="text-4xl font-bold mb-4">
              {winner.id === 0
                ? "You Won! 🎉"
                : `Player ${winner.id + 1} Won 😞`}
            </h2>
            <div className="flex gap-4 justify-center">
              <button
                onClick={startGame} // Use handler from hook
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-xl font-semibold"
              >
                Play Again
              </button>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg text-xl font-semibold"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Message Popup */}
      {gameMessage && (
        <div className="absolute top-1/2 left-1/2 -translate-y-1/2 z-50 ml-48">
          <div className="bg-black/60 backdrop-blur-md text-white font-bold text-4xl px-8 py-6 rounded-2xl shadow-2xl animate-pop-in">
            {gameMessage}
          </div>
        </div>
      )}

      {/* Card Animation Container */}
      {animatedCard && (
        <div
          id="animated-card-container"
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        >
          <CardComponent
            card={animatedCard.card}
            className={`absolute transition-all duration-500 ease-in-out z-50
              ${
                animatedCard.from === "deck" && animatedCard.to === "player"
                  ? "animate-deck-draw"
                  : ""
              }
              ${
                animatedCard.from === "deck" && animatedCard.to === "opponent"
                  ? "animate-opponent-draw"
                  : ""
              }
              ${animatedCard.from === "player" ? "animate-player-play" : ""}
              ${
                animatedCard.from === "opponent" ? "animate-opponent-play" : ""
              }`}
          />
        </div>
      )}

      {/* Settings Modal */}
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
                <h3 className="font-semibold mb-2">Difficulty</h3>
                <div
                  className={`w-full text-center p-2 rounded-lg font-bold text-white ${difficultyDisplay[difficulty].bg}`}
                >
                  {difficultyDisplay[difficulty].label}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Card Back Design</h3>
                <div className="grid grid-cols-3 gap-4">
                  {(
                    Object.keys(
                      cardBackDesigns
                    ) as (keyof typeof cardBackDesigns)[]
                  ).map((design) => (
                    <button
                      key={design}
                      onClick={() => setCardBack(design)}
                      className={`relative h-24 rounded-lg border-2 transition-all ${
                        cardBack === design
                          ? "border-blue-500 scale-105"
                          : "border-transparent hover:border-white/50"
                      }`}
                    >
                      <div
                        className={`w-full h-full ${cardBackDesigns[design]} rounded-md flex items-center justify-center border-2 border-black`}
                      >
                        <span className="text-white font-bold text-lg">
                          UNO
                        </span>
                      </div>
                      <p className="text-sm mt-2 capitalize font-medium">
                        {design}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <div className=" pt-4">
                <button
                  onClick={() => router.push("/")}
                  className="w-full px-6 py-3 bg-red-600/80 hover:bg-red-700/80 rounded-lg text-lg font-semibold"
                >
                  Exit Game
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
                onClick={() => selectColor("red")} // Use handler from hook
                className="w-24 h-24 rounded-full bg-red-500 hover:scale-110 transition-transform"
              ></button>
              <button
                onClick={() => selectColor("green")} // Use handler from hook
                className="w-24 h-24 rounded-full bg-green-500 hover:scale-110 transition-transform"
              ></button>
              <button
                onClick={() => selectColor("blue")} // Use handler from hook
                className="w-24 h-24 rounded-full bg-blue-500 hover:scale-110 transition-transform"
              ></button>
              <button
                onClick={() => selectColor("yellow")} // Use handler from hook
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
