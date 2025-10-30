"use client";

import { useState, useEffect } from "react";
import Link from "next/link"; // Import Link for navigation
import { useRouter } from "next/navigation";
import { FaTimes, FaUser } from "react-icons/fa";
// Using tsconfig path alias
import { Player, GameState, Difficulty } from "@/app/game/game-types";
import { getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
// Using tsconfig path alias
import { db, getGameDocRef, getUserId } from "@/app/lib/firebase";

// Helper function to generate a simple 6-digit game ID
const generateGameId = () => Math.random().toString().substring(2, 8);

export default function Home() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [gameIdToJoin, setGameIdToJoin] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium"); // Keep difficulty for local game
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false); // Add state for modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); // State for new profile modal

  // Open profile modal on load if no name is set
  useEffect(() => {
    if (!playerName.trim()) {
      setIsProfileModalOpen(true);
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      setError("Please set your name first.");
      setIsProfileModalOpen(true); // Open modal if name is missing
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const newGameId = generateGameId();
      const userId = await getUserId(); // Ensure user is authenticated

      const hostPlayer: Player = {
        // id will be assigned when game starts
        uid: userId,
        name: playerName,
        hand: [],
      };

      // Create a partial GameState for Firestore, non-essential fields will be added on game start
      const newGame: Partial<GameState> = {
        gameId: newGameId,
        hostId: userId,
        players: [hostPlayer],
        status: "waiting", // Game starts in a 'waiting' lobby
        difficulty: difficulty, // Store difficulty selected in lobby (can be used later if needed)
        // Deck, discardPile, currentPlayerIndex etc. are set when the host starts the game
      };

      const gameDocRef = getGameDocRef(newGameId);
      await setDoc(gameDocRef, newGame); // Use setDoc to create the document

      // Navigate to the new game room
      router.push(`/game/${newGameId}`);
    } catch (err) {
      console.error("Error creating game:", err);
      setError("Failed to create game. Please try again.");
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      setError("Please set your name first.");
      setIsProfileModalOpen(true); // Open modal if name is missing
      return;
    }
    if (!gameIdToJoin || gameIdToJoin.length !== 6) {
      // Ensure exactly 6 digits
      setError("Please enter a valid 6-digit Game ID.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const gameDocRef = getGameDocRef(gameIdToJoin);
      const gameDoc = await getDoc(gameDocRef);

      if (!gameDoc.exists()) {
        setError("Game not found. Check the ID and try again.");
        setLoading(false);
        return;
      }

      const gameData = gameDoc.data() as GameState;

      // Ensure gameData is properly loaded before accessing properties
      if (!gameData || !gameData.players) {
        setError("Game data is incomplete or corrupted.");
        setLoading(false);
        return;
      }

      if (gameData.status !== "waiting") {
        setError("This game has already started or is finished.");
        setLoading(false);
        return;
      }

      if (gameData.players.length >= 4) {
        setError("This game is full (max 4 players).");
        setLoading(false);
        return;
      }

      const userId = await getUserId();

      if (gameData.players.some((p) => p.uid === userId)) {
        // Player is already in the game, just navigate
        router.push(`/game/${gameIdToJoin}`);
        return;
      }

      const newPlayer: Player = {
        // id will be assigned when game starts
        uid: userId,
        name: playerName,
        hand: [], // Hand dealt when game starts
      };

      await updateDoc(gameDocRef, {
        players: arrayUnion(newPlayer),
      });

      // Navigate to the game room
      router.push(`/game/${gameIdToJoin}`);
    } catch (err) {
      console.error("Error joining game:", err);
      setError("Failed to join game. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main
      className="flex min-h-screen flex-col bg-cover bg-center"
      style={{ backgroundImage: "url('/main_bg.png')" }}
    >
      {/* Full-screen semi-transparent container */}
      <div className="relative flex flex-col bg-black/80 w-full min-h-screen p-4 sm:p-6 md:p-8">
        {/* Header: Title + Profile */}
        <div className="flex justify-between items-center w-full mb-4 sm:mb-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-[0.5rem] sm:tracking-[1rem] -mr-[0.5rem] sm:-mr-[1rem]">
            <span className="heading u">U</span>
            <span className="heading n">N</span>
            <span className="heading o">O</span>
          </h1>
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="p-3 bg-white/10 text-white rounded-full transition-all hover:bg-white/20"
            aria-label="Open Profile"
          >
            <FaUser size="2rem" />
          </button>
        </div>

        {/* Centered Content Wrapper */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <div className="w-full max-w-xl space-y-4 sm:space-y-6 ">
            <button
              onClick={() => setIsHowToPlayOpen(true)}
              className="w-full px-6 py-3 bg-black/60 text-white rounded-lg text-md font-semibold transition-all hover:bg-white/20"
            >
              How to Play
            </button>

            {error && (
              <div className="text-red-400 bg-red-900/50 p-3 rounded-lg text-center w-full">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4 sm:gap-6 w-full">
              {/* --- Play Local Section --- */}
              <div className="flex flex-col gap-4 p-4 border border-white/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <hr className="flex-grow border-white/50" />
                  <span className="text-white/80 font-semibold text-xl">
                    Single Player
                  </span>
                  <hr className="flex-grow border-white/50" />
                </div>
                {/* Items are in a row on sm screens, stacked on xs */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <label
                    htmlFor="difficulty-local"
                    className="text-white/80 sr-only"
                  >
                    Difficulty
                  </label>
                  <select
                    id="difficulty-local"
                    className="bg-white/50 text-black rounded-lg px-4 py-2 text-sm sm:text-base border border-white/20 appearance-none w-full sm:w-1/2"
                    value={difficulty}
                    onChange={(e) =>
                      setDifficulty(e.target.value as Difficulty)
                    }
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  {/* Use Link component for navigation */}
                  <Link
                    href={`/local-game?difficulty=${difficulty}&players=2`}
                    passHref
                    className="w-full sm:w-1/2"
                  >
                    <button
                      disabled={loading} // Can optionally disable while multiplayer actions load
                      className="w-full px-5 py-2 bg-teal-600/80 text-white rounded-lg text-lg sm:text-xl font-semibold transition-all hover:bg-teal-500/80 hover:scale-105 active:scale-95 disabled:bg-gray-500"
                    >
                      Play vs Computer
                    </button>
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <hr className="flex-grow border-white/50" />
                <span className="text-white/80 font-semibold">OR</span>
                <hr className="flex-grow border-white/50" />
              </div>

              {/* Multiplayer Sections (Create/Join - side by side on larger screens) */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Create Game Section */}
                <div className="flex flex-col gap-4 p-4 border border-white/10 rounded-lg flex-1">
                  <h2 className="text-lg sm:text-xl text-white font-semibold text-center">
                    Create Online Game
                  </h2>
                  <button
                    onClick={handleCreateGame}
                    disabled={loading || !playerName.trim()}
                    className="w-full px-6 py-3 bg-green-600/80 text-white rounded-lg text-xl font-semibold transition-all hover:bg-green-500/80 hover:scale-105 active:scale-95 disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
                    title={
                      !playerName.trim() ? "Please set your name first" : ""
                    }
                  >
                    {loading ? "Creating..." : "Create Game"}
                  </button>
                </div>

                {/* Join Game Section */}
                <div className="flex flex-col gap-4 p-4 border border-white/10 rounded-lg flex-1">
                  <h2 className="text-lg sm:text-xl text-white font-semibold text-center">
                    Join Online Game
                  </h2>
                  <label htmlFor="gameIdInput" className="sr-only">
                    Enter 6-digit Game ID
                  </label>
                  <input
                    id="gameIdInput"
                    type="text"
                    placeholder="Enter 6-digit Game ID"
                    maxLength={6}
                    value={gameIdToJoin}
                    onChange={(e) =>
                      setGameIdToJoin(e.target.value.replace(/[^0-9]/g, ""))
                    } // Allow only numbers
                    className="w-full px-4 py-3 bg-white/10 text-white placeholder-white/50 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-[0.2em] transition-all" // Center text and add tracking
                  />
                  <button
                    onClick={handleJoinGame}
                    disabled={
                      loading || !playerName.trim() || gameIdToJoin.length !== 6
                    }
                    className="w-full px-6 py-3 bg-blue-600/80 text-white rounded-lg text-xl font-semibold transition-all hover:bg-blue-500/80 hover:scale-105 active:scale-95 disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
                    title={
                      !playerName.trim()
                        ? "Please set your name first"
                        : gameIdToJoin.length !== 6
                        ? "Enter a 6-digit Game ID"
                        : ""
                    }
                  >
                    {loading ? "Joining..." : "Join Game"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How to Play Modal */}
        {isHowToPlayOpen && (
          // Removed backdrop-blur-sm
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            {/* Modal content */}
            <div className="bg-gray-800 border border-white/20 rounded-xl p-6 sm:p-8 text-white shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  How to Play UNO
                </h2>
                <button
                  onClick={() => setIsHowToPlayOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Close rules"
                >
                  <FaTimes size="1.5rem" />
                </button>
              </div>
              <div className="space-y-6 text-white/90 leading-relaxed">
                <p>Kya padhne aa gye 🤧, yk how to play🤣</p>
                <div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 border-b border-white/20 pb-2">
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
                      If you don't have a playable card, you must draw a card
                      from the deck.
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
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 border-b border-white/20 pb-2">
                    Special Cards
                  </h3>
                  <ul className="space-y-3">
                    <li>
                      <strong className="text-sky-400">Reverse:</strong>{" "}
                      Reverses the direction of play.
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

        {/* Profile Modal */}
        {isProfileModalOpen && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-white/20 rounded-xl p-6 sm:p-8 text-white shadow-2xl w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  Enter Your Name
                </h2>
                {playerName.trim() && ( // Only show close button if a name is already set
                  <button
                    onClick={() => setIsProfileModalOpen(false)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    aria-label="Close profile"
                  >
                    <FaTimes size="1.5rem" />
                  </button>
                )}
              </div>
              <div className="space-y-4">
                <p className="text-white/80">
                  Please enter a name to create or join a game.
                </p>
                <input
                  type="text"
                  placeholder="Your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 text-white placeholder-white/50 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button
                  onClick={() => {
                    if (playerName.trim()) {
                      setIsProfileModalOpen(false);
                      setError(null); // Clear any previous errors
                    } else {
                      setError("Name cannot be empty.");
                    }
                  }}
                  disabled={!playerName.trim()}
                  className="w-full px-6 py-3 bg-green-600/80 text-white rounded-lg text-xl font-semibold transition-all hover:bg-green-500/80 active:scale-95 disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                {/* Show error inside the modal if it's about the name */}
                {error && !playerName.trim() && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
