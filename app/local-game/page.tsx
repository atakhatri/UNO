"use client";

import { FaCog, FaTimes } from "react-icons/fa";
import { CardComponent } from "../Card"; // Correct path to Card component
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  Difficulty,
  cardBackDesigns,
  difficultyDisplay,
  Color, // Import Color
} from "../game/game-types"; // Correct path
import type { Card } from "../game-logic"; // Import Card type from game-logic
import { useUnoGame } from "./useUnoGame"; // Correct path

// --- Game Component remains largely the same, just consumes the hook ---
function Game() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Setup game parameters from URL
  const difficulty = (searchParams.get("difficulty") as Difficulty) || "medium";
  // For local game, always 2 players (1 human, 1 computer)
  const numPlayers = 2;

  // === Core Game State and Logic from Hook ===
  const {
    players,
    deck, // Get deck length if needed
    discardPile,
    topOfDiscard,
    currentPlayerIndex,
    winner,
    isColorPickerOpen,
    // isUnoState, // Removed, UI will calculate
    // playerCalledUno, // Internal state, not needed for UI directly
    gameMessage,
    animatedCard,
    isPlayerTurn,
    playCard,
    drawCard,
    callUno,
    playerCalledUno, // Need this to disable the button after click
    selectColor,
    startGame,
    // setGameMessage, // Managed internally by the hook now
  } = useUnoGame(numPlayers, difficulty);
  // ===========================================

  // === UI-Only State ===
  // Timer is optional for local play, let's remove it for simplicity first
  // const [timeLeft, setTimeLeft] = useState(45);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cardBack, setCardBack] =
    useState<keyof typeof cardBackDesigns>("default");
  // const turnNumber = useRef(0); // If timer were used

  // --- Effects for UI (like clearing messages are now inside the hook) ---

  const player = players[0];
  const opponents = players.slice(1);
  if (!player) return null; // Still loading initial state

  // Helper function to determine if a card is playable
  const isCardPlayable = (card: Card, topCard: Card | null): boolean => {
    if (!topCard) return true; // Can play anything if discard is empty
    if (card.color === "black") return true; // Wild cards are always playable
    if (card.color === topCard.color) return true;
    if (card.value === topCard.value) return true;
    return false;
  };

  const hasPlayableCard = player.hand.some((card) =>
    isCardPlayable(card, topOfDiscard)
  );

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between p-4 md:p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden">
      {/* Settings Button */}
      <div className="absolute top-2 right-2 md:top-4 md:right-4 z-30">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 md:p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Open settings"
        >
          <FaCog size="1.2rem" />
        </button>
      </div>

      {/* Opponent's Hand */}
      <div className="w-full flex justify-center mb-4 md:mb-0">
        {" "}
        {/* Center single opponent */}
        {opponents.map((opponent) => (
          <div key={opponent.id} className="flex flex-col items-center px-1">
            <h2
              className={`text-base md:text-xl font-bold mb-1 md:mb-2 text-center transition-all truncate max-w-[100px] md:max-w-none ${
                !isPlayerTurn
                  ? "text-yellow-300 scale-105" // Highlight opponent on their turn
                  : "text-white/50"
              }`}
            >
              {opponent.name} ({opponent.hand.length})
            </h2>
            <div className="flex justify-center h-20 md:h-28 items-center">
              <div
                className={`w-12 h-16 md:w-16 md:h-24 ${cardBackDesigns[cardBack]} rounded-md flex items-center justify-center border border-black shadow-md`}
              >
                <span className="font-bold text-lg md:text-2xl text-white">
                  {opponent.hand.length}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Game Table */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 my-4 md:my-8 w-full">
        {/* Deck */}
        <div className="flex flex-col items-center order-1 md:order-none">
          <p className="text-sm md:text-base mb-1 md:mb-2 font-semibold">
            Deck ({deck.length}) {/* Show deck count */}
          </p>
          <button
            onClick={isPlayerTurn ? drawCard : undefined}
            disabled={!isPlayerTurn || isColorPickerOpen}
            className="relative w-24 h-36 disabled:opacity-70 disabled:cursor-not-allowed group"
            title={isPlayerTurn ? "Draw a card" : ""}
          >
            {deck.length > 2 && (
              <div
                className={`absolute top-1 left-1 w-full h-full ${cardBackDesigns[cardBack]} rounded-xl border-4 border-white shadow-lg`}
              ></div>
            )}
            {deck.length > 1 && (
              <div
                className={`absolute top-0.5 left-0.5 w-full h-full ${cardBackDesigns[cardBack]} rounded-xl border-4 border-white shadow-lg`}
              ></div>
            )}
            {deck.length > 0 ? (
              <div
                className={`absolute inset-0 w-full h-full ${
                  cardBackDesigns[cardBack]
                } rounded-xl border-4 border-white shadow-lg group-hover:scale-105 group-hover:-translate-y-2 transition-transform duration-200 ${
                  isPlayerTurn && !hasPlayableCard
                    ? "animate-[pulse-glow_1.5s_ease-in-out_infinite]"
                    : ""
                }`}
              ></div>
            ) : (
              <div className="w-full h-full rounded-xl bg-black/20 border-4 border-white/50 flex items-center justify-center text-white/50 text-xs text-center p-2">
                Deck Empty
              </div>
            )}
          </button>
        </div>

        {/* Turn Indicator */}
        <div className="flex flex-col items-center text-center order-3 md:order-none px-4 min-h-[50px] pt-12">
          <div className="text-lg md:text-xl font-semibold">
            {winner
              ? "Game Over!"
              : isPlayerTurn
              ? "Your Turn"
              : `Player ${currentPlayerIndex + 1}'s Turn`}
          </div>
          {/* Removed Timer Display */}
        </div>

        {/* Discard Pile */}
        <div className="flex flex-col items-center justify-center order-2 md:order-none">
          <p className="text-sm md:text-base mb-1 md:mb-2 font-semibold">
            Discard
          </p>
          <div className="relative w-24 h-36">
            {topOfDiscard ? (
              <CardComponent card={topOfDiscard} className="shadow-lg" />
            ) : (
              <div className="w-full h-full rounded-lg bg-gray-700 border border-gray-500"></div> // Placeholder if empty initially
            )}
            {/* Animated Card for Play/Draw */}
            {animatedCard && animatedCard.type === "play" && (
              <div
                key={animatedCard.id}
                className={`absolute inset-0 z-20 ${
                  animatedCard.type === "play"
                    ? "animate-play-card"
                    : "animate-draw-card"
                }`}
              >
                <CardComponent card={animatedCard.card} />
              </div>
            )}
            {/* Chosen Color Indicator - Reuse from multiplayer */}
            {topOfDiscard?.color !== "black" &&
              discardPile.length > 1 &&
              discardPile[discardPile.length - 2]?.color === "black" && (
                <div
                  className={`absolute -bottom-5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg ${
                    {
                      red: "bg-red-500",
                      green: "bg-green-500",
                      blue: "bg-blue-500",
                      yellow: "bg-yellow-400",
                    }[topOfDiscard.color as Color]
                  }`}
                  title={`Chosen color: ${topOfDiscard.color}`}
                ></div>
              )}
          </div>
        </div>
      </div>

      {/* Player's Hand */}
      <div className="w-full mt-4 md:mt-0">
        <h2
          className={`text-lg md:text-2xl font-bold mb-2 md:mb-4 text-center transition-all ${
            isPlayerTurn ? "text-yellow-300 scale-105" : "text-white"
          }`}
        >
          Your Hand ({player.hand.length})
        </h2>
        {/* UNO Button - Show when player has 2 cards and it's their turn */}
        {isPlayerTurn && player.hand.length === 2 && (
          <div className="flex justify-center mb-2">
            <button
              onClick={callUno}
              disabled={playerCalledUno} // Disable if already called
              className={`px-6 py-3 rounded-full font-bold text-xl transition-all shadow-lg border-2 border-black transform active:scale-95
                         ${
                           playerCalledUno
                             ? "bg-green-500 text-white scale-105 cursor-default" // Style for after click
                             : "bg-yellow-400 text-black animate-pulse hover:scale-110" // Style before click
                         }`}
              title={playerCalledUno ? "UNO Called!" : "Call UNO!"}
            >
              UNO!
            </button>
          </div>
        )}
        {/* Scrollable Hand Container */}
        <div className="w-full max-w-4xl mx-auto overflow-x-auto pb-4 px-2">
          <div className="flex justify-center items-center gap-1 md:gap-2 min-h-[130px] md:min-h-[140px] w-max mx-auto px-4">
            {player.hand.length === 0 && !winner && (
              <p className="text-white/70">You have no cards.</p>
            )}
            {player.hand.map((card, index) =>
              (() => {
                const canPlayerAct = isPlayerTurn && !isColorPickerOpen;
                const isPlayable = isCardPlayable(card, topOfDiscard);
                return (
                  <CardComponent
                    key={`${card.color}-${card.value}-${index}-${player.hand.length}`}
                    card={card}
                    onClick={
                      canPlayerAct && isPlayable
                        ? () => playCard(card, index)
                        : undefined
                    }
                    className={
                      !canPlayerAct || !isPlayable
                        ? "opacity-50 cursor-not-allowed"
                        : "shadow-yellow-400/50 shadow-[0_0_15px]"
                    }
                  />
                );
              })()
            )}
          </div>
        </div>
      </div>

      {/* --- Modals and Overlays --- */}

      {/* Winner Modal */}
      {winner && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="bg-white/10 border border-white/20 rounded-xl p-8 text-center shadow-2xl max-w-md w-full">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {winner.id === 0 ? "You Won! 🎉" : `${winner.name} Won! 😞`}
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
                Exit to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Message Popup */}
      {gameMessage &&
        !isColorPickerOpen && ( // Don't show messages while picker is open
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg mt-32 md:mt-40 z-50 pointer-events-none">
            <div className="bg-black/70 backdrop-blur-md text-white font-bold text-xl md:text-2xl px-6 py-4 md:px-8 md:py-6 rounded-2xl shadow-2xl animate-pulse text-center">
              {gameMessage}
            </div>
          </div>
        )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-2 p-4">
          <div className="bg-gray-800 border border-white/20 rounded-xl p-6 text-white shadow-2xl w-full max-w-md">
            {/* ... (Modal content is similar, just Exit button) ... */}
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
              {/* Difficulty Display */}
              <div>
                <h3 className="font-semibold mb-2">Difficulty</h3>
                <div
                  className={`w-full text-center p-2 rounded-lg font-bold text-white ${
                    difficultyDisplay[difficulty]?.bg ?? "bg-gray-500"
                  }`}
                >
                  {difficultyDisplay[difficulty]?.label ?? "Unknown"}
                </div>
              </div>
              {/* Card Back Design */}
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
                      className={`relative h-20 md:h-24 rounded-lg border-2 transition-all ${
                        cardBack === design
                          ? "border-blue-500 scale-105"
                          : "border-transparent hover:border-white/50"
                      }`}
                    >
                      <div
                        className={`w-full h-full ${cardBackDesigns[design]} rounded-md flex items-center justify-center border border-black`}
                      >
                        <span className="text-white font-bold text-sm md:text-lg">
                          UNO
                        </span>
                      </div>
                      <p className="text-xs md:text-sm mt-1 md:mt-2 capitalize font-medium">
                        {design}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              {/* Exit Game Button */}
              <div className=" pt-4 border-t border-white/10">
                <button
                  onClick={() => router.push("/")}
                  className="w-full px-6 py-3 bg-red-600/80 hover:bg-red-700/80 rounded-lg text-lg font-semibold"
                >
                  Exit to Lobby
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Color Picker Modal */}
      {isColorPickerOpen &&
        isPlayerTurn && ( // Only show for player turn
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 border border-white/20 rounded-xl p-6 md:p-8 text-center shadow-2xl">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">
                Choose a color
              </h2>
              <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                <button
                  onClick={() => selectColor("red")}
                  className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-red-500 hover:scale-110 transition-transform shadow-lg border-2 border-white/50"
                  aria-label="Choose Red"
                ></button>
                {/* ... other color buttons ... */}
                <button
                  onClick={() => selectColor("green")}
                  className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-green-500 hover:scale-110 transition-transform shadow-lg border-2 border-white/50"
                  aria-label="Choose Green"
                ></button>
                <button
                  onClick={() => selectColor("blue")}
                  className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-blue-500 hover:scale-110 transition-transform shadow-lg border-2 border-white/50"
                  aria-label="Choose Blue"
                ></button>
                <button
                  onClick={() => selectColor("yellow")}
                  className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-yellow-400 hover:scale-110 transition-transform shadow-lg border-2 border-white/50"
                  aria-label="Choose Yellow"
                ></button>
              </div>
            </div>
          </div>
        )}
    </main>
  );
}

// Suspense wrapper remains the same
export default function LocalGamePage() {
  // Renamed component
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white text-xl">
          Loading Local Game...
        </div>
      }
    >
      <Game />
    </Suspense>
  );
}
