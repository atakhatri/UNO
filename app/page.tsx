"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaTimes } from "react-icons/fa";
import { getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, getGameDocRef, getUserId } from "./lib/firebase";
import { createDeck, drawCards, shuffleDeck } from "./game-logic";
import { GameState, Player } from "./game/game-types";

export default function Home() {
  const router = useRouter();
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [gameIdToJoin, setGameIdToJoin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      setError("Please enter your name.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const hostId = await getUserId();
      // Generate a simple 6-digit game ID
      const newGameId = Math.floor(100000 + Math.random() * 900000).toString();

      console.log(`Creating game ${newGameId} for host ${hostId}`);

      // 1. Create the initial game state
      let currentDeck = shuffleDeck(createDeck());

      // Draw 7 cards for the host
      const { drawn, remaining } = drawCards(currentDeck, 7);
      currentDeck = remaining;

      // Create the host player object
      const hostPlayer: Player = {
        id: 0,
        uid: hostId,
        name: playerName,
        hand: drawn,
      };

      // Draw the first card for the discard pile
      let firstCard: GameState["discardPile"][0];
      do {
        const drawResult = drawCards(currentDeck, 1);
        firstCard = drawResult.drawn[0];
        currentDeck = drawResult.remaining;
      } while (
        firstCard.value === "wild" ||
        firstCard.value === "wild-draw-four"
      );

      // 2. Define the full GameState object
      const newGame: GameState = {
        gameId: newGameId,
        hostId: hostId,
        players: [hostPlayer],
        deck: currentDeck,
        discardPile: [firstCard],
        currentPlayerIndex: 0,
        playDirection: 1,
        status: "waiting", // Game starts in a 'waiting' lobby
        winnerId: null,
        chosenColor: null,
        gameMessage: "Waiting for players to join...",
      };

      // 3. Save to Firestore
      const gameDocRef = getGameDocRef(newGameId);
      await setDoc(gameDocRef, newGame);

      // 4. Navigate to the new game room
      router.push(`/game/${newGameId}`);
    } catch (err) {
      console.error("Error creating game:", err);
      setError("Failed to create game. Please try again.");
      setIsLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!gameIdToJoin.trim()) {
      setError("Please enter a Game ID.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const userId = await getUserId();
      const gameDocRef = getGameDocRef(gameIdToJoin);
      const gameSnap = await getDoc(gameDocRef);

      if (!gameSnap.exists()) {
        setError("Game not found. Please check the ID.");
        setIsLoading(false);
        return;
      }

      const gameData = gameSnap.data() as GameState;

      if (gameData.status !== "waiting") {
        setError("This game has already started or is finished.");
        setIsLoading(false);
        return;
      }

      if (gameData.players.length >= 4) {
        setError("This game is full.");
        setIsLoading(false);
        return;
      }

      if (gameData.players.some((p) => p.uid === userId)) {
        // Player is already in the game, just navigate
        router.push(`/game/${gameIdToJoin}`);
        return;
      }

      // Add the new player
      // Draw 7 cards for the new player
      let currentDeck = gameData.deck;
      const { drawn, remaining } = drawCards(currentDeck, 7);
      currentDeck = remaining;

      const newPlayer: Player = {
        id: gameData.players.length, // Their ID is the next index
        uid: userId,
        name: playerName,
        hand: drawn,
      };

      // Update the doc with the new player and the depleted deck
      await updateDoc(gameDocRef, {
        players: arrayUnion(newPlayer),
        deck: currentDeck,
        gameMessage: `${playerName} has joined the game!`,
      });

      // Navigate to the game room
      router.push(`/game/${gameIdToJoin}`);
    } catch (err) {
      console.error("Error joining game:", err);
      setError("Failed to join game. Please try again.");
      setIsLoading(false);
    }
  };

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

        <div className="flex flex-col gap-6 w-72">
          {error && <p className="text-red-400 text-center">{error}</p>}
          <input
            type="text"
            placeholder="Enter Your Name"
            className="bg-white/10 text-white placeholder-white/50 rounded-lg px-4 py-3 border border-white/20"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />

          <button
            onClick={handleCreateGame}
            disabled={isLoading}
            className="w-full px-6 py-4 bg-green-600/80 text-white rounded-lg text-xl font-semibold transition-all hover:bg-green-500/80 hover:scale-105 active:scale-95 disabled:bg-gray-500"
          >
            {isLoading ? "Creating..." : "Create Game"}
          </button>

          <div className="flex items-center gap-2">
            <hr className="flex-grow border-white/20" />
            <span className="text-white/80">OR</span>
            <hr className="flex-grow border-white/20" />
          </div>

          <input
            type="text"
            placeholder="Enter Game ID"
            className="bg-white/10 text-white placeholder-white/50 rounded-lg px-4 py-3 border border-white/20"
            value={gameIdToJoin}
            onChange={(e) => setGameIdToJoin(e.target.value.trim())}
          />
          <button
            onClick={handleJoinGame}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-blue-600/80 text-white rounded-lg text-lg font-semibold transition-all hover:bg-blue-500/80 disabled:bg-gray-500"
          >
            {isLoading ? "Joining..." : "Join Game"}
          </button>
        </div>
      </div>

      {/* How to Play Modal (unchanged) */}
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
              {/* Rules content... */}
              <p>Kya padhne aa gye 🤧, yk the game 🤣😒</p>
              {/* ... truncated for brevity ... */}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
