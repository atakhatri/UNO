"use client";

import { FaCog, FaTimes, FaPaperPlane } from "react-icons/fa"; // Added FaPaperPlane
import { CardComponent } from "@/app/Card"; // Use alias if configured
import { useRouter, useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
// Correct path assuming game-types is inside app/game/
import {
  Color,
  cardBackDesigns,
  Player,
  // Import Player
} from "../game-types";
import type { Card } from "../../game-logic"; // <-- ADD this line to import Card correctly
import { useMultiplayerUnoGame } from "./useMultiplayerUnoGame";

// --- NEW ---
// Import firebase functions needed for friend invites
import {
  getUserDocRef,
  getDoc,
  sendGameInvite,
  User,
} from "../../lib/firebase";

// Define User Profile type (can be moved to a shared types file)
interface UserProfile {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  friends: string[];
  pendingRequests: string[];
  sentRequests: string[];
}
// --- END NEW ---

function Game() {
  const router = useRouter();
  const params = useParams();
  const gameId = Array.isArray(params.gameId)
    ? params.gameId[0]
    : params.gameId ?? ""; // Ensure gameId is a string

  // === Core Game State and Logic from Hook ===
  const {
    game,
    userId,
    error,
    isAwaitingColorChoice,
    startGame,
    playCard,
    drawCard,
    selectColor,
    callUno,
    leaveGame,
  } = useMultiplayerUnoGame(gameId);
  // ===========================================

  // === UI-Only State ===
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cardBack, setCardBack] =
    useState<keyof typeof cardBackDesigns>("default");
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [unoButtonClickedThisTurn, setUnoButtonClickedThisTurn] =
    useState(false);
  const [showCardSuggestions, setShowCardSuggestions] = useState(true);

  // --- NEW Invite State ---
  const [friendsDetails, setFriendsDetails] = useState<UserProfile[]>([]);
  const [sentInvites, setSentInvites] = useState<string[]>([]); // Track sent invites for this session
  // --- END NEW Invite State ---

  // Effect to clear local messages
  useEffect(() => {
    if (localMessage) {
      const timer = setTimeout(() => {
        setLocalMessage(null);
      }, 2000); // Show for 2 seconds
      return () => clearTimeout(timer);
    }
  }, [localMessage]);

  // Reset UNO button clicked state when turn changes *to this player*
  useEffect(() => {
    if (
      game &&
      userId &&
      game.players[game.currentPlayerIndex]?.uid === userId
    ) {
      setUnoButtonClickedThisTurn(false);
    }
  }, [game?.currentPlayerIndex, userId, game?.players]);

  // --- NEW Effect to fetch friends for invite list ---
  useEffect(() => {
    if (userId && game?.status === "waiting") {
      const fetchFriends = async () => {
        const userDocRef = getUserDocRef(userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          if (data.friends && data.friends.length > 0) {
            const friendPromises = data.friends.map(async (friendId) => {
              const friendDoc = await getDoc(getUserDocRef(friendId));
              return friendDoc.exists()
                ? ({ ...friendDoc.data(), id: friendDoc.id } as UserProfile)
                : null;
            });
            const friends = (await Promise.all(friendPromises)).filter(
              Boolean
            ) as UserProfile[];
            setFriendsDetails(friends);
          }
        }
      };
      fetchFriends();
    }
  }, [userId, game?.status]); // Re-fetch if user or game status changes
  // --- END NEW Effect ---

  // --- Render Loading/Error States ---
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-8">
        <h2 className="text-3xl text-red-500 mb-4">Error</h2>
        <p className="text-xl mb-6">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-xl font-semibold"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  if (!game || !userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white text-xl">
        Loading game data for ID "{gameId || "..."}". Joining room...
      </div>
    );
  }

  // --- Derived State (Calculated from `game` state) ---
  const user = game.players.find((p) => p.uid === userId);
  const player = game.players.find((p) => p.uid === userId);
  const opponents = game.players.filter((p) => p.uid !== userId);

  const topOfDiscard =
    game.discardPile && game.discardPile.length > 0
      ? game.discardPile[game.discardPile.length - 1]
      : null;

  const isPlayerTurn =
    game.status === "playing" &&
    game.players[game.currentPlayerIndex]?.uid === userId;
  const isHost = game.hostId === userId;
  const currentTurnPlayerName =
    game.players[game.currentPlayerIndex]?.name ?? "Loading...";

  const showUnoButton =
    isPlayerTurn && player?.hand.length === 2 && !isAwaitingColorChoice;

  // Helper function to determine if a card is playable
  const isCardPlayableLocal = (card: Card, topCard: Card | null): boolean => {
    if (!topCard) return true; // Should not happen in a started game
    const effectiveColor = game.chosenColor || topCard.color;
    if (card.color === "black") return true;
    if (card.color === effectiveColor) return true;
    if (card.value === topCard.value) return true;
    return false;
  };

  const hasPlayableCard =
    player?.hand.some((card) => isCardPlayableLocal(card, topOfDiscard)) ??
    false;

  // --- UI Handlers ---
  const handlePlayCard = (card: Card, index: number) => {
    if (!isPlayerTurn) {
      setLocalMessage("It's not your turn!");
      return;
    }
    if (isAwaitingColorChoice) {
      setLocalMessage("Please choose a color first!");
      return;
    }
    playCard(card, index);
  };

  const handleDrawCard = () => {
    if (!isPlayerTurn) {
      setLocalMessage("It's not your turn!");
      return;
    }
    if (isAwaitingColorChoice) {
      setLocalMessage("Please choose a color first!");
      return;
    }
    drawCard();
  };

  const handleSelectColor = (color: Color) => {
    if (!isAwaitingColorChoice) return;
    selectColor(color);
  };

  const handleCallUno = () => {
    if (showUnoButton && !unoButtonClickedThisTurn) {
      callUno();
      setUnoButtonClickedThisTurn(true);
      setLocalMessage("UNO!");
    }
  };

  const handleLeaveGame = async () => {
    await leaveGame();
    router.push("/");
  };

  // --- NEW Invite Handler ---
  const handleSendInvite = async (friendId: string) => {
    if (!user || !player || !gameId) return;
    try {
      // Immediately mark as invited to disable the button
      setSentInvites((prev) => [...prev, friendId]);
      await sendGameInvite(user.uid, player.name, gameId, friendId);
      setSentInvites((prev) => [...prev, friendId]); // Mark as invited

      // After 5 seconds, allow the user to be invited again
      setTimeout(() => {
        setSentInvites((prev) => prev.filter((id) => id !== friendId));
      }, 5000);
    } catch (err) {
      console.error("Error sending invite:", err);
      // Optionally show a local error message
      setSentInvites((prev) => prev.filter((id) => id !== friendId)); // Re-enable on error
    }
  };

  // --- Render Game UI ---
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between p-2 md:p-4 bg-linear-to-br from-gray-900 to-gray-800 text-white overflow-hidden">
      {/* Opponents' Hands Area */}
      <div className="w-full flex justify-around mb-4 md:mb-0">
        {opponents.map((opponent) => (
          <div
            key={opponent.id}
            className="flex flex-col items-center px-1 relative"
          >
            <h2
              className={`text-sm md:text-lg font-bold mb-1 text-center transition-all truncate max-w-[100px] md:max-w-none ${
                game.players[game.currentPlayerIndex]?.id === opponent.id
                  ? "text-yellow-300 scale-105" // Highlight current opponent
                  : "text-white/50"
              }`}
            >
              {opponent.name} ({opponent.hand.length})
            </h2>
            {/* --- UNO State Indicator for Opponent --- */}
            {game.playerInUnoState === opponent.uid && (
              <span className="absolute -top-4 md:-top-5 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs md:text-sm font-bold px-2 py-0.5 rounded-full animate-pulse">
                UNO!
              </span>
            )}
            <div className="flex justify-center h-24 md:h-28 items-center">
              {/* Simple card back showing count */}
              <div
                className={`w-16 h-24 md:w-20 md:h-28 ${cardBackDesigns[cardBack]} rounded-md flex items-center justify-center border border-black shadow-md`}
              >
                <span className="font-bold text-base md:text-lg text-white">
                  {opponent.hand.length}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Turn Indicator */}
      <div className="flex flex-col items-center text-center px-2">
        <div className="text-base md:text-xl font-semibold">
          {game.status === "waiting"
            ? "Waiting..."
            : game.status === "finished"
            ? "Game Over!"
            : `${currentTurnPlayerName}'s Turn`}
        </div>
        <div className="bg-black/30 p-2 rounded-lg text-xs">
          <span className="font-bold">ID:</span>
          <span className="ml-2 font-mono text-yellow-300 tracking-widest">
            {game.gameId}
          </span>
        </div>
      </div>

      {/* Center Table Area (Deck, Discard, Turn Info) */}
      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 my-2 w-full">
        {/* Deck */}
        <div className="flex flex-col items-center">
          <p className="text-sm md:text-base mb-1 md:mb-2 font-semibold">
            Deck ({game.deck?.length ?? 0})
          </p>
          <button
            onClick={handleDrawCard}
            disabled={!isPlayerTurn || isAwaitingColorChoice}
            className="relative w-28 h-40 disabled:opacity-70 disabled:cursor-not-allowed group"
            title={isPlayerTurn ? "Draw a card" : ""}
          >
            {(game.deck?.length ?? 0) > 2 && (
              <div
                className={`absolute top-1 left-1 w-full h-full ${cardBackDesigns[cardBack]} rounded-xl border-4 border-white shadow-lg`}
              ></div>
            )}
            {(game.deck?.length ?? 0) > 1 && (
              <div
                className={`absolute top-0.5 left-0.5 w-full h-full ${cardBackDesigns[cardBack]} rounded-xl border-4 border-white shadow-lg`}
              ></div>
            )}
            {(game.deck?.length ?? 0) > 0 ? (
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

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-3 mt-6 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Open settings"
        >
          <FaCog size="1.5rem" />
        </button>

        {/* Discard Pile */}
        <div className="flex flex-col items-center">
          <p className="text-sm md:text-base mb-1 md:mb-2 font-semibold">
            Discard
          </p>
          <div className="relative w-28 h-40">
            {topOfDiscard ? (
              <div className="w-full h-full">
                <CardComponent card={topOfDiscard} className="shadow-lg" />
              </div>
            ) : (
              <div className="w-full h-full rounded-lg bg-gray-700 border border-gray-500 flex items-center justify-center text-white/50 text-xs text-center">
                Empty
              </div>
            )}
            {/* Animated Card for Play/Draw */}
            {game.animatedCard && game.animatedCard.type === "play" && (
              <div
                key={game.animatedCard.id}
                className={`absolute inset-0 z-20 ${
                  game.animatedCard.type === "play"
                    ? "animate-play-card"
                    : "animate-draw-card"
                }`}
              >
                <CardComponent card={game.animatedCard.card} />
              </div>
            )}
            {/* Chosen Color Indicator */}
            {game.chosenColor && (
              <div
                className={`absolute -bottom-5 left-1/2 -translate-x-1/2 w-20 h-4 rounded-full border-2 border-white shadow-lg ${
                  {
                    red: "bg-red-500",
                    green: "bg-green-500",
                    blue: "bg-blue-500",
                    yellow: "bg-yellow-400",
                  }[game.chosenColor]
                }`}
                title={`Chosen color: ${game.chosenColor}`}
              ></div>
            )}
          </div>
        </div>
      </div>

      {/* Player's Hand Area */}
      <div className="w-full mt-2 md:mt-0 relative">
        <h2
          className={`text-base md:text-xl font-bold mb-2 text-center transition-all ${
            isPlayerTurn ? "text-yellow-300 scale-105" : "text-white"
          }`}
        >
          Your Hand ({player?.hand.length ?? 0})
        </h2>

        {/* --- UNO Button --- */}
        {showUnoButton && (
          <div className="absolute -top-10 md:-top-12 left-1/2 -translate-x-1/2 z-20">
            <button
              onClick={handleCallUno} // Use new handler
              disabled={unoButtonClickedThisTurn} // Disable after clicking once per turn
              className={`px-6 py-3 rounded-full font-bold text-xl transition-all shadow-lg border-2 border-black transform active:scale-95
                         ${
                           unoButtonClickedThisTurn
                             ? "bg-green-500 text-white scale-105 cursor-default" // Style for after click
                             : "bg-yellow-400 text-black animate-pulse hover:scale-110" // Style before click
                         }`}
              title={unoButtonClickedThisTurn ? "UNO Called!" : "Call UNO!"}
            >
              UNO!
            </button>
          </div>
        )}

        {/* Scrollable Hand Container */}
        <div className="w-full max-w-5xl mx-auto overflow-x-auto pb-4 px-2">
          <div className="flex justify-center items-end gap-1 md:gap-2 min-h-[180px] md:min-h-[200px] w-max mx-auto px-4">
            {player?.hand.length === 0 && game.status === "playing" && (
              <p className="text-white/70">You have no cards.</p>
            )}
            {player?.hand.map((card, index) => {
              const canPlayerAct = isPlayerTurn && !isAwaitingColorChoice;
              const isPlayable = isCardPlayableLocal(card, topOfDiscard);

              const shouldHighlight =
                showCardSuggestions && canPlayerAct && isPlayable;
              const isClickable = canPlayerAct && isPlayable;

              // When suggestions are off, all cards are fully visible.
              // When on, non-playable cards are dimmed.
              const cardClassName =
                showCardSuggestions && !isClickable
                  ? "opacity-50 cursor-not-allowed"
                  : !isClickable
                  ? "cursor-not-allowed"
                  : "";

              return (
                <CardComponent
                  key={`${card.color}-${card.value}-${index}-${player.hand.length}`}
                  card={card}
                  onClick={
                    isClickable ? () => handlePlayCard(card, index) : undefined
                  }
                  className={cardClassName}
                  highlight={shouldHighlight}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* --- Modals and Overlays --- */}
      {/* Waiting Lobby */}
      {game.status === "waiting" && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="bg-white/10 border border-white/20 rounded-xl p-6 md:p-8 text-white shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
              Waiting for Players...
            </h2>
            <p className="text-lg mb-4 text-center">
              Share Game ID:{" "}
              <span className="text-yellow-300 font-bold tracking-widest">
                {game.gameId}
              </span>
            </p>
            <div className="mb-6 text-left bg-black/20 p-3 rounded">
              <h3 className="font-semibold mb-2">
                Players ({game.players.length}/4):
              </h3>
              <ul className="list-disc list-inside space-y-1">
                {game.players.map((p) => (
                  <li key={p.uid} className="truncate text-white/90">
                    {p.name} {p.uid === game.hostId ? "(Host)" : ""}
                  </li>
                ))}
              </ul>
            </div>

            {/* --- NEW Invite Friends Section --- */}
            {isHost && (
              <div className="mb-6 text-left bg-black/20 p-3 rounded">
                <h3 className="font-semibold mb-2">Invite Friends</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {friendsDetails.length === 0 && (
                    <p className="text-white/70 text-sm">
                      No friends to invite. Add friends from the profile modal
                      on the home page.
                    </p>
                  )}
                  {friendsDetails.map((friend) => {
                    const isAlreadyInGame = game.players.some(
                      (p) => p.uid === friend.uid
                    );
                    const isInviteSent = sentInvites.includes(friend.id);
                    return (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between"
                      >
                        <span className="truncate">{friend.displayName}</span>
                        <button
                          onClick={() => handleSendInvite(friend.id)}
                          disabled={isAlreadyInGame || isInviteSent}
                          className="px-3 py-1 bg-blue-600/80 rounded-lg text-sm font-semibold transition-all hover:bg-blue-500/80 disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {isAlreadyInGame
                            ? "In Game"
                            : isInviteSent
                            ? "Sent"
                            : "Invite"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* --- END NEW Invite Friends Section --- */}

            {isHost && (
              <button
                onClick={startGame}
                disabled={game.players.length < 2}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-xl font-semibold disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
                title={
                  game.players.length < 2
                    ? "Need at least 2 players to start"
                    : "Start the game!"
                }
              >
                Start Game ({game.players.length}/4)
              </button>
            )}
            {!isHost && (
              <p className="text-lg text-white/80 text-center">
                Waiting for host (
                {game.players.find((p) => p.uid === game.hostId)?.name ?? "..."}
                ) to start...
              </p>
            )}
            <button
              onClick={handleLeaveGame}
              className="mt-4 w-full px-6 py-2 bg-red-600/80 hover:bg-red-700/80 rounded-lg text-lg font-semibold"
            >
              Leave Game
            </button>
          </div>
        </div>
      )}
      {/* Winner Modal */}
      {game.status === "finished" && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="bg-white/10 border border-white/20 rounded-xl p-8 text-center shadow-2xl max-w-md w-full">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {game.winnerId === userId
                ? "You Won! 🎉"
                : `${
                    game.players.find((p) => p.uid === game.winnerId)?.name ??
                    "Someone"
                  } Won!`}
            </h2>
            <button
              onClick={handleLeaveGame}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-xl font-semibold"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}
      {/* Game Message Popup */}
      {(game.gameMessage || localMessage) && !isAwaitingColorChoice && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg mt-32 md:mt-40 z-50 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-md text-white font-bold text-xl md:text-2xl px-6 py-4 md:px-8 md:py-6 rounded-2xl shadow-2xl animate-pulse text-center">
            {localMessage || game.gameMessage}
          </div>
        </div>
      )}
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-2 p-4">
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
              {/* Card Suggestions Toggle */}
              <div className="border-b border-white/10 pb-6">
                <h3 className="font-semibold mb-3">Gameplay</h3>
                <div className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                  <label htmlFor="card-suggestions" className="text-white/90">
                    Card Suggestions
                  </label>
                  <button
                    id="card-suggestions"
                    onClick={() => setShowCardSuggestions(!showCardSuggestions)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showCardSuggestions ? "bg-green-500" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showCardSuggestions ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
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
              {/* Leave Game Button */}
              <div className=" pt-4 border-t border-white/10">
                <button
                  onClick={handleLeaveGame}
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
      {isAwaitingColorChoice && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 border border-white/20 rounded-xl p-6 md:p-8 text-center shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              Choose a color
            </h2>
            <div className="flex flex-wrap justify-center gap-3 md:gap-4">
              <button
                onClick={() => handleSelectColor("red")}
                className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-red-500 hover:scale-110 transition-transform shadow-lg border-2 border-white/50"
                aria-label="Choose Red"
              ></button>
              <button
                onClick={() => handleSelectColor("green")}
                className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-green-500 hover:scale-110 transition-transform shadow-lg border-2 border-white/50"
                aria-label="Choose Green"
              ></button>
              <button
                onClick={() => handleSelectColor("blue")}
                className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-blue-500 hover:scale-110 transition-transform shadow-lg border-2 border-white/50"
                aria-label="Choose Blue"
              ></button>
              <button
                onClick={() => handleSelectColor("yellow")}
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
export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white text-xl">
          Loading Game Room...
        </div>
      }
    >
      <Game />
    </Suspense>
  );
}
